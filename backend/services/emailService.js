/**
 * سرویس ایمیل پنل — ارسال ایمیل خوش‌آمدگویی، اعلان ورود، بازیابی رمز
 * تنظیمات از متغیرهای محیط: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, EMAIL_LOGIN_NOTIFICATION
 */

const nodemailer = require('nodemailer');

const FROM_NAME = process.env.SMTP_FROM_NAME || 'پورتال کارکنان';
const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@localhost';
const LOGIN_NOTIFICATION_ENABLED = process.env.EMAIL_LOGIN_NOTIFICATION === 'true' || process.env.EMAIL_LOGIN_NOTIFICATION === '1';
const PANEL_URL = process.env.FRONTEND_URL || process.env.PANEL_URL || 'http://localhost:3002';

let transporter = null;

function isEnabled() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    return !!(host && port);
}

function getTransporter() {
    if (transporter) return transporter;
    if (!isEnabled()) return null;
    const secure = process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1' || String(process.env.SMTP_PORT) === '465';
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure,
        auth: process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined
    });
    return transporter;
}

function getFrom() {
    return FROM_NAME ? `"${FROM_NAME}" <${FROM_EMAIL}>` : FROM_EMAIL;
}

/**
 * ارسال ایمیل ساده — در صورت خطا لاگ می‌کند و false برمی‌گرداند
 */
async function sendMail({ to, subject, text, html }) {
    if (!isEnabled()) {
        console.warn('Email service disabled: SMTP not configured');
        return false;
    }
    try {
        const transport = getTransporter();
        if (!transport) return false;
        await transport.sendMail({
            from: getFrom(),
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject || '(بدون موضوع)',
            text: text || '',
            html: html || (text ? text.replace(/\n/g, '<br>') : '')
        });
        return true;
    } catch (err) {
        console.error('Email send error:', err.message);
        return false;
    }
}

/**
 * ارسال ایمیل با تنظیمات SMTP دلخواه (مثلاً از تنظیمات پنل)
 * config: { host, port, user, pass, from?, fromName?, secure? }
 */
async function sendMailWithConfig(config, { to, subject, text, html }) {
    if (!config || !config.host || !config.port) return false;
    try {
        const nodemailer = require('nodemailer');
        const transport = nodemailer.createTransport({
            host: config.host,
            port: parseInt(config.port, 10) || 587,
            secure: !!config.secure,
            auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined
        });
        const fromAddr = config.from || config.user || 'noreply@localhost';
        const from = config.fromName ? `"${config.fromName}" <${fromAddr}>` : fromAddr;
        await transport.sendMail({
            from,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject || '(بدون موضوع)',
            text: text || '',
            html: html || (text ? text.replace(/\n/g, '<br>') : '')
        });
        return true;
    } catch (err) {
        console.error('Email send error (config):', err.message);
        return false;
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

module.exports = {
    isEnabled,
    sendMail,
    sendMailWithConfig,
    sendWelcomeCredentials,
    sendLoginNotification,
    sendPasswordReset,
    getFrom,
    LOGIN_NOTIFICATION_ENABLED,
    PANEL_URL,
    baseHtml
};
