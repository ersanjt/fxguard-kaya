/**
 * GET /api/customers/:id/avatar — آواتار مشتری (محلی، واکشی از واتساپ، یا placeholder)
 */
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { Customer } = require('../models');
const { isValidUUID } = require('../lib/validation');
const { canAccessCustomer } = require('../lib/customerAccess');
const {
    isAlreadyLocalPath,
    maybeRefreshWhatsappCustomerAvatar,
    isSafeRemoteUrl,
    isAllowedProfilePicCdnHost,
} = require('../lib/customerAvatar');
const { sendPlaceholderPng, upstreamHeadersForProfilePic } = require('./profileImage');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const MAX_BYTES = 5 * 1024 * 1024;

function mimeFromExt(ext) {
    const e = String(ext || '').toLowerCase();
    if (e === '.png') return 'image/png';
    if (e === '.webp') return 'image/webp';
    if (e === '.gif') return 'image/gif';
    if (e === '.svg') return 'image/svg+xml';
    return 'image/jpeg';
}

function resolveUploadPath(publicPath) {
    const rel = String(publicPath || '')
        .replace(/^\/uploads\/?/, '')
        .replace(/^\/+/, '');
    if (!rel || rel.includes('..')) return null;
    const root = path.resolve(uploadsDir) + path.sep;
    const full = path.resolve(uploadsDir, rel);
    if (full !== path.resolve(uploadsDir) && !full.startsWith(root)) return null;
    return full;
}

async function fetchRemoteProfileImage(rawUrl) {
    const u = new URL(rawUrl);
    const response = await axios.get(rawUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
        maxContentLength: MAX_BYTES,
        maxBodyLength: MAX_BYTES,
        maxRedirects: 5,
        validateStatus: (s) => s >= 200 && s < 400,
        headers: upstreamHeadersForProfilePic(u.hostname),
    });
    const ct = (response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (!ct.startsWith('image/')) return null;
    const buf = Buffer.from(response.data);
    if (buf.length < 16 || buf.length > MAX_BYTES) return null;
    return { buf, ct };
}

async function getCustomerAvatar(req, res) {
    if (!req.canAccess('customers') && !req.canAccess('conversations')) {
        return res.status(403).json({ error: 'دسترسی ندارید' });
    }
    if (!isValidUUID(req.params.id)) {
        return res.status(400).json({ error: 'شناسه نامعتبر است' });
    }

    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).end();

    const allowed = await canAccessCustomer(req, customer.id);
    if (!allowed) return res.status(403).end();

    try {
        await maybeRefreshWhatsappCustomerAvatar(customer);
        await customer.reload();
    } catch (_) {}

    let pic = String(customer.profilePic || '').trim();

    if (isAlreadyLocalPath(pic)) {
        const filePath = resolveUploadPath(pic);
        if (filePath && fs.existsSync(filePath)) {
            res.setHeader('Cache-Control', 'private, max-age=600');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.type(mimeFromExt(path.extname(filePath)));
            return res.sendFile(filePath);
        }
    }

    if (pic && /^https?:\/\//i.test(pic) && isSafeRemoteUrl(pic)) {
        try {
            const u = new URL(pic);
            if (isAllowedProfilePicCdnHost(u.hostname)) {
                const fetched = await fetchRemoteProfileImage(pic);
                if (fetched) {
                    res.setHeader('Cache-Control', 'private, max-age=300');
                    res.setHeader('X-Content-Type-Options', 'nosniff');
                    res.type(fetched.ct);
                    return res.send(fetched.buf);
                }
            }
        } catch (_) {}
    }

    if (pic.startsWith('data:image/')) {
        const m = pic.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
        if (m) {
            try {
                const buf = Buffer.from(m[2].replace(/\s/g, ''), 'base64');
                if (buf.length >= 32 && buf.length <= MAX_BYTES) {
                    res.setHeader('Cache-Control', 'private, max-age=300');
                    res.setHeader('X-Content-Type-Options', 'nosniff');
                    res.type(m[1]);
                    return res.send(buf);
                }
            } catch (_) {}
        }
    }

    return sendPlaceholderPng(res);
}

module.exports = { getCustomerAvatar };
