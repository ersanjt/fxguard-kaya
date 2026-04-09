function isDemoModeEnabled() {
    return String(process.env.DEMO_MODE || '').trim().toLowerCase() === 'true';
}

function getDemoUsername() {
    return (process.env.DEMO_USERNAME || 'demo').toString().trim();
}

function getDemoPassword() {
    return (process.env.DEMO_PASSWORD || '123456').toString();
}

function getRequestHost(req) {
    try {
        const forwardedHost = (req && req.headers && req.headers['x-forwarded-host']) || '';
        const rawHost = (forwardedHost || (req && req.headers && req.headers.host) || '').toString();
        return rawHost.split(',')[0].trim().split(':')[0].toLowerCase();
    } catch (_) {
        return '';
    }
}

function getPublicAppHost() {
    return (process.env.PUBLIC_APP_HOST || 'app.fxguard.io').toString().trim().toLowerCase();
}

function isPublicAppRequest(req) {
    const host = getRequestHost(req);
    const publicHost = getPublicAppHost();
    return !!host && !!publicHost && host === publicHost;
}

function getDemoUserPayload() {
    return {
        id: 'demo-user',
        username: getDemoUsername(),
        name: 'Demo User',
        firstName: 'Demo',
        lastName: 'User',
        email: (process.env.DEMO_EMAIL || 'demo@fxguard.io').toString().trim().toLowerCase(),
        role: 'admin',
        departmentId: null,
        branchId: null,
        status: 'online',
        permissions: {
            dashboard: true,
            conversations: true,
            customers: true,
            tickets: true,
            tasks: true,
            departments: true,
            users: true,
            branches: true,
            supervision: true,
            staff_activity: true,
            profile: true,
            announcements: true,
            internal_chat: true,
            whatsapp: true,
            rates: true,
            services: true,
            processes: true,
            panel_settings: true,
            manage_users: true,
            manage_tickets: true
        },
        totpEnabled: false,
        isDemo: true
    };
}

function isDemoCredentialMatch(identifier, password) {
    const normalizedIdentifier = (identifier || '').toString().trim().toLowerCase();
    const demoUsername = getDemoUsername().toLowerCase();
    const demoEmail = getDemoUserPayload().email.toLowerCase();
    return (normalizedIdentifier === demoUsername || normalizedIdentifier === demoEmail) && String(password || '') === getDemoPassword();
}

function isPublicAppHostName(host) {
    const h = (host || '').toString().trim().split(',')[0].trim().split(':')[0].toLowerCase();
    const publicHost = getPublicAppHost();
    return !!h && !!publicHost && h === publicHost;
}

module.exports = {
    isDemoModeEnabled,
    getDemoUsername,
    getDemoUserPayload,
    isDemoCredentialMatch,
    isPublicAppRequest,
    getPublicAppHost,
    isPublicAppHostName
};
