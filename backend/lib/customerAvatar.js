/**
 * دانلود آواتار مشتری از URL راه‌دور و ذخیره در uploads تا لینک‌های منقضی‌شوندهٔ واتساپ/متا نشکنند.
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

/** شمارهٔ فقط رقمی برای API گیت‌وی (بدون +، فاصله، پسوند @c.us) */
function digitsOnlyChatPhone(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (/@g\.us$/i.test(s)) return s;
    return s.replace(/@c\.us$/i, '').replace(/\D/g, '').trim();
}

function isAlreadyLocalPath(s) {
    if (!s || typeof s !== 'string') return false;
    const t = s.trim();
    return t.startsWith('/uploads/') || t.startsWith('uploads/');
}

function isSafeRemoteUrl(urlStr) {
    try {
        const u = new URL(urlStr);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
        const host = u.hostname.toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
        const parts = host.split('.');
        if (parts[0] === '10' || (parts[0] === '172' && parseInt(parts[1], 10) >= 16 && parseInt(parts[1], 10) <= 31)) return false;
        if (parts[0] === '192' && parts[1] === '168') return false;
        return true;
    } catch {
        return false;
    }
}

function extFromContentType(ct) {
    const c = (ct || '').toLowerCase();
    if (c.includes('png')) return '.png';
    if (c.includes('webp')) return '.webp';
    if (c.includes('gif')) return '.gif';
    if (c.includes('jpeg') || c.includes('jpg')) return '.jpg';
    if (c.includes('svg')) return '.svg';
    return '.jpg';
}

/**
 * @param {string} customerId UUID
 * @param {string} sourceUrl URL از واتساپ یا آدرس دستی
 * @returns {Promise<string|null>} مسیر عمومی مثل `/uploads/customers/{id}/avatar.jpg` یا null در صورت شکست
 */
function ensureAvatarFetchUrl(raw) {
    const u = String(raw || '').trim();
    if (!u) return '';
    if (u.startsWith('//')) return 'https:' + u;
    if (/^https?:\/\//i.test(u)) return u;
    const slash = u.indexOf('/');
    const host = slash >= 0 ? u.slice(0, slash) : u;
    if (host.indexOf('.') > 0) {
        try {
            if (/^[a-z0-9.-]+$/i.test(host) && host.split('.').length >= 2) return 'https://' + u.replace(/^\/+/, '');
        } catch (_) {}
    }
    return u;
}

async function downloadAvatarToUploads(customerId, sourceUrl) {
    if (!customerId || !sourceUrl || typeof sourceUrl !== 'string') return null;
    let raw = sourceUrl.trim();
    if (isAlreadyLocalPath(raw)) return raw.startsWith('/') ? raw : '/' + raw;
    raw = ensureAvatarFetchUrl(raw);
    if (!/^https?:\/\//i.test(raw)) return null;
    if (!isSafeRemoteUrl(raw)) return null;

    try {
        const res = await axios.get(raw, {
            responseType: 'arraybuffer',
            timeout: 12000,
            maxContentLength: 5 * 1024 * 1024,
            maxBodyLength: 5 * 1024 * 1024,
            maxRedirects: 5,
            validateStatus: (s) => s >= 200 && s < 400,
            headers: {
                Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (compatible; fxguard-kaya/1.0; +https://github.com/ersanjt/fxguard-kaya)',
            },
        });
        const ct = (res.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        if (!ct.startsWith('image/')) return null;
        const buf = Buffer.from(res.data);
        if (buf.length < 32 || buf.length > 5 * 1024 * 1024) return null;

        const ext = extFromContentType(ct);
        const dir = path.join(__dirname, '..', 'uploads', 'customers', customerId);
        fs.mkdirSync(dir, { recursive: true });
        const filename = 'avatar' + ext;
        const fullPath = path.join(dir, filename);
        try {
            const prev = fs.readdirSync(dir);
            for (const f of prev) {
                if (f.startsWith('avatar.') && f !== filename) {
                    try {
                        fs.unlinkSync(path.join(dir, f));
                    } catch (_) {}
                }
            }
        } catch (_) {}
        fs.writeFileSync(fullPath, buf);
        return '/uploads/customers/' + customerId + '/' + filename;
    } catch {
        return null;
    }
}

/**
 * اگر URL راه‌دور است، در پس‌زمینه ذخیره محلی می‌کند و URL نهایی را برمی‌گرداند؛ در غیر این صورت همان ورودی.
 */
async function persistRemoteAvatarIfNeeded(customerId, profilePicValue) {
    if (!customerId || !profilePicValue || typeof profilePicValue !== 'string') return profilePicValue || null;
    const t = profilePicValue.trim();
    if (!t) return null;
    if (isAlreadyLocalPath(t)) return t.startsWith('/') ? t : '/' + t;
    if (t.startsWith('data:')) return t;
    const local = await downloadAvatarToUploads(customerId, t);
    return local || t;
}

/** جلوگیری از فراخوانی پشت‌سرهم Gateway برای یک مشتری */
const _waAvatarRefreshAt = new Map();

function looksLikeExpiringCdnProfilePic(url) {
    if (!url || typeof url !== 'string') return false;
    const u = url.toLowerCase();
    return (
        u.includes('whatsapp.net') ||
        u.includes('fbcdn.net') ||
        u.includes('instagram.com') ||
        u.includes('googleusercontent.com')
    );
}

/** فقط CDNهای پروفایل شناخته‌شده — برای پروکسی تصویر در API (کاهش SSRF) */
const PROFILE_PIC_PROXY_HOST_SUFFIXES = [
    'whatsapp.net',
    'fbcdn.net',
    'facebook.com',
    'instagram.com',
    'cdninstagram.com',
    'googleusercontent.com',
];

function isAllowedProfilePicCdnHost(hostname) {
    if (!hostname || typeof hostname !== 'string') return false;
    const h = hostname.toLowerCase();
    return PROFILE_PIC_PROXY_HOST_SUFFIXES.some((suffix) => h === suffix || h.endsWith('.' + suffix));
}

/**
 * اگر مشتری واتساپ است و عکس محلی ندارد (یا لینک CDN احتمالاً منقضی است)، از Gateway عکس پروفایل بگیرد و ذخیره کند.
 * @param {import('sequelize').Model} customer — نمونهٔ Customer با id, phone, source, profilePic
 * @returns {Promise<string|null>} مقدار جدید profilePic در صورت به‌روزرسانی، وگرنه null
 */
async function maybeRefreshWhatsappCustomerAvatar(customer) {
    if (!customer || !customer.id) return null;
    const phoneDigits = digitsOnlyChatPhone(customer.phone);
    if (!phoneDigits) return null;
    if (!/@g\.us$/i.test(phoneDigits) && phoneDigits.length < 8) return null;
    const src = String(customer.source || '').toLowerCase();
    /* web: معمولاً شمارهٔ واتساپ نیست — واکشی پروفایل WA بی‌معنی */
    if (src === 'web') return null;
    /* manual با عکس ذخیره‌شده: دست‌کاری نکن؛ بدون عکس مثل واتساپ از گیت‌وی تلاش کن */
    const pic = String(customer.profilePic || '').trim();
    if (src === 'manual' && pic) return null;

    if (isAlreadyLocalPath(pic)) return null;

    const now = Date.now();
    const last = _waAvatarRefreshAt.get(customer.id) || 0;
    const minGap = pic
        ? (looksLikeExpiringCdnProfilePic(pic) ? 90 * 1000 : 10 * 60 * 1000)
        : 45 * 1000;
    if (last && now - last < minGap) return null;
    _waAvatarRefreshAt.set(customer.id, now);

    let remoteUrl = '';
    try {
        const { gatewayGet } = require('./gatewayClient');
        const qs = /@g\.us$/i.test(phoneDigits)
            ? 'chatId=' + encodeURIComponent(phoneDigits)
            : 'phone=' + encodeURIComponent(phoneDigits);
        const res = await gatewayGet('/api/contacts/profile-pic?' + qs, { timeout: 5000 });
        remoteUrl = (res && res.data && res.data.profilePicUrl) ? String(res.data.profilePicUrl).trim() : '';
    } catch (_) {
        return null;
    }
    if (!remoteUrl) return null;

    try {
        const persisted = await persistRemoteAvatarIfNeeded(customer.id, remoteUrl);
        const finalPic = persisted || remoteUrl;
        if (!finalPic || finalPic === pic) return null;
        await customer.update({ profilePic: finalPic });
        return finalPic;
    } catch (_) {
        return null;
    }
}

module.exports = {
    downloadAvatarToUploads,
    persistRemoteAvatarIfNeeded,
    isAlreadyLocalPath,
    digitsOnlyChatPhone,
    maybeRefreshWhatsappCustomerAvatar,
    isSafeRemoteUrl,
    isAllowedProfilePicCdnHost,
};
