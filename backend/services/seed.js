/**
 * ایجاد کاربران ادمین اصلی و دپارتمان پیش‌فرض
 */
const models = require('../models');
const { sequelize, User, Department } = models;

async function ensureAdminUser(MAIN_ADMIN_EMAIL, MAIN_ADMIN_PASSWORD, logger) {
    const MAIN_ADMIN_EMAILS_LIST = MAIN_ADMIN_EMAIL.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const ADMIN_CONFIGS = MAIN_ADMIN_EMAIL.split(',').map(e => {
        const email = e.trim().toLowerCase();
        const name = email.split('@')[0];
        return { email, name, username: name, password: MAIN_ADMIN_PASSWORD };
    });

    try {
        let dept = await Department.findOne({ where: { isDefault: true } });
        if (!dept) {
            dept = await Department.create({
                name: 'پشتیبانی',
                description: 'دپارتمان پیش‌فرض',
                keywords: 'پشتیبانی,مشکل,راهنما',
                isDefault: true,
                isActive: true,
                color: '#3498db'
            });
            logger.info('✅ دپارتمان پیش‌فرض ایجاد شد');
        }
        for (const cfg of ADMIN_CONFIGS) {
            if (!MAIN_ADMIN_EMAILS_LIST.includes(cfg.email)) continue;
            let existing = await User.findOne({
                where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), cfg.email)
            });
            if (!existing) {
                await User.create({
                    name: cfg.name,
                    username: cfg.username,
                    email: cfg.email,
                    password: cfg.password,
                    role: 'owner',
                    branchId: null,
                    departmentId: null,
                    isActive: true
                });
                logger.info('✅ کاربر ادمین اصلی ایجاد شد: ' + cfg.email);
            } else {
                let changed = false;
                if (existing.role !== 'owner') { existing.role = 'owner'; changed = true; }
                if (!existing.isActive) { existing.isActive = true; changed = true; }
                if (changed) {
                    await existing.save();
                    logger.info('✅ ادمین اصلی به‌روز شد: ' + existing.email);
                }
            }
        }
    } catch (err) {
        logger.warn('⚠️ ensureAdminUser:', err.message);
    }
}

module.exports = { ensureAdminUser };
