const models = require('../../models');
const { sequelize, RateCurrency } = models;
const { runPreSync, runPostSync } = require('./autoMigrate');

async function connectDatabases(logger) {
    try {
        await sequelize.authenticate();
        if (sequelize.getDialect() === 'sqlite') {
            await sequelize.query('PRAGMA journal_mode=WAL;');
            await sequelize.query('PRAGMA synchronous=NORMAL;');
        }

        await runPreSync(sequelize, logger);

        await sequelize.sync();
        logger.info(process.env.USE_SQLITE ? '✅ SQLite Connected (WAL)' : '✅ PostgreSQL Connected');

        await runPostSync(sequelize, logger, { RateCurrency });
    } catch (error) {
        logger.error('❌ Database Connection Error:', error);
        process.exit(1);
    }
}

module.exports = { connectDatabases };
