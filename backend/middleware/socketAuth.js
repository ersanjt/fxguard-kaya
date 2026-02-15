const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
        if (!token) {
            socket.userId = null;
            socket.departmentId = null;
            return next();
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
        const user = await User.findByPk(decoded.id || decoded.userId);
        if (user && user.isActive) {
            socket.userId = user.id;
            socket.departmentId = user.departmentId;
        } else {
            socket.userId = null;
            socket.departmentId = null;
        }
        next();
    } catch (err) {
        socket.userId = null;
        socket.departmentId = null;
        next();
    }
};
