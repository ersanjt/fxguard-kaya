const emailService = require('./emailService');
const telegramService = require('./telegramService');
const logger = require('../config/logger');
const { getPanelSettings, getPanelAlertConfig } = require('./config/panelSettingsLoader');

async function resolveAlertConfig(options = {}) {
    if (options.alertConfig) return options.alertConfig;
    if (options.settings) return getPanelAlertConfig(options.settings);
    const settings = await getPanelSettings();
    return getPanelAlertConfig(settings);
}

function fmtNow() {
    return new Date().toISOString();
}

function buildSubject(eventType, siteName) {
    const title = siteName || 'Kaya CRM';
    if (eventType === 'login_success') return `اعلان امنیتی: ورود کاربر - ${title}`;
    if (eventType === 'login_failed') return `اعلان امنیتی: ورود ناموفق - ${title}`;
    if (eventType === 'logout') return `اعلان امنیتی: خروج کاربر - ${title}`;
    if (eventType === 'frontend_error') return `اعلان خطای فرانت‌اند - ${title}`;
    if (eventType === 'backend_error') return `اعلان خطای بک‌اند - ${title}`;
    return `اعلان امنیتی سیستم - ${title}`;
}

function buildBody(eventType, data) {
    const ip = data.ip || '—';
    const country = data.country || '—';
    const userAgent = (data.userAgent || '—').toString().slice(0, 200);
    const userLabel = data.userEmail || data.username || data.identifier || '—';
    const action =
        eventType === 'login_success'
            ? 'ورود موفق'
            : eventType === 'login_failed'
              ? 'ورود ناموفق'
              : eventType === 'logout'
                ? 'خروج'
                : eventType === 'frontend_error'
                  ? 'خطای فرانت‌اند'
                  : eventType === 'backend_error'
                    ? 'خطای بک‌اند'
                : eventType;
    const errorMessage = data.errorMessage || data.message || '—';
    const requestPath = data.path || data.pageUrl || '—';

    return {
        text: [
            `Security alert: ${action}`,
            `Time: ${fmtNow()}`,
            `User: ${userLabel}`,
            `Path/Page: ${requestPath}`,
            `Error: ${errorMessage}`,
            `IP: ${ip}`,
            `Country: ${country}`,
            `Agent: ${userAgent}`
        ].join('\n'),
        html: emailService.baseHtml(
            'اعلان امنیتی سیستم',
            `<p><strong>رویداد:</strong> ${action}</p>
             <p><strong>زمان:</strong> ${fmtNow()}</p>
             <p><strong>کاربر:</strong> ${userLabel}</p>
             <p><strong>مسیر/صفحه:</strong> ${requestPath}</p>
             <p><strong>متن خطا:</strong> ${errorMessage}</p>
             <p><strong>IP:</strong> ${ip}</p>
             <p><strong>کشور:</strong> ${country}</p>
             <p><strong>مرورگر/دستگاه:</strong> ${userAgent}</p>`
        ),
        tg: [
            '🚨 Security Alert',
            `Event: ${action}`,
            `Time: ${fmtNow()}`,
            `User: ${userLabel}`,
            `Path/Page: ${requestPath}`,
            `Error: ${errorMessage}`,
            `IP: ${ip}`,
            `Country: ${country}`
        ].join('\n')
    };
}

async function sendAdminSecurityAlert(eventType, data = {}, options = {}) {
    const alertConfig = await resolveAlertConfig(options);
    if (!alertConfig.adminAlertsEnabled) return { ok: false, skipped: true, reason: 'alerts_disabled' };
    const isErrorEvent = eventType === 'frontend_error' || eventType === 'backend_error';
    if (isErrorEvent && alertConfig.clientErrorReportingEnabled === false) {
        return { ok: false, skipped: true, reason: 'error_reporting_disabled' };
    }

    const body = buildBody(eventType, data);
    const subject = buildSubject(eventType, options.siteName);
    const adminEmails = Array.isArray(alertConfig.adminAlertEmails) ? alertConfig.adminAlertEmails : [];

    let emailOk = false;
    if (adminEmails.length > 0) {
        try {
            if (options.emailConfig && options.emailConfig.host) {
                const r = await emailService.sendMailWithConfigDetailed(options.emailConfig, {
                    to: adminEmails,
                    subject,
                    text: body.text,
                    html: body.html
                });
                emailOk = !!r.ok;
            } else {
                const r = await emailService.sendMailWithRetry({
                    to: adminEmails,
                    subject,
                    text: body.text,
                    html: body.html
                });
                emailOk = !!r.ok;
            }
        } catch (err) {
            logger.warn('Admin alert email failed', { error: err.message || String(err) });
        }
    }

    let telegramOk = false;
    const tgConfig = {
        botToken: alertConfig.telegramBotToken,
        chatIds: alertConfig.telegramChatIds,
        timeoutMs: alertConfig.telegramTimeoutMs
    };
    if (telegramService.isEnabled(tgConfig)) {
        try {
            const r = await telegramService.sendMessage(body.tg, tgConfig);
            telegramOk = !!r.ok;
        } catch (err) {
            logger.warn('Admin alert telegram failed', { error: err.message || String(err) });
        }
    }

    return { ok: emailOk || telegramOk, emailOk, telegramOk };
}

module.exports = {
    sendAdminSecurityAlert
};
