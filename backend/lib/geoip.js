/**
 * دریافت کشور از آدرس IP — برای نمایش در لاگ ورودها
 */
const net = require('net');

let geoip = null;
try {
    geoip = require('geoip-lite');
} catch (_) {
    geoip = null;
}

/**
 * @param {string} ip - آدرس IP (مثلاً از req.ip)
 * @returns {string|null} - کد کشور ISO (مثلاً IR, US) یا null برای localhost/نامعتبر
 */
function getCountryFromIp(ip) {
    if (!ip || typeof ip !== 'string') return null;
    let trimmed = ip.trim();
    if (trimmed.startsWith('::ffff:')) trimmed = trimmed.slice(7);
    if (!trimmed || !net.isIP(trimmed)) return null;
    // بعضی resolverها octet دارای صفر ابتدایی را octal می‌خوانند؛ قبل از geoip ردش کن.
    if (
        net.isIPv4(trimmed) &&
        trimmed.split('.').some((part) => part.length > 1 && part.startsWith('0'))
    ) {
        return null;
    }
    // localhost / private
    if (trimmed === '::1' || trimmed === '127.0.0.1') return null;
    if (!geoip) return null;
    try {
        const geo = geoip.lookup(trimmed);
        return geo && geo.country ? geo.country : null;
    } catch (_) {
        return null;
    }
}

module.exports = { getCountryFromIp };
