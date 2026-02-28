/**
 * تنظیمات CORS و origins مجاز
 */
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3002')
    .split(',')
    .map(s => s.trim());

module.exports = { allowedOrigins };
