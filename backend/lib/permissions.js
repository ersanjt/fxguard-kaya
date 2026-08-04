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
    'system_status',  // وضعیت سیستم / Gateway / متریک (ادمین)
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
const VIEW_CUSTOMER_PHONE_KEY = 'view_customer_phone'; // نمایش شماره تلفن مخاطب در مکالمات/مشتریان
const BULK_MESSAGING_KEY = 'bulk_messaging'; // ارسال پیام انبوه به مشتریان

/** ادمین‌های اصلی پنل — این ایمیل‌ها (از env) دسترسی کامل دارند. خالی بودن = هیچ‌کس ادمین اصلی نیست. با کاما جدا کنید. */
const MAIN_ADMIN_EMAIL = (process.env.MAIN_ADMIN_EMAIL || '').trim();
const MAIN_ADMIN_EMAILS = MAIN_ADMIN_EMAIL.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

function isMainAdmin(user) {
    if (!user || !user.email || !MAIN_ADMIN_EMAILS.length) return false;
    return MAIN_ADMIN_EMAILS.includes(String(user.email).trim().toLowerCase());
}

/** پیش‌فرض دسترسی هر نقش (بدون override در user.permissions) */
const DEFAULT_BY_ROLE = {
    owner: {
        dashboard: true, conversations: true, customers: true, tickets: true, tasks: true,
        departments: true, users: true, branches: true, supervision: true, system_status: true,
        staff_activity: true, profile: true, announcements: true, internal_chat: true, whatsapp: true, rates: true, services: true, processes: true, panel_settings: true,
        [MANAGE_USERS_KEY]: true, [MANAGE_TICKETS_KEY]: true, [VIEW_CUSTOMER_PHONE_KEY]: true, [BULK_MESSAGING_KEY]: true,
    },
    admin: {
        dashboard: true, conversations: true, customers: true, tickets: true, tasks: true,
        departments: true, users: true, branches: true, supervision: false, system_status: true,
        staff_activity: true, profile: true, announcements: true, internal_chat: true, whatsapp: true, rates: true, services: true, processes: true, panel_settings: true,
        [MANAGE_USERS_KEY]: true, [MANAGE_TICKETS_KEY]: true, [VIEW_CUSTOMER_PHONE_KEY]: true, [BULK_MESSAGING_KEY]: true,
    },
    manager: {
        dashboard: true, conversations: true, customers: true, tickets: true, tasks: true,
        departments: true, users: true, branches: true, supervision: false, system_status: false,
        staff_activity: true, profile: true, announcements: true, internal_chat: true, whatsapp: false, rates: false, services: true, processes: true, panel_settings: false,
        [MANAGE_USERS_KEY]: true, [MANAGE_TICKETS_KEY]: true, [VIEW_CUSTOMER_PHONE_KEY]: true, [BULK_MESSAGING_KEY]: false,
    },
    supervisor: {
        dashboard: true, conversations: true, customers: true, tickets: true, tasks: true,
        departments: false, users: true, branches: false, supervision: false, system_status: false,
        staff_activity: true, profile: true, announcements: true, internal_chat: true, whatsapp: false, rates: false, services: true, processes: true, panel_settings: false,
        [MANAGE_USERS_KEY]: false, [MANAGE_TICKETS_KEY]: true, [VIEW_CUSTOMER_PHONE_KEY]: false, [BULK_MESSAGING_KEY]: false,
    },
    agent: {
        dashboard: true, conversations: true, customers: true, tickets: true, tasks: true,
        departments: false, users: false, branches: false, supervision: false, system_status: false,
        staff_activity: false, profile: true, announcements: true, internal_chat: true, whatsapp: false, rates: false, services: true, processes: true, panel_settings: false,
        [MANAGE_USERS_KEY]: false, [MANAGE_TICKETS_KEY]: false, [VIEW_CUSTOMER_PHONE_KEY]: false, [BULK_MESSAGING_KEY]: false,
    },
};

function getDefaults(role) {
    const d = DEFAULT_BY_ROLE[role] || DEFAULT_BY_ROLE.agent;
    const out = {};
    SECTION_KEYS.forEach(k => { out[k] = !!d[k]; });
    out[MANAGE_USERS_KEY] = !!d[MANAGE_USERS_KEY];
    out[MANAGE_TICKETS_KEY] = !!d[MANAGE_TICKETS_KEY];
    out[VIEW_CUSTOMER_PHONE_KEY] = !!d[VIEW_CUSTOMER_PHONE_KEY];
    out[BULK_MESSAGING_KEY] = !!d[BULK_MESSAGING_KEY];
    return out;
}

/**
 * دسترسی نهایی کاربر را برمی‌گرداند (پیش‌فرض نقش + override از user.permissions).
 * ادمین اصلی پنل (MAIN_ADMIN_EMAIL) و مالک (owner) همیشه دسترسی کامل دارند.
 */
function getPermissions(user) {
    if (!user) return getDefaults('agent');
    if (isMainAdmin(user)) return getDefaults('owner');
    if (user.role === 'owner') return getDefaults('owner'); // مالک همیشه دسترسی کامل
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
    if (overrides[VIEW_CUSTOMER_PHONE_KEY] !== undefined) {
        resolved[VIEW_CUSTOMER_PHONE_KEY] = !!overrides[VIEW_CUSTOMER_PHONE_KEY];
    }
    if (overrides[BULK_MESSAGING_KEY] !== undefined) {
        resolved[BULK_MESSAGING_KEY] = !!overrides[BULK_MESSAGING_KEY];
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

/** فقط مالک یا ادمین اصلی می‌توانند مشتری را (نرم) از دسترس خارج کنند — پیام‌ها هرگز پاک نمی‌شوند */
function canDeleteCustomer(user) {
    if (!user) return false;
    if (isMainAdmin(user)) return true;
    return user.role === 'owner';
}

/** فقط مالک (بالاترین سطح دسترسی) می‌تواند کاربر را حذف کند */
function canDeleteUser(user) {
    if (!user) return false;
    if (isMainAdmin(user)) return true;
    return user.role === 'owner';
}

/** فقط مالک یا ادمین اصلی می‌تواند مکالمه را آرشیو/از لیست فعال خارج کند */
function canManageConversations(user) {
    if (!user) return false;
    if (isMainAdmin(user)) return true;
    return user.role === 'owner';
}

/** حذف سخت دادهٔ پیام مطلقاً ممنوع است (حتی برای مالک) — فقط آرشیو مجاز است */
function canHardDeleteMessages() {
    return false;
}

/** مالک، ادمین و مدیر می‌توانند مکالمات آرشیو شده را ببینند */
function canViewArchivedConversations(user) {
    if (!user) return false;
    if (isMainAdmin(user)) return true;
    return ['owner', 'admin', 'manager'].indexOf(user.role || '') !== -1;
}

/** مالک (مدیرعامل)، ادمین و ادمین اصلی می‌توانند مکالمات مخفی از کارکنان را ببینند */
function canViewHiddenConversations(user) {
    if (!user) return false;
    if (isMainAdmin(user)) return true;
    return ['owner', 'admin'].indexOf(user.role || '') !== -1;
}

/** فقط ادمین سطح بالا می‌تواند دسترسی مشتری/مکالمهٔ محدود را به دیگران بدهد */
function canGrantStaffResourceAccess(user) {
    return canViewHiddenConversations(user);
}

/** مالک و هر کاربری که دسترسی manage_tickets دارد می‌تواند تیکت را حذف یا آرشیو کند */
function canManageTickets(user) {
    if (!user) return false;
    if (isMainAdmin(user)) return true;
    if (user.role === 'owner') return true;
    const p = getPermissions(user);
    return !!p[MANAGE_TICKETS_KEY];
}

/** آیا کاربر می‌تواند شماره تلفن مخاطب را ببیند؟ */
function canViewCustomerPhone(user) {
    if (!user) return false;
    if (isMainAdmin(user)) return true;
    if (user.role === 'owner') return true;
    const p = getPermissions(user);
    return !!p[VIEW_CUSTOMER_PHONE_KEY];
}

/** آیا کاربر می‌تواند پیام انبوه بفرستد؟ */
function canBulkMessage(user) {
    if (!user) return false;
    if (isMainAdmin(user)) return true;
    if (user.role === 'owner') return true;
    const p = getPermissions(user);
    return !!p[BULK_MESSAGING_KEY];
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
    canManageTickets,
    canViewCustomerPhone,
    canBulkMessage,
    canDeleteCustomer,
    canDeleteUser,
    canManageConversations,
    canHardDeleteMessages,
    canViewArchivedConversations,
    canViewHiddenConversations,
    canGrantStaffResourceAccess,
    isMainAdmin,
    getSectionKeys,
    getManageUsersKey,
    SECTION_KEYS,
    MANAGE_USERS_KEY,
    MANAGE_TICKETS_KEY,
    VIEW_CUSTOMER_PHONE_KEY,
    BULK_MESSAGING_KEY,
    MAIN_ADMIN_EMAIL,
    MAIN_ADMIN_EMAILS,
};
