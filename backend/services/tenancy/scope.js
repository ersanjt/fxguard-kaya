/**
 * کارهای پس‌زمینه یک‌بار روی دیتابیس فعلی سرور و یک‌بار برای هر شرکت جدا اجرا می‌شوند.
 */
const logger = require('../../config/logger');
const registry = require('./registry');
const connections = require('./connections');
const { run } = require('./context');
const { panelUrl } = require('./host');

async function forEachTenant(fn) {
    try {
        await fn();
    } catch (err) {
        logger.warn('Tenant job on default database failed', { error: err.message });
    }
    let rows = [];
    try {
        rows = await registry.listActive();
    } catch (err) {
        logger.warn('Tenant registry unavailable for jobs', { error: err.message });
        return;
    }
    for (const row of rows) {
        try {
            const sequelize = connections.openFromRow(row);
            await run(
                {
                    sequelize,
                    tenant: row,
                    publicBase: panelUrl(row.slug, row.environment)
                },
                () => fn()
            );
        } catch (err) {
            logger.warn('Tenant job failed', { slug: row.slug, error: err.message });
        }
    }
}

module.exports = { forEachTenant };
