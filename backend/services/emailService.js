/**
 * سرویس ایمیل پنل — ارسال ایمیل خوش‌آمدگویی، اعلان ورود، بازیابی رمز
 * تنظیمات از متغیرهای محیط: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, EMAIL_LOGIN_NOTIFICATION
 * ✓ ارسال مجدد خودکار در صورت خطا
 * ✓ اعتبارسنجی آدرس ایمیل
 * ✓ سرصحت‌های انطباق مع (Compliance, Unsubscribe)
 * ✓ محدودیت میزان ارسال
 */

const logger = require('../config/logger');

const FROM_NAME = process.env.SMTP_FROM_NAME || 'Kaya CRM';
const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@localhost';
const LOGIN_NOTIFICATION_ENABLED = process.env.EMAIL_LOGIN_NOTIFICATION === 'true' || process.env.EMAIL_LOGIN_NOTIFICATION === '1';
const PANEL_URL =
    process.env.BACKEND_PUBLIC_URL || process.env.PANEL_URL || process.env.FRONTEND_URL || 'http://localhost:3002';
const MAX_RETRIES = parseInt(process.env.EMAIL_MAX_RETRIES || '3', 10);
const RETRY_DELAY_MS = parseInt(process.env.EMAIL_RETRY_DELAY_MS || '2000', 10);
const RATE_LIMIT_REQUESTS = parseInt(process.env.EMAIL_RATE_LIMIT_REQUESTS || '100', 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.EMAIL_RATE_LIMIT_WINDOW_MS || '3600000', 10); // 1 hour
// زمان‌انتظار اتصال SMTP (میلی‌ثانیه) — در صورت timeout افزایش دهید
const CONNECTION_TIMEOUT_MS = parseInt(process.env.EMAIL_CONNECTION_TIMEOUT_MS || '25000', 10);
const GREETING_TIMEOUT_MS = parseInt(process.env.EMAIL_GREETING_TIMEOUT_MS || '15000', 10);
const SOCKET_TIMEOUT_MS = parseInt(process.env.EMAIL_SOCKET_TIMEOUT_MS || '25000', 10);

const emailStats = { count: 0, resetAt: Date.now() };

function parseFallbackHosts(raw) {
    return String(raw || '')
        .split(',')
        .map(h => h.trim().toLowerCase())
        .filter(Boolean);
}

function isEnabled() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    return !!(host && port);
}

/**
 * اعتبارسنجی ساده ایمیل
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * بررسی محدودیت میزان ارسال
 */
function checkRateLimit() {
    const now = Date.now();
    if (now - emailStats.resetAt > RATE_LIMIT_WINDOW_MS) {
        emailStats.count = 0;
        emailStats.resetAt = now;
    }
    if (emailStats.count >= RATE_LIMIT_REQUESTS) {
        logger.warn('Email rate limit exceeded', { count: emailStats.count, limit: RATE_LIMIT_REQUESTS });
        return false;
    }
    emailStats.count++;
    return true;
}

function getEnvEmailConfig() {
    if (!isEnabled()) return null;
    const host = normalizeHost(process.env.SMTP_HOST || '');
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    const secure = process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1' || port === 465;
    return {
        host,
        port,
        user: process.env.SMTP_USER || null,
        pass: process.env.SMTP_PASS || null,
        from: process.env.SMTP_FROM || process.env.SMTP_USER || null,
        fromName: process.env.SMTP_FROM_NAME || FROM_NAME || null,
        secure,
        allowSelfSigned: parseFallbackHosts(process.env.SMTP_ALLOW_SELF_SIGNED_HOSTS || '').some(h => host.includes(h) || host === h),
        fallbackHosts: parseFallbackHosts(process.env.SMTP_FALLBACK_HOSTS || '')
    };
}

function isRetryableError(err) {
    const msg = (err && err.message ? err.message : '').toLowerCase();
    return err.code === 'ECONNREFUSED' ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'EHOSTUNREACH' ||
        err.code === 'ECONNECTION' ||
        msg.includes('smtp') ||
        msg.includes('timeout') ||
        msg.includes('connection');
}

function getCandidateHosts(config) {
    const baseHost = normalizeHost(config.host);
    const envFallback = parseFallbackHosts(process.env.SMTP_FALLBACK_HOSTS || '');
    const cfgFallback = Array.isArray(config.fallbackHosts)
        ? config.fallbackHosts.map(h => normalizeHost(h)).filter(Boolean)
        : [];
    const out = [baseHost];
    for (const h of [...cfgFallback, ...envFallback]) {
        if (!h) continue;
        if (!out.includes(h)) out.push(h);
    }
    return out;
}

function buildMailOpts(config, { to, subject, text, html, attachments = [] }) {
    const emails = Array.isArray(to) ? to : [to];
    const fromAddr = (config.from || config.user || FROM_EMAIL || 'noreply@localhost').trim();
    const from = config.fromName ? `"${config.fromName}" <${fromAddr}>` : fromAddr;
    const unsubscribeUrl = `${PANEL_URL}?unsubscribe=1`;
    return {
        from,
        to: emails.join(', '),
        subject: subject || '(no subject)',
        text: text || '',
        html: html || (text ? text.replace(/\n/g, '<br>') : ''),
        attachments: attachments || [],
        headers: {
            'X-Mailer': 'fxguard-kaya',
            'Reply-To': fromAddr,
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'X-Priority': '3',
            'X-MSMail-Priority': 'Normal',
            'Precedence': 'bulk'
        }
    };
}

function getFrom() {
    return FROM_NAME ? `"${FROM_NAME}" <${FROM_EMAIL}>` : FROM_EMAIL;
}

/**
 * ارسال ایمیل با منطق تکرار خودکار
 * @returns {Promise<{ok: boolean, error?: string, retries?: number}>}
 */
async function sendMailWithRetry({ to, subject, text, html, attachments = [] }, attempt = 1) {
    const envConfig = getEnvEmailConfig();
    if (!envConfig) {
        logger.warn('Email service disabled: SMTP not configured');
        return { ok: false, error: 'SMTP not configured' };
    }
    return sendMailWithConfigDetailed(envConfig, { to, subject, text, html, attachments }, attempt);
}

/**
 * ارسال ایمیل ساده — در صورت خطا false برمی‌گرداند
 * @deprecated استفاده از sendMailWithRetry توصیه می‌شود
 */
async function sendMail({ to, subject, text, html }) {
    const result = await sendMailWithRetry({ to, subject, text, html });
    return result.ok;
}

/**
 * ارسال ایمیل با تنظیمات SMTP دلخواه (مثلاً از تنظیمات پنل)
 * config: { host, port, user, pass, from?, fromName?, secure? }
 * @returns {Promise<boolean>} true اگر موفق، false اگر ناموفق
 */
async function sendMailWithConfig(config, { to, subject, text, html, attachments = [] }) {
    const r = await sendMailWithConfigDetailed(config, { to, subject, text, html, attachments });
    return r.ok;
}

/**
 * ارسال ایمیل با برگرداندن خطای دقیق (برای تست و عیب‌یابی)
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
function normalizeHost(host) {
    if (!host || typeof host !== 'string') return host;
    return host.replace(/\.+$/, '').trim();
}

/** Integer > 0 from env or caller; otherwise `fallback` (avoids NaN in nodemailer timeouts). */
function parsePositiveInt(val, fallback) {
    const n = parseInt(String(val), 10);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return n;
}

async function sendMailWithConfigDetailed(config, { to, subject, text, html, attachments = [] }, attempt = 1, deliveryOpts = null) {
    if (!config || !config.host || !config.port) {
        return { ok: false, error: 'SMTP host and port are required' };
    }

    if (!checkRateLimit()) {
        return { ok: false, error: 'Rate limit exceeded' };
    }

    // اعتبارسنجی ایمیل‌ها
    const emails = Array.isArray(to) ? to : [to];
    for (const email of emails) {
        if (!isValidEmail(email)) {
            logger.warn('Invalid email address', { email });
            return { ok: false, error: `Invalid email: ${email}` };
        }
    }

    const effMaxRetries = deliveryOpts && deliveryOpts.maxRetries != null
        ? Math.max(1, parsePositiveInt(deliveryOpts.maxRetries, MAX_RETRIES))
        : MAX_RETRIES;
    const connTimeoutMs = deliveryOpts && deliveryOpts.connectionTimeoutMs != null
        ? parsePositiveInt(deliveryOpts.connectionTimeoutMs, CONNECTION_TIMEOUT_MS)
        : CONNECTION_TIMEOUT_MS;
    const greetTimeoutMs = deliveryOpts && deliveryOpts.greetingTimeoutMs != null
        ? parsePositiveInt(deliveryOpts.greetingTimeoutMs, GREETING_TIMEOUT_MS)
        : GREETING_TIMEOUT_MS;
    const sockTimeoutMs = deliveryOpts && deliveryOpts.socketTimeoutMs != null
        ? parsePositiveInt(deliveryOpts.socketTimeoutMs, SOCKET_TIMEOUT_MS)
        : SOCKET_TIMEOUT_MS;

    const nodemailer_local = require('nodemailer');
    const basePort = parseInt(config.port, 10) || 587;
    const baseSecure = !!config.secure;
    const mailOpts = buildMailOpts(config, { to, subject, text, html, attachments });
    const hostCandidates = getCandidateHosts(config);
    let lastError = null;

    // If SSL/TLS mismatch happens (wrong version number), try alternate port/secure combos.
    // This addresses errors like: "ssl3_get_record:wrong version number".
    const connectionCandidates = deliveryOpts && deliveryOpts.singleConnectionCandidate
        ? [{ port: basePort, secure: baseSecure }]
        : (() => {
            if (basePort === 587) {
                return [
                    { port: 587, secure: false },
                    { port: 465, secure: true },
                    { port: 587, secure: true }
                ];
            }
            if (basePort === 465) {
                return [
                    { port: 465, secure: true },
                    { port: 587, secure: false },
                    { port: 465, secure: false }
                ];
            }
            return [{ port: basePort, secure: baseSecure }];
        })();

    for (const host of hostCandidates) {
        for (const conn of connectionCandidates) {
            const trySecure = !!conn.secure;
            const tryPort = parseInt(conn.port, 10) || basePort;

            for (let i = Math.max(1, attempt); i <= effMaxRetries; i++) {
                try {
                    const opts = {
                        host,
                        port: tryPort,
                        secure: trySecure,
                        auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
                        connectionTimeout: connTimeoutMs,
                        greetingTimeout: greetTimeoutMs,
                        socketTimeout: sockTimeoutMs
                    };
                    if (tryPort === 587 && !trySecure) opts.requireTLS = true;
                    if (config.allowSelfSigned) opts.tls = { rejectUnauthorized: false };

                    const transport = nodemailer_local.createTransport(opts);
                    await transport.sendMail(mailOpts);
                    logger.info('Email sent successfully (custom config)', {
                        to: emails.join(', '),
                        host,
                        port: tryPort,
                        secure: trySecure
                    });
                    return { ok: true, usedHost: host };
                } catch (err) {
                    lastError = err;
                    const retryable = isRetryableError(err);
                    if (retryable && i < effMaxRetries) {
                        const delay = RETRY_DELAY_MS * i;
                        logger.warn('Email send failed (custom config), retrying', {
                            attempt: i,
                            maxRetries: effMaxRetries,
                            delay,
                            host,
                            port: tryPort,
                            secure: trySecure,
                            error: err.message
                        });
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }

                    // Try next connection candidate (e.g. switch 587<->465 or secure flag)
                    break;
                }
            }
        }
    }

    let msg = (lastError && (lastError.message || String(lastError))) || 'Email send failed';
    if (lastError && lastError.response) msg += ' — ' + (typeof lastError.response === 'string' ? lastError.response : JSON.stringify(lastError.response));
    logger.error('Email send error (custom config)', { error: msg });
    return { ok: false, error: msg };
}

/** Shared HTML layout for outbound mail (English, LTR). */
function baseHtml(title, body, opts = {}) {
    const accentColor = opts.accentColor || '#059669';
    const accentDark  = opts.accentDark  || '#047857';
    const siteName    = opts.siteName    || FROM_NAME || 'Staff Portal';
    const logoUrl     = opts.logoUrl     || '';
    const footerText  = opts.footerText  || `This email was sent automatically by <strong>${siteName}</strong>.`;
    const unsubUrl    = `${PANEL_URL}?unsubscribe=1`;
    const dir         = opts.dir || 'ltr';
    const lang        = opts.lang || 'en';

    return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Ubuntu,Cantarell,Helvetica,Arial,sans-serif;background:#f0f2f5;color:#1a1a2e;line-height:1.7;-webkit-font-smoothing:antialiased}
    .wrapper{width:100%;background:#f0f2f5;padding:32px 16px}
    .container{max-width:580px;margin:0 auto}
    .brand-bar{background:linear-gradient(135deg,${accentColor} 0%,${accentDark} 100%);border-radius:16px 16px 0 0;padding:24px 32px;display:flex;align-items:center;gap:12px}
    .brand-bar img{height:40px;width:auto;border-radius:6px}
    .brand-name{color:#fff;font-size:1.15rem;font-weight:700;letter-spacing:.3px}
    .card{background:#fff;border-radius:0 0 16px 16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)}
    .card-header{background:linear-gradient(135deg,${accentColor}18 0%,${accentColor}08 100%);border-bottom:2px solid ${accentColor}22;padding:24px 32px}
    .card-header h1{font-size:1.2rem;font-weight:700;color:${accentDark};line-height:1.4}
    .card-body{padding:28px 32px}
    .card-body p{margin-bottom:14px;font-size:.97rem;color:#2d3748}
    .divider{border:none;border-top:1px solid #e8ecf0;margin:20px 0}
    .info-box{background:#f8fafb;border:1px solid #e2e8f0;border-left:4px solid ${accentColor};border-radius:10px;padding:16px 20px;margin:18px 0}
    .info-box .label{font-size:.82rem;color:#718096;margin-bottom:3px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    .info-box .value{font-size:1rem;color:#1a202c;font-weight:600;word-break:break-all}
    .cred-box{background:#1a202c;border-radius:10px;padding:16px 20px;margin:18px 0;direction:ltr;text-align:left}
    .cred-box .cred-label{color:#68d391;font-size:.78rem;font-weight:600;margin-bottom:4px;letter-spacing:.5px;text-transform:uppercase}
    .cred-box .cred-value{color:#f0fff4;font-size:1.05rem;font-weight:700;font-family:'Courier New',monospace;word-break:break-all}
    .feature-grid{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0}
    .feature-item{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;flex:1;min-width:140px;font-size:.88rem;color:#166534;font-weight:600}
    .feature-item .icon{font-size:1.2rem;margin-bottom:4px;display:block}
    .btn{display:inline-block;padding:13px 28px;background:linear-gradient(135deg,${accentColor},${accentDark});color:#fff !important;text-decoration:none !important;border-radius:10px;font-weight:700;font-size:.97rem;margin-top:8px;box-shadow:0 4px 12px ${accentColor}44;letter-spacing:.2px}
    .btn-outline{display:inline-block;padding:11px 24px;background:transparent;color:${accentColor} !important;text-decoration:none !important;border:2px solid ${accentColor};border-radius:10px;font-weight:700;font-size:.9rem;margin-top:8px;margin-right:8px}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:.8rem;font-weight:700}
    .badge-green{background:#d1fae5;color:#065f46}
    .badge-blue{background:#dbeafe;color:#1e40af}
    .badge-red{background:#fee2e2;color:#991b1b}
    .badge-yellow{background:#fef3c7;color:#92400e}
    .alert-box{border-radius:10px;padding:14px 18px;margin:16px 0;display:flex;align-items:flex-start;gap:12px}
    .alert-info{background:#eff6ff;border:1px solid #bfdbfe}
    .alert-warn{background:#fffbeb;border:1px solid #fde68a}
    .alert-icon{font-size:1.3rem;flex-shrink:0;margin-top:1px}
    .alert-text{font-size:.92rem;color:#374151;line-height:1.5}
    .muted{color:#718096;font-size:.88rem}
    .text-center{text-align:center}
    .mt-4{margin-top:16px}
    .card-footer{background:#f8fafb;border-top:1px solid #e8ecf0;padding:18px 32px;text-align:center}
    .card-footer p{font-size:.82rem;color:#a0aec0;line-height:1.6}
    .card-footer a{color:${accentColor};text-decoration:none;font-weight:600}
    @media(max-width:480px){
      .wrapper{padding:16px 8px}
      .brand-bar,.card-header,.card-body,.card-footer{padding-left:20px;padding-right:20px}
      .feature-item{min-width:100px}
    }
  </style>
</head>
<body>
<div class="wrapper">
  <div class="container">
    <div class="brand-bar">
      ${logoUrl ? `<img src="${logoUrl}" alt="${siteName}">` : ''}
      <span class="brand-name">${siteName}</span>
    </div>
    <div class="card">
      <div class="card-header"><h1>${title}</h1></div>
      <div class="card-body">${body}</div>
      <div class="card-footer">
        <p>${footerText}</p>
        <p class="mt-4"><a href="${unsubUrl}">Unsubscribe</a> &nbsp;·&nbsp; <a href="${PANEL_URL}">Sign in</a></p>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Welcome email for a newly created user (sign-in details).
 * @param {object} [extra] - { passwordLinkUrl, guideExtra }
 */
async function sendWelcomeCredentials(user, plainPassword, siteName = 'Staff Portal', panelConfig = null, extra = null) {
    if (!user || !user.email) return false;
    const roleLabels = {
        owner: 'Owner',
        admin: 'Administrator',
        manager: 'Manager',
        supervisor: 'Supervisor',
        agent: 'Agent'
    };
    const roleName = roleLabels[user.role] || user.role || 'Agent';
    const passwordLinkUrl = extra && extra.passwordLinkUrl;
    const title = `Welcome to ${escHtml(siteName)}`;
    const body = `
      <p>Hello <strong>${escHtml(user.name || 'there')}</strong>,</p>
      <p>Your staff account on <strong>${escHtml(siteName)}</strong> has been created.</p>
      <p>Your role: <span class="badge badge-green">${escHtml(roleName)}</span></p>
      <hr class="divider">
      <p><strong>Sign-in details</strong></p>
      <div class="info-box">
        <div class="label">Portal URL</div>
        <div class="value"><a href="${PANEL_URL}" style="color:#059669">${PANEL_URL}</a></div>
      </div>
      <div class="info-box">
        <div class="label">Sign-in email${user.username ? ' / username' : ''}</div>
        <div class="value">${escHtml(user.email)}${user.username ? ' · ' + escHtml(user.username) : ''}</div>
      </div>
      ${plainPassword && plainPassword !== '—' ? `
      <div class="cred-box">
        <div class="cred-label">Temporary password</div>
        <div class="cred-value">${escHtml(plainPassword)}</div>
      </div>` : ''}
      ${passwordLinkUrl ? `
      <div class="info-box">
        <div class="label">Secure password link</div>
        <div class="value"><a href="${escHtml(passwordLinkUrl)}" style="color:#059669">Set or reset your password</a></div>
      </div>` : ''}
      <div class="alert-box alert-warn">
        <span class="alert-icon">⚠️</span>
        <span class="alert-text">Change your password after first sign-in. Prefer the secure link above when available.</span>
      </div>
      <hr class="divider">
      <p><strong>What you can do</strong></p>
      <div class="feature-grid">
        <div class="feature-item"><span class="icon">💬</span>WhatsApp conversations</div>
        <div class="feature-item"><span class="icon">👥</span>Customer management</div>
        <div class="feature-item"><span class="icon">🎫</span>Internal tickets</div>
        <div class="feature-item"><span class="icon">✅</span>Tasks</div>
        <div class="feature-item"><span class="icon">📊</span>Reports &amp; analytics</div>
        <div class="feature-item"><span class="icon">🔔</span>Telegram bot (link in Profile)</div>
      </div>
      <hr class="divider">
      <p><strong>Getting started</strong></p>
      <ol style="margin: 0 0 0 20px; padding: 0; font-size:.94rem; color:#2d3748">
        <li style="margin-bottom:6px">Open the portal and sign in</li>
        <li style="margin-bottom:6px">Set a strong password</li>
        <li style="margin-bottom:6px">Open <strong>My profile</strong> and link Telegram for account alerts</li>
        <li style="margin-bottom:6px">Complete the short onboarding checklist on first login</li>
        <li>Work with conversations, tickets, and tasks</li>
      </ol>
      <div class="text-center mt-4">
        <a href="${PANEL_URL}" class="btn">Sign in to the portal →</a>
      </div>`;
    const mailOpts = {
        to: user.email,
        subject: `${title} — your sign-in details`,
        text: `Hello ${user.name || 'there'},\n\nYour account on ${siteName} is ready.\n\nPortal: ${PANEL_URL}\nEmail: ${user.email}${user.username ? '\nUsername: ' + user.username : ''}\nTemporary password: ${plainPassword || '(use secure link)'}\n${passwordLinkUrl ? 'Password link: ' + passwordLinkUrl + '\n' : ''}\nPlease change your password after you sign in.`,
        html: baseHtml(title, body, { siteName })
    };
    if (panelConfig && panelConfig.host) return sendMailWithConfig(panelConfig, mailOpts);
    return sendMail(mailOpts);
}

/**
 * اعلان تغییرات حساب (نقش، شعبه، مسدود، رمز و …)
 */
async function sendAccountLifecycleEmail(user, details = {}, panelConfig = null) {
    if (!user || !user.email) return false;
    const siteName = details.siteName || 'Staff Portal';
    const title = details.title || 'Account update';
    const bodyText = details.bodyText || '';
    const passwordLinkUrl = details.passwordLinkUrl;
    const actorName = details.actorName || '';
    const body = `
      <p>Hello <strong>${escHtml(user.name || 'there')}</strong>,</p>
      <p>${escHtml(title)}</p>
      <div class="info-box">
        <div class="label">Details</div>
        <div class="value" style="white-space:pre-wrap;font-family:inherit">${escHtml(bodyText)}</div>
      </div>
      ${actorName ? `<p style="font-size:.9rem;color:#64748b">Changed by: ${escHtml(actorName)}</p>` : ''}
      ${passwordLinkUrl ? `
      <div class="info-box">
        <div class="label">Secure password link</div>
        <div class="value"><a href="${escHtml(passwordLinkUrl)}" style="color:#059669">Open link</a></div>
      </div>` : ''}
      <div class="text-center mt-4">
        <a href="${PANEL_URL}" class="btn">Open portal →</a>
      </div>`;
    const mailOpts = {
        to: user.email,
        subject: `${siteName} — ${title}`,
        text: `${title}\n\n${bodyText}\n\nPortal: ${PANEL_URL}${passwordLinkUrl ? '\nPassword: ' + passwordLinkUrl : ''}`,
        html: baseHtml(title, body, { siteName })
    };
    if (panelConfig && panelConfig.host) return sendMailWithConfig(panelConfig, mailOpts);
    return sendMail(mailOpts);
}

/**
 * ارسال اعلان ورود به پنل به ایمیل کاربر
 * options: اختیاری — { emailConfig, loginNotificationEnabled } از تنظیمات پنل
 */
async function sendLoginNotification(user, ip = '', userAgent = '', options = null) {
    const usePanel = options && options.emailConfig && options.emailConfig.host;
    if (usePanel && options.loginNotificationEnabled !== true) return false;
    if (!usePanel && (!LOGIN_NOTIFICATION_ENABLED || !user || !user.email)) return false;
    if (!user || !user.email) return false;
    const title = 'New sign-in to your account';
    const now = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const body = `
      <p>Hello <strong>${escHtml(user.name || 'there')}</strong>,</p>
      <p>A successful sign-in to the portal was recorded for your account.</p>
      <div class="info-box">
        <div class="label">Time</div>
        <div class="value">${escHtml(now)}</div>
      </div>
      ${ip ? `<div class="info-box"><div class="label">IP address</div><div class="value" style="direction:ltr;text-align:left">${escHtml(ip)}</div></div>` : ''}
      ${userAgent ? `<div class="info-box"><div class="label">Browser / device</div><div class="value" style="font-size:.85rem">${escHtml(userAgent.substring(0, 100))}${userAgent.length > 100 ? '…' : ''}</div></div>` : ''}
      <div class="alert-box alert-warn" style="margin-top:16px">
        <span class="alert-icon">⚠️</span>
        <span class="alert-text">If this was not you, change your password immediately.</span>
      </div>
      <div class="text-center mt-4">
        <a href="${PANEL_URL}?page=profile" class="btn-outline">Change password</a>
      </div>`;
    const mailOpts = {
        to: user.email,
        subject: `Sign-in notification — ${now}`,
        text: `A sign-in to the portal was recorded.\nTime: ${now}${ip ? '\nIP: ' + ip : ''}`,
        html: baseHtml(title, body)
    };
    if (usePanel) return sendMailWithConfig(options.emailConfig, mailOpts);
    return sendMail(mailOpts);
}

/**
 * ارسال لینک بازیابی رمز عبور
 * panelConfig: اختیاری — تنظیمات SMTP از پنل
 */
async function sendPasswordReset(user, resetToken, expiresInMinutes = 60, panelConfig = null) {
    if (!user || !user.email) return false;
    const base = PANEL_URL.replace(/#.*$/, '').replace(/\?.*$/, '');
    const sep = base.indexOf('?') >= 0 ? '&' : '?';
    const resetUrl = `${base}${sep}reset=1&token=${encodeURIComponent(resetToken)}`;
    const title = 'Reset your password';
    const body = `
      <p>Hello <strong>${escHtml(user.name || 'there')}</strong>,</p>
      <p>We received a request to reset the password for this account:</p>
      <div class="info-box">
        <div class="label">Account email</div>
        <div class="value">${escHtml(user.email)}</div>
      </div>
      <p>Click the button below to choose a new password:</p>
      <div class="text-center mt-4">
        <a href="${resetUrl}" class="btn">Set a new password</a>
      </div>
      <div class="alert-box alert-info" style="margin-top:20px">
        <span class="alert-icon">ℹ️</span>
        <span class="alert-text">This link is valid for <strong>${expiresInMinutes} minutes</strong> and can only be used once.</span>
      </div>
      <hr class="divider">
      <p class="muted">If you did not request this, you can ignore this email. Your current password will stay the same.</p>`;
    const mailOpts = {
        to: user.email,
        subject: 'Password reset request',
        text: `Password reset\n\nHello ${user.name || 'there'},\nUse this link to set a new password: ${resetUrl}\n(Valid for ${expiresInMinutes} minutes.)`,
        html: baseHtml(title, body)
    };
    /** بازیابی رمز: بدون چند دقیقه انتظار — SMTP کند/قطع نباید UI را قفل کند */
    const quickForgotDelivery = {
        maxRetries: parsePositiveInt(process.env.EMAIL_FORGOT_MAX_RETRIES, 1),
        connectionTimeoutMs: parsePositiveInt(process.env.EMAIL_FORGOT_CONNECTION_TIMEOUT_MS, 10000),
        greetingTimeoutMs: parsePositiveInt(process.env.EMAIL_FORGOT_GREETING_TIMEOUT_MS, 7000),
        socketTimeoutMs: parsePositiveInt(process.env.EMAIL_FORGOT_SOCKET_TIMEOUT_MS, 10000),
        singleConnectionCandidate: process.env.EMAIL_FORGOT_TRY_ALL_SMTP_COMBOS === '1' ? false : true
    };
    const envCfg = getEnvEmailConfig();
    const cfg = panelConfig && panelConfig.host ? panelConfig : envCfg;
    if (!cfg) return false;
    const r = await sendMailWithConfigDetailed(cfg, mailOpts, 1, quickForgotDelivery);
    return r.ok;
}

function escHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * ارسال ایمیل هنگام تخصیص تیکت به کاربر
 */
async function sendTicketAssigned(user, ticket, assignedBy = null, panelConfig = null) {
    if (!user || !user.email) return false;
    const ticketUrl = `${PANEL_URL}?page=tickets&id=${encodeURIComponent(ticket.id || '')}`;
    const priorityBadge = {
        high: '<span class="badge badge-red">High</span>',
        urgent: '<span class="badge badge-red">Urgent</span>',
        normal: '<span class="badge badge-blue">Normal</span>',
        low: '<span class="badge badge-yellow">Low</span>'
    };
    const title = 'A ticket has been assigned to you';
    const body = `
      <p>Hello <strong>${escHtml(user.name || 'there')}</strong>,</p>
      <p>A ticket has been assigned to you${assignedBy ? ` by <strong>${escHtml(assignedBy)}</strong>` : ''}.</p>
      <div class="info-box">
        <div class="label">Subject</div>
        <div class="value">${escHtml(ticket.subject || ticket.title || '(No subject)')}</div>
      </div>
      ${ticket.ticketNumber ? `<div class="info-box"><div class="label">Ticket number</div><div class="value">#${escHtml(ticket.ticketNumber)}</div></div>` : ''}
      <div class="info-box">
        <div class="label">Priority</div>
        <div class="value">${priorityBadge[ticket.priority] || escHtml(ticket.priority) || '—'}</div>
      </div>
      ${ticket.description ? `<div class="info-box"><div class="label">Description</div><div class="value" style="font-size:.9rem;line-height:1.6">${escHtml(String(ticket.description).substring(0, 300))}${ticket.description.length > 300 ? '...' : ''}</div></div>` : ''}
      <div class="text-center mt-4">
        <a href="${ticketUrl}" class="btn">Open ticket →</a>
      </div>`;
    const mailOpts = {
        to: user.email,
        subject: `New ticket: ${ticket.subject || ticket.title || '#' + (ticket.ticketNumber || '')}`,
        text: `A ticket was assigned to you: ${ticket.subject || ticket.title || ''} — ${ticketUrl}`,
        html: baseHtml(title, body)
    };
    if (panelConfig && panelConfig.host) return sendMailWithConfig(panelConfig, mailOpts);
    return sendMail(mailOpts);
}

/**
 * ارسال ایمیل هنگام تخصیص مکالمه به کاربر
 */
async function sendConversationAssigned(user, conversation, customerName = '', assignedBy = null, panelConfig = null) {
    if (!user || !user.email) return false;
    const convUrl = `${PANEL_URL}?page=conversations&id=${encodeURIComponent(conversation.id || '')}`;
    const title = 'A conversation has been assigned to you';
    const body = `
      <p>Hello <strong>${escHtml(user.name || 'there')}</strong>,</p>
      <p>A WhatsApp conversation has been assigned to you${assignedBy ? ` by <strong>${escHtml(assignedBy)}</strong>` : ''}.</p>
      ${customerName ? `<div class="info-box"><div class="label">Customer</div><div class="value">${escHtml(customerName)}</div></div>` : ''}
      ${conversation.lastMessagePreview ? `<div class="info-box"><div class="label">Last message</div><div class="value" style="font-size:.9rem;font-style:italic">"${escHtml(String(conversation.lastMessagePreview).substring(0, 200))}"</div></div>` : ''}
      <div class="text-center mt-4">
        <a href="${convUrl}" class="btn">Open conversation →</a>
      </div>`;
    const mailOpts = {
        to: user.email,
        subject: `New conversation assigned${customerName ? ': ' + customerName : ''}`,
        text: `A conversation was assigned to you: ${customerName || ''} — ${convUrl}`,
        html: baseHtml(title, body)
    };
    if (panelConfig && panelConfig.host) return sendMailWithConfig(panelConfig, mailOpts);
    return sendMail(mailOpts);
}

/**
 * ارسال فرم تماس لندینگ — به ایمیل فروش/پشتیبانی
 * toEmail: ایمیل گیرنده (از env: CONTACT_EMAIL یا sales@kaya.fxguard.io)
 */
async function sendContactForm({ purpose, name, email, phone, message, emailConfig = null }) {
    if (!isValidEmail(email)) {
        logger.warn('Invalid email in contact form', { email });
        return { ok: false, error: 'Invalid email address' };
    }

    const toEmail = process.env.CONTACT_EMAIL || 'sales@kaya.fxguard.io';
    if (!isValidEmail(toEmail)) {
        logger.warn('Invalid recipient email', { toEmail });
        return { ok: false, error: 'Invalid recipient email' };
    }

    const purposeLabels = { purchase: 'Purchase', quote: 'Custom Quote', support: 'Support', other: 'Other' };
    const subject = 'WhatsApp CRM - ' + (purposeLabels[purpose] || purpose || 'New Contact');
    const text = [
        `Purpose: ${purposeLabels[purpose] || purpose}`,
        `Name: ${name || '—'}`,
        `Email: ${email || '—'}`,
        `Phone: ${phone || '—'}`,
        '',
        'Message:',
        message || '—'
    ].join('\n');
    const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const html = baseHtml(subject, `
      <p><strong>Purpose:</strong> ${esc(purposeLabels[purpose] || purpose)}</p>
      <p><strong>Name:</strong> ${esc(name) || '—'}</p>
      <p><strong>Email:</strong> <a href="mailto:${esc(email || '')}">${esc(email) || '—'}</a></p>
      <p><strong>Phone:</strong> ${esc(phone) || '—'}</p>
      <p><strong>Message:</strong></p>
      <p>${esc(message || '—').replace(/\n/g, '<br>')}</p>
      <p class="muted">Reply directly to ${esc(email) || 'the sender'}.</p>
    `);
    
    let result;
    if (emailConfig && emailConfig.host) {
        result = await sendMailWithConfigDetailed(emailConfig, { to: toEmail, subject, text, html });
    } else {
        result = await sendMailWithRetry({ to: toEmail, subject, text, html });
    }
    if (!result.ok) {
        logger.error('Contact form email failed', { error: result.error });
        return result;
    }
    return { ok: true };
}

/**
 * تست اتصال SMTP
 * @returns {Promise<{ok: boolean, error?: string, version?: string}>}
 */
async function testSmtpConnection(config) {
    if (!config || !config.host || !config.port) {
        return { ok: false, error: 'SMTP host and port are required' };
    }

    try {
        const nodemailer_test = require('nodemailer');
        const host = normalizeHost(config.host);
        const port = parseInt(config.port, 10) || 587;
        const secure = !!config.secure;
        const opts = {
            host,
            port,
            secure,
            auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
            connectionTimeout: CONNECTION_TIMEOUT_MS,
            greetingTimeout: GREETING_TIMEOUT_MS,
            socketTimeout: SOCKET_TIMEOUT_MS
        };
        if (port === 587 && !secure) opts.requireTLS = true;
        if (config.allowSelfSigned) opts.tls = { rejectUnauthorized: false };
        
        const transport = nodemailer_test.createTransport(opts);
        await transport.verify();
        logger.info('SMTP connection verified successfully');
        return { ok: true };
    } catch (err) {
        const errorMsg = err.message || String(err);
        logger.error('SMTP connection test failed', { error: errorMsg });
        return { ok: false, error: errorMsg };
    }
}

/**
 * ارسال ایمیل تست
 */
async function sendTestEmail(config, testEmail) {
    if (!isValidEmail(testEmail)) {
        return { ok: false, error: 'Invalid test email address' };
    }

    const result = await sendMailWithConfigDetailed(config, {
        to: testEmail,
        subject: 'SMTP test — Kaya CRM',
        text: 'This message was sent to verify your SMTP settings.',
        html: baseHtml('SMTP test', '<p>This message was sent to verify your SMTP settings.</p><p>If you received it, your outbound mail configuration is working.</p>')
    });

    return result;
}

module.exports = {
    isEnabled,
    isValidEmail,
    checkRateLimit,
    sendMail,
    sendMailWithRetry,
    sendMailWithConfig,
    sendMailWithConfigDetailed,
    sendWelcomeCredentials,
    sendAccountLifecycleEmail,
    sendLoginNotification,
    sendPasswordReset,
    sendTicketAssigned,
    sendConversationAssigned,
    sendContactForm,
    testSmtpConnection,
    sendTestEmail,
    getFrom,
    LOGIN_NOTIFICATION_ENABLED,
    PANEL_URL,
    baseHtml,
    escHtml
};
