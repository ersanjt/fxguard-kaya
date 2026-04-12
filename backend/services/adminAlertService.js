const emailService = require('./emailService');
const telegramService = require('./telegramService');
const logger = require('../config/logger');
const { getPanelSettings, getPanelAlertConfig } = require('./config/panelSettingsLoader');
const {
    formatSystemIncident,
    redactPayload,
    shouldTelegramLoginFailure,
    shouldTelegramFrontendErrorBurst,
    shouldTelegramBackendError
} = require('./incidentTelegramPolicy');

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
    if (eventType === 'login_success') return `Security alert: user sign-in — ${title}`;
    if (eventType === 'login_failed') return `Security alert: failed sign-in — ${title}`;
    if (eventType === 'logout') return `Security alert: user sign-out — ${title}`;
    if (eventType === 'frontend_error') return `Client error report — ${title}`;
    if (eventType === 'backend_error') return `Server error report — ${title}`;
    return `Security alert — ${title}`;
}

function buildBody(eventType, data) {
    const ip = data.ip || '—';
    const country = data.country || '—';
    const userAgent = (data.userAgent || '—').toString().slice(0, 200);
    const userLabel = data.userEmail || data.username || data.identifier || '—';
    const action =
        eventType === 'login_success'
            ? 'Successful sign-in'
            : eventType === 'login_failed'
              ? 'Failed sign-in'
              : eventType === 'logout'
                ? 'Sign-out'
                : eventType === 'frontend_error'
                  ? 'Frontend error'
                  : eventType === 'backend_error'
                    ? 'Backend error'
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
            'System security alert',
            `<p><strong>Event:</strong> ${action}</p>
             <p><strong>Time:</strong> ${fmtNow()}</p>
             <p><strong>User:</strong> ${userLabel}</p>
             <p><strong>Path / page:</strong> ${requestPath}</p>
             <p><strong>Error message:</strong> ${errorMessage}</p>
             <p><strong>IP:</strong> ${ip}</p>
             <p><strong>Country:</strong> ${country}</p>
             <p><strong>Browser / device:</strong> ${userAgent}</p>`
        ),
        tgLegacy: [
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

function buildTelegramIncidentText(eventType, data, opts = {}) {
    const ip = (data.ip || '—').toString().split(',')[0].trim();
    const path = (data.path || data.pageUrl || '—').toString().slice(0, 400);
    const safeData = redactPayload({
        userEmail: data.userEmail || null,
        username: data.username || null,
        identifier: data.identifier || null,
        path,
        ip,
        userAgent: (data.userAgent || '').toString().slice(0, 160)
    });

    if (eventType === 'login_success' || eventType === 'logout') {
        return null;
    }

    if (eventType === 'login_failed' && opts.authTelegram === false) {
        return null;
    }

    if (eventType === 'login_failed') {
        const gate = shouldTelegramLoginFailure(ip);
        if (!gate.send) return null;
        return formatSystemIncident(
            'WARNING',
            'Failed login burst (threshold)',
            `Repeated failed portal sign-ins from one IP (count ${gate.count} in window).`,
            'Possible brute-force or misconfigured client.',
            `${gate.count} failures (rolling window)`,
            safeData,
            'Review auth logs; consider IP controls or captcha.',
            null
        );
    }

    if (eventType === 'frontend_error') {
        const gate = shouldTelegramFrontendErrorBurst();
        if (!gate.send) return null;
        return formatSystemIncident(
            'WARNING',
            'Frontend error burst',
            'Many client-side error reports in a short interval.',
            'Users may hit broken UI or API mismatch.',
            `${gate.count} reports in window`,
            safeData,
            'Check recent deploy, API version, and browser console.',
            null
        );
    }

    if (eventType === 'backend_error') {
        const msg = String(data.errorMessage || data.message || '').slice(0, 2000);
        const gate = shouldTelegramBackendError(msg);
        if (!gate.send) return null;
        const severity = gate.burst ? 'CRITICAL' : 'WARNING';
        const errSnippet = msg.split('\n')[0].slice(0, 280);
        return formatSystemIncident(
            severity,
            gate.burst ? 'Backend error burst' : 'Backend error (deduped)',
            gate.burst ? 'Same failure signature repeated quickly.' : 'Repeated server error signature.',
            'API users may see 5xx or failed operations.',
            gate.burst ? `${gate.count} hits in window` : 'One alert per cooldown per signature',
            { ...safeData, error: errSnippet },
            'Inspect stack trace in logs; verify DB/Redis/gateway.',
            null
        );
    }

    return null;
}

async function sendAdminSecurityAlert(eventType, data = {}, options = {}) {
    const alertConfig = await resolveAlertConfig(options);
    const panelSettings = options.settings || (await getPanelSettings());
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
            const authTelegram = panelSettings.telegramNotifyAuthEvents !== false;
            const tgText = buildTelegramIncidentText(eventType, data, { authTelegram });
            if (tgText) {
                const pathStr = String(data.path || '');
                const isProcessFatal =
                    pathStr.includes('uncaughtException') || pathStr.includes('unhandledRejection');
                const errorsMuted = alertConfig.telegramNotifyErrorEvents === false;
                if (errorsMuted && (eventType === 'frontend_error' || (eventType === 'backend_error' && !isProcessFatal))) {
                    /* panel disabled routine error TG */
                } else {
                    const r = await telegramService.sendMessage(tgText, tgConfig, { parse_mode: null });
                    telegramOk = !!r.ok;
                }
            }
        } catch (err) {
            logger.warn('Admin alert telegram failed', { error: err.message || String(err) });
        }
    }

    return { ok: emailOk || telegramOk, emailOk, telegramOk };
}

module.exports = {
    sendAdminSecurityAlert
};
