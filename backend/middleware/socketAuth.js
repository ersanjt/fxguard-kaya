const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
        if (!token) {
            return next(new Error('احراز هویت الزامی است'));
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.totpStep) {
            return next(new Error('احراز دو مرحله‌ای تکمیل نشده است'));
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
