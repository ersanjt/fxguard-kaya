/**
 * Migration: add new Customer profile fields (birthDate, nationalId, nationality, gender,
 * occupation, companyName, address, city, country, postalCode, loyaltyPoints, loyaltyTier,
 * referredBy, instagram, telegram, website) and CustomerDocuments table.
 *
 * اجرا: node scripts/add-customer-profile-fields.js
 */
'use strict';

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'production';
const cfg = config[env] || config.production;
const databaseUrl = process.env.DATABASE_URL;
const isSqlite = cfg.dialect === 'sqlite';

let sequelize;
if (isSqlite) {
    sequelize = new Sequelize({ storage: cfg.storage, dialect: 'sqlite', logging: false });
} else if (databaseUrl) {
    const sslEnabled = process.env.DATABASE_SSL !== 'false';
    const sslRejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';
    const sslOptions = sslEnabled ? { ssl: { require: true, rejectUnauthorized: sslRejectUnauthorized } } : {};
    sequelize = new Sequelize(databaseUrl, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) ? sslOptions : {}
    });
} else {
    sequelize = new Sequelize(
        process.env.DB_NAME || cfg.database,
        process.env.DB_USER || cfg.username,
        process.env.DB_PASSWORD || cfg.password,
        { host: process.env.DB_HOST || cfg.host, port: process.env.DB_PORT || 5432, dialect: 'postgres', logging: false }
    );
}

async function run() {
    await sequelize.authenticate();
    const qi = sequelize.getQueryInterface();
    const dialect = sequelize.getDialect();
    const isPg = dialect === 'postgres';

    console.log(`Connected (${dialect})`);

    // ── Customers: new profile fields ──────────────────────────────────────
    let custDesc;
    try {
        custDesc = await qi.describeTable('Customers');
    } catch (e) {
        console.log('Customers table not found, skipping:', e.message);
        return;
    }

    const customerCols = [
        ['birthDate',      { type: DataTypes.DATEONLY, allowNull: true }],
        ['nationalId',     { type: DataTypes.STRING, allowNull: true }],
        ['nationality',    { type: DataTypes.STRING, allowNull: true }],
        ['occupation',     { type: DataTypes.STRING, allowNull: true }],
        ['companyName',    { type: DataTypes.STRING, allowNull: true }],
        ['address',        { type: DataTypes.TEXT, allowNull: true }],
        ['city',           { type: DataTypes.STRING, allowNull: true }],
        ['country',        { type: DataTypes.STRING, allowNull: true }],
        ['postalCode',     { type: DataTypes.STRING, allowNull: true }],
        ['loyaltyPoints',  { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 }],
        ['referredBy',     { type: DataTypes.UUID, allowNull: true }],
        ['instagram',      { type: DataTypes.STRING, allowNull: true }],
        ['telegram',       { type: DataTypes.STRING, allowNull: true }],
        ['website',        { type: DataTypes.STRING, allowNull: true }],
    ];

    for (const [col, def] of customerCols) {
        if (!custDesc[col]) {
            try {
                await qi.addColumn('Customers', col, def);
                console.log(`  ✅ Customers.${col} added`);
            } catch (e) {
                if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
                    console.warn(`  ⚠️  Customers.${col}:`, e.message);
                } else {
                    console.log(`  ℹ️  Customers.${col} already exists`);
                }
            }
        } else {
            console.log(`  ✓  Customers.${col} already exists`);
        }
    }

    // ENUM columns need special handling in PostgreSQL
    const enumCols = [
        ['gender',       'enum_Customers_gender',       ['male', 'female', 'other']],
        ['loyaltyTier',  'enum_Customers_loyaltyTier',  ['bronze', 'silver', 'gold', 'platinum']],
    ];

    for (const [col, enumName, values] of enumCols) {
        if (!custDesc[col]) {
            try {
                if (isPg) {
                    // Create ENUM type if it doesn't exist
                    const enumValues = values.map(v => `'${v}'`).join(', ');
                    await sequelize.query(
                        `DO $$ BEGIN
                            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${enumName}') THEN
                                CREATE TYPE "${enumName}" AS ENUM (${enumValues});
                            END IF;
                        END $$;`
                    );
                    await sequelize.query(
                        `ALTER TABLE "Customers" ADD COLUMN IF NOT EXISTS "${col}" "${enumName}";`
                    );
                } else {
                    await qi.addColumn('Customers', col, {
                        type: DataTypes.ENUM(...values),
                        allowNull: true
                    });
                }
                console.log(`  ✅ Customers.${col} (ENUM) added`);
            } catch (e) {
                if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
                    console.warn(`  ⚠️  Customers.${col}:`, e.message);
                } else {
                    console.log(`  ℹ️  Customers.${col} already exists`);
                }
            }
        } else {
            console.log(`  ✓  Customers.${col} already exists`);
        }
    }

    // ── CustomerDocuments table ─────────────────────────────────────────────
    const tables = await qi.showAllTables();
    const hasDocTable = tables.some(t => t === 'CustomerDocuments' || t === 'customer_documents');

    if (!hasDocTable) {
        console.log('Creating CustomerDocuments table...');
        try {
            if (isPg) {
                // Create ENUM types first
                await sequelize.query(`
                    DO $$ BEGIN
                        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_CustomerDocuments_category') THEN
                            CREATE TYPE "enum_CustomerDocuments_category" AS ENUM ('identity', 'contract', 'financial', 'media', 'other');
                        END IF;
                        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_CustomerDocuments_fileType') THEN
                            CREATE TYPE "enum_CustomerDocuments_fileType" AS ENUM ('image', 'video', 'audio', 'document', 'other');
                        END IF;
                        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_CustomerDocuments_source') THEN
                            CREATE TYPE "enum_CustomerDocuments_source" AS ENUM ('manual', 'conversation');
                        END IF;
                    END $$;
                `);
            }

            await qi.createTable('CustomerDocuments', {
                id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
                customerId: { type: DataTypes.UUID, allowNull: false, references: { model: 'Customers', key: 'id' } },
                category: isPg
                    ? { type: '"enum_CustomerDocuments_category"', defaultValue: 'other' }
                    : { type: DataTypes.ENUM('identity', 'contract', 'financial', 'media', 'other'), defaultValue: 'other' },
                title: { type: DataTypes.STRING, allowNull: false },
                description: { type: DataTypes.TEXT },
                filePath: { type: DataTypes.TEXT, allowNull: false },
                fileName: { type: DataTypes.STRING, allowNull: false },
                fileSize: { type: DataTypes.INTEGER },
                mimeType: { type: DataTypes.STRING },
                fileType: isPg
                    ? { type: '"enum_CustomerDocuments_fileType"', defaultValue: 'other' }
                    : { type: DataTypes.ENUM('image', 'video', 'audio', 'document', 'other'), defaultValue: 'other' },
                source: isPg
                    ? { type: '"enum_CustomerDocuments_source"', defaultValue: 'manual' }
                    : { type: DataTypes.ENUM('manual', 'conversation'), defaultValue: 'manual' },
                messageId: { type: DataTypes.UUID },
                conversationId: { type: DataTypes.UUID },
                uploadedBy: { type: DataTypes.UUID },
                expiresAt: { type: DataTypes.DATEONLY },
                tags: { type: DataTypes.JSON, defaultValue: [] },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false }
            });
            console.log('  ✅ CustomerDocuments table created');

            // Add indexes
            await qi.addIndex('CustomerDocuments', ['customerId']).catch(() => {});
            await qi.addIndex('CustomerDocuments', ['category']).catch(() => {});
            await qi.addIndex('CustomerDocuments', ['fileType']).catch(() => {});
            await qi.addIndex('CustomerDocuments', ['source']).catch(() => {});
            await qi.addIndex('CustomerDocuments', ['conversationId']).catch(() => {});
            console.log('  ✅ CustomerDocuments indexes added');
        } catch (e) {
            console.error('  ❌ CustomerDocuments table creation failed:', e.message);
        }
    } else {
        console.log('  ✓  CustomerDocuments table already exists');
    }

    await sequelize.close();
    console.log('\n✅ Migration complete');
}

run().catch(e => {
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
});
