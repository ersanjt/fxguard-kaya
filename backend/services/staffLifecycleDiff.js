/**
 * توابع خالص diff/فرمت چرخهٔ عمر کاربر (بدون DB)
 */
const { normalizePhone, isKnownPhoneDigits, canonicalizePhoneDigits } = require('../lib/phoneUtils');

const ROLE_LABELS_FA = {
    owner: 'مالک',
    admin: 'مدیر',
    manager: 'مدیر میانی',
    supervisor: 'سرپرست',
    agent: 'کارشناس',
};

function permissionsFingerprint(perms) {
    if (!perms || typeof perms !== 'object') return '';
    return Object.keys(perms)
        .sort()
        .filter((k) => !!perms[k])
        .join(',');
}

function snapshotUser(user, extras = {}) {
    if (!user) return null;
    const j = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
    return {
        id: j.id,
        name: j.name || '',
        email: j.email || '',
        phone: j.phone || null,
        role: j.role || '',
        position: j.position || null,
        departmentId: j.departmentId || null,
        branchId: j.branchId || null,
        isActive: j.isActive !== false,
        permissionsFp: permissionsFingerprint(j.permissions),
        telegramChatId: j.telegramChatId || null,
        departmentName: extras.departmentName || (j.department && j.department.name) || null,
        branchName: extras.branchName || (j.branch && j.branch.name) || null,
    };
}

function computeLifecycleChanges(before, after, opts = {}) {
    const changes = [];
    if (!before || !after) return changes;
    if (before.role !== after.role) {
        changes.push({
            key: 'role',
            label: 'نقش / سطح دسترسی',
            from: ROLE_LABELS_FA[before.role] || before.role || '—',
            to: ROLE_LABELS_FA[after.role] || after.role || '—',
        });
    }
    if (String(before.position || '') !== String(after.position || '')) {
        changes.push({
            key: 'position',
            label: 'سمت / عنوان',
            from: before.position || '—',
            to: after.position || '—',
        });
    }
    if (String(before.branchId || '') !== String(after.branchId || '')) {
        changes.push({
            key: 'branch',
            label: 'شعبه',
            from: before.branchName || '—',
            to: after.branchName || '—',
        });
    }
    if (String(before.departmentId || '') !== String(after.departmentId || '')) {
        changes.push({
            key: 'department',
            label: 'دپارتمان',
            from: before.departmentName || '—',
            to: after.departmentName || '—',
        });
    }
    if (!!before.isActive !== !!after.isActive) {
        changes.push({
            key: after.isActive ? 'account_activated' : 'account_deactivated',
            label: 'وضعیت حساب',
            from: before.isActive ? 'فعال' : 'مسدود',
            to: after.isActive ? 'فعال' : 'مسدود',
        });
    }
    if (before.permissionsFp !== after.permissionsFp) {
        changes.push({
            key: 'permissions',
            label: 'دسترسی بخش‌ها',
            from: before.permissionsFp ? 'سفارشی' : 'پیش‌فرض نقش',
            to: after.permissionsFp ? 'به‌روز شد' : 'بازگشت به پیش‌فرض نقش',
        });
    }
    if (opts.passwordChanged) {
        changes.push({
            key: 'password',
            label: 'رمز عبور',
            from: '••••',
            to: 'توسط مدیر تغییر کرد',
        });
    }
    if (String(before.phone || '') !== String(after.phone || '') && opts.includePhone) {
        changes.push({
            key: 'phone',
            label: 'شماره واتساپ',
            from: before.phone || '—',
            to: after.phone || '—',
        });
    }
    return changes;
}

function formatChangesText(changes) {
    if (!changes.length) return '';
    return changes.map((c) => `• ${c.label}: ${c.from} ← ${c.to}`).join('\n');
}

function normalizeStaffPhone(raw) {
    if (!raw) return null;
    const digits = canonicalizePhoneDigits(raw);
    if (!digits || !isKnownPhoneDigits(digits)) {
        const n = normalizePhone(raw);
        if (n && isKnownPhoneDigits(canonicalizePhoneDigits(n))) return n;
        return null;
    }
    return normalizePhone(raw) || digits;
}

module.exports = {
    ROLE_LABELS_FA,
    permissionsFingerprint,
    snapshotUser,
    computeLifecycleChanges,
    formatChangesText,
    normalizeStaffPhone,
};
