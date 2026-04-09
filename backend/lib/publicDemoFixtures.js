/**
 * دادهٔ نمایشی فقط برای دامنهٔ دمو (PUBLIC_APP_HOST) — هیچ ارتباطی با دادهٔ واقعی ندارد.
 */
const { getDemoUserPayload } = require('./demoAuth');

const DEMO_CUST = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEMO_CUST_2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DEMO_CONV_A = '11111111-1111-4111-8111-111111111111';
const DEMO_CONV_B = '22222222-2222-4222-8222-222222222222';
const DEMO_MSG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001';
const DEMO_MSG_B = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002';

function demoCustomer(overrides) {
    return Object.assign(
        {
            id: DEMO_CUST,
            name: 'Sample Customer',
            phone: '+1 555 0101',
            email: 'sample@example.com',
            profilePic: null,
            status: 'active',
            source: 'demo',
            notes: null,
            customFields: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        overrides || {}
    );
}

function conversationRow(overrides) {
    const c = Object.assign(
        {
            id: DEMO_CONV_A,
            customerId: DEMO_CUST,
            status: 'open',
            priority: 'normal',
            unreadCount: 0,
            lastMessageAt: new Date().toISOString(),
            lastIncomingMessageAt: new Date().toISOString(),
            lastOutgoingMessageAt: new Date().toISOString(),
            lastMessagePreview: 'Sample preview text for UI only.',
            source: 'whatsapp',
            customer: demoCustomer(),
            assignee: { id: 'demo-user', name: 'Demo User' },
            branch: null,
            department: null,
        },
        overrides || {}
    );
    return c;
}

function demoConversationsList() {
    return {
        data: [
            conversationRow({
                id: DEMO_CONV_A,
                lastMessagePreview: 'Hello — this is sample data for the UI preview.',
            }),
            conversationRow({
                id: DEMO_CONV_B,
                customerId: DEMO_CUST_2,
                customer: demoCustomer({
                    id: DEMO_CUST_2,
                    name: 'Another Sample',
                    phone: '+1 555 0102',
                    email: null,
                }),
                lastMessagePreview: 'Thanks, we will get back to you.',
                unreadCount: 1,
            }),
        ],
        total: 2,
        page: 1,
    };
}

function demoConversationDetail(id) {
    if (id !== DEMO_CONV_A && id !== DEMO_CONV_B) return null;
    const isB = id === DEMO_CONV_B;
    return conversationRow({
        id,
        customerId: isB ? DEMO_CUST_2 : DEMO_CUST,
        customer: isB
            ? demoCustomer({ id: DEMO_CUST_2, name: 'Another Sample', phone: '+1 555 0102', email: null })
            : demoCustomer(),
        metadata: {},
    });
}

function demoMessages(convId) {
    if (convId !== DEMO_CONV_A && convId !== DEMO_CONV_B) return null;
    const now = Date.now();
    const rows =
        convId === DEMO_CONV_A
            ? [
                  {
                      id: DEMO_MSG_A,
                      conversationId: DEMO_CONV_A,
                      direction: 'incoming',
                      content: 'Hi! This is a **demo** conversation — not real customer data.',
                      timestamp: new Date(now - 3600000).toISOString(),
                      status: 'delivered',
                      type: 'text',
                      media: null,
                      userId: null,
                      user: null,
                      metadata: {},
                  },
                  {
                      id: DEMO_MSG_B,
                      conversationId: DEMO_CONV_A,
                      direction: 'outgoing',
                      content: 'Welcome — you are viewing a product preview only.',
                      timestamp: new Date(now - 3500000).toISOString(),
                      status: 'read',
                      type: 'text',
                      media: null,
                      userId: 'demo-user',
                      user: { id: 'demo-user', name: 'Demo User', username: 'demo' },
                      metadata: {},
                  },
              ]
            : [
                  {
                      id: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001',
                      conversationId: DEMO_CONV_B,
                      direction: 'incoming',
                      content: 'Second thread — still fake data.',
                      timestamp: new Date(now - 7200000).toISOString(),
                      status: 'delivered',
                      type: 'text',
                      media: null,
                      userId: null,
                      user: null,
                      metadata: {},
                  },
              ];
    return {
        data: rows,
        total: rows.length,
        hasMore: false,
        oldestId: rows[0] ? rows[0].id : null,
    };
}

function demoConversationStats(convId) {
    if (convId !== DEMO_CONV_A && convId !== DEMO_CONV_B) return null;
    return {
        firstResponseTimeMin: 3,
        firstIncomingAt: new Date(Date.now() - 7200000).toISOString(),
        firstOutgoingAt: new Date(Date.now() - 7100000).toISOString(),
        responders: [{ id: 'demo-user', name: 'Demo User' }],
        messageCount: convId === DEMO_CONV_A ? 2 : 1,
        outgoingCount: convId === DEMO_CONV_A ? 1 : 0,
        unreadCount: convId === DEMO_CONV_B ? 1 : 0,
    };
}

function demoCustomersList() {
    const c1 = demoCustomer();
    const c2 = demoCustomer({
        id: DEMO_CUST_2,
        name: 'Another Sample',
        phone: '+1 555 0102',
        email: null,
        lastContactAt: new Date().toISOString(),
    });
    return {
        data: [
            Object.assign({}, c2, {
                totalConversations: 1,
                totalMessages: 4,
                lastOpenConv: { id: DEMO_CONV_B, assignee: null, department: null, status: 'open' },
            }),
            Object.assign({}, c1, {
                totalConversations: 1,
                totalMessages: 8,
                lastOpenConv: { id: DEMO_CONV_A, assignee: { id: 'demo-user', name: 'Demo User' }, department: null, status: 'open' },
            }),
        ],
        total: 2,
        page: 1,
        stats: { total: 2, active: 2, inactive: 0, blocked: 0 },
    };
}

function demoAnalyticsDashboard() {
    return {
        totalConversations: 12,
        openConversations: 4,
        unreadConversations: 2,
        todayMessages: 28,
        totalCustomers: 48,
        ticketsOpen: 3,
        tasksPending: 5,
        announcementsCount: 1,
        unreadAnnouncements: 1,
        staffOnline: 4,
        loginsToday: 6,
        avgResponseTimeMinutes: 4.2,
        avgRating: 4.7,
        ratedConversationsCount: 9,
    };
}

function demoUsersList() {
    const u = getDemoUserPayload();
    return {
        data: [
            {
                id: u.id,
                username: u.username,
                name: u.name,
                email: u.email,
                role: u.role,
                status: 'online',
                department: null,
                branch: null,
                isProtectedAdmin: false,
                permissions: u.permissions,
            },
        ],
    };
}

function demoDepartmentsList() {
    return {
        data: [
            {
                id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
                name: 'Sales (demo)',
                color: '#7c3aed',
                isActive: true,
                users: [],
                branch: null,
            },
            {
                id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
                name: 'Support (demo)',
                color: '#0ea5e9',
                isActive: true,
                users: [],
                branch: null,
            },
        ],
    };
}

function demoBranchesList() {
    return { data: [{ id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', name: 'Demo Branch', city: '—' }] };
}

function demoTagsList() {
    return { data: [{ id: '99999999-9999-4999-8999-999999999999', name: 'demo-tag', color: '#94a3b8' }] };
}

function demoAnnouncementsForMe() {
    const id = 'abababab-abab-4aba-8aba-abababababab';
    return {
        data: [
            {
                id,
                title: 'Demo notice',
                body: 'This panel shows sample content only — not your organization.',
                targetType: 'all',
                targetId: null,
                targetName: null,
                isImportant: false,
                read: false,
                canDelete: false,
                fromUserId: 'demo-user',
                fromUser: { id: 'demo-user', name: 'Demo User', email: 'demo@example.com' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ],
    };
}

function demoGatewayStatus() {
    return { whatsapp: false, status: 'disconnected', error: null, demoPreview: true };
}

module.exports = {
    DEMO_CONV_A,
    DEMO_CONV_B,
    DEMO_CUST,
    DEMO_CUST_2,
    demoConversationsList,
    demoConversationDetail,
    demoMessages,
    demoConversationStats,
    demoCustomersList,
    demoAnalyticsDashboard,
    demoUsersList,
    demoDepartmentsList,
    demoBranchesList,
    demoTagsList,
    demoAnnouncementsForMe,
    demoGatewayStatus,
};
