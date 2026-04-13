/**
 * پروکسی تصویر پروفایل برای پنل: واکشی سمت سرور تا محدودیت Referer/CDN مرورگر دور زده شود.
 * احراز هویت با کوکی httpOnly یا هدر Authorization (همان authMiddleware).
 */
const axios = require('axios');
const { isSafeRemoteUrl, isAllowedProfilePicCdnHost } = require('../lib/customerAvatar');

const MAX_URL_LEN = 2800;
const MAX_BYTES = 5 * 1024 * 1024;

async function getProfileImage(req, res) {
    if (!req.canAccess('customers') && !req.canAccess('conversations')) {
        return res.status(403).json({ error: 'دسترسی ندارید' });
    }
    const raw = String(req.query.url || '').trim();
    if (!raw || raw.length > MAX_URL_LEN) {
        return res.status(400).json({ error: 'نشانی نامعتبر است' });
    }
    let u;
    try {
        u = new URL(raw);
    } catch {
        return res.status(400).json({ error: 'نشانی نامعتبر است' });
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return res.status(400).json({ error: 'نشانی نامعتبر است' });
    }
    if (!isSafeRemoteUrl(raw) || !isAllowedProfilePicCdnHost(u.hostname)) {
        return res.status(400).json({ error: 'میزبان مجاز نیست' });
    }

    try {
        const response = await axios.get(raw, {
            responseType: 'arraybuffer',
            timeout: 15000,
            maxContentLength: MAX_BYTES,
            maxBodyLength: MAX_BYTES,
            maxRedirects: 0,
            validateStatus: (s) => s === 200,
            headers: {
                Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (compatible; KayaCRM/1.0; +https://github.com/ersanjt/kayaCRM)',
            },
        });
        const ct = (response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        if (!ct.startsWith('image/')) {
            return res.status(502).json({ error: 'پاسخ تصویر نیست' });
        }
        const buf = Buffer.from(response.data);
        if (buf.length < 16 || buf.length > MAX_BYTES) {
            return res.status(502).json({ error: 'اندازه نامعتبر است' });
        }
        res.setHeader('Cache-Control', 'private, max-age=300');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.type(ct);
        return res.send(buf);
    } catch {
        return res.status(404).json({ error: 'بارگذاری تصویر ناموفق بود' });
    }
}

module.exports = { getProfileImage };
