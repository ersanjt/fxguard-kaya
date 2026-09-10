/**
 * FXGuard — پرداخت کریپتو Cloud Start (USDT / BNB / BTC)
 * @file    backend/lib/cryptoBilling.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const crypto = require('crypto');

const START_AMOUNT_CENTS = 4900;
const AMOUNT_USDT = Math.round(START_AMOUNT_CENTS / 100);

/** آدرس‌های پیش‌فرض همان ویترین fxguard.io/pay — با env قابل جایگزینی */
const DEFAULT_WALLETS = {
    usdt_trc20: 'TYXX9pYcTsbizX1P59NM4B2PmcN9Bmh1aH',
    usdt_erc20: '0x5B7b93CD8fC14E24515eBa9B9C584342eF0BBD97',
    usdt_bep20: '0x5B7b93CD8fC14E24515eBa9B9C584342eF0BBD97',
    bnb_bep20: '0x5B7b93CD8fC14E24515eBa9B9C584342eF0BBD97',
    btc: 'bc1qt7ynteuhpvzslg7xfm2yzz7ayj9cjhcg30ay2l',
};

const NETWORKS = {
    usdt_trc20: {
        id: 'usdt_trc20',
        asset: 'USDT',
        network: 'TRC20 (Tron)',
        amountLabel: '49 USDT',
        exactUsdt: true,
        envKey: 'CRYPTO_WALLET_USDT_TRC20',
    },
    usdt_erc20: {
        id: 'usdt_erc20',
        asset: 'USDT',
        network: 'ERC20 (Ethereum)',
        amountLabel: '49 USDT',
        exactUsdt: true,
        envKey: 'CRYPTO_WALLET_USDT_ERC20',
    },
    usdt_bep20: {
        id: 'usdt_bep20',
        asset: 'USDT',
        network: 'BEP20 (BNB Smart Chain)',
        amountLabel: '49 USDT',
        exactUsdt: true,
        envKey: 'CRYPTO_WALLET_USDT_BEP20',
    },
    bnb_bep20: {
        id: 'bnb_bep20',
        asset: 'BNB',
        network: 'BNB Smart Chain',
        amountLabel: '≈ $49 in BNB',
        exactUsdt: false,
        envKey: 'CRYPTO_WALLET_BNB',
    },
    btc: {
        id: 'btc',
        asset: 'BTC',
        network: 'Bitcoin',
        amountLabel: '≈ $49 in BTC',
        exactUsdt: false,
        envKey: 'CRYPTO_WALLET_BTC',
    },
};

function envFlagOn(raw) {
    const v = String(raw || '')
        .trim()
        .toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

function walletAddress(env, networkId) {
    const meta = NETWORKS[networkId];
    if (!meta) return '';
    const src = env || process.env;
    const fromEnv = String(src[meta.envKey] || '').trim();
    if (fromEnv) return fromEnv;
    return DEFAULT_WALLETS[networkId] || '';
}

function listWallets(env) {
    const src = env || process.env;
    return Object.keys(NETWORKS)
        .map((id) => {
            const meta = NETWORKS[id];
            const address = walletAddress(src, id);
            if (!address) return null;
            return {
                id,
                asset: meta.asset,
                network: meta.network,
                amountLabel: meta.amountLabel,
                exactUsdt: !!meta.exactUsdt,
                address,
                qrUrl:
                    'https://api.qrserver.com/v1/create-qr-code/?size=200x200&ecc=M&data=' +
                    encodeURIComponent(address),
            };
        })
        .filter(Boolean);
}

function isCryptoPayEnabled(env) {
    const src = env || process.env;
    if (envFlagOn(src.CRYPTO_PAY_DISABLED)) return false;
    if (envFlagOn(src.CRYPTO_PAY_ENABLED)) return true;
    return listWallets(src).length > 0;
}

function cryptoAutoActivate(env) {
    const src = env || process.env;
    if (String(src.CRYPTO_PAY_AUTO_ACTIVATE || '').trim() === '') return true;
    return envFlagOn(src.CRYPTO_PAY_AUTO_ACTIVATE);
}

function salesWhatsApp(env) {
    const raw = String((env || process.env).SUPPORT_URL || (env || process.env).SALES_URL || '').trim();
    const m = raw.match(/wa\.me\/(\d+)/i);
    if (m) return m[1];
    return '905010676486';
}

function publicCryptoBillingConfig(env) {
    const src = env || process.env;
    const enabled = isCryptoPayEnabled(src);
    const wallets = enabled ? listWallets(src) : [];
    return {
        enabled,
        mode: enabled ? 'crypto' : 'off',
        amountUsd: AMOUNT_USDT,
        amountUsdt: AMOUNT_USDT,
        currency: 'USDT',
        autoActivate: cryptoAutoActivate(src),
        wallets,
        preferredNetwork: 'usdt_trc20',
        whatsapp: salesWhatsApp(src),
        payPageUrl: 'https://fxguard.io/pay',
    };
}

function normalizeTxId(raw) {
    return String(raw || '')
        .trim()
        .replace(/\s+/g, '');
}

function validateTxId(networkId, txId) {
    const tx = normalizeTxId(txId);
    if (!tx || tx.length < 12 || tx.length > 128) {
        return { ok: false, error: 'TXID نامعتبر است' };
    }
    if (/[<>"'`]/.test(tx)) {
        return { ok: false, error: 'TXID نامعتبر است' };
    }
    if (networkId === 'usdt_trc20') {
        if (!/^[a-fA-F0-9]{64}$/.test(tx)) {
            return { ok: false, error: 'TXID شبکهٔ Tron باید ۶۴ کاراکتر هگز باشد' };
        }
    } else if (networkId === 'btc') {
        if (!/^[a-fA-F0-9]{64}$/.test(tx)) {
            return { ok: false, error: 'TXID بیت‌کوین نامعتبر است' };
        }
    } else if (networkId === 'usdt_erc20' || networkId === 'usdt_bep20' || networkId === 'bnb_bep20') {
        const h = tx.startsWith('0x') || tx.startsWith('0X') ? tx.slice(2) : tx;
        if (!/^[a-fA-F0-9]{64}$/.test(h)) {
            return { ok: false, error: 'TXID اتریوم/BSC نامعتبر است' };
        }
    }
    return { ok: true, txId: tx };
}

function assertValidNetwork(networkId) {
    return !!NETWORKS[networkId];
}

function confirmTokenForTenant(tenantId, secret) {
    const key = String(secret || process.env.JWT_SECRET || '').trim();
    if (!key || !tenantId) return '';
    const body = String(tenantId);
    const sig = crypto.createHmac('sha256', key).update('crypto-confirm:' + body).digest('hex').slice(0, 24);
    return Buffer.from(body + '.' + sig).toString('base64url');
}

function parseConfirmToken(token, secret) {
    try {
        const raw = Buffer.from(String(token || ''), 'base64url').toString('utf8');
        const parts = raw.split('.');
        if (parts.length !== 2) return null;
        const tenantId = parts[0];
        const expected = confirmTokenForTenant(tenantId, secret);
        if (!expected || expected !== String(token)) return null;
        return tenantId;
    } catch (_) {
        return null;
    }
}

module.exports = {
    AMOUNT_USDT,
    START_AMOUNT_CENTS,
    NETWORKS,
    DEFAULT_WALLETS,
    isCryptoPayEnabled,
    cryptoAutoActivate,
    listWallets,
    publicCryptoBillingConfig,
    normalizeTxId,
    validateTxId,
    assertValidNetwork,
    confirmTokenForTenant,
    parseConfirmToken,
    salesWhatsApp,
};
