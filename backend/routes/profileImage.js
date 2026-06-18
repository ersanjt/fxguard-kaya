/**
 * پروکسی تصویر پروفایل برای پنل: واکشی سمت سرور تا محدودیت Referer/CDN مرورگر دور زده شود.
 * احراز هویت با کوکی httpOnly یا هدر Authorization (همان authMiddleware).
 *
 * در صورت شکست واکشی، به‌جای 404 JSON یک PNG شفاف ۱×۱ با ۲۰۰ برمی‌گردانیم تا <img> در کنسول
 * خطای «Failed to load resource» ندهد و onerror با پاسخ JSON خراب نشود.
 */
const axios = require('axios');
const { isSafeRemoteUrl, isAllowedProfilePicCdnHost } = require('../lib/customerAvatar');

const MAX_URL_LEN = 2800;
const MAX_BYTES = 5 * 1024 * 1024;

/** PNG شفاف ۱×۱ — جایگزین امن وقتی CDN پاسخ نمی‌دهد */
const PLACEHOLDER_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64'
);

function sendPlaceholderPng(res) {
    res.setHeader('Cache-Control', 'private, max-age=120');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Profile-Image-Status', 'unavailable');
    res.type('image/png');
    return res.send(PLACEHOLDER_PNG);
}

function upstreamHeadersForProfilePic(hostname) {
    const h = String(hostname || '').toLowerCase();
    const base = {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    };
    if (h === 'whatsapp.net' || h.endsWith('.whatsapp.net')) {
        return {
            ...base,
            Referer: 'https://web.whatsapp.com/',
            Origin: 'https://web.whatsapp.com',
        };
    }
    if (h === 'fbcdn.net' || h.endsWith('.fbcdn.net') || h === 'facebook.com' || h.endsWith('.facebook.com')) {
        return { ...base, Referer: 'https://www.facebook.com/' };
    }
    if (h.includes('instagram.com') || h.includes('cdninstagram.com')) {
        return { ...base, Referer: 'https://www.instagram.com/' };
    }
    return base;
}

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
            maxRedirects: 5,
            validateStatus: (s) => s >= 200 && s < 400,
            headers: upstreamHeadersForProfilePic(u.hostname),
        });
        const ct = (response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        if (!ct.startsWith('image/')) {
            return sendPlaceholderPng(res);
        }
        const buf = Buffer.from(response.data);
        if (buf.length < 16 || buf.length > MAX_BYTES) {
            return sendPlaceholderPng(res);
        }
        res.setHeader('Cache-Control', 'private, max-age=300');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.type(ct);
        return res.send(buf);
    } catch {
        return sendPlaceholderPng(res);
    }
}

module.exports = { getProfileImage, sendPlaceholderPng, upstreamHeadersForProfilePic };
