require('dotenv').config();
const models = require('./models');
const { User, Department } = models;

async function seed() {
    try {
        await models.sequelize.authenticate();
        await models.sequelize.sync({ alter: true });
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
        const existing = await User.findOne({ where: { email: 'admin@company.com' } });
        if (!existing) {
            await User.create({
                name: 'مدیر سیستم',
                email: 'admin@company.com',
                password: 'Admin@123',
                role: 'admin',
                departmentId: dept.id,
                isActive: true
            });
            console.log('✅ کاربر ادمین ایجاد شد: admin@company.com / Admin@123');
        } else {
            console.log('ℹ️ کاربر ادمین از قبل وجود دارد');
        }
        process.exit(0);
    } catch (err) {
        console.error('خطا در seed:', err);
        process.exit(1);
    }
}

seed();
