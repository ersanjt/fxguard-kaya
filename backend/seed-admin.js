require('dotenv').config();
const models = require('./models');
const { User, Department, sequelize } = models;
const { MAIN_ADMIN_EMAILS } = require('./lib/permissions');
const { ensureDefaultDepartments } = require('./services/defaultDepartments');

const ADMIN_PASSWORD = '2468097531KayaFx';

const ADMIN_CONFIGS = [
    { email: 'admin@kaya.fxguard.io', name: 'Admin', username: 'Admin' },
    { email: 'ersanjahedtabrizi@gmail.com', name: 'Ersan', username: 'Ersan' },
];

async function seed() {
    try {
        await models.sequelize.authenticate();
        await ensureDefaultDepartments();
        for (const cfg of ADMIN_CONFIGS) {
            if (!MAIN_ADMIN_EMAILS.includes(cfg.email)) continue;
            let existing = await User.findOne({
                where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), cfg.email)
            });
            if (!existing) {
                await User.create({
                    name: cfg.name,
                    username: cfg.username,
                    email: cfg.email,
                    password: ADMIN_PASSWORD,
                    role: 'owner',
                    branchId: null,
                    departmentId: null,
                    isActive: true
                });
                console.log('✅ کاربر ادمین اصلی ایجاد شد: ' + cfg.email);
            } else {
                existing.name = cfg.name;
                existing.username = cfg.username;
                existing.password = ADMIN_PASSWORD;
                existing.role = 'owner';
                existing.isActive = true;
                existing.branchId = null;
                existing.departmentId = null;
                await existing.save();
                console.log('✅ کاربر ادمین اصلی به‌روزرسانی شد: ' + existing.email);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error('خطا در seed:', err);
        process.exit(1);
    }
}

seed();
