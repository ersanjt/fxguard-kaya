'use strict';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Open a 1:1 chat in the WhatsApp Web UI (required before clicking call buttons).
 */
async function openChatInWaWeb(client, chatId) {
    await client.pupPage.evaluate(async (id) => {
        const widFactory = window.require('WAWebWidFactory');
        const wid = widFactory.createWid(id);
        const cmd = window.require('WAWebCmd');
        if (cmd?.Chat?.openChatBottom) {
            await cmd.Chat.openChatBottom(wid);
            return;
        }
        const collection =
            window.require('WAWebChatCollection')?.ChatCollection || window.Store?.Chat;
        const chat = collection?.get?.(id);
        if (chat && cmd?.Chat?.openChatAt) await cmd.Chat.openChatAt(chat);
    }, chatId);
}

async function tryUiCallClickForChat(client, chatId, isVideo) {
    await openChatInWaWeb(client, chatId);
    await sleep(700);
    const clicked = await client.pupPage.evaluate(
        (iconName) => {
            const selectors = [
                `span[data-icon="${iconName}"]`,
                `button span[data-icon="${iconName}"]`,
                `[data-icon="${iconName}"]`,
            ];
            let el = null;
            for (const sel of selectors) {
                el = document.querySelector(sel);
                if (el) break;
            }
            if (!el) {
                const header =
                    document.querySelector('header') || document.querySelector('#main header');
                if (header) {
                    el = header.querySelector(`[data-icon="${iconName}"]`);
                }
            }
            if (!el) return false;
            const btn = el.closest('button') || el.closest('[role="button"]') || el;
            btn.click();
            return true;
        },
        isVideo ? 'video-call' : 'voice-call'
    );
    return clicked;
}

/**
 * Generate a WhatsApp call link (voice or video) via WA Web internals.
 */
async function createWaCallLink(client, isVideo) {
    const startTime = new Date(Date.now() + 30_000);
    const callType = isVideo ? 'video' : 'voice';
    if (typeof client.createCallLink === 'function') {
        const link = await client.createCallLink(startTime, callType);
        if (link) return link;
    }
    const startTimeTs = Math.floor(startTime.getTime() / 1000);
    return client.pupPage.evaluate(
        async (ts, type) => {
            const mod = window.require('WAWebGenerateEventCallLink');
            if (!mod?.createEventCallLink) return '';
            const link = await mod.createEventCallLink(ts, type);
            return link || '';
        },
        startTimeTs,
        callType
    );
}

/**
 * Start an outgoing WhatsApp call to a contact or group.
 * 1) Click UI call button in linked WhatsApp Web session
 * 2) Fallback: send call link message to chat
 */
async function startOutgoingCall(client, to, isVideo, logger, opts = {}) {
    const raw = String(to || '').trim();
    let chatId;
    if (/@(c\.us|g\.us|lid|s\.whatsapp\.net)$/i.test(raw)) {
        chatId = raw;
    } else if (raw.includes('@')) {
        chatId = raw;
    } else {
        const digits = raw.replace(/\D/g, '');
        chatId = digits ? `${digits}@c.us` : '';
    }
    if (!chatId) {
        const err = new Error('invalid_recipient');
        err.statusCode = 400;
        throw err;
    }
    const isGroup = /@g\.us$/i.test(chatId);
    const introText = (opts.introText && String(opts.introText).trim()) || '';

    if (introText) {
        try {
            await client.sendMessage(chatId, introText);
            await sleep(900);
        } catch (e) {
            logger.warn('Call intro send failed', { chatId, error: e?.message });
            const err = new Error(
                'ارسال پیام معرفی تماس ناموفق بود — شناسه مخاطب یا نشست واتساپ را بررسی کنید'
            );
            err.statusCode = 503;
            throw err;
        }
    }

    try {
        const uiOk = await tryUiCallClickForChat(client, chatId, isVideo);
        if (uiOk) {
            logger.info('Outgoing call started via WhatsApp Web UI', {
                chatId,
                isVideo,
                isGroup,
                hasIntro: !!introText,
            });
            return { ok: true, method: 'ui', isGroup, introSent: !!introText };
        }
    } catch (e) {
        logger.warn('UI call click failed, trying call link fallback', {
            error: e?.message,
            chatId,
            isGroup,
        });
    }

    let callLink = '';
    try {
        callLink = await createWaCallLink(client, isVideo);
    } catch (e) {
        logger.warn('createWaCallLink failed', { error: e?.message, chatId });
    }
    if (!callLink) {
        const err = new Error('call_link_failed');
        err.statusCode = 503;
        throw err;
    }

    const linkLead = isGroup
        ? isVideo
            ? 'برای پیوستن به تماس تصویری گروهی روی لینک زیر بزنید (تا ۱۰ نفر):'
            : 'برای پیوستن به تماس صوتی گروهی روی لینک زیر بزنید (تا ۱۰ نفر):'
        : isVideo
          ? 'برای پیوستن به تماس تصویری روی لینک زیر بزنید:'
          : 'برای پیوستن به تماس صوتی روی لینک زیر بزنید:';
    const text = introText
        ? `${introText}\n\n${linkLead}\n${callLink}`
        : `${linkLead}\n${callLink}`;
    try {
        if (!introText) {
            await client.sendMessage(chatId, text);
        } else {
            await client.sendMessage(chatId, `${linkLead}\n${callLink}`);
        }
    } catch (e) {
        logger.warn('Call link send failed', { chatId, error: e?.message });
        const err = new Error('ارسال لینک تماس ناموفق بود');
        err.statusCode = 503;
        throw err;
    }
    logger.info('Call link sent', { chatId, isVideo, isGroup, introSent: !!introText });
    return { ok: true, method: 'link', callLink, isGroup, introSent: !!introText };
}

module.exports = {
    startOutgoingCall,
};
