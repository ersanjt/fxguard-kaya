/**
 * برای کاربر دمو روی PUBLIC_APP_HOST هر GET دادهٔ واقعی DB برنمی‌گرداند؛ فقط فیکسچرها.
 */
const { isDemoModeEnabled, isPublicAppRequest } = require('../lib/demoAuth');
const F = require('../lib/publicDemoFixtures');

function stripPath(req) {
    const u = (req.originalUrl || req.url || '').split('?')[0];
    const noApi = u.replace(/^\/api/, '');
    return noApi || '/';
}

function isDemoViewer(req) {
    return req.user && req.user.isDemo && isDemoModeEnabled() && isPublicAppRequest(req);
}

function publicDemoReadStub(req, res, next) {
    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') return next();
    if (!isDemoViewer(req)) return next();

    const p = stripPath(req);

    if (p === '/conversations' || p.startsWith('/conversations?')) {
        return res.json(F.demoConversationsList());
    }
    const convDetail = /^\/conversations\/([0-9a-f-]{36})$/i.exec(p);
    if (convDetail) {
        const row = F.demoConversationDetail(convDetail[1]);
        if (!row) return res.status(404).json({ error: 'Not found' });
        return res.json(row);
    }
    const convMsgs = /^\/conversations\/([0-9a-f-]{36})\/messages$/i.exec(p);
    if (convMsgs) {
        const payload = F.demoMessages(convMsgs[1]);
        if (!payload) return res.status(404).json({ error: 'Not found' });
        return res.json(payload);
    }
    const convStats = /^\/conversations\/([0-9a-f-]{36})\/stats$/i.exec(p);
    if (convStats) {
        const payload = F.demoConversationStats(convStats[1]);
        if (!payload) return res.status(404).json({ error: 'Not found' });
        return res.json(payload);
    }

    if (p === '/customers' || p.startsWith('/customers?')) {
        return res.json(F.demoCustomersList());
    }
    const custOne = /^\/customers\/([0-9a-f-]{36})$/i.exec(p);
    if (custOne) {
        const id = custOne[1];
        if (id !== F.DEMO_CUST && id !== F.DEMO_CUST_2) return res.status(404).json({ error: 'Not found' });
        const row = id === F.DEMO_CUST_2 ? F.demoCustomer?.({}) : null;
        const base = require('../lib/publicDemoFixtures');
        const { demoCustomer } = require('../lib/publicDemoFixtures');
        // demoCustomer not exported - inline
        const d =
            id === F.DEMO_CUST
                ? {
                      id: F.DEMO_CUST,
                      name: 'Sample Customer',
                      phone: '+1 555 0101',
                      email: 'sample@example.com',
                      status: 'active',
                      profilePic: null,
                      notes: 'Demo only',
                  }
                : {
                      id: F.DEMO_CUST_2,
                      name: 'Another Sample',
                      phone: '+1 555 0102',
                      email: null,
                      status: 'active',
                      profilePic: null,
                      notes: null,
                  };
        return res.json(Object.assign({}, d, { totalConversations: 1, totalMessages: 3 }));
    }

    if (p === '/analytics/dashboard') {
        return res.json(F.demoAnalyticsDashboard());
    }

    if (p === '/users' || p.startsWith('/users?')) {
        return res.json(F.demoUsersList());
    }

    if (p === '/departments' || p.startsWith('/departments?')) {
        return res.json(F.demoDepartmentsList());
    }

    if (p === '/branches' || p.startsWith('/branches?')) {
        return res.json(F.demoBranchesList());
    }

    if (p === '/tags' || p.startsWith('/tags?')) {
        return res.json(F.demoTagsList());
    }

    if (p === '/announcements/for-me' || p.startsWith('/announcements/for-me?')) {
        return res.json(F.demoAnnouncementsForMe());
    }
    if (p === '/announcements/targets' || p.startsWith('/announcements/targets?')) {
        return res.json({ targets: [], branches: [], departments: [] });
    }
    if (p === '/announcements' || p.startsWith('/announcements?')) {
        return res.json({ data: F.demoAnnouncementsForMe().data, total: 1 });
    }

    if (p === '/gateway/status' || p.startsWith('/gateway/status?')) {
        return res.json(F.demoGatewayStatus());
    }

    if (p === '/rates' || p.startsWith('/rates?')) {
        return res.json({
            items: [
                { key: 'usd', label: 'USD (demo)', value: 50000, change: null, rawValue: 50000 },
                { key: 'eur', label: 'EUR (demo)', value: 54000, change: null, rawValue: 54000 },
            ],
            allItems: [
                { key: 'usd', label: 'USD (demo)', value: 50000, change: null, rawValue: 50000 },
                { key: 'eur', label: 'EUR (demo)', value: 54000, change: null, rawValue: 54000 },
            ],
            visibleKeys: ['usd', 'eur'],
            updatedAt: new Date().toISOString(),
            updatedAtTimestamp: null,
            tickerDisplay: 'toman',
        });
    }
    if (
        p.startsWith('/rates/history') ||
        p.startsWith('/rates/adjustments') ||
        p.startsWith('/rates/ticker-config') ||
        p.startsWith('/rates/currencies') ||
        p.startsWith('/rates/config-status')
    ) {
        if (p.startsWith('/rates/config-status')) return res.json({ hasApiKey: false });
        if (p.startsWith('/rates/ticker-config')) return res.json({ visibleKeys: ['usd', 'eur'] });
        if (p.startsWith('/rates/adjustments')) return res.json({ adjustments: [] });
        if (p.startsWith('/rates/currencies')) return res.json({ data: [] });
        return res.json({ data: [], series: [] });
    }

    if (p.startsWith('/message-templates')) return res.json({ data: [] });
    if (p.startsWith('/file-templates')) return res.json({ data: [] });
    if (p.startsWith('/bulk')) return res.json({ data: [] });
    if (p.startsWith('/tasks')) return res.json({ data: [], total: 0 });
    if (p.startsWith('/tickets')) return res.json({ data: [], total: 0 });
    if (p.startsWith('/processes')) return res.json({ data: [] });
    if (p.startsWith('/supervision')) return res.json({ data: [], events: [] });
    if (p.startsWith('/whatsapp')) return res.json({ connected: false, demo: true });
    if (p.startsWith('/internal')) return res.json({ data: [], threads: [] });
    if (p.startsWith('/exchange')) return res.json([]);
    if (p.startsWith('/services')) return res.json([]);
    if (p.startsWith('/company-emails')) return res.json({ data: [] });

    if (p.startsWith('/users/')) {
        return res.status(404).json({ error: 'Not found' });
    }
    if (p.startsWith('/customers/')) {
        return res.status(404).json({ error: 'Not found' });
    }

    return res.json({ data: [], demo: true, message: 'preview stub' });
}

module.exports = { publicDemoReadStub, isDemoViewer };
