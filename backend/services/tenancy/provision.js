/**
 * ساخت شرکت: دیتابیس خالی، جدول‌ها، دپارتمان پیش‌فرض، کاربر مالک.
 */
const { validatePassword } = require('../../lib/passwordValidation');
const { runPreSync, runPostSync } = require('../core/autoMigrate');
const { ensureDefaultDepartments } = require('../defaultDepartments');
const logger = require('../../config/logger');
const registry = require('./registry');
const connections = require('./connections');
const { run } = require('./context');
const { allowedEnvironments, isLegacyTenant, isReservedSlug, panelUrl } = require('./host');
const { trialEndsFrom } = require('./billing');

const SLUG_RE = /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/;

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

function normalizeSlug(raw) {
    return String(raw || '').trim().toLowerCase();
}

function assertInput({ slug, name, ownerEmail, ownerPassword, environment }) {
    if (!SLUG_RE.test(slug) || isReservedSlug(slug)) {
        throw httpError(400, 'آدرس شرکت فقط حرف کوچک انگلیسی، عدد و خط تیره است و با حرف شروع می‌شود.');
    }
    if (!name || String(name).trim().length < 2) {
        throw httpError(400, 'نام شرکت لازم است.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
        throw httpError(400, 'ایمیل مالک نامعتبر است.');
    }
    const pwd = validatePassword(ownerPassword);
    if (!pwd.valid) throw httpError(400, 'رمز مالک باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد.');
    if (!allowedEnvironments().includes(environment)) {
        throw httpError(400, 'این سرور شرکت را در این محیط نمی‌سازد.');
    }
    if (isLegacyTenant(slug, environment)) {
        throw httpError(409, 'این شرکت روی دیتابیس فعلی همین سرور است و دیتابیس جدا نمی‌گیرد.');
    }
}

async function seedBranding(companyName) {
    const { PanelSetting } = require('../../models');
    const existing = await PanelSetting.findByPk('default');
    if (existing) return existing;
    return PanelSetting.create({
        id: 'default',
        siteName: companyName,
        loginTitle: companyName,
        pageTitle: companyName,
        footerText: companyName
    });
}

async function seedOwner(ownerEmail, ownerPassword, companyName) {
    const { User } = require('../../models');
    const existing = await User.findOne({ where: { email: ownerEmail } });
    if (existing) return existing;
    const local = ownerEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24) || 'owner';
    return User.create({
        name: companyName,
        username: local,
        email: ownerEmail,
        password: ownerPassword,
        role: 'owner',
        isActive: true
    });
}

async function provisionTenant(input) {
    const slug = normalizeSlug(input.slug);
    const environment = String(input.environment || '').trim().toLowerCase();
    const name = String(input.name || '').trim().slice(0, 120);
    const ownerEmail = String(input.ownerEmail || '').trim().toLowerCase();
    const ownerPassword = String(input.ownerPassword || '');
    assertInput({ slug, name, ownerEmail, ownerPassword, environment });

    let row = await registry.findOne(slug, environment);
    if (row && row.status === 'active') {
        throw httpError(409, 'این شرکت قبلاً ساخته شده است.');
    }
    if (!row) {
        row = await registry.createRow({
            slug,
            environment,
            name,
            status: 'provisioning',
            ownerEmail,
            plan: 'trial',
            trialEndsAt: trialEndsFrom()
        });
    } else {
        row.name = name;
        row.ownerEmail = ownerEmail;
        row.status = 'provisioning';
        row.lastError = null;
        await row.save();
    }

    try {
        const meta = await connections.allocateDatabase(slug, environment);
        row.dbConfig = JSON.stringify(meta);
        const tenantSequelize = connections.openFromRow(row);
        if (tenantSequelize.getDialect() === 'sqlite') {
            await tenantSequelize.query('PRAGMA journal_mode=WAL;');
        }
        const models = require('../../models');
        await run({ sequelize: tenantSequelize, tenant: row, publicBase: panelUrl(slug, environment) }, async () => {
            await runPreSync(models.sequelize, logger);
            await models.sequelize.sync();
            await runPostSync(models.sequelize, logger, { RateCurrency: models.RateCurrency });
            await ensureDefaultDepartments();
            await seedOwner(ownerEmail, ownerPassword, name);
            await seedBranding(name);
        });
        row.status = 'active';
        row.lastError = null;
        row.plan = 'trial';
        if (!row.trialEndsAt) row.trialEndsAt = trialEndsFrom();
        await row.save();
        return {
            slug,
            name,
            environment,
            ownerEmail,
            panelUrl: panelUrl(slug, environment),
            status: 'active',
            plan: 'trial',
            trialEndsAt: row.trialEndsAt
        };
    } catch (err) {
        row.status = 'failed';
        row.lastError = String(err.message || err).slice(0, 500);
        try {
            await row.save();
        } catch (_) {}
        if (err.status && err.status < 500) throw err;
        logger.error('Tenant provision failed', { slug, environment, error: err.message });
        throw httpError(500, 'ساخت پنل شرکت انجام نشد.');
    }
}

module.exports = { provisionTenant };
