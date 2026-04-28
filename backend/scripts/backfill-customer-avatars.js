/**
 * Backfill customer avatars from WhatsApp Gateway profile picture lookup.
 *
 * Usage:
 *   node scripts/backfill-customer-avatars.js
 *   node scripts/backfill-customer-avatars.js --all --limit=1000
 */
require('dotenv').config();

const { Op } = require('sequelize');
const { connectDatabases } = require('../services/database');
const logger = require('../config/logger');
const { Customer } = require('../models');
const { gatewayGet } = require('../lib/gatewayClient');
const { persistRemoteAvatarIfNeeded, digitsOnlyChatPhone } = require('../lib/customerAvatar');

function parseArgs(argv) {
    const opts = { all: false, limit: 500, delayMs: 120 };
    for (const a of argv) {
        if (a === '--all') opts.all = true;
        else if (a.startsWith('--limit=')) opts.limit = Math.max(1, parseInt(a.split('=')[1], 10) || 500);
        else if (a.startsWith('--delay=')) opts.delayMs = Math.max(0, parseInt(a.split('=')[1], 10) || 0);
    }
    return opts;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function looksLikePrivateChatPhone(phone) {
    if (!phone) return false;
    const p = String(phone).trim();
    if (!p) return false;
    if (p.includes('@g.us')) return false;
    const digits = p.replace(/\D/g, '');
    return digits.length >= 8;
}

async function lookupProfilePic(phone) {
    const res = await gatewayGet('/api/contacts/profile-pic?phone=' + encodeURIComponent(phone), { timeout: 5000 });
    return (res && res.data && res.data.profilePicUrl) ? String(res.data.profilePicUrl).trim() : '';
}

async function run() {
    const opts = parseArgs(process.argv.slice(2));
    await connectDatabases(logger);

    const where = opts.all
        ? { source: 'whatsapp' }
        : {
            source: 'whatsapp',
            [Op.or]: [
                { profilePic: null },
                { profilePic: '' }
            ]
        };

    const rows = await Customer.findAll({
        where,
        attributes: ['id', 'name', 'phone', 'profilePic'],
        order: [['updatedAt', 'DESC']],
        limit: opts.limit
    });

    let scanned = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const c of rows) {
        scanned++;
        const phone = String(c.phone || '').trim();
        if (!looksLikePrivateChatPhone(phone)) {
            skipped++;
            continue;
        }
        const phoneDigits = digitsOnlyChatPhone(c.phone);
        if (!phoneDigits) {
            skipped++;
            continue;
        }
        try {
            const remoteUrl = await lookupProfilePic(phoneDigits);
            if (!remoteUrl) {
                skipped++;
                continue;
            }
            const persisted = await persistRemoteAvatarIfNeeded(c.id, remoteUrl);
            if (!persisted) {
                skipped++;
                continue;
            }
            if (persisted !== c.profilePic) {
                await c.update({ profilePic: persisted });
                updated++;
            } else {
                skipped++;
            }
        } catch (err) {
            failed++;
            logger.warn('avatar backfill failed', {
                customerId: c.id,
                phone: phone.slice(-6),
                error: err?.message
            });
        }
        if (opts.delayMs > 0) await sleep(opts.delayMs);
    }

    console.log('avatar backfill done');
    console.log('scanned=' + scanned);
    console.log('updated=' + updated);
    console.log('skipped=' + skipped);
    console.log('failed=' + failed);
}

run()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('avatar backfill fatal:', err?.message || err);
        process.exit(1);
    });

