/**
 * روی PUBLIC_APP_HOST با کاربر دمو: پاسخ GET هرگز از DB تولید نمی‌شود (فقط فیکسچر).
 */
const { isDemoModeEnabled, isPublicAppRequest } = require('../lib/demoAuth');
const F = require('../lib/publicDemoFixtures');

const UUID_RE = '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';

function stripPath(req) {
    const u = (req.originalUrl || req.url || '').split('?')[0];
    return (u.replace(/^\/api/, '') || '/').toLowerCase();
}

function isDemoViewer(req) {
    return !!(req.user && req.user.isDemo && isDemoModeEnabled() && isPublicAppRequest(req));
}

function publicDemoReadStub(req, res, next) {
    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') return next();
    if (!isDemoViewer(req)) return next();

    const p = stripPath(req);

    if (p === '/conversations' || p.startsWith('/conversations?')) return res.json(F.demoConversationsList());

    const convDetail = new RegExp(`^/conversations/${UUID_RE}$`, 'i').exec(p);
    if (convDetail) {
        const row = F.demoConversationDetail(convDetail[1]);
        if (!row) return res.status(404).json({ error: 'Not found' });
        return res.json(row);
    }
    const convMsgs = new RegExp(`^/conversations/${UUID_RE}/messages$`, 'i').exec(p);
    if (convMsgs) {
        const payload = F.demoMessages(convMsgs[1]);
        if (!payload) return res.status(404).json({ error: 'Not found' });
        return res.json(payload);
    }
    const convStats = new RegExp(`^/conversations/${UUID_RE}/stats$`, 'i').exec(p);
    if (convStats) {
        const payload = F.demoConversationStats(convStats[1]);
        if (!payload) return res.status(404).json({ error: 'Not found' });
        return res.json(payload);
    }

    if (p === '/customers' || p.startsWith('/customers?')) return res.json(F.demoCustomersList());

    const custPath = new RegExp(`^/customers/${UUID_RE}(.*)$`, 'i').exec(p);
    if (custPath) {
        const id = custPath[1];
        const rest = (custPath[2] || '').toLowerCase();
        if (id !== F.DEMO_CUST && id !== F.DEMO_CUST_2) return res.status(404).json({ error: 'Not found' });
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
                      totalConversations: 1,
                      totalMessages: 8,
                  }
                : {
                      id: F.DEMO_CUST_2,
                      name: 'Another Sample',
                      phone: '+1 555 0102',
                      email: null,
                      status: 'active',
                      profilePic: null,
                      notes: null,
                      totalConversations: 1,
                      totalMessages: 4,
                  };
        if (rest.startsWith('/conversations')) {
            const conv = id === F.DEMO_CUST_2 ? F.demoConversationDetail(F.DEMO_CONV_B) : F.demoConversationDetail(F.DEMO_CONV_A);
            return res.json({ data: conv ? [conv] : [] });
        }
        if (rest.startsWith('/timeline')) return res.json({ data: [] });
        if (rest.startsWith('/transactions')) return res.json({ data: [] });
        if (rest.startsWith('/notes')) return res.json({ data: [] });
        if (rest.startsWith('/tags')) return res.json({ data: [] });
        if (rest.startsWith('/documents')) return res.json({ data: [] });
        return res.json(d);
    }

    if (p === '/analytics/dashboard' || p.startsWith('/analytics/dashboard?')) {
        return res.json(F.demoAnalyticsDashboard());
    }

    if (p === '/users' || p.startsWith('/users?')) return res.json(F.demoUsersList());

    if (p === '/departments' || p.startsWith('/departments?')) return res.json(F.demoDepartmentsList());
    if (p === '/branches' || p.startsWith('/branches?')) return res.json(F.demoBranchesList());
    if (p === '/tags' || p.startsWith('/tags?')) return res.json(F.demoTagsList());

    if (p === '/announcements/for-me' || p.startsWith('/announcements/for-me?')) {
        return res.json(F.demoAnnouncementsForMe());
    }
    if (p === '/announcements/targets' || p.startsWith('/announcements/targets?')) {
        return res.json({ users: [], departments: [] });
    }
    if (p === '/announcements/sent' || p.startsWith('/announcements/sent?')) {
        return res.json({ data: [] });
    }

    if (p === '/gateway/status' || p.startsWith('/gateway/status?')) return res.json(F.demoGatewayStatus());

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
    if (p.startsWith('/rates/history')) return res.json({ key: 'usd', item: 'demo', points: [] });
    if (p.startsWith('/rates/adjustments')) return res.json({ data: [] });
    if (p.startsWith('/rates/ticker-config')) return res.json({ visibleKeys: ['usd', 'eur'] });
    if (p.startsWith('/rates/currencies')) {
        return res.json({
            data: [
                { key: 'usd', label: 'USD (demo)', apiKeys: [], sortOrder: 0 },
                { key: 'eur', label: 'EUR (demo)', apiKeys: [], sortOrder: 1 },
            ],
        });
    }
    if (p.startsWith('/rates/health')) return res.json({ ok: false, external: false, demoPreview: true });
    if (p.startsWith('/rates/config-status')) return res.json({ hasApiKey: false });

    if (p.startsWith('/whatsapp/')) {
        if (p.startsWith('/whatsapp/config')) {
            return res.json({
                welcomeMessage: 'Demo — not connected to WhatsApp.',
                welcomeEnabled: true,
                alertUnansweredAfterMinutes: 5,
                escalateUnansweredAfterMinutes: 15,
                escalationDepartmentId: null,
                aiAnswerEnabled: false,
                openaiApiKeySet: false,
                deptAssignedMessage: '',
                employeeIntroMessage: '',
                autoAssignmentMessagesEnabled: true,
            });
        }
        return res.json({ demo: true, connected: false });
    }

    if (p.startsWith('/exchange/summary')) {
        return res.json({ cashBoxes: [], bankAccounts: [], totalCash: 0, totalBank: 0, total: 0 });
    }
    if (p.startsWith('/exchange/currency-position')) {
        return res.json({
            currencyPosition: {},
            pendingInward: {},
            pendingOutward: {},
            outstandingBalance: [],
            cashBoxes: [],
            bankAccounts: [],
        });
    }
    if (p.startsWith('/exchange/transactions')) {
        return res.json({ rows: [], count: 0, page: 1 });
    }
    if (p.startsWith('/exchange/')) {
        return res.json([]);
    }

    if (p.startsWith('/services')) return res.json({ data: [] });

    if (p.startsWith('/message-templates')) return res.json({ data: [] });
    if (p.startsWith('/file-templates')) return res.json({ data: [] });
    if (p.startsWith('/bulk')) return res.json({ data: [] });
    if (p.startsWith('/tasks')) return res.json({ data: [], total: 0, page: 1 });
    if (p.startsWith('/tickets')) return res.json({ data: [], total: 0 });
    if (p.startsWith('/processes')) return res.json({ data: [] });
    if (p.startsWith('/supervision')) return res.json({ data: [], events: [] });
    if (p.startsWith('/internal')) return res.json({ data: [], threads: [] });
    if (p.startsWith('/company-emails')) return res.json({ data: [] });

    if (p.startsWith('/users/')) return res.status(404).json({ error: 'Not found' });

    return res.json({ data: [], demoPreview: true });
}

module.exports = { publicDemoReadStub, isDemoViewer };
