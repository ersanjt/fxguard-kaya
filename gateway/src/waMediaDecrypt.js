'use strict';

const crypto = require('crypto');
const axios = require('axios');

const HKDF_INFO = {
    image: 'WhatsApp Image Keys',
    sticker: 'WhatsApp Image Keys',
    video: 'WhatsApp Video Keys',
    audio: 'WhatsApp Audio Keys',
    ptt: 'WhatsApp Audio Keys',
    document: 'WhatsApp Document Keys',
};

function mediaKeyToBuffer(mediaKeyB64) {
    const raw = String(mediaKeyB64 || '').trim();
    if (!raw) throw new Error('media_key_missing');
    let ikm = Buffer.from(raw, 'base64');
    if (ikm.length < 16) {
        ikm = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    }
    if (ikm.length < 16 && /^[0-9a-f]+$/i.test(raw)) {
        ikm = Buffer.from(raw, 'hex');
    }
    if (ikm.length < 16) throw new Error('media_key_or_body_too_small');
    return ikm;
}

function hkdfExpand(ikm, info, length) {
    return Buffer.from(crypto.hkdfSync('sha256', ikm, Buffer.alloc(32), String(info), length));
}

function decryptWhatsAppEnc(encBuf, mediaKeyB64, type) {
    const ikm = mediaKeyToBuffer(mediaKeyB64);
    if (encBuf.length < 32) {
        throw new Error('media_key_or_body_too_small');
    }
    const infos = [HKDF_INFO[type] || HKDF_INFO.document];
    if (type === 'sticker') infos.push('WhatsApp Sticker Keys', 'WhatsApp Image Keys');
    if (type === 'ptt') infos.push('WhatsApp Audio Keys');
    const file = encBuf.subarray(0, encBuf.length - 10);
    let lastErr;
    for (const info of [...new Set(infos)]) {
        try {
            const expanded = hkdfExpand(ikm, info, 112);
            const iv = expanded.subarray(0, 16);
            const key = expanded.subarray(16, 48);
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            return Buffer.concat([decipher.update(file), decipher.final()]);
        } catch (err) {
            lastErr = err;
        }
    }
    throw lastErr || new Error('decrypt_failed');
}

function candidateUrls(meta) {
    const out = [];
    for (const u of [meta.url, meta.deprecatedMms3Url, meta.mediaUrl]) {
        if (u && /^https?:\/\//i.test(String(u))) out.push(String(u));
    }
    if (meta.directPath) {
        const p = String(meta.directPath).startsWith('/')
            ? String(meta.directPath)
            : `/${meta.directPath}`;
        out.push(`https://mmg.whatsapp.net${p}`);
        out.push(`https://media.fna.whatsapp.net${p}`);
    }
    return [...new Set(out)];
}

async function downloadAndDecryptWhatsAppMedia(meta) {
    if (!meta || !meta.mediaKey) return { error: 'no_media_key' };
    const type = String(meta.type || 'document').toLowerCase();
    const attempts = [];
    for (const url of candidateUrls(meta)) {
        try {
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 20000,
                maxContentLength: 25 * 1024 * 1024,
                validateStatus: () => true,
                maxRedirects: 5,
                headers: {
                    Origin: 'https://web.whatsapp.com',
                    Referer: 'https://web.whatsapp.com/',
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
            });
            if (res.status < 200 || res.status >= 300 || !res.data) {
                attempts.push({ status: res.status });
                continue;
            }
            const enc = Buffer.from(res.data);
            if (enc.length < 32) {
                attempts.push({ status: res.status, error: 'body_too_small' });
                continue;
            }
            try {
                const plain = decryptWhatsAppEnc(enc, meta.mediaKey, type);
                if (!plain || plain.length < 16) {
                    attempts.push({ status: res.status, error: 'plain_too_small' });
                    continue;
                }
                return {
                    data: plain.toString('base64'),
                    mimetype: meta.mimetype || null,
                    filename: meta.filename || null,
                };
            } catch (err) {
                attempts.push({
                    status: res.status,
                    error: (err && err.message) || 'decrypt_failed',
                });
            }
        } catch (err) {
            attempts.push({ error: (err && err.message) || 'fetch_failed' });
        }
    }
    return { error: 'cdn_miss', attempts };
}

module.exports = { downloadAndDecryptWhatsAppMedia, decryptWhatsAppEnc };
