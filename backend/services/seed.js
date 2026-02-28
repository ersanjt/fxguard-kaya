/**
 * ایجاد کاربران ادمین اصلی و دپارتمان پیش‌فرض
 *
 * فرمت MAIN_ADMIN_EMAIL:
 *   - تک ادمین:    admin@example.com
 *   - چند ادمین:   admin1@example.com,admin2@example.com
 *   - رمز جداگانه: admin1@example.com:Pass1!,admin2@example.com:Pass2!
 *   اگر رمز جداگانه داده نشود، MAIN_ADMIN_PASSWORD برای همه استفاده می‌شود.
 */
const models = require('../models');
const { sequelize, User, Department } = models;

async function ensureAdminUser(MAIN_ADMIN_EMAIL, MAIN_ADMIN_PASSWORD, logger) {
    const ADMIN_CONFIGS = MAIN_ADMIN_EMAIL.split(',').map(entry => {
        const parts = entry.trim().split(':');
        if (parts.length >= 3) {
            // فرمت email:password — ایمیل‌هایی که شامل : نیستند (مثل user@host:port)
            // آخرین بخش رمز است، بقیه ایمیل
            const password = parts.pop();
            const email = parts.join(':').toLowerCase();
            const name = email.split('@')[0];
            return { email, name, username: name, password };
        } else if (parts.length === 2 && parts[0].includes('@')) {
            const [email, password] = parts;
            const emailLower = email.trim().toLowerCase();
            const name = emailLower.split('@')[0];
            return { email: emailLower, name, username: name, password: password.trim() };
        } else {
            const email = entry.trim().toLowerCase();
            const name = email.split('@')[0];
            return { email, name, username: name, password: MAIN_ADMIN_PASSWORD };
        }
    }).filter(cfg => cfg.email && cfg.password);

    const MAIN_ADMIN_EMAILS_LIST = ADMIN_CONFIGS.map(c => c.email);

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
