/**
 * دریافت کشور از آدرس IP — برای نمایش در لاگ ورودها
 */
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
    const trimmed = ip.trim();
    if (!trimmed) return null;
    // localhost / private
    if (/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(trimmed)) return null;
    if (!geoip) return null;
    try {
        const geo = geoip.lookup(trimmed);
        return geo && geo.country ? geo.country : null;
    } catch (_) {
        return null;
    }
}

module.exports = { getCountryFromIp };
