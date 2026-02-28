/**
 * سرویس ایمیل پنل — ارسال ایمیل خوش‌آمدگویی، اعلان ورود، بازیابی رمز
 * تنظیمات از متغیرهای محیط: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, EMAIL_LOGIN_NOTIFICATION
 * ✓ ارسال مجدد خودکار در صورت خطا
 * ✓ اعتبارسنجی آدرس ایمیل
 * ✓ سرصحت‌های انطباق مع (Compliance, Unsubscribe)
 * ✓ محدودیت میزان ارسال
 */

const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const FROM_NAME = process.env.SMTP_FROM_NAME || 'پورتال کارکنان';
const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@localhost';
const LOGIN_NOTIFICATION_ENABLED = process.env.EMAIL_LOGIN_NOTIFICATION === 'true' || process.env.EMAIL_LOGIN_NOTIFICATION === '1';
const PANEL_URL = process.env.FRONTEND_URL || process.env.PANEL_URL || 'http://localhost:3002';
const MAX_RETRIES = parseInt(process.env.EMAIL_MAX_RETRIES || '3', 10);
const RETRY_DELAY_MS = parseInt(process.env.EMAIL_RETRY_DELAY_MS || '2000', 10);
const RATE_LIMIT_REQUESTS = parseInt(process.env.EMAIL_RATE_LIMIT_REQUESTS || '100', 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.EMAIL_RATE_LIMIT_WINDOW_MS || '3600000', 10); // 1 hour

let transporter = null;
const emailStats = { count: 0, resetAt: Date.now() };

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
        console.warn(`Email rate limit exceeded: ${emailStats.count}/${RATE_LIMIT_REQUESTS}`);
        return false;
    }
    emailStats.count++;
    return true;
}

function getTransporter() {
    if (transporter) return transporter;
    if (!isEnabled()) return null;
    const secure = process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1' || String(process.env.SMTP_PORT) === '465';
    const host = (process.env.SMTP_HOST || '').replace(/\.+$/, '').trim();
    transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure,
        auth: process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        maxConnections: 5,
        maxMessages: 100
    });
    return transporter;
}

function getFrom() {
    return FROM_NAME ? `"${FROM_NAME}" <${FROM_EMAIL}>` : FROM_EMAIL;
}

/**
 * ارسال ایمیل با منطق تکرار خودکار
 * @returns {Promise<{ok: boolean, error?: string, retries?: number}>}
 */
async function sendMailWithRetry({ to, subject, text, html, attachments = [] }, attempt = 1) {
    if (!isEnabled()) {
        console.warn('Email service disabled: SMTP not configured');
        return { ok: false, error: 'SMTP not configured' };
    }

    if (!checkRateLimit()) {
        return { ok: false, error: 'Rate limit exceeded' };
    }

    // اعتبارسنجی آدرس ایمیل
    const emails = Array.isArray(to) ? to : [to];
    for (const email of emails) {
        if (!isValidEmail(email)) {
            logger.warn('Invalid email address', { email });
            return { ok: false, error: `Invalid email: ${email}` };
        }
    }

    try {
        const transport = getTransporter();
        if (!transport) return { ok: false, error: 'Transporter not initialized' };

        const fromAddr = FROM_EMAIL.trim();
        const unsubscribeUrl = `${PANEL_URL}?unsubscribe=1`;
        
        const mailOpts = {
            from: getFrom(),
            to: emails.join(', '),
            subject: subject || '(بدون موضوع)',
            text: text || '',
            html: html || (text ? text.replace(/\n/g, '<br>') : ''),
            attachments: attachments || [],
            headers: {
                'X-Mailer': 'KayaCRM',
                'Reply-To': fromAddr,
                'List-Unsubscribe': `<${unsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                'X-Priority': '3',
                'X-MSMail-Priority': 'Normal',
                'Precedence': 'bulk'
            }
        };

        await transport.sendMail(mailOpts);
        logger.info('Email sent successfully', { to: emails.join(', ') });
        return { ok: true };
    } catch (err) {
        const isRetryable = err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || 
                           err.code === 'EHOSTUNREACH' || err.message.includes('SMTP');
        
        if (isRetryable && attempt < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * attempt;
            logger.warn(`Email send failed, retrying`, { attempt, maxRetries: MAX_RETRIES, delay, error: err.message });
            await new Promise(resolve => setTimeout(resolve, delay));
            return sendMailWithRetry({ to, subject, text, html, attachments }, attempt + 1);
        }

        const errorMsg = err.message || String(err);
        if (err.response) {
            return { ok: false, error: `SMTP Error: ${errorMsg}` };
        }
        logger.error('Email send failed', { attempt, error: errorMsg });
        return { ok: false, error: errorMsg, retries: attempt };
    }
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

async function sendMailWithConfigDetailed(config, { to, subject, text, html, attachments = [] }, attempt = 1) {
    if (!config || !config.host || !config.port) {
        return { ok: false, error: 'Host و پورت الزامی است.' };
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

    try {
        const nodemailer_local = require('nodemailer');
        const host = normalizeHost(config.host);
        const opts = {
            host,
            port: parseInt(config.port, 10) || 587,
            secure: !!config.secure,
            auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
            connectionTimeout: 15000,
            greetingTimeout: 10000,
            socketTimeout: 15000
        };
        if (config.allowSelfSigned) opts.tls = { rejectUnauthorized: false };
        
        const transport = nodemailer_local.createTransport(opts);
        const fromAddr = (config.from || config.user || 'noreply@localhost').trim();
        const from = config.fromName ? `"${config.fromName}" <${fromAddr}>` : fromAddr;
        const unsubscribeUrl = `${PANEL_URL}?unsubscribe=1`;
        
        const mailOpts = {
            from,
            to: emails.join(', '),
            subject: subject || '(بدون موضوع)',
            text: text || '',
            html: html || (text ? text.replace(/\n/g, '<br>') : ''),
            attachments: attachments || [],
            headers: {
                'X-Mailer': 'KayaCRM',
                'Reply-To': fromAddr,
                'List-Unsubscribe': `<${unsubscribeUrl}>`,
                'X-Priority': '3',
                'Precedence': 'bulk'
            }
        };
        
        await transport.sendMail(mailOpts);
        logger.info('Email sent successfully (custom config)', { to: emails.join(', ') });
        return { ok: true };
    } catch (err) {
        const isRetryable = err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || 
                           err.code === 'EHOSTUNREACH' || err.message.includes('SMTP');
        
        if (isRetryable && attempt < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * attempt;
            logger.warn('Email send failed (custom config), retrying', { attempt, maxRetries: MAX_RETRIES, delay, error: err.message });
            await new Promise(resolve => setTimeout(resolve, delay));
            return sendMailWithConfigDetailed(config, { to, subject, text, html, attachments }, attempt + 1);
        }

        let msg = err.message || String(err);
        if (err.response) msg += ' — ' + (typeof err.response === 'string' ? err.response : JSON.stringify(err.response));
        logger.error('Email send error (custom config)', { error: msg });
        return { ok: false, error: msg };
    }
}

/** قالب HTML پایه با پشتیبانی RTL */
function baseHtml(title, body) {
    return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: Tahoma, Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 24px; color: #333; line-height: 1.6; }
    .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #fff; padding: 20px 24px; font-size: 1.2rem; font-weight: 600; }
    .body { padding: 24px; }
    .footer { padding: 16px 24px; font-size: 0.85rem; color: #666; border-top: 1px solid #eee; }
    .btn { display: inline-block; padding: 12px 24px; background: #059669; color: #fff !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 12px; }
    .btn:hover { background: #047857; }
    .muted { color: #666; font-size: 0.9rem; }
    code, .cred { background: #f0f0f0; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">${title}</div>
    <div class="body">${body}</div>
    <div class="footer">این ایمیل به‌صورت خودکار از پورتال کارکنان ارسال شده است.</div>
  </div>
</body>
</html>`;
}

/**
 * ارسال اطلاعات ورود به کاربر تازه‌ساخته‌شده
 * panelConfig: اختیاری — تنظیمات SMTP از پنل؛ در صورت ارسال از آن استفاده می‌شود
 */
async function sendWelcomeCredentials(user, plainPassword, siteName = 'پورتال کارکنان', panelConfig = null) {
    if (!user || !user.email) return false;
    const title = `حساب کاربری شما در ${siteName} ایجاد شد`;
    const mailOpts = {
        to: user.email,
        subject: title,
        text: `حساب کاربری شما در ${siteName} ایجاد شد. آدرس پنل: ${PANEL_URL} — ایمیل: ${user.email} — رمز موقت: ${plainPassword}`,
        html: baseHtml(title, `
      <p>سلام ${user.name || 'کاربر'}،</p>
      <p>یک حساب کاربری برای شما در <strong>${siteName}</strong> ایجاد شده است.</p>
      <p><strong>اطلاعات ورود:</strong></p>
      <ul>
        <li>آدرس پنل: <a href="${PANEL_URL}">${PANEL_URL}</a></li>
        <li>ایمیل / نام کاربری: <span class="cred">${user.email}${user.username ? ' یا ' + user.username : ''}</span></li>
        <li>رمز عبور موقت: <span class="cred">${plainPassword}</span></li>
      </ul>
      <p class="muted">برای امنیت بیشتر پس از اولین ورود از بخش «پروفایل من» رمز عبور خود را تغییر دهید.</p>
      <a href="${PANEL_URL}" class="btn">ورود به پنل</a>
    `)
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
    const title = 'ورود به پورتال';
    const body = `
      <p>سلام ${user.name || 'کاربر'}،</p>
      <p>ورود به پورتال با موفقیت انجام شد.</p>
      ${ip || userAgent ? `<p class="muted">IP: ${ip || '—'} | مرورگر: ${userAgent ? userAgent.substring(0, 80) + (userAgent.length > 80 ? '…' : '') : '—'}</p>` : ''}
      <p>در صورت عدم اطلاع از این ورود، رمز عبور خود را تغییر دهید.</p>
      <a href="${PANEL_URL}#profile" class="btn">پروفایل و تغییر رمز</a>
    `;
    const mailOpts = { to: user.email, subject: 'ورود به پورتال انجام شد', text: `ورود به پورتال با موفقیت انجام شد. ${ip ? 'IP: ' + ip : ''}`, html: baseHtml(title, body) };
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
    const title = 'بازیابی رمز عبور';
    const body = `
      <p>سلام ${user.name || 'کاربر'}،</p>
      <p>درخواست بازیابی رمز عبور برای حساب <strong>${user.email}</strong> ثبت شده است.</p>
      <p>برای تعیین رمز جدید روی دکمه زیر کلیک کنید (این لینک تا ${expiresInMinutes} دقیقه معتبر است):</p>
      <a href="${resetUrl}" class="btn">تعیین رمز عبور جدید</a>
      <p class="muted">اگر شما این درخواست را نزده‌اید، این ایمیل را نادیده بگیرید.</p>
    `;
    const mailOpts = { to: user.email, subject: 'بازیابی رمز عبور پورتال', text: `بازیابی رمز: ${resetUrl} (معتبر تا ${expiresInMinutes} دقیقه)`, html: baseHtml(title, body) };
    if (panelConfig && panelConfig.host) return sendMailWithConfig(panelConfig, mailOpts);
    return sendMail(mailOpts);
}

/**
 * ارسال فرم تماس لندینگ — به ایمیل فروش/پشتیبانی
 * toEmail: ایمیل گیرنده (از env: CONTACT_EMAIL یا sales@fxguard.io)
 */
async function sendContactForm({ purpose, name, email, phone, message }) {
    if (!isValidEmail(email)) {
        logger.warn('Invalid email in contact form', { email });
        return { ok: false, error: 'Invalid email address' };
    }

    const toEmail = process.env.CONTACT_EMAIL || 'sales@fxguard.io';
    if (!isValidEmail(toEmail)) {
        logger.warn('Invalid recipient email', { toEmail });
        return { ok: false, error: 'Invalid recipient email' };
    }

    const purposeLabels = { demo: 'Demo Request', purchase: 'Purchase', quote: 'Custom Quote', support: 'Support', other: 'Other' };
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
    const html = baseHtml(subject, `
      <p><strong>Purpose:</strong> ${purposeLabels[purpose] || purpose}</p>
      <p><strong>Name:</strong> ${name || '—'}</p>
      <p><strong>Email:</strong> <a href="mailto:${email || ''}">${email || '—'}</a></p>
      <p><strong>Phone:</strong> ${phone || '—'}</p>
      <p><strong>Message:</strong></p>
      <p>${(message || '—').replace(/\n/g, '<br>')}</p>
      <p class="muted">Reply directly to ${email || 'the sender'}.</p>
    `);
    
    const result = await sendMailWithRetry({ to: toEmail, subject, text, html });
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
        return { ok: false, error: 'Host و پورت الزامی است.' };
    }

    try {
        const nodemailer_test = require('nodemailer');
        const host = normalizeHost(config.host);
        const opts = {
            host,
            port: parseInt(config.port, 10) || 587,
            secure: !!config.secure,
            auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
            connectionTimeout: 10000,
            greetingTimeout: 5000,
            socketTimeout: 10000
        };
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
        subject: 'تست SMTP - WhatsApp CRM',
        text: 'این ایمیل برای تست تنظیمات SMTP است.',
        html: baseHtml('تست SMTP', '<p>این ایمیل برای تست تنظیمات SMTP است.</p><p>اگر این ایمیل دریافت کردید، تنظیمات SMTP شما درست است.</p>')
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
    sendLoginNotification,
    sendPasswordReset,
    sendContactForm,
    testSmtpConnection,
    sendTestEmail,
    getFrom,
    LOGIN_NOTIFICATION_ENABLED,
    PANEL_URL,
    baseHtml
};
