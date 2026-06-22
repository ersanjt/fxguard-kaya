/**
 * خلاصه وضعیت سیستم واتساپ — برای صفحه #whatsapp (مرکز کنترل)
 */
const { getWhatsappConnectionConfig, isCloudApiConfigured } = require('./whatsappConnectionLoader');
const { gatewayGet } = require('./gatewayClient');

function getPublicBaseUrl(req) {
    const env = String(process.env.BACKEND_PUBLIC_URL || '').trim().replace(/\/$/, '');
    if (env) return env;
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const host = req.get('x-forwarded-host') || req.get('host') || '';
    return host ? `${proto}://${host}` : '';
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
    const webhookUrl = publicUrl ? `${publicUrl}/api/webhook/whatsapp-cloud` : '';

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
        warnings,
        meta: {
            backendPublicUrl: publicUrl || null,
            metaDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
        },
    };
}

module.exports = { buildWhatsappOverview };
