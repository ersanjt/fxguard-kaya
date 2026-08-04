/**
 * Dashboard constants — page IDs, routing, section mapping
 */
(function () {
    'use strict';

    const VALID_PAGES = [
        'dashboard', 'conversations', 'customers', 'departments', 'users',
        'tickets', 'tasks', 'processes', 'whatsapp', 'message-templates',
        'branches', 'supervision', 'system-status', 'staff-activity', 'profile', 'announcements',
        'internal-chat', 'rates', 'rates-charts', 'services', 'panel-settings'
    ];

    const PAGE_TO_SECTION = {
        'panel-settings': 'panel_settings',
        whatsapp: 'whatsapp',
        tickets: 'tickets',
        'internal-chat': 'internal_chat',
        tasks: 'tasks',
        supervision: 'supervision',
        'system-status': 'system_status',
        'staff-activity': 'staff_activity',
        branches: 'branches',
        departments: 'departments',
        users: 'users',
        rates: 'rates',
        'rates-charts': 'rates',
        services: 'services',
        conversations: 'conversations',
        customers: 'customers',
        processes: 'processes',
        announcements: 'announcements',
        'message-templates': 'conversations'
    };

    const PAGE_IDS = {
        dashboard: 'pageDashboard',
        conversations: 'pageConversations',
        customers: 'pageCustomers',
        departments: 'pageDepartments',
        users: 'pageUsers',
        tickets: 'pageTickets',
        tasks: 'pageTasks',
        processes: 'pageProcesses',
        whatsapp: 'pageWhatsapp',
        'message-templates': 'pageMessageTemplates',
        branches: 'pageBranches',
        supervision: 'pageSupervision',
        'system-status': 'pageSystemStatus',
        'staff-activity': 'pageStaffActivity',
        profile: 'pageProfile',
        announcements: 'pageAnnouncements',
        'internal-chat': 'pageInternalChat',
        rates: 'pageRates',
        'rates-charts': 'pageRatesCharts',
        services: 'pageServices',
        'panel-settings': 'pagePanelSettings'
    };

    const PAGE_TITLES = {
        dashboard: 'nav_dashboard',
        conversations: 'nav_conversations',
        customers: 'nav_customers',
        tickets: 'nav_tickets',
        tasks: 'nav_tasks',
        processes: 'nav_processes',
        departments: 'nav_departments',
        users: 'nav_users',
        branches: 'nav_branches',
        supervision: 'nav_supervision',
        'system-status': 'nav_system_status',
        'staff-activity': 'nav_staff_activity',
        profile: 'nav_profile',
        announcements: 'nav_announcements',
        'internal-chat': 'nav_internal_chat',
        whatsapp: 'nav_whatsapp',
        'message-templates': 'nav_message_templates',
        rates: 'nav_rates',
        'rates-charts': 'nav_rates_charts',
        services: 'nav_services',
        'panel-settings': 'nav_panel_settings'
    };

    window.CRM = window.CRM || {};
    window.CRM.Constants = {
        VALID_PAGES: VALID_PAGES,
        PAGE_TO_SECTION: PAGE_TO_SECTION,
        PAGE_IDS: PAGE_IDS,
        PAGE_TITLES: PAGE_TITLES
    };
})();
