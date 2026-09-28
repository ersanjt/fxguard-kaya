/**
 * Host را به زمینهٔ درخواست وصل می‌کند.
 */
const registry = require('./registry');
const connections = require('./connections');
const { resolveHost, isLegacyTenant } = require('./host');
const { run } = require('./context');

function isPlatformPath(req) {
    const p = String(req.originalUrl || '').split('?')[0];
    return p === '/api/platform' || p.startsWith('/api/platform/');
}

function isOpenPath(req) {
    const p = String(req.originalUrl || '').split('?')[0];
    return p === '/api/ping' || p.startsWith('/api/ping');
}

async function resolveStore(hostHeader, publicBase) {
    const resolution = resolveHost(hostHeader);
    const store = {
        sequelize: null,
        tenant: null,
        resolution,
        publicBase: publicBase || null
    };
    if (resolution.kind === 'legacy' || resolution.kind === 'platform' || resolution.kind === 'unknown') {
        return { store };
    }
    if (isLegacyTenant(resolution.slug, resolution.environment)) {
        store.tenant = {
            slug: resolution.slug,
            environment: resolution.environment,
            legacy: true
        };
        return { store };
    }
    const row = await registry.findActive(resolution.slug, resolution.environment);
    if (!row) return { store, missing: true };
    store.sequelize = connections.openFromRow(row);
    store.tenant = row;
    return { store };
}

function bindSocketToStore(socket, store) {
    if (!socket || socket.__tenantBound) return;
    socket.__tenantBound = true;
    const origOn = socket.on.bind(socket);
    socket.on = (event, listener) => origOn(event, (...args) => run(store, () => listener.apply(socket, args)));
}

async function tenantContext(req, res, next) {
    const publicBase = `${req.protocol}://${req.get('host')}`;
    try {
        const resolved = await resolveStore(req.headers.host, publicBase);
        const kind = resolved.store.resolution.kind;
        const platformApi = isPlatformPath(req) || isOpenPath(req);
        if (!platformApi && kind === 'platform') {
            return res.status(404).json({
                error: 'این آدرس پنل یک شرکت نیست. هر شرکت روی زیردامنهٔ خودش وارد می‌شود.'
            });
        }
        if (!platformApi && kind === 'unknown') {
            return res.status(404).json({ error: 'این دامنه برای پنل شناخته نشد.' });
        }
        if (!platformApi && resolved.missing) {
            return res.status(404).json({ error: 'پنلی با این آدرس ثبت نشده است.' });
        }
        return run(resolved.store, () => next());
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    tenantContext,
    resolveStore,
    bindSocketToStore,
    isPlatformPath
};
