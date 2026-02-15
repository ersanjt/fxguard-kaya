const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { logActivity } = require('../services/activityLog');

router.post('/login', async (req, res) => {
    try {
        const email = (req.body.email || '').toString().trim().toLowerCase();
        const password = req.body.password;
        if (!email || !password) {
            return res.status(400).json({ error: 'ایمیل و رمز عبور الزامی است' });
        }
        if (email.length > 255) return res.status(400).json({ error: 'ایمیل نامعتبر است' });
        const user = await User.findOne({ where: { email, isActive: true } });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
        }
        const now = new Date();
        await user.update({ lastLoginAt: now, status: 'online' });
        await logActivity({
            userId: user.id,
            branchId: user.branchId || null,
            departmentId: user.departmentId || null,
            action: 'user_login',
            entityType: 'user',
            entityId: user.id,
            summary: 'ورود به پورتال کارکنان کایا',
            metadata: {
                ip: req.ip || req.connection?.remoteAddress,
                userAgent: (req.get && req.get('user-agent')) || null,
                email: user.email
            }
        });
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'default-secret',
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                departmentId: user.departmentId,
                branchId: user.branchId,
                status: 'online'
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'توکن یافت نشد' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
        const user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
        if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
        res.json(user);
    } catch (err) {
        res.status(401).json({ error: 'توکن نامعتبر است' });
    }
});

const { authMiddleware } = require('../middleware/auth');
router.post('/logout', authMiddleware, async (req, res) => {
    try {
        await req.user.update({ status: 'offline' });
        res.json({ ok: true, message: 'خروج انجام شد' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch('/me/presence', authMiddleware, async (req, res) => {
    try {
        const status = req.body.status;
        if (status && ['online', 'away', 'busy', 'offline'].indexOf(status) !== -1) {
            await req.user.update({ status });
        }
        res.json({ ok: true, status: req.user.status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
