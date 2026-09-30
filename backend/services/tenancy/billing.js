/**
 * دورهٔ رایگان ۱۴روزه و پنل‌هایی که بعد از آن باید تهیه شوند.
 */
const TRIAL_DAYS = 14;

const PLANS = [
    {
        id: 'monthly',
        name: 'پنل ماهانه',
        price: '$49',
        period: 'در ماه',
        url: 'https://wa.me/905010676486?text=I%20want%20the%20monthly%20FXGuard%20panel'
    },
    {
        id: 'yearly',
        name: 'پنل سالانه',
        price: '$490',
        period: 'در سال',
        url: 'https://wa.me/905010676486?text=I%20want%20the%20yearly%20FXGuard%20panel'
    },
    {
        id: 'custom',
        name: 'پنل سفارشی',
        price: 'توافقی',
        period: '',
        url: 'https://fxguard.io/#contact-form'
    }
];

function trialEndsFrom(now) {
    const start = now ? new Date(now) : new Date();
    return new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

function assessTenantBilling(tenant) {
    if (!tenant || tenant.legacy) return { active: true };
    const plan = tenant.plan || 'trial';
    if (plan !== 'trial') {
        const paidUntil = tenant.planExpiresAt ? new Date(tenant.planExpiresAt) : null;
        if (!paidUntil || paidUntil.getTime() > Date.now()) return { active: true, plan };
    }
    const ends = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
    if (!ends || ends.getTime() > Date.now()) return { active: true, plan: 'trial', trialEndsAt: ends };
    return { active: false, plan: 'trial', trialEndsAt: ends };
}

function expiredBillingPayload() {
    return {
        billingRequired: true,
        error: '۱۴ روز استفاده رایگان تمام شد. برای ادامه باید یکی از پنل‌ها را تهیه کنید.',
        plans: PLANS
    };
}

module.exports = {
    TRIAL_DAYS,
    PLANS,
    trialEndsFrom,
    assessTenantBilling,
    expiredBillingPayload
};
