const jwt = require('jsonwebtoken');
const { User } = require('../models');

async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'توکن یافت نشد' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
        const user = await User.findByPk(decoded.id, {
            include: [
                { association: 'branch', required: false },
                { association: 'department', required: false }
            ]
        });
        if (!user || !user.isActive) return res.status(401).json({ error: 'کاربر نامعتبر' });
        req.user = user;
        req.userId = user.id;
        req.isOwner = user.role === 'owner';
        next();
    } catch (err) {
        return res.status(401).json({ error: 'توکن نامعتبر یا منقضی' });
    }
}

module.exports = { authMiddleware };
