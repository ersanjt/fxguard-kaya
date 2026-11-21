/**
 * Kaya CRM — خلاصه وضعیت سیستم واتساپ — برای صفحه #whatsapp (مرکز کنترل)
 * @file    backend/lib/whatsappOverview.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/META-TECH-PROVIDER-PLAN-FA.md
 */
const { getWhatsappConnectionConfig, isCloudApiConfigured } = require('./whatsappConnectionLoader');
const { gatewayGet } = require('./gatewayClient');
const { getPublicEmbeddedSignupConfig } = require('./metaEmbeddedSignup');
const { getPanelSettingsKey } = require('./tenantContext');

function getPublicBaseUrl(req) {
    const env = String(process.env.BACKEND_PUBLIC_URL || '').trim().replace(/\/$/, '');
    if (env) return env;
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const host = req.get('x-forwarded-host') || req.get('host') || '';
    return host ? `${proto}://${host}` : '';
}

function getCloudWebhookUrl(req) {
    const publicUrl = getPublicBaseUrl(req);
    if (!publicUrl) return '';
    const webhook = new URL(`${publicUrl}/api/webhook/whatsapp-cloud`);
    const tenant = req && req.tenant;
    if (tenant && tenant.id && tenant.slug && !tenant.isPlatform) {
        webhook.searchParams.set('panel', tenant.slug);
    }
    return webhook.toString();
}

async function fetchGatewayStatus(cfg) {
    if (cfg.gatewayEnabled === false) {
        return { reachable: false, connected: false, reason: 'disabled' };
    }
    try {
        const r = await gatewayGet('/api/status', { timeout: 8000 });
        const data = r.data || {};
        return {
            reachable: true,
            connected: !!data.whatsapp,
            phase: data.phase || null,
            number: data.number || data.pushname || null,
            status: data.status || 'unknown',
            authFailure: data.authFailure || null,
        };
    } catch (e) {
        return {
            reachable: false,
            connected: false,
            reason: e.code || (e.response ? 'http_error' : 'unreachable'),
        };
    }
}

function resolveActiveChannel(mode, cloudReady, gatewayReady) {
    const m = mode || 'cloud_first';
    if (m === 'cloud') return cloudReady ? 'cloud' : (gatewayReady ? 'gateway' : 'none');
    if (m === 'gateway') return gatewayReady ? 'gateway' : (cloudReady ? 'cloud' : 'none');
    if (cloudReady) return 'cloud';
    if (gatewayReady) return 'gateway';
    return 'none';
}

/**
 * @param {import('express').Request} req
 */
async function buildWhatsappOverview(req) {
    const cfg = await getWhatsappConnectionConfig();
    const cloudConfigured = await isCloudApiConfigured();
    const appSecretSet = !!String(process.env.WHATSAPP_CLOUD_APP_SECRET || '').trim();
    const publicUrl = getPublicBaseUrl(req);
    const webhookUrl = getCloudWebhookUrl(req);

    const gateway = await fetchGatewayStatus(cfg);
    const cloudReady = cloudConfigured && cfg.cloudEnabled !== false;
    const gatewayReady = cfg.gatewayEnabled !== false && gateway.connected;

    const mode = cfg.connectionMode || 'cloud_first';
    const activeChannel = resolveActiveChannel(mode, cloudReady, gatewayReady);

    const cloudChecks = [
        { id: 'token', ok: !!(cfg.cloudAccessToken && String(cfg.cloudAccessToken).length > 10) },
        { id: 'phoneId', ok: !!String(cfg.cloudPhoneNumberId || '').trim() },
        { id: 'verifyToken', ok: !!String(cfg.cloudVerifyToken || '').trim() },
        { id: 'appSecret', ok: appSecretSet, envOnly: true },
        { id: 'publicUrl', ok: !!publicUrl },
        { id: 'bulkTemplate', ok: !!String(cfg.cloudBulkTemplateName || process.env.WHATSAPP_CLOUD_BULK_TEMPLATE_NAME || '').trim(), optional: true },
    ];

    const gatewayChecks = [
        { id: 'enabled', ok: cfg.gatewayEnabled !== false },
        { id: 'reachable', ok: gateway.reachable },
        { id: 'connected', ok: gateway.connected },
        { id: 'secret', ok: !!String(cfg.gatewayApiSecret || process.env.GATEWAY_API_SECRET || '').trim(), optional: true },
    ];

    const embeddedSignup = getPublicEmbeddedSignupConfig();
    let cloudWabaId = '';
    let embeddedSignupAt = null;
    try {
        const { WhatsappConnection } = require('../models');
        const panelKey = getPanelSettingsKey();
        if (panelKey) {
            const row = await WhatsappConnection.findByPk(panelKey, {
                attributes: ['cloudWabaId', 'embeddedSignupAt'],
            });
            if (row) {
                cloudWabaId = row.cloudWabaId || '';
                embeddedSignupAt = row.embeddedSignupAt || null;
            }
        }
    } catch (_) { /* جدول/ستون ممکن است هنوز نباشد */ }

    cloudChecks.push({
        id: 'embeddedSignup',
        ok: !!embeddedSignupAt || (!!cloudConfigured && !!String(cfg.cloudPhoneNumberId || '').trim()),
        optional: true,
        platformEnabled: !!embeddedSignup.enabled,
    });

    const warnings = [];
    if (mode === 'cloud_first' && !cloudReady && gatewayReady) {
        warnings.push({ id: 'cloud_fallback', level: 'info' });
    }
    if (activeChannel === 'gateway' && mode !== 'gateway') {
        warnings.push({ id: 'using_gateway', level: 'warn' });
    }
    if (activeChannel === 'gateway') {
        warnings.push({ id: 'number_risk', level: 'warn' });
    }
    if (cfg.cloudEnabled !== false && cloudConfigured && !appSecretSet) {
        warnings.push({ id: 'no_app_secret', level: 'error' });
    }
    if (cloudReady && gatewayReady) {
        warnings.push({ id: 'dual_connected', level: 'info' });
    }
    if (activeChannel === 'none') {
        warnings.push({ id: 'no_channel', level: 'error' });
    }
    if (activeChannel === 'none' && embeddedSignup.enabled) {
        warnings.push({ id: 'es_connect_hint', level: 'info' });
    }

    return {
        connectionMode: mode,
        activeChannel,
        channels: {
            cloud: {
                enabled: cfg.cloudEnabled !== false,
                configured: cloudConfigured,
                ready: cloudReady,
                checks: cloudChecks,
                complete: cloudChecks.filter((c) => !c.optional).every((c) => (c.envOnly && c.id === 'appSecret') ? appSecretSet : c.ok) && appSecretSet,
                phoneNumberId: cfg.cloudPhoneNumberId || '',
                wabaId: cloudWabaId || '',
                embeddedSignupAt,
                bulkTemplateName: cfg.cloudBulkTemplateName || process.env.WHATSAPP_CLOUD_BULK_TEMPLATE_NAME || '',
                bulkTemplateLanguage: cfg.cloudBulkTemplateLanguage || process.env.WHATSAPP_CLOUD_BULK_TEMPLATE_LANGUAGE || 'fa',
                webhookUrl,
            },
            gateway: {
                enabled: cfg.gatewayEnabled !== false,
                ready: gatewayReady,
                checks: gatewayChecks,
                reachable: gateway.reachable,
                connected: gateway.connected,
                phase: gateway.phase || null,
                number: gateway.number || null,
                authFailure: gateway.authFailure || null,
            },
        },
        embeddedSignup,
        warnings,
        meta: {
            backendPublicUrl: publicUrl || null,
            metaDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
            embeddedSignupDocsUrl: 'https://developers.facebook.com/docs/whatsapp/embedded-signup/',
        },
    };
}

module.exports = { buildWhatsappOverview, getCloudWebhookUrl };
