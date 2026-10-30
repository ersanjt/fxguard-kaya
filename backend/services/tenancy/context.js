/**
 * زمینهٔ شرکت جاری برای هر درخواست — کوئری‌های Sequelize همان دیتابیس را می‌بینند.
 */
const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

function getStore() {
    return storage.getStore() || null;
}

function run(store, fn) {
    return storage.run(store || {}, fn);
}

function getTenantPublicBase() {
    const store = getStore();
    const base = store && store.publicBase ? String(store.publicBase).trim() : '';
    return base || null;
}

/** کار پس‌زمینه (ایمیل ورود و مانند آن) همان دیتابیس شرکت را از دست ندهد */
function deferInTenant(fn) {
    const store = getStore();
    setImmediate(() => {
        if (!store) {
            fn();
            return;
        }
        storage.run(store, fn);
    });
}

module.exports = {
    getStore,
    run,
    getTenantPublicBase,
    deferInTenant
};
