/**
 * Migration: Add customerId column to Transactions table
 * Run: node scripts/add-transaction-customerid.js
 */
require('dotenv').config();
const { sequelize } = require('../models');

async function run() {
    try {
        const dialect = sequelize.getDialect();
        const [results] = await sequelize.query(
            dialect === 'sqlite'
                ? "PRAGMA table_info(Transactions)"
                : "SELECT column_name FROM information_schema.columns WHERE table_name = 'Transactions'"
        );
        const hasColumn = dialect === 'sqlite'
            ? results.some(r => r.name === 'customerId')
            : results.some(r => r.column_name === 'customerId');
        if (hasColumn) {
            console.log('customerId column already exists');
            process.exit(0);
            return;
        }
        if (dialect === 'sqlite') {
            await sequelize.query('ALTER TABLE "Transactions" ADD COLUMN "customerId" VARCHAR(36)');
        } else {
            await sequelize.query('ALTER TABLE "Transactions" ADD COLUMN "customerId" UUID REFERENCES "Customers"("id")');
        }
        console.log('customerId column added successfully');
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

run();
