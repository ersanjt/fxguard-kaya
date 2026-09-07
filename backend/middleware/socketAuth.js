const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { assertMatchingTokenVersion } = require('../lib/staffSession');
const { COOKIE_NAME } = require('../lib/authCookie');

function tokenFromCookieHeader(cookieHeader) {
    const raw = String(cookieHeader || '');
    const parts = raw.split(';');
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const idx = part.indexOf('=');
        if (idx < 0) continue;
        const name = part.slice(0, idx).trim();
        if (name !== COOKIE_NAME) continue;
        let val = part.slice(idx + 1).trim();
        try {
            val = decodeURIComponent(val);
        } catch (_) { /* keep raw */ }
        return val;
    }
    return '';
}

function collectHandshakeTokens(socket) {
    const tokens = [];
    const cookieTok = tokenFromCookieHeader(socket.handshake.headers && socket.handshake.headers.cookie);
    if (cookieTok) tokens.push(cookieTok);
    const authTok = socket.handshake.auth && socket.handshake.auth.token
        ? String(socket.handshake.auth.token).trim()
        : '';
    if (authTok && tokens.indexOf(authTok) === -1) tokens.push(authTok);
    const header = socket.handshake.headers && socket.handshake.headers.authorization
        ? String(socket.handshake.headers.authorization)
        : '';
    if (header.toLowerCase().startsWith('bearer ')) {
        const bearer = header.slice(7).trim();
        if (bearer && tokens.indexOf(bearer) === -1) tokens.push(bearer);
    }
    return tokens;
}

module.exports = async (socket, next) => {
    try {
        const tokens = collectHandshakeTokens(socket);
        if (!tokens.length) {
            return next(new Error('احراز هویت الزامی است'));
        }
        let lastErr = null;
        for (let i = 0; i < tokens.length; i++) {
            try {
                const decoded = jwt.verify(tokens[i], process.env.JWT_SECRET);
                if (decoded.totpStep) {
                    lastErr = new Error('احراز دو مرحله‌ای تکمیل نشده است');
                    continue;
                }
                const user = await User.findByPk(decoded.id || decoded.userId);
                if (!user || !user.isActive) {
                    lastErr = new Error('کاربر نامعتبر یا غیرفعال است');
                    continue;
                }
                try {
                    assertMatchingTokenVersion(decoded, user);
                } catch (_) {
                    lastErr = new Error('نشست باطل شده است');
                    continue;
                }
                socket.userId = user.id;
                socket.departmentId = user.departmentId;
                socket.userRole = user.role;
                socket.user = user;
                return next();
            } catch (err) {
                lastErr = err;
            }
        }
        next(lastErr || new Error('توکن نامعتبر یا منقضی'));
    } catch (err) {
        next(new Error('توکن نامعتبر یا منقضی'));
    }
};
