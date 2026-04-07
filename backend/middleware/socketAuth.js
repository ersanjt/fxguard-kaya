const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { isDemoModeEnabled } = require('../lib/demoAuth');

module.exports = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
        if (!token) {
            return next(new Error('احراز هویت الزامی است'));
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.isDemo && isDemoModeEnabled()) {
            socket.userId = 'demo-user';
            socket.departmentId = null;
            socket.userRole = 'agent';
            socket.isDemo = true;
            return next();
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
