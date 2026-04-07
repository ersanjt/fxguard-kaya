function isDemoModeEnabled() {
    return String(process.env.DEMO_MODE || '').trim().toLowerCase() === 'true';
}

function getDemoUsername() {
    return (process.env.DEMO_USERNAME || 'demo').toString().trim();
}

function getDemoPassword() {
    return (process.env.DEMO_PASSWORD || '123456').toString();
}

function getDemoUserPayload() {
    return {
        id: 'demo-user',
        username: getDemoUsername(),
        name: 'Demo User',
        firstName: 'Demo',
        lastName: 'User',
        email: (process.env.DEMO_EMAIL || 'demo@fxguard.io').toString().trim().toLowerCase(),
        role: 'agent',
        departmentId: null,
        branchId: null,
        status: 'online',
        permissions: {
            dashboard: true,
            conversations: true,
            customers: true,
            tickets: true,
            tasks: true,
            departments: false,
            users: false,
            branches: false,
            supervision: false,
            staff_activity: false,
            profile: true,
            announcements: true,
            internal_chat: true,
            whatsapp: false,
            rates: false,
            services: true,
            processes: true,
            panel_settings: false,
            manage_users: false,
            manage_tickets: false
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

module.exports = {
    isDemoModeEnabled,
    getDemoUsername,
    getDemoUserPayload,
    isDemoCredentialMatch
};
