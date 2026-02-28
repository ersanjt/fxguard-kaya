require('dotenv').config();
const path = require('path');

const useSqlite = process.env.USE_SQLITE === 'true' || process.env.USE_SQLITE === '1';
// DATABASE_URL برای Railway, Render, Neon و غیره — در models/index.js استفاده می‌شود
const databaseUrl = process.env.DATABASE_URL;
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
        dialect: 'postgres'
      },
  test: { storage: ':memory:', dialect: 'sqlite', logging: false }
};
