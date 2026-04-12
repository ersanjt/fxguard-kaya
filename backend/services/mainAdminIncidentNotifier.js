/**
 * In-app (Socket.IO) + email alerts for MAIN_ADMIN_EMAIL users on critical incidents.
 * Independent of Telegram configuration and panel "notify all" toggles.
 */
const logger = require('../config/logger');
const { User, PanelSetting } = require('../models');
const emailService = require('./emailService');
const { getPanelEmailConfig } = require('./panelSettingsLoader');
const { MAIN_ADMIN_EMAILS } = require('../lib/permissions');

let _io = null;
const _dedupeAt = new Map();
const DEDUPE_DEFAULT_MS = parseInt(process.env.MAIN_ADMIN_INCIDENT_DEDUPE_MS || '120000', 10);

function setMainAdminIncidentIo(io) {
    _io = io;
}

function shouldSkipDedupe(key, windowMs) {
    if (!key) return false;
    const w = Number.isFinite(Number(windowMs)) ? Math.max(5000, Number(windowMs)) : DEDUPE_DEFAULT_MS;
    const t = Date.now();
    if (_dedupeAt.size > 400) {
        for (const [k, ts] of _dedupeAt) {
            if (t - ts > w * 4) _dedupeAt.delete(k);
        }
    }
    const last = _dedupeAt.get(key);
    if (last != null && t - last < w) return true;
    _dedupeAt.set(key, t);
    return false;
}

async function getMainAdminUsers() {
    if (!MAIN_ADMIN_EMAILS.length) return [];
    const emailSet = new Set(MAIN_ADMIN_EMAILS.map(e => String(e).trim().toLowerCase()).filter(Boolean));
    const users = await User.findAll({
        where: { isActive: true },
        attributes: ['id', 'email', 'name']
    });
    return users.filter(u => u.email && emailSet.has(String(u.email).trim().toLowerCase()));
}

/**
 * @param {object} opts
 * @param {string} opts.severity
 * @param {string} opts.kind
 * @param {string} opts.title
 * @param {string} opts.bodyText
 * @param {string} [opts.correlationId]
 * @param {string} [opts.dedupeKey]
 * @param {number} [opts.dedupeWindowMs]
 */
async function notifyMainAdminsIncident(opts = {}) {
    const {
        severity = 'CRITICAL',
        kind = 'incident',
        title = 'System incident',
        bodyText = '',
        correlationId = null,
        dedupeKey = null,
        dedupeWindowMs = null
    } = opts;

    const dk = dedupeKey || `ma:${kind}:${String(title).slice(0, 80)}`;
    if (shouldSkipDedupe(dk, dedupeWindowMs)) {
        return { ok: false, skipped: true, reason: 'deduped' };
    }

    const users = await getMainAdminUsers();
    if (users.length === 0) {
        return { ok: false, skipped: true, reason: 'no_main_admin_users' };
    }

    let settings;
    try {
        settings = await PanelSetting.findByPk('default');
    } catch (e) {
        logger.warn('mainAdminIncident: panel settings load failed', { error: e.message });
    }
    const emailConfig = settings ? getPanelEmailConfig(settings) : null;

    const esc = emailService.escHtml;
    const subj = `[${severity}] Kaya CRM — ${String(title).slice(0, 160)}`;
    const corrLine = correlationId ? `<p><strong>Correlation:</strong> ${esc(correlationId)}</p>` : '';
    const htmlBody = `<p>${esc(String(bodyText || '')).replace(/\n/g, '<br>')}</p>${corrLine}`;
    const html = emailService.baseHtml(subj, htmlBody);

    const payload = {
        severity,
        kind,
        title: String(title).slice(0, 400),
        body: String(bodyText || '').slice(0, 8000),
        correlationId,
        ts: new Date().toISOString()
    };

    for (const u of users) {
        if (u.email) {
            try {
                const mailOpts = {
                    to: u.email,
                    subject: subj,
                    text: [bodyText, correlationId ? `Correlation: ${correlationId}` : ''].filter(Boolean).join('\n'),
                    html
                };
                if (emailConfig && emailConfig.host) {
                    await emailService.sendMailWithConfig(emailConfig, mailOpts);
                } else {
                    await emailService.sendMailWithRetry(mailOpts);
                }
            } catch (err) {
                logger.warn('mainAdminIncident: email failed', { userId: u.id, error: err.message });
            }
        }
        if (_io) {
            try {
                _io.to(`user_${u.id}`).emit('main_admin_critical_alert', payload);
            } catch (err) {
                logger.warn('mainAdminIncident: socket emit failed', { userId: u.id, error: err.message });
            }
        }
    }

    return { ok: true, recipients: users.map(u => u.id) };
}

module.exports = {
    setMainAdminIncidentIo,
    notifyMainAdminsIncident,
    getMainAdminUsers
};
