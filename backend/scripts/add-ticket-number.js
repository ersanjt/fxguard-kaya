/**
 * اسکریپت افزودن ستون ticketNumber و مقداردهی برای تیکت‌های موجود
 * اجرا: node backend/scripts/add-ticket-number.js
 */
require('dotenv').config();
const path = require('path');
const { DataTypes } = require('sequelize');
const models = require(path.join(__dirname, '..', 'models'));
const { Op } = require('sequelize');
const { sequelize, Ticket } = models;

async function run() {
    try {
        const qi = sequelize.getQueryInterface();
        const tableDesc = await qi.describeTable('Tickets');
        if (!tableDesc.ticketNumber) {
            if (sequelize.getDialect() === 'sqlite') {
                await sequelize.query('ALTER TABLE `Tickets` ADD COLUMN `ticketNumber` VARCHAR(255);');
            } else {
                await qi.addColumn('Tickets', 'ticketNumber', { type: DataTypes.STRING, allowNull: true });
            }
        }
        const tickets = await Ticket.findAll({ where: { [Op.or]: [{ ticketNumber: null }, { ticketNumber: '' }] }, attributes: ['id', 'createdAt'] });
        const used = new Set();
        for (const t of tickets) {
            let num;
            do {
                const date = t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10).replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const rnd = Math.floor(1000 + Math.random() * 9000);
                num = 'TKT-' + date + '-' + rnd;
            } while (used.has(num));
            used.add(num);
            await t.update({ ticketNumber: num });
        }
        if (sequelize.getDialect() === 'sqlite') {
            try { await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS `tickets_ticket_number` ON `Tickets` (`ticketNumber`);'); } catch (_) {}
        }
        if (tickets.length > 0) console.log('Updated', tickets.length, 'tickets with ticket numbers');
        console.log('Done');
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}
run();
