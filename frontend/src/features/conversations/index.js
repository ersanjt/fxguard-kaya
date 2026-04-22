/**
 * Conversations feature foundation for gradual migration from legacy dashboard.js.
 */

export const featureId = 'conversations';

const QUICK_TABS = new Set(['all', 'unread', 'unanswered', 'unassigned', 'open', 'archived', 'groups', 'mine']);

function toBool(value) {
    return value === true || value === 'true' || value === 1 || value === '1';
}

/**
 * Normalize user/UI filters to a stable shape.
 * @param {Record<string, unknown>} raw
 */
export function normalizeConversationFilters(raw = {}) {
    const quickTab = QUICK_TABS.has(String(raw.quickTab || 'all')) ? String(raw.quickTab || 'all') : 'all';
    return {
        quickTab,
        status: raw.status ? String(raw.status) : '',
        priority: raw.priority ? String(raw.priority) : '',
        branchId: raw.branchId ? String(raw.branchId) : '',
        departmentId: raw.departmentId ? String(raw.departmentId) : '',
        assignedTo: raw.assignedTo ? String(raw.assignedTo) : '',
        search: raw.search ? String(raw.search).trim().slice(0, 120) : '',
        page: Number(raw.page) > 0 ? Number(raw.page) : 1,
        limit: Number(raw.limit) > 0 ? Math.min(Number(raw.limit), 100) : 20,
        archived: toBool(raw.archived),
        unread: toBool(raw.unread),
        unanswered: toBool(raw.unanswered),
        unassigned: toBool(raw.unassigned),
        isGroup: toBool(raw.isGroup),
        mineUserId: raw.mineUserId ? String(raw.mineUserId) : ''
    };
}

/**
 * Build URL query for `/api/conversations` with server-compatible flags.
 * @param {ReturnType<typeof normalizeConversationFilters>} filters
 */
export function buildConversationsQuery(filters) {
    const f = normalizeConversationFilters(filters);
    const params = new URLSearchParams();
    params.set('page', String(f.page));
    params.set('limit', String(f.limit));

    if (f.quickTab === 'unread') params.set('unread', 'true');
    else if (f.quickTab === 'unanswered') params.set('unanswered', 'true');
    else if (f.quickTab === 'unassigned') params.set('unassigned', 'true');
    else if (f.quickTab === 'open') params.set('status', 'open');
    else if (f.quickTab === 'archived') params.set('status', 'archived');
    else if (f.quickTab === 'groups') params.set('isGroup', 'true');
    else if (f.quickTab === 'mine' && f.mineUserId) params.set('assignedTo', f.mineUserId);

    if (f.status) params.set('status', f.status);
    if (f.priority) params.set('priority', f.priority);
    if (f.branchId) params.set('branchId', f.branchId);
    if (f.departmentId) params.set('departmentId', f.departmentId);
    if (f.assignedTo) params.set('assignedTo', f.assignedTo);
    if (f.search) params.set('search', f.search);
    if (f.archived) params.set('archived', 'true');
    if (f.unread) params.set('unread', 'true');
    if (f.unanswered) params.set('unanswered', 'true');
    if (f.unassigned) params.set('unassigned', 'true');
    if (f.isGroup) params.set('isGroup', 'true');
    return `?${params.toString()}`;
}

/**
 * Service facade; accepts any fetcher with signature `(url, init) => Promise<{ok,data}>`.
 */
export function createConversationsApi(fetcher) {
    if (typeof fetcher !== 'function') {
        throw new Error('createConversationsApi requires a fetcher function');
    }
    return {
        list(filters = {}) {
            return fetcher('/api/conversations' + buildConversationsQuery(filters));
        },
        detail(conversationId) {
            return fetcher(`/api/conversations/${encodeURIComponent(conversationId)}`);
        },
        messages(conversationId, before) {
            const suffix = before ? `?before=${encodeURIComponent(before)}` : '';
            return fetcher(`/api/conversations/${encodeURIComponent(conversationId)}/messages${suffix}`);
        },
        markRead(conversationId) {
            return fetcher(`/api/conversations/${encodeURIComponent(conversationId)}/read`, { method: 'POST' });
        },
        send(conversationId, body) {
            return fetcher(`/api/conversations/${encodeURIComponent(conversationId)}/send`, {
                method: 'POST',
                body: JSON.stringify(body || {})
            });
        }
    };
}

/**
 * Minimal bootstrap hook; safe in parallel with legacy dashboard.js.
 */
export function initConversations(ctx) {
    if (!ctx || typeof ctx !== 'object') return null;
    const apiFetch = ctx.services && typeof ctx.services.apiFetch === 'function'
        ? ctx.services.apiFetch
        : null;
    if (!apiFetch) return null;

    const api = createConversationsApi(apiFetch);
    if (!ctx.services.features) ctx.services.features = {};
    ctx.services.features[featureId] = { api };
    return ctx.services.features[featureId];
}
