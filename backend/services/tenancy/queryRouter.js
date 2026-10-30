/**
 * مدل‌ها یک‌بار ساخته می‌شوند. این لایه کوئری و تراکنش را به دیتابیس شرکت جاری می‌فرستد.
 */
const { getStore } = require('./context');

function install(base) {
    if (!base || base.__tenantQueryRouter) return;
    const originalQuery = base.query.bind(base);
    const originalTransaction = base.transaction.bind(base);

    base.query = function routedQuery(sql, options) {
        const store = getStore();
        const target = store && store.sequelize;
        if (!target || target === base) return originalQuery(sql, options);
        return target.query(sql, options);
    };

    base.transaction = function routedTransaction(...args) {
        const store = getStore();
        const target = store && store.sequelize;
        if (!target || target === base) return originalTransaction(...args);
        return target.transaction(...args);
    };

    base.__tenantQueryRouter = true;
}

module.exports = { install };
