require('dotenv').config();
const models = require('./models');
const { User, Department, sequelize } = models;
const { MAIN_ADMIN_EMAIL } = require('./lib/permissions');
const { ensureDefaultDepartments } = require('./services/defaultDepartments');

const ADMIN_USERNAME = 'Admin';
const ADMIN_NAME = 'Admin';
const ADMIN_PASSWORD = '2468097531KayaFx';

async function seed() {
    try {
        await models.sequelize.authenticate();
        await ensureDefaultDepartments();
        const adminEmailLower = MAIN_ADMIN_EMAIL.toLowerCase();
        let existing = await User.findOne({
            where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), adminEmailLower)
        });
        if (!existing) {
            await User.create({
                name: ADMIN_NAME,
                username: ADMIN_USERNAME,
                email: adminEmailLower,
                password: ADMIN_PASSWORD,
                role: 'owner',
                branchId: null,
                departmentId: null,
                isActive: true
            });
            console.log('✅ کاربر ادمین اصلی ایجاد شد: ' + adminEmailLower);
        } else {
            existing.name = ADMIN_NAME;
            existing.username = ADMIN_USERNAME;
            existing.password = ADMIN_PASSWORD;
            existing.role = 'owner';
            existing.isActive = true;
            existing.branchId = null;
            existing.departmentId = null;
            await existing.save();
            console.log('✅ کاربر ادمین اصلی به‌روزرسانی شد: ' + existing.email);
        }
        process.exit(0);
    } catch (err) {
        console.error('خطا در seed:', err);
        process.exit(1);
    }
}

seed();
