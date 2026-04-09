/**
 * دانلود آواتار مشتری از URL راه‌دور و ذخیره در uploads تا لینک‌های منقضی‌شوندهٔ واتساپ/متا نشکنند.
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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
    let u = String(raw || '').trim();
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
            validateStatus: (s) => s === 200,
            headers: {
                Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (compatible; KayaCRM/1.0; +https://github.com/ersanjt/kayaCRM)',
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

module.exports = {
    downloadAvatarToUploads,
    persistRemoteAvatarIfNeeded,
    isAlreadyLocalPath,
};
