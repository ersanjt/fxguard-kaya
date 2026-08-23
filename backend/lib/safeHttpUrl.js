'use strict';

const net = require('net');
const dns = require('dns').promises;

function ipv4Octets(ip) {
    const parts = String(ip || '').split('.');
    if (parts.length !== 4) return null;
    const nums = parts.map((p) => Number(p));
    if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    return nums;
}

function isPrivateIp(ip) {
    const raw = String(ip || '').trim().replace(/^::ffff:/i, '');
    if (!raw) return true;
    if (raw === '::1' || raw === '0:0:0:0:0:0:0:1') return true;
    if (raw.toLowerCase().startsWith('fe80:') || raw.toLowerCase().startsWith('fc') || raw.toLowerCase().startsWith('fd')) {
        return true;
    }
    const oct = ipv4Octets(raw);
    if (!oct) {
        return net.isIP(raw) === 6;
    }
    const [a, b] = oct;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    return false;
}

function isBlockedHostname(host) {
    const h = String(host || '').trim().toLowerCase().replace(/\.$/, '');
    if (!h) return true;
    if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true;
    if (h === 'metadata.google.internal' || h.endsWith('.internal')) return true;
    if (h === '169.254.169.254') return true;
    return false;
}

async function assertSafeHttpUrl(rawUrl) {
    let parsed;
    try {
        parsed = new URL(String(rawUrl || '').trim());
    } catch (_) {
        const err = new Error('invalid url');
        err.code = 'UNSAFE_URL';
        throw err;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        const err = new Error('invalid protocol');
        err.code = 'UNSAFE_URL';
        throw err;
    }
    const host = parsed.hostname;
    if (isBlockedHostname(host) || isPrivateIp(host)) {
        const err = new Error('private host');
        err.code = 'UNSAFE_URL';
        throw err;
    }
    let records;
    try {
        records = await dns.lookup(host, { all: true });
    } catch (_) {
        const err = new Error('unresolvable host');
        err.code = 'UNSAFE_URL';
        throw err;
    }
    if (!records || !records.length) {
        const err = new Error('unresolvable host');
        err.code = 'UNSAFE_URL';
        throw err;
    }
    for (const rec of records) {
        if (isPrivateIp(rec.address)) {
            const err = new Error('private ip');
            err.code = 'UNSAFE_URL';
            throw err;
        }
    }
    return parsed.href;
}

function axiosRedirectGuard(options) {
    const href = options && (options.href || options.url);
    if (!href) {
        const err = new Error('redirect without url');
        err.code = 'UNSAFE_URL';
        throw err;
    }
    const parsed = new URL(String(href), options.baseURL || undefined);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        const err = new Error('invalid protocol');
        err.code = 'UNSAFE_URL';
        throw err;
    }
    if (isBlockedHostname(parsed.hostname) || isPrivateIp(parsed.hostname)) {
        const err = new Error('private redirect');
        err.code = 'UNSAFE_URL';
        throw err;
    }
}

module.exports = {
    isPrivateIp,
    isBlockedHostname,
    assertSafeHttpUrl,
    axiosRedirectGuard,
};
