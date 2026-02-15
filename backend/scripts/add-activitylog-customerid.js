/**
 * افزودن ستون customerId به ActivityLogs
 * اجرا: node backend/scripts/add-activitylog-customerid.js
 */
require('dotenv').config();
const path = require('path');
const models = require(path.join(__dirname, '..', 'models'));
const { sequelize } = models;

async function run() {
    try {
        const qi = sequelize.getQueryInterface();
        const tableDesc = await qi.describeTable('ActivityLogs');
        if (!tableDesc.customerId) {
            if (sequelize.getDialect() === 'sqlite') {
                await sequelize.query('ALTER TABLE `ActivityLogs` ADD COLUMN `customerId` VARCHAR(36);');
            } else {
                await qi.addColumn('ActivityLogs', 'customerId', { type: require('sequelize').DataTypes.UUID, allowNull: true });
            }
            console.log('Added customerId column to ActivityLogs');
        }
        console.log('Done');
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}
run();
