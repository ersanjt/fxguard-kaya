/**
 * اعلان چرخهٔ عمر کاربر به ایمیل / واتساپ / تلگرام
 */
const crypto = require('crypto');
const logger = require('../config/logger');
const { PasswordResetToken, Branch, Department, User } = require('../models');
const { logActivity } = require('./activityLog');
const {
    ROLE_LABELS_FA,
    snapshotUser,
    computeLifecycleChanges,
    formatChangesText,
    normalizeStaffPhone,
} = require('./staffLifecycleDiff');

const RESET_TOKEN_EXPIRY_MINUTES = 48 * 60;

function panelUrl() {
    try {
        const { PANEL_URL } = require('./emailService');
        return PANEL_URL || process.env.PANEL_URL || process.env.BACKEND_PUBLIC_URL || '';
    } catch (_) {
        return process.env.PANEL_URL || process.env.BACKEND_PUBLIC_URL || '';
    }
}

async function resolveNames(departmentId, branchId) {
    const out = { departmentName: null, branchName: null };
    try {
        if (departmentId) {
            const d = await Department.findByPk(departmentId, { attributes: ['name'] });
            out.departmentName = d ? d.name : null;
        }
        if (branchId) {
            const b = await Branch.findByPk(branchId, { attributes: ['name'] });
            out.branchName = b ? b.name : null;
        }
    } catch (_) {}
    return out;
}

async function createPasswordSetLink(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
    await PasswordResetToken.destroy({ where: { userId } });
    await PasswordResetToken.create({ userId, token, expiresAt });
    const base = panelUrl().replace(/\/$/, '');
    return {
        token,
        url: `${base}?reset=1&token=${encodeURIComponent(token)}`,
        expiresHours: Math.round(RESET_TOKEN_EXPIRY_MINUTES / 60),
    };
}

async function loadPrefs(userId) {
    try {
        const { getOrCreatePreference } = require('./notificationService');
        return await getOrCreatePreference(userId);
    } catch (_) {
        return {
            accountLifecycleEmailEnabled: true,
            accountLifecycleWhatsappEnabled: true,
            accountLifecycleTelegramEnabled: true,
        };
    }
}

async function deliverChannels({ user, event, title, bodyText, plainPassword, passwordLink, actorName, siteName }) {
    const prefs = await loadPrefs(user.id);
    const results = { email: null, whatsapp: null, telegram: null };
    const portal = panelUrl();

    if (prefs.accountLifecycleEmailEnabled !== false && user.email) {
        try {
            const emailService = require('./emailService');
            const { getPanelSettings, getPanelEmailConfig } = require('./panelSettingsLoader');
            const settings = await getPanelSettings();
            const emailConfig = getPanelEmailConfig(settings);
            const brand = siteName || (settings && settings.siteName) || 'پورتال کارکنان';
            if (event === 'account_created') {
                results.email = await emailService.sendWelcomeCredentials(
                    user,
                    plainPassword || '—',
                    brand,
                    emailConfig,
                    { passwordLinkUrl: passwordLink && passwordLink.url, guideExtra: true }
                );
            } else {
                results.email = await emailService.sendAccountLifecycleEmail(
                    user,
                    {
                        title,
                        bodyText,
                        passwordLinkUrl: passwordLink && passwordLink.url,
                        actorName,
                        siteName: brand,
                    },
                    emailConfig
                );
            }
        } catch (err) {
            results.email = false;
            logger.warn('staffLifecycle email failed', { userId: user.id, event, error: err.message });
        }
    }

    const phone = normalizeStaffPhone(user.phone);
    if (prefs.accountLifecycleWhatsappEnabled !== false && phone) {
        try {
            const { sendWhatsAppMessage } = require('../lib/gatewayClient');
            const lines = [
                title,
                '',
                bodyText,
                '',
                portal ? `ورود به پنل:\n${portal}` : '',
                passwordLink && passwordLink.url
                    ? `\nتنظیم / بازنشانی رمز (لینک امن):\n${passwordLink.url}`
                    : '',
                '\nاین پیام خودکار از سیستم مدیریت کارکنان است.',
            ].filter(Boolean);
            await sendWhatsAppMessage({ to: phone, message: lines.join('\n') }, { timeout: 45000 });
            results.whatsapp = true;
        } catch (err) {
            results.whatsapp = false;
            logger.warn('staffLifecycle whatsapp failed', { userId: user.id, event, error: err.message });
        }
    }

    if (prefs.accountLifecycleTelegramEnabled !== false && user.telegramChatId) {
        try {
            const telegramBotService = require('./telegramBotService');
            const tgText = [
                title,
                '',
                bodyText,
                portal ? `\nپنل: ${portal}` : '',
                passwordLink && passwordLink.url ? `\nرمز: ${passwordLink.url}` : '',
            ]
                .filter(Boolean)
                .join('\n');
            results.telegram = await telegramBotService.sendToUser(user.id, tgText);
        } catch (err) {
            results.telegram = false;
            logger.warn('staffLifecycle telegram failed', { userId: user.id, event, error: err.message });
        }
    }

    logger.info('staffLifecycle delivery', {
        event,
        userId: user.id,
        email: results.email,
        whatsapp: results.whatsapp,
        telegram: results.telegram,
    });

    try {
        await logActivity({
            userId: user.id,
            action: 'staff_lifecycle_notified',
            entityType: 'user',
            entityId: user.id,
            summary: title,
            metadata: { event, channels: results },
        });
    } catch (_) {}

    return results;
}

async function notifyAccountCreated(user, { plainPassword, actor, siteName } = {}) {
    if (!user || !user.id) return null;
    let passwordLink = null;
    try {
        passwordLink = await createPasswordSetLink(user.id);
    } catch (err) {
        logger.warn('createPasswordSetLink failed', { error: err.message });
    }
    const actorName = (actor && (actor.name || actor.email)) || 'مدیر سیستم';
    const roleLabel = ROLE_LABELS_FA[user.role] || user.role || 'کارشناس';
    const title = 'حساب کاربری شما ایجاد شد';
    const bodyText = [
        `سلام ${user.name || ''}،`,
        `حساب شما در پورتال کارکنان ایجاد شد.`,
        `نقش: ${roleLabel}`,
        `ایمیل ورود: ${user.email || '—'}`,
        `توسط: ${actorName}`,
        '',
        'راهنمای شروع:',
        '۱) وارد پنل شوید',
        '۲) رمز را از لینک امن یا پروفایل تغییر دهید',
        '۳) در پروفایل، ربات تلگرام را متصل کنید',
        '۴) مکالمات، مشتریان و تیکت‌ها را بررسی کنید',
    ].join('\n');

    const fresh = await User.findByPk(user.id).catch(() => user);
    return deliverChannels({
        user: fresh || user,
        event: 'account_created',
        title,
        bodyText,
        plainPassword,
        passwordLink,
        actorName,
        siteName,
    });
}

async function notifyAccountUpdated(beforeSnap, afterUser, { actor, passwordChanged, siteName } = {}) {
    if (!afterUser || !beforeSnap) return null;
    const names = await resolveNames(afterUser.departmentId, afterUser.branchId);
    const afterSnap = snapshotUser(afterUser, names);
    if (!beforeSnap.branchName && beforeSnap.branchId) {
        const n = await resolveNames(beforeSnap.departmentId, beforeSnap.branchId);
        beforeSnap.branchName = beforeSnap.branchName || n.branchName;
        beforeSnap.departmentName = beforeSnap.departmentName || n.departmentName;
    }
    const changes = computeLifecycleChanges(beforeSnap, afterSnap, { passwordChanged });
    if (!changes.length) return null;

    let passwordLink = null;
    if (passwordChanged) {
        try {
            passwordLink = await createPasswordSetLink(afterUser.id);
        } catch (_) {}
    }

    const actorName = (actor && (actor.name || actor.email)) || 'مدیر سیستم';
    const title = 'به‌روزرسانی حساب کاربری شما';
    const bodyText = [
        `سلام ${afterUser.name || ''}،`,
        'تغییراتی در حساب شما اعمال شد:',
        '',
        formatChangesText(changes),
        '',
        `توسط: ${actorName}`,
    ].join('\n');

    const fresh = await User.findByPk(afterUser.id).catch(() => afterUser);
    return deliverChannels({
        user: fresh || afterUser,
        event: 'account_updated',
        title,
        bodyText,
        passwordLink,
        actorName,
        siteName,
    });
}

module.exports = {
    snapshotUser,
    resolveNames,
    computeLifecycleChanges,
    formatChangesText,
    createPasswordSetLink,
    normalizeStaffPhone,
    notifyAccountCreated,
    notifyAccountUpdated,
    ROLE_LABELS_FA,
};
