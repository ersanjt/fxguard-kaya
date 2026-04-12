/**
 * تنظیمات CORS و origins مجاز
 * در غیر production، مبداهای رایج dev (Vite 5173، localhost/127.0.0.1) همیشه اضافه می‌شوند
 * تا درخواست مستقیم از مرورگر به API قطع نشود.
 */
function parseList(raw) {
    return String(raw || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

const fromEnv = parseList(
    process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3002'
);

const devExtras = parseList(
    process.env.CORS_ORIGINS_EXTRA ||
        'http://127.0.0.1:3000,http://127.0.0.1:3002,http://localhost:5173,http://127.0.0.1:5173'
);

const allowedOrigins =
    process.env.NODE_ENV === 'production'
        ? fromEnv
        : [...new Set([...fromEnv, ...devExtras])];

module.exports = { allowedOrigins };
