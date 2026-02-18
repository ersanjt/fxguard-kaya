/**
 * دسترسی‌های پنل — owner، admin و manager (و هر کاربری که دسترسی «مدیریت کاربران» به او داده شده)
 * می‌توانند دپارتمان‌ها و کاربران را ویرایش کنند و دسترسی افراد را تعیین کنند.
 * هر بخش پنل با کلید زیر قابل کنترل است.
 */
const SECTION_KEYS = [
    'dashboard',      // داشبورد (صفحه اول)
    'conversations',  // مکالمات
    'customers',      // مشتریان
    'tickets',        // تیکت‌های داخلی
    'tasks',          // وظایف و تسک‌ها
    'departments',    // دپارتمان‌ها
    'users',          // کاربران
    'branches',       // شعب
    'supervision',    // نظارت (مالک)
    'staff_activity', // ورودها و وضعیت آنلاین
    'profile',        // پروفایل من (همیشه برای خود کاربر)
    'announcements',  // اعلان‌ها
    'internal_chat',  // چت داخلی
    'whatsapp',       // اتصال واتساپ
    'rates',          // تنظیم نرخ ارزها (نوار زیر پنل)
    'services',       // خدمات صرافی (سرویس‌های قابل ارائه)
    'processes',      // فرایندهای کسب‌وکار (BPM)
    'panel_settings', // ظاهر پنل (لوگو، فاویکون، نام سایت)
];

const MANAGE_USERS_KEY = 'manage_users'; // owner، admin، manager یا دارنده این دسترسی می‌توانند کاربران و دپارتمان‌ها را ویرایش/مدیریت کنند
const MANAGE_TICKETS_KEY = 'manage_tickets'; // حذف و آرشیو تیکت

/** ادمین اصلی پنل — این ایمیل (از env یا پیش‌فرض) دسترسی کامل دارد. خالی بودن = هیچ‌کس ادمین اصلی نیست و همه قابل حذف/ویرایش هستند. */
const MAIN_ADMIN_EMAIL = (process.env.MAIN_ADMIN_EMAIL || 'ersanjahedtabrizi@gmail.com').trim();

function isMainAdmin(user) {
    if (!user || !user.email || !MAIN_ADMIN_EMAIL) return false;
    return String(user.email).trim().toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase();
}

/** پیش‌فرض دسترسی هر نقش (بدون override در user.permissions) */
const DEFAULT_BY_ROLE = {
    owner: {
        dashboard: true, conversations: true, customers: true, tickets: true, tasks: true,
        departments: true, users: true, branches: true, supervision: true,
        staff_activity: true, profile: true, announcements: true, internal_chat: true, whatsapp: true, rates: true, services: true, processes: true, panel_settings: true,
        [MANAGE_USERS_KEY]: true, [MANAGE_TICKETS_KEY]: true,
    },
    admin: {
        dashboard: true, conversations: true, customers: true, tickets: true, tasks: true,
        departments: true, users: true, branches: true, supervision: false,
        staff_activity: true, profile: true, announcements: true, internal_chat: true, whatsapp: true, rates: true, services: true, processes: true, panel_settings: true,
        [MANAGE_USERS_KEY]: true, [MANAGE_TICKETS_KEY]: true,
    },
    manager: {
        dashboard: true, conversations: true, customers: true, tickets: true, tasks: true,
        departments: true, users: true, branches: true, supervision: false,
        staff_activity: true, profile: true, announcements: true, internal_chat: true, whatsapp: false, rates: false, services: true, processes: true, panel_settings: false,
        [MANAGE_USERS_KEY]: true, [MANAGE_TICKETS_KEY]: true,
    },
    supervisor: {
        dashboard: true, conversations: true, customers: true, tickets: true, tasks: true,
        departments: false, users: true, branches: false, supervision: false,
        staff_activity: true, profile: true, announcements: true, internal_chat: true, whatsapp: false, rates: false, services: true, processes: true, panel_settings: false,
        [MANAGE_USERS_KEY]: false, [MANAGE_TICKETS_KEY]: true,
    },
    agent: {
        dashboard: true, conversations: true, customers: true, tickets: true, tasks: true,
        departments: false, users: false, branches: false, supervision: false,
        staff_activity: false, profile: true, announcements: true, internal_chat: true, whatsapp: false, rates: false, services: true, processes: true, panel_settings: false,
        [MANAGE_USERS_KEY]: false,
    },
};

function getDefaults(role) {
    const d = DEFAULT_BY_ROLE[role] || DEFAULT_BY_ROLE.agent;
    const out = {};
    SECTION_KEYS.forEach(k => { out[k] = !!d[k]; });
    out[MANAGE_USERS_KEY] = !!d[MANAGE_USERS_KEY];
    out[MANAGE_TICKETS_KEY] = !!d[MANAGE_TICKETS_KEY];
    return out;
}

/**
 * دسترسی نهایی کاربر را برمی‌گرداند (پیش‌فرض نقش + override از user.permissions).
 * ادمین اصلی پنل (MAIN_ADMIN_EMAIL) همیشه دسترسی کامل دارد.
 */
function getPermissions(user) {
    if (!user) return getDefaults('agent');
    if (isMainAdmin(user)) return getDefaults('owner');
    const role = user.role || 'agent';
    const defaults = getDefaults(role);
    const overrides = user.permissions && typeof user.permissions === 'object' ? user.permissions : {};
    const resolved = { ...defaults };
    SECTION_KEYS.forEach(k => {
        if (overrides[k] !== undefined) resolved[k] = !!overrides[k];
    });
    if (overrides[MANAGE_USERS_KEY] !== undefined) {
        resolved[MANAGE_USERS_KEY] = !!overrides[MANAGE_USERS_KEY];
    }
    if (overrides[MANAGE_TICKETS_KEY] !== undefined) {
        resolved[MANAGE_TICKETS_KEY] = !!overrides[MANAGE_TICKETS_KEY];
    }
    return resolved;
}

function canAccess(user, section) {
    const p = getPermissions(user);
    if (section === 'profile') return true; // پروفایل خودش همیشه
    return !!p[section];
}

function canManageUsers(user) {
    if (!user) return false;
    if (isMainAdmin(user)) return true;
    if (user.role === 'owner') return true;
    const p = getPermissions(user);
    return !!p[MANAGE_USERS_KEY];
}

function getSectionKeys() {
    return [...SECTION_KEYS];
}

function getManageUsersKey() {
    return MANAGE_USERS_KEY;
}

module.exports = {
    getPermissions,
    canAccess,
    canManageUsers,
    isMainAdmin,
    getSectionKeys,
    getManageUsersKey,
    SECTION_KEYS,
    MANAGE_USERS_KEY,
    MAIN_ADMIN_EMAIL,
};
