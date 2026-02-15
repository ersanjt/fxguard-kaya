require('dotenv').config();

const useSqlite = process.env.USE_SQLITE === 'true' || process.env.USE_SQLITE === '1';
// DATABASE_URL برای Railway, Render, Neon و غیره — در models/index.js استفاده می‌شود
const databaseUrl = process.env.DATABASE_URL;

module.exports = {
  development: useSqlite
    ? { storage: './database.sqlite', dialect: 'sqlite', logging: false }
    : {
        database: process.env.DB_NAME || 'whatsapp_crm',
        username: process.env.DB_USER || 'crm_user',
        password: process.env.DB_PASSWORD || 'StrongPassword123!',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres'
      },
  production: {
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres'
  }
};
