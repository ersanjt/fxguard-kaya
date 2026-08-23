/**
 * Kaya CRM — سقف پلن تجاری (شعبه، صندلی، ماژول نرخ)
 * @file    backend/lib/planLimits.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */

'use strict';

const PLAN_TIERS = ['legacy', 'start', 'business', 'multi', 'license', 'managed'];
const FX_NAV_PAGES = ['rates', 'rates-charts', 'services'];
const DEFAULT_TIER = 'legacy';
const SNAPSHOT_CACHE_MS = 8000;

class PlanLimitError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'PlanLimitError';
        this.code = code;
        this.status = 403;
    }
}

let snapshotCache = { at: 0, value: null };
let limitsCache = { at: 0, value: null };

function invalidatePlanCache() {
    snapshotCache = { at: 0, value: null };
    limitsCache = { at: 0, value: null };
}

function normalizePlanTier(raw) {
    const v = String(raw || '')
        .trim()
        .toLowerCase();
    return PLAN_TIERS.indexOf(v) >= 0 ? v : null;
}

function isPlanTierLockEnabled(env) {
    const src = env || process.env;
    const v = String(src.PLAN_TIER_LOCK || '')
        .trim()
        .toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Default is legacy (no caps) so existing tenants are not locked.
 * PLAN_TIER_LOCK=1 + PLAN_TIER=start makes hosting env win over the panel UI.
 */
function resolvePlanTier(storedTier, env) {
    const src = env || process.env;
    const envTier = normalizePlanTier(src.PLAN_TIER);
    if (isPlanTierLockEnabled(src) && envTier) return envTier;
    return normalizePlanTier(storedTier) || envTier || DEFAULT_TIER;
}

function limitsForTier(tier) {
    const t = normalizePlanTier(tier) || DEFAULT_TIER;
    if (t === 'start') {
        return { staffLimit: 3, branchLimit: 1, fxEnabled: false };
    }
    if (t === 'business') {
        return { staffLimit: 10, branchLimit: 3, fxEnabled: true };
    }
    return { staffLimit: null, branchLimit: null, fxEnabled: true };
}

function remainingSlots(used, limit) {
    if (limit == null) return null;
    return Math.max(0, limit - (Number(used) || 0));
}

function mergeFxHidden(hiddenSections, snap) {
    const hidden = Array.isArray(hiddenSections) ? hiddenSections.slice() : [];
    if (snap && snap.fxEnabled === false) {
        FX_NAV_PAGES.forEach((page) => {
            if (hidden.indexOf(page) < 0) hidden.push(page);
        });
    }
    return hidden;
}

/**
 * What the dashboard home should surface: timed WhatsApp trial, or Start caps.
 * Legacy/business with no trial stay quiet so existing desks are not nagged.
 */
function commercialHomeKind(snap, trial) {
    const status = trial && trial.status;
    if (status === 'active') return 'trial_active';
    if (status === 'expired') return 'trial_expired';
    if (snap && snap.tier === 'start') return 'start';
    return 'none';
}

function planErrorPayload(err) {
    if (!err || err.name !== 'PlanLimitError') return null;
    return { error: err.message, code: err.code };
}

async function loadStoredPlanTier() {
    const { PanelSetting } = require('../models');
    const row = await PanelSetting.findByPk('default');
    return row && row.planTier != null ? row.planTier : null;
}

async function getResolvedLimits() {
    const now = Date.now();
    if (limitsCache.value && now - limitsCache.at < SNAPSHOT_CACHE_MS) {
        return limitsCache.value;
    }
    const stored = await loadStoredPlanTier();
    const tier = resolvePlanTier(stored);
    const limits = limitsForTier(tier);
    const locked = isPlanTierLockEnabled() && !!normalizePlanTier(process.env.PLAN_TIER);
    const value = {
        tier,
        locked,
        staffLimit: limits.staffLimit,
        branchLimit: limits.branchLimit,
        fxEnabled: limits.fxEnabled !== false,
    };
    limitsCache = { at: now, value };
    return value;
}

async function getPlanSnapshot(options) {
    const opts = options || {};
    const withCounts = opts.counts !== false;
    const now = Date.now();
    if (
        withCounts &&
        snapshotCache.value &&
        now - snapshotCache.at < SNAPSHOT_CACHE_MS
    ) {
        return snapshotCache.value;
    }

    const resolved = await getResolvedLimits();

    let staffCount = 0;
    let branchCount = 0;
    if (withCounts) {
        const { User, Branch } = require('../models');
        staffCount = await User.count({ where: { isActive: true } });
        branchCount = await Branch.count({ where: { isActive: true } });
    }

    const snap = {
        tier: resolved.tier,
        locked: resolved.locked,
        staffLimit: resolved.staffLimit,
        branchLimit: resolved.branchLimit,
        staffCount,
        branchCount,
        staffRemaining: remainingSlots(staffCount, resolved.staffLimit),
        branchRemaining: remainingSlots(branchCount, resolved.branchLimit),
        fxEnabled: resolved.fxEnabled !== false,
    };

    if (withCounts) {
        snapshotCache = { at: now, value: snap };
    }
    return snap;
}

async function isFxModuleEnabled() {
    const snap = await getPlanSnapshot({ counts: false });
    return snap.fxEnabled !== false;
}

async function assertCanAddStaff() {
    invalidatePlanCache();
    const snap = await getPlanSnapshot({ counts: true });
    if (snap.staffLimit == null) return snap;
    if (snap.staffCount >= snap.staffLimit) {
        throw new PlanLimitError(
            `سقف پلن فعلی ${snap.staffLimit} کارمند فعال است. برای افزودن نیرو پلن را ارتقا دهید.`,
            'PLAN_STAFF_LIMIT'
        );
    }
    return snap;
}

async function assertCanAddBranch() {
    invalidatePlanCache();
    const snap = await getPlanSnapshot({ counts: true });
    if (snap.branchLimit == null) return snap;
    if (snap.branchCount >= snap.branchLimit) {
        throw new PlanLimitError(
            `سقف پلن فعلی ${snap.branchLimit} شعبه فعال است. برای شعبه بیشتر پلن را ارتقا دهید.`,
            'PLAN_BRANCH_LIMIT'
        );
    }
    return snap;
}

async function requireFxModule(req, res, next) {
    try {
        const ok = await isFxModuleEnabled();
        if (!ok) {
            return res.status(403).json({
                error: 'ماژول نرخ ارز و خدمات صرافی در پلن شروع فعال نیست. پلن تجاری یا بالاتر لازم است.',
                code: 'PLAN_FX_LOCKED',
            });
        }
        next();
    } catch (err) {
        next(err);
    }
}

async function attachPlanToSettings(out) {
    const snap = await getPlanSnapshot({ counts: true });
    out.planTier = snap.tier;
    out.planLimits = snap;
    out.navHiddenSections = mergeFxHidden(out.hiddenSections, snap);
    return out;
}

module.exports = {
    PLAN_TIERS,
    FX_NAV_PAGES,
    DEFAULT_TIER,
    PlanLimitError,
    normalizePlanTier,
    isPlanTierLockEnabled,
    resolvePlanTier,
    limitsForTier,
    remainingSlots,
    mergeFxHidden,
    commercialHomeKind,
    planErrorPayload,
    invalidatePlanCache,
    getPlanSnapshot,
    isFxModuleEnabled,
    assertCanAddStaff,
    assertCanAddBranch,
    requireFxModule,
    attachPlanToSettings,
};
