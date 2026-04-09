const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { isDemoModeEnabled, isPublicAppHostName } = require('../lib/demoAuth');

function socketHandshakeHost(socket) {
    try {
        const forwarded = (socket.handshake.headers && socket.handshake.headers['x-forwarded-host']) || '';
        const raw = (forwarded || (socket.handshake.headers && socket.handshake.headers.host) || '').toString();
        return raw.split(',')[0].trim().split(':')[0].toLowerCase();
    } catch (_) {
        return '';
    }
}

module.exports = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
        if (!token) {
            return next(new Error('احراز هویت الزامی است'));
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const onPublicDemoHost = isPublicAppHostName(socketHandshakeHost(socket));
        if (onPublicDemoHost) {
            if (!isDemoModeEnabled() || !decoded || !decoded.isDemo) {
                return next(new Error('اتصال زنده فقط با حساب دمو روی این دامنه مجاز است.'));
            }
            socket.userId = 'demo-user';
            socket.departmentId = null;
            socket.userRole = 'agent';
            socket.isDemo = true;
            return next();
        }
        if (decoded && decoded.isDemo) {
            return next(new Error('حساب دمو فقط روی دامنهٔ پیش‌نمایش (Public Demo) قابل استفاده است.'));
        }
        const user = await User.findByPk(decoded.id || decoded.userId);
        if (!user || !user.isActive) {
            return next(new Error('کاربر نامعتبر یا غیرفعال است'));
        }
        socket.userId = user.id;
        socket.departmentId = user.departmentId;
        socket.userRole = user.role;
        next();
    } catch (err) {
        next(new Error('توکن نامعتبر یا منقضی'));
    }
};
