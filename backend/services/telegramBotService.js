/**
 * سرویس بات تلگرام — دستیار کارکنان CRM
 *
 * دستورات:
 *   /start [/token]  — خوش‌آمد + اتصال سریع
 *   /menu            — منوی تعاملی
 *   /link <token>    — اتصال حساب
 *   /me              — پروفایل
 *   /rates           — نرخ ارز
 *   /status          — سلامت واتساپ / کانال‌ها
 *   /inbox           — مکالمات خوانده‌نشده
 *   /team            — همکاران آنلاین
 *   /unlink          — قطع اتصال
 *   /help            — راهنما
 */

const axios = require('axios');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const { buildRatesSnapshot } = require('../lib/ratesSnapshot');

function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

let _pollingActive = false;
let _lastUpdateId = 0;
let _pollingTimeout = null;
let _appModels = null;
let _botConfig = null;
/** از getMe — برای botUrl در API اتصال تلگرام وقتی TELEGRAM_BOT_USERNAME تنظیم نشده */
let _cachedBotUsername = '';
/** فاصلهٔ بعدی بین چرخه‌های getUpdates (بعد از ۴۲۹/۴۰۹ توسط API تنظیم می‌شود) */
let _adaptivePollMs = 2000;

const POLL_INTERVAL_MS = 2000;
const LONG_POLL_TIMEOUT_SEC = 25;
const REQUEST_TIMEOUT_MS = 30000;
const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

const ROLE_LABELS = {
    owner: 'مالک',
    admin: 'مدیر',
    manager: 'مدیر میانی',
    supervisor: 'سرپرست',
    agent: 'کارشناس'
};

const STATUS_LABELS = {
    online: 'آنلاین',
    offline: 'آفلاین',
    busy: 'مشغول',
    away: 'دور'
};

const BTN = {
    rates: 'نرخ‌ها',
    inbox: 'صندوق ورودی',
    status: 'وضعیت سیستم',
    team: 'تیم آنلاین',
    me: 'حساب من',
    help: 'راهنما',
    menu: 'منو'
};

function setBotConfig(config) {
    _botConfig = config;
}

function setModels(models) {
    _appModels = models;
}

function getToken() {
    if (_botConfig && _botConfig.botToken) return String(_botConfig.botToken).trim();
    return (process.env.TELEGRAM_BOT_TOKEN || '').trim();
}

function isConfigured() {
    return !!getToken();
}

function getCachedBotUsername() {
    return _cachedBotUsername || '';
}

/** فقط یک worker باید getUpdates بزند (PM2 cluster / چند replica) */
function shouldSkipTelegramPollingForThisWorker() {
    if (process.env.TELEGRAM_POLLING_DISABLED === '1') return true;
    if (process.env.TELEGRAM_POLL_ALL_WORKERS === '1') return false;
    const inst = process.env.NODE_APP_INSTANCE;
    if (inst === undefined || inst === '') return false;
    return String(inst) !== '0';
}

async function apiCall(method, params = {}) {
    const token = getToken();
    if (!token) return null;
    const url = `https://api.telegram.org/bot${token}/${method}`;
    try {
        const res = await axios.post(url, params, { timeout: REQUEST_TIMEOUT_MS });
        const data = res.data;
        if (data && data.ok === false) {
            logger.warn(`Telegram API ${method} rejected`, { description: data.description, error_code: data.error_code });
        }
        return data;
    } catch (err) {
        const body = err.response && err.response.data;
        const desc = body && body.description;
        const errorCode = body && body.error_code;
        logger.warn(`Telegram API call failed: ${method}`, {
            error: err.message,
            description: desc,
            error_code: errorCode,
            status: err.response && err.response.status
        });
        if (desc) return { ok: false, description: desc, error_code: errorCode };
        return null;
    }
}

function splitTelegramText(text, limit = TELEGRAM_MAX_MESSAGE_LENGTH) {
    const s = String(text || '');
    const parts = [];
    let rest = s;
    while (rest.length > 0) {
        if (rest.length <= limit) {
            parts.push(rest);
            break;
        }
        let slice = rest.slice(0, limit);
        const nl = slice.lastIndexOf('\n');
        if (nl > Math.floor(limit * 0.72)) slice = rest.slice(0, nl + 1);
        parts.push(slice);
        rest = rest.slice(slice.length);
    }
    return parts;
}

function stripHtmlForFallback(s) {
    return String(s)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/code>/gi, '')
        .replace(/<code>/gi, '')
        .replace(/<\/b>/gi, '')
        .replace(/<b>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

async function sendReply(chatId, text, opts = {}) {
    const { parse_mode, ...restOpts } = opts;
    const useHtml = parse_mode !== undefined ? parse_mode : 'HTML';
    const chunks = splitTelegramText(text, TELEGRAM_MAX_MESSAGE_LENGTH);
    let last = null;
    for (let i = 0; i < chunks.length; i++) {
        const part = chunks[i];
        // کیبورد فقط روی آخرین قطعه
        const chunkOpts = i === chunks.length - 1 ? restOpts : { ...restOpts };
        if (i < chunks.length - 1) {
            delete chunkOpts.reply_markup;
        }
        const payload = {
            chat_id: chatId,
            text: part,
            disable_web_page_preview: true,
            ...chunkOpts,
            ...(useHtml ? { parse_mode: useHtml } : {})
        };
        let data = await apiCall('sendMessage', payload);
        if (data && data.ok === false) {
            const desc = String(data.description || '');
            if (/parse|entities|html|markdown/i.test(desc)) {
                data = await apiCall('sendMessage', {
                    chat_id: chatId,
                    text: stripHtmlForFallback(part).slice(0, TELEGRAM_MAX_MESSAGE_LENGTH),
                    disable_web_page_preview: true,
                    ...chunkOpts
                });
            }
            if (data && data.ok === false) {
                logger.warn('Telegram sendMessage failed', { description: data.description, chat_id: chatId });
            }
        }
        last = data;
    }
    return last;
}

async function getUpdates(offset = 0) {
    const token = getToken();
    if (!token) return [];
    const url = `https://api.telegram.org/bot${token}/getUpdates`;
    try {
        const res = await axios.post(url, {
            offset,
            timeout: LONG_POLL_TIMEOUT_SEC,
            allowed_updates: ['message', 'edited_message', 'callback_query']
        }, { timeout: REQUEST_TIMEOUT_MS + 5000 });
        if (res.data && res.data.ok && Array.isArray(res.data.result)) {
            _adaptivePollMs = POLL_INTERVAL_MS;
            return res.data.result;
        }
        if (res.data && res.data.ok === false) {
            const code = res.data.error_code;
            if (code === 429 && res.data.parameters && res.data.parameters.retry_after != null) {
                const sec = Math.max(1, Number(res.data.parameters.retry_after) || 5);
                _adaptivePollMs = Math.min(60000, Math.max(3000, sec * 1000));
                logger.warn('Telegram getUpdates rate limited (429), backing off', { retry_after_sec: sec });
            } else {
                logger.warn('Telegram getUpdates rejected', {
                    description: res.data.description,
                    error_code: code
                });
            }
        }
        return [];
    } catch (err) {
        const status = err.response && err.response.status;
        const body = err.response && err.response.data;
        if (status === 409 || (body && body.error_code === 409)) {
            _adaptivePollMs = Math.max(_adaptivePollMs, 12000);
            logger.error(
                'Telegram getUpdates conflict (409): another instance may be using the same bot token. Only one long-poll consumer is allowed per bot.'
            );
            return [];
        }
        if (status === 429 && body && body.parameters && body.parameters.retry_after != null) {
            const sec = Math.max(1, Number(body.parameters.retry_after) || 5);
            _adaptivePollMs = Math.min(60000, Math.max(3000, sec * 1000));
            logger.warn('Telegram getUpdates HTTP 429, backing off', { retry_after_sec: sec });
            return [];
        }
        if (err.code !== 'ECONNABORTED' && err.code !== 'ETIMEDOUT') {
            logger.warn('Telegram getUpdates error', {
                error: err.message,
                description: body && body.description,
                error_code: body && body.error_code,
                status
            });
        }
        return [];
    }
}

async function getBrandName() {
    try {
        const { getPanelSettings } = require('./config/panelSettingsLoader');
        const s = await getPanelSettings();
        const name = s && (s.siteName || s.loginTitle || s.pageTitle);
        if (name && String(name).trim()) return String(name).trim();
    } catch (_) { /* ignore */ }
    return 'کایا';
}

function faNow() {
    return new Date().toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
}

function brandFooter(brand) {
    return `\n\n<code>┄┄┄┄┄┄┄┄┄┄┄┄┄┄</code>\n<i>${esc(brand)} · دستیار کارکنان</i>`;
}

function mainReplyKeyboard() {
    return {
        keyboard: [
            [{ text: BTN.rates }, { text: BTN.inbox }],
            [{ text: BTN.status }, { text: BTN.team }],
            [{ text: BTN.me }, { text: BTN.help }]
        ],
        resize_keyboard: true,
        is_persistent: true
    };
}

function mainInlineKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: 'نرخ ارز', callback_data: 'rates' },
                { text: 'صندوق', callback_data: 'inbox' }
            ],
            [
                { text: 'وضعیت', callback_data: 'status' },
                { text: 'تیم', callback_data: 'team' }
            ],
            [
                { text: 'حساب من', callback_data: 'me' },
                { text: 'راهنما', callback_data: 'help' }
            ]
        ]
    };
}

function formatChange(change) {
    if (change == null || !Number.isFinite(Number(change))) return '';
    const n = Number(change);
    if (n === 0) return ' <i>· بدون تغییر</i>';
    const arrow = n > 0 ? '▲' : '▼';
    const sign = n > 0 ? '+' : '';
    return ` <i>${arrow} ${sign}${n.toLocaleString('fa-IR')}</i>`;
}

async function getRatesText() {
    try {
        const models = _appModels || require('../models');
        const brand = await getBrandName();
        const snap = await buildRatesSnapshot({ models, onlyPositive: true, respectVisible: true });

        if (!snap.hasApiKey && !snap.hasLiveData) {
            return null;
        }
        if (!snap.items || snap.items.length === 0) {
            return null;
        }

        const now = faNow();
        const cacheNote = snap.fromCache ? '\n<i>منبع: آخرین اسنپ‌شات موفق</i>' : '';
        const lines = snap.items.map((i) => {
            const formatted = Number(i.value).toLocaleString('fa-IR');
            return `▸ <b>${esc(i.label)}</b>\n    ${formatted} تومان${formatChange(i.change)}`;
        });

        return (
            `<b>${esc(brand)}</b>\n` +
            `نرخ ارز · ${now}${cacheNote}\n\n` +
            `${lines.join('\n\n')}` +
            brandFooter(brand)
        );
    } catch (err) {
        logger.warn('getRatesText error', { error: err.message });
        return null;
    }
}

async function getUserInfo(userId) {
    try {
        const { User } = _appModels || require('../models');
        const user = await User.findByPk(userId, {
            include: [
                { association: 'branch', required: false },
                { association: 'department', required: false }
            ],
            attributes: ['id', 'name', 'email', 'username', 'role', 'status', 'lastLoginAt', 'departmentId', 'branchId', 'isActive']
        });
        return user;
    } catch (_) {
        return null;
    }
}

async function findUserByChatId(chatId) {
    try {
        const { User } = _appModels || require('../models');
        return await User.findOne({ where: { telegramChatId: String(chatId) } });
    } catch (_) {
        return null;
    }
}

async function requireLinked(chatId) {
    const user = await findUserByChatId(chatId);
    if (!user) {
        const brand = await getBrandName();
        await sendReply(
            chatId,
            `حساب CRM شما هنوز به این بات وصل نیست.\n\n` +
                `از پنل <b>${esc(brand)}</b> → پروفایل من → اتصال تلگرام یک کد بگیرید و بفرستید:\n` +
                `<code>/link کد_شما</code>`,
            { reply_markup: mainReplyKeyboard() }
        );
        return null;
    }
    return user;
}

async function handleCommand(chatId, text, fromUser) {
    const parts = text.trim().split(/\s+/);
    const cmd = (parts[0] || '').toLowerCase().split('@')[0];

    if (cmd === '/start') {
        if (parts[1]) {
            await handleLink(chatId, parts[1], fromUser);
            return;
        }
        await handleStart(chatId, fromUser);
        return;
    }

    if (cmd === '/menu') {
        await handleMenu(chatId);
        return;
    }

    if (cmd === '/link') {
        await handleLink(chatId, parts[1], fromUser);
        return;
    }

    if (cmd === '/unlink') {
        await handleUnlink(chatId);
        return;
    }

    if (cmd === '/me') {
        await handleMe(chatId);
        return;
    }

    if (cmd === '/rates') {
        await handleRates(chatId);
        return;
    }

    if (cmd === '/status') {
        await handleStatus(chatId);
        return;
    }

    if (cmd === '/inbox') {
        await handleInbox(chatId);
        return;
    }

    if (cmd === '/team') {
        await handleTeam(chatId);
        return;
    }

    if (cmd === '/help') {
        await handleHelp(chatId);
        return;
    }

    await sendReply(chatId, 'دستور نامشخص است. از /menu یا دکمه‌های پایین استفاده کنید.', {
        reply_markup: mainReplyKeyboard()
    });
}

async function handleStart(chatId, fromUser) {
    const brand = await getBrandName();
    const firstName = esc(fromUser.first_name || '');
    const linked = await findUserByChatId(chatId);

    if (linked) {
        await sendReply(
            chatId,
            `سلام ${firstName}.\n\n` +
                `<b>${esc(brand)}</b> · دستیار کارکنان\n` +
                `حساب شما متصل است: <b>${esc(linked.name)}</b>\n\n` +
                `از منوی زیر یا دکمه‌ها استفاده کنید.`,
            { reply_markup: mainInlineKeyboard() }
        );
        await sendReply(chatId, 'کیبورد سریع فعال شد.', { reply_markup: mainReplyKeyboard() });
        return;
    }

    await sendReply(
        chatId,
        `سلام ${firstName}.\n\n` +
            `<b>${esc(brand)}</b>\n` +
            `دستیار اختصاصی کارکنان — نرخ، صندوق، وضعیت واتساپ و تیم.\n\n` +
            `<b>اتصال حساب</b>\n` +
            `۱) ورود به پنل CRM\n` +
            `۲) پروفایل من ← اتصال تلگرام\n` +
            `۳) دریافت کد و ارسال:\n` +
            `<code>/link کد_شما</code>\n\n` +
            `یا لینک مستقیم از پنل را باز کنید.`,
        { reply_markup: mainReplyKeyboard() }
    );
}

async function handleMenu(chatId) {
    const brand = await getBrandName();
    const linked = await findUserByChatId(chatId);
    await sendReply(
        chatId,
        `<b>${esc(brand)}</b> · منو\n` +
            (linked ? `متصل: ${esc(linked.name)}\n\n` : 'هنوز متصل نیستید — /start\n\n') +
            `یک گزینه را انتخاب کنید:`,
        { reply_markup: mainInlineKeyboard() }
    );
}

async function handleHelp(chatId) {
    const brand = await getBrandName();
    await sendReply(
        chatId,
        `<b>راهنمای دستیار ${esc(brand)}</b>\n\n` +
            `/start — شروع\n` +
            `/menu — منوی دکمه‌ای\n` +
            `/link <code>کد</code> — اتصال حساب\n` +
            `/me — پروفایل من\n` +
            `/rates — نرخ ارز زنده\n` +
            `/inbox — پیام‌های خوانده‌نشده\n` +
            `/status — وضعیت واتساپ و کانال‌ها\n` +
            `/team — همکاران آنلاین\n` +
            `/unlink — قطع اتصال\n` +
            `/help — همین راهنما` +
            brandFooter(brand),
        { reply_markup: mainReplyKeyboard() }
    );
}

async function handleLink(chatId, token, _fromUser) {
    if (!token) {
        await sendReply(
            chatId,
            `توکن را وارد کنید:\n<code>/link توکن_شما</code>\n\n` +
                `توکن را از پنل ← پروفایل من ← اتصال تلگرام بگیرید.`
        );
        return;
    }

    try {
        const { User } = _appModels || require('../models');
        const user = await User.findOne({
            where: { telegramLinkToken: token }
        });

        if (!user) {
            await sendReply(chatId, 'توکن نامعتبر است. از پنل یک کد تازه بگیرید.');
            return;
        }

        if (user.telegramLinkTokenExpiry && new Date() > user.telegramLinkTokenExpiry) {
            await sendReply(chatId, 'توکن منقضی شده است. از پنل یک کد تازه بگیرید.');
            return;
        }

        const existing = await User.findOne({ where: { telegramChatId: String(chatId) } });
        if (existing && existing.id !== user.id) {
            await sendReply(chatId, 'این تلگرام به حساب دیگری وصل است. ابتدا /unlink بفرستید.');
            return;
        }

        await user.update({
            telegramChatId: String(chatId),
            telegramLinkToken: null,
            telegramLinkTokenExpiry: null
        });

        const brand = await getBrandName();
        const roleName = ROLE_LABELS[user.role] || esc(user.role) || '';
        await sendReply(
            chatId,
            `<b>اتصال برقرار شد</b>\n\n` +
                `نام: <b>${esc(user.name)}</b>\n` +
                `ایمیل: ${esc(user.email)}\n` +
                `نقش: ${roleName}\n\n` +
                `حالا می‌توانید از منو استفاده کنید.`,
            { reply_markup: mainInlineKeyboard() }
        );
        await sendReply(chatId, `${esc(brand)} آماده است.`, { reply_markup: mainReplyKeyboard() });
        logger.info(`Telegram linked: user ${user.email} → chatId ${chatId}`);
    } catch (err) {
        logger.error('Telegram link error', { error: err.message });
        await sendReply(chatId, 'خطا در اتصال حساب. دوباره امتحان کنید.');
    }
}

async function handleUnlink(chatId) {
    try {
        const { User } = _appModels || require('../models');
        const user = await User.findOne({ where: { telegramChatId: String(chatId) } });
        if (!user) {
            await sendReply(chatId, 'هیچ حسابی به این تلگرام متصل نیست.');
            return;
        }
        await user.update({ telegramChatId: null });
        await sendReply(chatId, 'اتصال تلگرام قطع شد. برای اتصال دوباره: /start', {
            reply_markup: { remove_keyboard: true }
        });
    } catch (err) {
        logger.error('handleUnlink error', { chatId, error: err.message });
        await sendReply(chatId, 'خطا در قطع اتصال. دوباره امتحان کنید.');
    }
}

async function handleMe(chatId) {
    const user = await requireLinked(chatId);
    if (!user) return;

    try {
        const fullUser = await getUserInfo(user.id);
        if (!fullUser) {
            await sendReply(chatId, 'اطلاعات حساب در دسترس نیست.');
            return;
        }

        const brand = await getBrandName();
        const roleName = ROLE_LABELS[fullUser.role] || esc(fullUser.role) || '';
        const statusName = STATUS_LABELS[fullUser.status] || esc(fullUser.status) || '';
        const lastLogin = fullUser.lastLoginAt
            ? new Date(fullUser.lastLoginAt).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })
            : 'نامشخص';
        const dept = fullUser.department ? esc(fullUser.department.name) : '—';
        const branch = fullUser.branch ? esc(fullUser.branch.name) : '—';

        await sendReply(
            chatId,
            `<b>حساب من · ${esc(brand)}</b>\n\n` +
                `نام: <b>${esc(fullUser.name)}</b>\n` +
                `ایمیل: ${esc(fullUser.email)}\n` +
                (fullUser.username ? `نام کاربری: ${esc(fullUser.username)}\n` : '') +
                `نقش: ${roleName}\n` +
                `وضعیت حضور: ${statusName}\n` +
                `شعبه: ${branch}\n` +
                `بخش: ${dept}\n` +
                `آخرین ورود: ${lastLogin}` +
                brandFooter(brand),
            { reply_markup: mainReplyKeyboard() }
        );
    } catch (err) {
        logger.error('handleMe error', { error: err.message });
        await sendReply(chatId, 'خطا در دریافت اطلاعات حساب.');
    }
}

async function handleRates(chatId) {
    await sendReply(chatId, 'در حال دریافت نرخ…');
    const text = await getRatesText();
    if (!text) {
        await sendReply(
            chatId,
            'نرخ معتبر در دسترس نیست.\n' +
                'کلید API نواسان را در پنل چک کنید یا چند دقیقه بعد دوباره /rates بزنید.',
            { reply_markup: mainReplyKeyboard() }
        );
        return;
    }
    await sendReply(chatId, text, { reply_markup: mainReplyKeyboard() });
}

async function handleStatus(chatId) {
    const user = await requireLinked(chatId);
    if (!user) return;

    const brand = await getBrandName();
    try {
        const { getWhatsappConnectionConfig, isCloudApiConfigured } = require('../lib/whatsappConnectionLoader');
        const { gatewayGet } = require('../lib/gatewayClient');
        const cfg = await getWhatsappConnectionConfig();
        const cloudConfigured = await isCloudApiConfigured();

        let gw = { reachable: false, connected: false, number: null, phase: null };
        if (cfg.gatewayEnabled !== false) {
            try {
                const r = await gatewayGet('/api/status', { timeout: 8000 });
                const data = r.data || {};
                gw = {
                    reachable: true,
                    connected: !!data.whatsapp,
                    number: data.number || data.pushname || null,
                    phase: data.phase || null
                };
            } catch (_) {
                gw = { reachable: false, connected: false, number: null, phase: null };
            }
        }

        const cloudReady = cloudConfigured && cfg.cloudEnabled !== false;
        const gwLine = cfg.gatewayEnabled === false
            ? 'غیرفعال'
            : !gw.reachable
                ? 'غیرقابل دسترس'
                : gw.connected
                    ? `متصل${gw.number ? ` · ${esc(String(gw.number))}` : ''}`
                    : `قطع${gw.phase ? ` · ${esc(String(gw.phase))}` : ''}`;

        const cloudLine = cfg.cloudEnabled === false
            ? 'غیرفعال'
            : cloudReady
                ? 'آماده'
                : cloudConfigured
                    ? 'پیکربندی ناقص'
                    : 'پیکربندی نشده';

        const mode = cfg.connectionMode || 'cloud_first';
        let active = 'هیچ';
        if (mode === 'cloud' && cloudReady) active = 'Cloud API';
        else if (mode === 'gateway' && gw.connected) active = 'Gateway';
        else if (cloudReady) active = 'Cloud API';
        else if (gw.connected) active = 'Gateway';

        await sendReply(
            chatId,
            `<b>وضعیت سیستم · ${esc(brand)}</b>\n` +
                `${faNow()}\n\n` +
                `کانال فعال: <b>${active}</b>\n` +
                `حالت اتصال: <code>${esc(mode)}</code>\n\n` +
                `WhatsApp Gateway: ${gwLine}\n` +
                `Cloud API: ${cloudLine}` +
                brandFooter(brand),
            { reply_markup: mainReplyKeyboard() }
        );
    } catch (err) {
        logger.warn('handleStatus error', { error: err.message });
        await sendReply(chatId, 'خطا در دریافت وضعیت سیستم.');
    }
}

async function handleInbox(chatId) {
    const user = await requireLinked(chatId);
    if (!user) return;

    const brand = await getBrandName();
    try {
        const models = _appModels || require('../models');
        const { Conversation, Customer } = models;
        if (!Conversation) {
            await sendReply(chatId, 'ماژول مکالمات در دسترس نیست.');
            return;
        }

        const where = {
            assignedTo: user.id,
            unreadCount: { [Op.gt]: 0 }
        };

        const [totalUnread, rows] = await Promise.all([
            Conversation.sum('unreadCount', { where }),
            Conversation.findAll({
                where,
                include: Customer
                    ? [{ model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'], required: false }]
                    : [],
                order: [['updatedAt', 'DESC']],
                limit: 8
            })
        ]);

        const sum = Number(totalUnread) || 0;
        if (sum === 0 || !rows.length) {
            await sendReply(
                chatId,
                `<b>صندوق ورودی</b>\n\nپیام خوانده‌نشده‌ای برای شما نیست.` + brandFooter(brand),
                { reply_markup: mainReplyKeyboard() }
            );
            return;
        }

        const lines = rows.map((c, idx) => {
            const cust = c.customer;
            const title = cust && cust.name
                ? esc(cust.name)
                : cust && cust.phone
                    ? esc(cust.phone)
                    : `چت #${c.id}`;
            const n = Number(c.unreadCount) || 0;
            return `${idx + 1}. <b>${title}</b> — ${n.toLocaleString('fa-IR')} خوانده‌نشده`;
        });

        await sendReply(
            chatId,
            `<b>صندوق ورودی · ${esc(brand)}</b>\n` +
                `مجموع خوانده‌نشده: <b>${sum.toLocaleString('fa-IR')}</b>\n\n` +
                `${lines.join('\n')}\n\n` +
                `<i>جزئیات کامل در پنل وب</i>` +
                brandFooter(brand),
            { reply_markup: mainReplyKeyboard() }
        );
    } catch (err) {
        logger.warn('handleInbox error', { error: err.message });
        await sendReply(chatId, 'خطا در دریافت صندوق ورودی.');
    }
}

async function handleTeam(chatId) {
    const user = await requireLinked(chatId);
    if (!user) return;

    const brand = await getBrandName();
    try {
        const { User } = _appModels || require('../models');
        const online = await User.findAll({
            where: {
                isActive: true,
                status: { [Op.in]: ['online', 'busy', 'away'] }
            },
            attributes: ['id', 'name', 'role', 'status'],
            order: [['status', 'ASC'], ['name', 'ASC']],
            limit: 20
        });

        if (!online.length) {
            await sendReply(
                chatId,
                `<b>تیم · ${esc(brand)}</b>\n\nدر حال حاضر کسی آنلاین/مشغول نیست.` + brandFooter(brand),
                { reply_markup: mainReplyKeyboard() }
            );
            return;
        }

        const lines = online.map((u) => {
            const st = STATUS_LABELS[u.status] || u.status;
            const role = ROLE_LABELS[u.role] || u.role || '';
            const mark = u.status === 'online' ? '●' : u.status === 'busy' ? '◆' : '○';
            return `${mark} <b>${esc(u.name)}</b> — ${st}${role ? ` · ${role}` : ''}`;
        });

        await sendReply(
            chatId,
            `<b>تیم آنلاین · ${esc(brand)}</b>\n` +
                `${online.length.toLocaleString('fa-IR')} نفر\n\n` +
                `${lines.join('\n')}` +
                brandFooter(brand),
            { reply_markup: mainReplyKeyboard() }
        );
    } catch (err) {
        logger.warn('handleTeam error', { error: err.message });
        await sendReply(chatId, 'خطا در دریافت وضعیت تیم.');
    }
}

async function handlePlainText(chatId, text, fromUser) {
    const t = String(text || '').trim();
    const map = {
        [BTN.rates]: () => handleRates(chatId),
        [BTN.inbox]: () => handleInbox(chatId),
        [BTN.status]: () => handleStatus(chatId),
        [BTN.team]: () => handleTeam(chatId),
        [BTN.me]: () => handleMe(chatId),
        [BTN.help]: () => handleHelp(chatId),
        [BTN.menu]: () => handleMenu(chatId)
    };
    if (map[t]) {
        await map[t]();
        return;
    }
    // کد اتصال خام (بدون /link)
    if (/^[a-zA-Z0-9_-]{8,64}$/.test(t) && !(await findUserByChatId(chatId))) {
        await handleLink(chatId, t, fromUser);
        return;
    }
    await sendReply(chatId, 'از دکمه‌های پایین یا /menu استفاده کنید.', {
        reply_markup: mainReplyKeyboard()
    });
}

async function handleCallback(cq) {
    if (!cq || !cq.id) return;
    const chatId = cq.message && cq.message.chat && cq.message.chat.id;
    const data = String(cq.data || '');
    await apiCall('answerCallbackQuery', { callback_query_id: cq.id });
    if (!chatId) return;

    if (data === 'rates') await handleRates(chatId);
    else if (data === 'inbox') await handleInbox(chatId);
    else if (data === 'status') await handleStatus(chatId);
    else if (data === 'team') await handleTeam(chatId);
    else if (data === 'me') await handleMe(chatId);
    else if (data === 'help') await handleHelp(chatId);
    else if (data === 'menu') await handleMenu(chatId);
}

async function processUpdate(update) {
    try {
        if (!update) return;
        if (update.callback_query) {
            await handleCallback(update.callback_query);
            return;
        }
        const msg = update.message || update.edited_message;
        if (!msg) return;
        const chatId = msg.chat && msg.chat.id;
        const text = msg.text || '';
        const fromUser = msg.from || {};

        if (!chatId || !text) return;
        if (text.startsWith('/')) {
            await handleCommand(chatId, text, fromUser);
        } else {
            await handlePlainText(chatId, text, fromUser);
        }
    } catch (err) {
        logger.warn('processUpdate error', { error: err.message });
    }
}

async function pollOnce() {
    const updates = await getUpdates(_lastUpdateId);
    for (const update of updates) {
        if (update.update_id >= _lastUpdateId) {
            _lastUpdateId = update.update_id + 1;
        }
        try {
            await processUpdate(update);
        } catch (err) {
            logger.warn('Telegram update handler error', { update_id: update.update_id, error: err.message });
        }
    }
}

async function startPolling(models, config = undefined) {
    if (_pollingActive) return;
    if (models) _appModels = models;
    if (config !== undefined) {
        _botConfig =
            config && String(config.botToken || '').trim()
                ? { botToken: String(config.botToken).trim() }
                : null;
    }

    if (shouldSkipTelegramPollingForThisWorker()) {
        logger.info(
            'Telegram bot: long polling skipped on this process (set TELEGRAM_POLL_ALL_WORKERS=1 to force, or use a single backend instance per bot token)'
        );
        return;
    }

    const token = getToken();
    if (!token) {
        logger.info('Telegram bot: no token configured, polling disabled');
        return;
    }

    _adaptivePollMs = POLL_INTERVAL_MS;

    const me = await apiCall('getMe', {});
    if (me && me.ok === true && me.result && me.result.username) {
        const u = String(me.result.username).replace(/^@/, '').trim();
        if (u) _cachedBotUsername = u;
    }
    if (me && me.ok === false) {
        const code = me.error_code;
        const desc = String(me.description || '');
        if (code === 401 || /unauthorized|invalid bot token/i.test(desc)) {
            logger.error('Telegram bot: token invalid (getMe), polling not started', { description: me.description });
            setImmediate(() => {
                try {
                    const { notifyMainAdminsIncident } = require('./mainAdminIncidentNotifier');
                    const { newCorrelationId } = require('./incidentTelegramPolicy');
                    notifyMainAdminsIncident({
                        severity: 'CRITICAL',
                        kind: 'telegram_bot_token_invalid',
                        title: 'Telegram bot: invalid or revoked token',
                        bodyText: [
                            'Long polling was not started because Telegram API rejected the bot token (getMe).',
                            'Check Panel → Telegram bot token, or revoke/regenerate the token with BotFather.',
                            `API: ${desc || 'unauthorized'}`
                        ].join('\n'),
                        correlationId: newCorrelationId(),
                        dedupeKey: 'ma:tg_token_invalid',
                        dedupeWindowMs: 3600000
                    }).catch(() => {});
                } catch (_) {}
            });
            return;
        }
        logger.warn('Telegram getMe non-fatal', { description: me.description, error_code: code });
    }

    const delWh = await apiCall('deleteWebhook', { drop_pending_updates: false });
    if (delWh && delWh.ok === false) {
        logger.warn('Telegram deleteWebhook failed', { description: delWh.description });
    } else {
        logger.info('Telegram bot: webhook cleared (if any) — long polling enabled');
    }

    const brand = await getBrandName().catch(() => 'کایا');
    await apiCall('setMyCommands', {
        commands: [
            { command: 'start', description: 'شروع دستیار کارکنان' },
            { command: 'menu', description: 'منوی تعاملی' },
            { command: 'rates', description: 'نرخ ارز لحظه‌ای' },
            { command: 'inbox', description: 'صندوق پیام‌های خوانده‌نشده' },
            { command: 'status', description: 'وضعیت واتساپ و کانال‌ها' },
            { command: 'team', description: 'همکاران آنلاین' },
            { command: 'me', description: 'حساب من' },
            { command: 'link', description: 'اتصال با کد از پنل' },
            { command: 'unlink', description: 'قطع اتصال' },
            { command: 'help', description: 'راهنما' }
        ]
    });
    await apiCall('setMyDescription', {
        description: `${brand} · دستیار کارکنان — نرخ ارز، صندوق ورودی، وضعیت واتساپ و تیم.`
    }).catch(() => {});
    await apiCall('setMyShortDescription', {
        short_description: `${brand} · دستیار کارکنان CRM`
    }).catch(() => {});

    _pollingActive = true;
    logger.info('Telegram staff assistant polling started', { brand });

    const poll = async () => {
        if (!_pollingActive) return;
        try {
            await pollOnce();
        } catch (err) {
            logger.warn('Telegram polling cycle error', { error: err.message });
        }
        if (_pollingActive) {
            const delay = Math.max(POLL_INTERVAL_MS, _adaptivePollMs || POLL_INTERVAL_MS);
            _pollingTimeout = setTimeout(poll, delay);
        }
    };

    poll();
}

function stopPolling() {
    _pollingActive = false;
    if (_pollingTimeout) {
        clearTimeout(_pollingTimeout);
        _pollingTimeout = null;
    }
    _lastUpdateId = 0;
    logger.info('Telegram bot polling stopped');
}

/**
 * بعد از تغییر توکن در تنظیمات پنل — polling را با توکن تازه از DB دوباره بالا می‌آورد.
 */
async function restartPollingFromPanel(models) {
    const m = models || _appModels;
    stopPolling();
    if (m) _appModels = m;
    const { getPanelSettings, getPanelAlertConfig } = require('./config/panelSettingsLoader');
    const settings = await getPanelSettings();
    const alertCfg = getPanelAlertConfig(settings);
    const tok = (alertCfg.telegramBotToken || '').trim();
    const cfg = tok ? { botToken: tok } : null;
    await startPolling(m, cfg);
}

/**
 * ارسال پیام مستقیم به کاربر CRM از طریق تلگرام
 */
async function sendToUser(userId, text) {
    try {
        const { User } = _appModels || require('../models');
        const user = await User.findByPk(userId, { attributes: ['telegramChatId'] });
        if (!user || !user.telegramChatId) return false;
        const data = await sendReply(String(user.telegramChatId).trim(), text);
        return !!(data && data.ok !== false);
    } catch (_) {
        return false;
    }
}

module.exports = {
    startPolling,
    stopPolling,
    restartPollingFromPanel,
    isConfigured,
    getCachedBotUsername,
    getRatesText,
    sendReply,
    sendToUser,
    setBotConfig,
    setModels
};
