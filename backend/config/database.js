require('dotenv').config();
const path = require('path');

const useSqlite = process.env.USE_SQLITE === 'true' || process.env.USE_SQLITE === '1';
// DATABASE_URL برای Railway, Render, Neon — در models/index.js از process.env خوانده می‌شود
// مسیر ثابت نسبت به پوشه backend تا seed و سرور هر دو همان فایل را استفاده کنند
const sqliteStorage = path.join(__dirname, '..', 'database.sqlite');

module.exports = {
  development: useSqlite
    ? { storage: sqliteStorage, dialect: 'sqlite', logging: false }
    : {
        database: process.env.DB_NAME || 'whatsapp_crm',
        username: process.env.DB_USER || 'crm_user',
        password: process.env.DB_PASSWORD || null,
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres'
      },
  production: useSqlite
    ? { storage: sqliteStorage, dialect: 'sqlite', logging: false }
    : {
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        pool: {
            max: parseInt(process.env.DB_POOL_MAX) || 10,
            min: parseInt(process.env.DB_POOL_MIN) || 2,
            acquire: 30000,
            idle: 10000
        },
        dialectOptions: process.env.DB_SSL === 'false' ? {} : {
            ssl: { require: true, rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
        }
      },
  test: { storage: ':memory:', dialect: 'sqlite', logging: false }
};
