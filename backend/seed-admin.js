require('dotenv').config();
const models = require('./models');
const { User, Department, sequelize } = models;
const { MAIN_ADMIN_EMAIL } = require('./lib/permissions');

async function seed() {
    try {
        await models.sequelize.authenticate();
        // جدول‌ها با اجرای سرور (server.js) ساخته می‌شوند؛ اینجا فقط ادمین را ایجاد/به‌روز می‌کنیم
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
            console.log('✅ دپارتمان پیش‌فرض ایجاد شد');
        }
        const adminEmailLower = MAIN_ADMIN_EMAIL.toLowerCase();
        let existing = await User.findOne({
            where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), adminEmailLower)
        });
        if (!existing) {
            await User.create({
                name: 'مدیر سیستم',
                email: adminEmailLower,
                password: '20231030',
                role: 'owner',
                branchId: null,
                departmentId: dept.id,
                isActive: true
            });
            console.log('✅ کاربر ادمین اصلی ایجاد شد: ' + adminEmailLower);
        } else {
            existing.password = '20231030';
            existing.role = 'owner';
            existing.isActive = true;
            existing.branchId = null;
            await existing.save();
            console.log('✅ کاربر ادمین اصلی به‌روزرسانی شد (رمز 20231030، نقش owner، فعال): ' + existing.email);
        }
        process.exit(0);
    } catch (err) {
        console.error('خطا در seed:', err);
        process.exit(1);
    }
}

seed();
