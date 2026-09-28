/**
 * دفتر پلتفرم: فقط نام شرکت، آدرس و اینکه دیتابیسش کجاست. دادهٔ CRM اینجا نیست.
 */
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

let platform = null;
let Tenant = null;
let readyPromise = null;

function platformStorage() {
    if (process.env.PLATFORM_SQLITE_PATH) return process.env.PLATFORM_SQLITE_PATH;
    const dir = path.join(__dirname, '..', '..', 'data');
    fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'platform.sqlite');
}

function init() {
    const storage = platformStorage();
    if (storage !== ':memory:') {
        fs.mkdirSync(path.dirname(storage), { recursive: true });
    }
    platform = new Sequelize({ dialect: 'sqlite', storage, logging: false });
    Tenant = platform.define(
        'PlatformTenant',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            slug: { type: DataTypes.STRING(40), allowNull: false },
            environment: { type: DataTypes.STRING(20), allowNull: false },
            name: { type: DataTypes.STRING(120), allowNull: false },
            status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'provisioning' },
            ownerEmail: { type: DataTypes.STRING(255), allowNull: false },
            dbConfig: { type: DataTypes.TEXT, allowNull: true },
            lastError: { type: DataTypes.TEXT, allowNull: true },
            plan: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'trial' },
            trialEndsAt: { type: DataTypes.DATE, allowNull: true }
        },
        {
            tableName: 'platform_tenants',
            indexes: [{ unique: true, fields: ['slug', 'environment'] }]
        }
    );
    return platform.sync();
}

function ready() {
    if (!readyPromise) readyPromise = init();
    return readyPromise;
}

async function findOne(slug, environment) {
    await ready();
    return Tenant.findOne({ where: { slug, environment } });
}

async function findActive(slug, environment) {
    await ready();
    return Tenant.findOne({ where: { slug, environment, status: 'active' } });
}

async function listActive() {
    await ready();
    return Tenant.findAll({ where: { status: 'active' }, order: [['createdAt', 'ASC']] });
}

async function listAll() {
    await ready();
    return Tenant.findAll({ order: [['createdAt', 'DESC']] });
}

async function createRow(fields) {
    await ready();
    return Tenant.create(fields);
}

function toPublic(row) {
    if (!row) return null;
    return {
        id: row.id,
        slug: row.slug,
        environment: row.environment,
        name: row.name,
        status: row.status,
        ownerEmail: row.ownerEmail,
        createdAt: row.createdAt
    };
}

module.exports = {
    ready,
    findOne,
    findActive,
    listActive,
    listAll,
    createRow,
    toPublic
};
