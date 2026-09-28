/**
 * یک اتصال Sequelize برای هر دیتابیس شرکت. فایل یا دیتابیس PostgreSQL جدا است.
 */
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

const cache = new Map();

function tenantSqliteDir() {
    if (process.env.TENANT_SQLITE_DIR) return process.env.TENANT_SQLITE_DIR;
    return path.join(__dirname, '..', '..', 'data', 'tenants');
}

function baseSequelize() {
    return require('../../models').sequelize;
}

function databaseName(slug, environment) {
    const raw = `fxg_${environment}_${slug}`.replace(/-/g, '_');
    if (!/^[a-z0-9_]+$/.test(raw)) {
        throw Object.assign(new Error('نام دیتابیس شرکت نامعتبر است.'), { status: 400 });
    }
    return raw;
}

async function allocateDatabase(slug, environment) {
    const base = baseSequelize();
    if (base.getDialect() === 'sqlite') {
        const dir = tenantSqliteDir();
        fs.mkdirSync(dir, { recursive: true });
        return {
            dialect: 'sqlite',
            storage: path.join(dir, `${environment}-${slug}.sqlite`)
        };
    }
    const dbName = databaseName(slug, environment);
    const { Client } = require('pg');
    const adminUrl = process.env.PLATFORM_ADMIN_DATABASE_URL || process.env.DATABASE_URL;
    if (!adminUrl && !(base.config && base.config.host)) {
        throw Object.assign(new Error('اتصال مدیر دیتابیس برای ساخت شرکت تنظیم نشده است.'), { status: 503 });
    }
    const client = adminUrl
        ? new Client({ connectionString: adminUrl })
        : new Client({
            host: base.config.host,
            port: base.config.port,
            user: base.config.username,
            password: base.config.password,
            database: 'postgres'
        });
    await client.connect();
    try {
        const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
        if (!exists.rowCount) {
            await client.query(`CREATE DATABASE "${dbName}"`);
        }
    } finally {
        await client.end();
    }
    return { dialect: 'postgres', database: dbName };
}

function openFromRow(row) {
    if (!row || !row.dbConfig) {
        throw Object.assign(new Error('دیتابیس این شرکت آماده نیست.'), { status: 503 });
    }
    const key = String(row.id);
    if (cache.has(key)) return cache.get(key);
    const cfg = JSON.parse(row.dbConfig);
    let sequelize;
    if (cfg.dialect === 'sqlite') {
        const dir = path.resolve(tenantSqliteDir());
        const storage = path.resolve(String(cfg.storage || ''));
        const inside = storage.startsWith(dir + path.sep) && storage.toLowerCase().endsWith('.sqlite');
        if (!inside) {
            throw Object.assign(new Error('مسیر دیتابیس شرکت نامعتبر است.'), { status: 500 });
        }
        sequelize = new Sequelize({ dialect: 'sqlite', storage, logging: false });
    } else {
        const base = baseSequelize();
        sequelize = new Sequelize(cfg.database, base.config.username, base.config.password, {
            host: base.config.host,
            port: base.config.port,
            dialect: 'postgres',
            logging: false,
            dialectOptions: (base.options && base.options.dialectOptions) || {},
            pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
        });
    }
    cache.set(key, sequelize);
    return sequelize;
}

module.exports = {
    allocateDatabase,
    openFromRow,
    tenantSqliteDir
};
