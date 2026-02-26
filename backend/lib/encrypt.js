/**
 * رمزنگاری AES-256-GCM برای ذخیرهٔ رمز عبور ایمیل شرکتی
 * از ENCRYPT_SECRET جداگانه استفاده می‌کند (نه JWT_SECRET)
 */
const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LEN = 16;
const KEY_LEN = 32;

function getKey() {
    const secret = process.env.ENCRYPT_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error('ENCRYPT_SECRET یا JWT_SECRET باید در .env تنظیم شود');
    return crypto.scryptSync(secret, 'company-email-salt-v2', KEY_LEN);
}

function encrypt(plain) {
    if (!plain || typeof plain !== 'string') return null;
    const key = getKey();
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return iv.toString('base64') + ':' + tag.toString('base64') + ':' + enc.toString('base64');
}

function decrypt(encrypted) {
    if (!encrypted || typeof encrypted !== 'string') return null;
    try {
        const parts = encrypted.split(':');
        if (parts.length !== 3) return null;
        const key = getKey();
        const iv = Buffer.from(parts[0], 'base64');
        const tag = Buffer.from(parts[1], 'base64');
        const enc = Buffer.from(parts[2], 'base64');
        const decipher = crypto.createDecipheriv(ALGO, key, iv);
        decipher.setAuthTag(tag);
        return decipher.update(enc) + decipher.final('utf8');
    } catch (_) {
        return null;
    }
}

module.exports = { encrypt, decrypt };
