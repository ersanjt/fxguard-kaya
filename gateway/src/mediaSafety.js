'use strict';

const dns = require('dns').promises;
const net = require('net');

const BLOCKED_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    'metadata.google.internal',
    'metadata.google',
]);

function ipv4ToInt(ip) {
    const p = String(ip)
        .split('.')
        .map((n) => Number(n));
    if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    return (((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]) >>> 0;
}

function isBlockedIp(ip) {
    const raw = String(ip || '')
        .toLowerCase()
        .replace(/^\[|\]$/g, '');
    if (!raw) return true;
    if (raw === '::1' || raw.startsWith('fe80:') || raw.startsWith('fc') || raw.startsWith('fd'))
        return true;
    const v4 = raw.startsWith('::ffff:') ? raw.slice(7) : raw;
    if (net.isIP(v4) !== 4) return net.isIP(raw) === 0;
    const n = ipv4ToInt(v4);
    if (n == null) return true;
    const a = (n >>> 24) & 255;
    const b = (n >>> 16) & 255;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
}

function hostnameBlocked(host) {
    const h = String(host || '')
        .toLowerCase()
        .replace(/\.$/, '');
    if (!h || BLOCKED_HOSTS.has(h) || h.endsWith('.local') || h.endsWith('.internal')) return true;
    if (net.isIP(h)) return isBlockedIp(h);
    return false;
}

/**
 * چک نام میزبان قبل از DNS. false = ناامن.
 * @param {string} url
 * @param {{ mediaAllowLocalhost?: boolean, mediaUrlWhitelist?: string[] }} [opts]
 */
function isSafeMediaUrl(url, opts = {}) {
    if (!url || typeof url !== 'string') return false;
    try {
        const u = new URL(url.trim());
        if (!['http:', 'https:'].includes(u.protocol)) return false;
        const host = u.hostname.toLowerCase();
        const whitelist = opts.mediaUrlWhitelist || [];
        if (whitelist.length > 0) {
            return whitelist.some((d) => host === d || host.endsWith('.' + d));
        }
        if (opts.mediaAllowLocalhost && (host === 'localhost' || host === '127.0.0.1')) return true;
        if (hostnameBlocked(host)) return false;
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * بعد از resolve، IP واقعی را چک می‌کند (DNS rebinding / metadata).
 * @returns {Promise<boolean>}
 */
async function isSafeMediaUrlResolved(url, opts = {}) {
    if (!isSafeMediaUrl(url, opts)) return false;
    const u = new URL(String(url).trim());
    const host = u.hostname.toLowerCase();
    if (opts.mediaAllowLocalhost && (host === 'localhost' || host === '127.0.0.1')) return true;
    if (net.isIP(host)) return !isBlockedIp(host);
    let records;
    try {
        records = await dns.lookup(host, { all: true, verbatim: true });
    } catch (_) {
        return false;
    }
    if (!records || !records.length) return false;
    return records.every((r) => r && r.address && !isBlockedIp(r.address));
}

module.exports = {
    isBlockedIp,
    isSafeMediaUrl,
    isSafeMediaUrlResolved,
};
