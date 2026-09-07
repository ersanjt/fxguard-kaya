/**
 * هویت یکسان مخاطب واتساپ: شمارهٔ واقعی در برابر LID.
 * همگام‌سازی چت نباید برای @c.us و @lid یک نفر دو مشتری بسازد.
 */
const { Op } = require('sequelize');
const { sequelize, Customer, Conversation } = require('../models');
const {
    normalizePhone,
    isLikelyWhatsAppLid,
    isGroupJid,
    extractDigits,
    isKnownPhoneDigits,
    canonicalizePhoneDigits,
    looksLikeTechnicalWhatsAppLabel,
    phoneStorageVariants,
} = require('./phoneUtils');
const { chatIdVariants } = require('../services/legacyCrmLockdown');

function asJidString(val) {
    if (val == null || val === '') return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'object') {
        if (val._serialized) return String(val._serialized).trim();
        if (val.user && val.server) return `${val.user}@${val.server}`;
        if (val.id) return asJidString(val.id);
    }
    return String(val).trim();
}

function realPhoneFromValue(raw) {
    const s = asJidString(raw);
    if (!s || isGroupJid(s)) return '';
    if (isLikelyWhatsAppLid(s) || /@lid$/i.test(s)) return '';
    return normalizePhone(s) || '';
}

function lidDigitsFromValue(raw) {
    const s = asJidString(raw);
    if (!s || isGroupJid(s)) return '';
    if (isLikelyWhatsAppLid(s) || /@lid$/i.test(s)) return extractDigits(s) || '';
    return '';
}

function uniqueNonEmpty(values) {
    const out = [];
    const seen = new Set();
    for (const v of values || []) {
        const s = String(v || '').trim();
        if (!s) continue;
        const key = s.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(s);
    }
    return out;
}

function splitChatIdentity(row) {
    const hints = [row && row.id, row && row.phone, row && row.requested, row && row.lid];
    let phone = '';
    let lid = '';
    for (const hint of hints) {
        if (!phone) phone = realPhoneFromValue(hint);
        if (!lid) lid = lidDigitsFromValue(hint);
        if (phone && lid) break;
    }
    const isGroup = !!(row && (row.isGroup || isGroupJid(row.id)));
    return { phone, lid, isGroup };
}

function identityVariants(row) {
    const identity = splitChatIdentity(row);
    const raw = [
        row && row.id,
        row && row.phone,
        row && row.requested,
        row && row.lid,
        identity.phone,
        identity.lid,
        identity.lid ? `${identity.lid}@lid` : '',
    ];
    const out = [];
    for (const item of raw) {
        if (!item) continue;
        out.push(...chatIdVariants(item));
        const normalized = realPhoneFromValue(item);
        if (normalized) {
            out.push(...chatIdVariants(normalized));
            out.push(...phoneStorageVariants(normalized));
        }
    }
    return uniqueNonEmpty(out);
}

function identityKeys(row) {
    return identityVariants(row).map((v) => String(v).toLowerCase());
}

function preferChatId(a, b) {
    const left = String((a && a.id) || '');
    const right = String((b && b.id) || '');
    if (/@(c\.us|s\.whatsapp\.net)$/i.test(left) && /@lid$/i.test(right)) return left;
    if (/@(c\.us|s\.whatsapp\.net)$/i.test(right) && /@lid$/i.test(left)) return right;
    if (left && !right) return left;
    if (right && !left) return right;
    const leftScore = [a && a.name, a && a.phone, a && a.lastPreview, a && a.timestamp].filter(
        Boolean
    ).length;
    const rightScore = [b && b.name, b && b.phone, b && b.lastPreview, b && b.timestamp].filter(
        Boolean
    ).length;
    return rightScore > leftScore ? right : left || right;
}

function mergeChatIdentityRows(a, b) {
    const left = splitChatIdentity(a);
    const right = splitChatIdentity(b);
    return {
        id: preferChatId(a, b),
        phone: left.phone || right.phone || a.phone || b.phone || null,
        requested: a.requested || b.requested || null,
        lid: left.lid || right.lid || a.lid || b.lid || null,
        name: (a.name && String(a.name).trim()) || (b.name && String(b.name).trim()) || null,
        isGroup: !!(a.isGroup || b.isGroup || left.isGroup || right.isGroup),
        lastPreview: a.lastPreview || b.lastPreview || null,
        timestamp: a.timestamp || b.timestamp || null,
        profilePicUrl: a.profilePicUrl || b.profilePicUrl || null,
    };
}

function isGhostLidRow(row) {
    const id = String((row && row.id) || '');
    if (!/@lid$/i.test(id)) return false;
    const identity = splitChatIdentity(row);
    if (identity.phone) return false;
    const name = String((row && row.name) || '').trim();
    if (name && name !== 'مشتری' && !isKnownPhoneDigits(extractDigits(name))) return false;
    if (row && (row.lastPreview || row.timestamp)) return false;
    return true;
}

function dedupeChatRows(rows) {
    const groups = [];
    const keyToGroup = new Map();
    const dropGroup = (group) => {
        group.dropped = true;
        for (const [key, mapped] of keyToGroup) {
            if (mapped === group) keyToGroup.delete(key);
        }
    };
    for (const raw of rows || []) {
        if (!raw || !raw.id) continue;
        const keys = identityKeys(raw);
        const matched = [];
        const seenGroups = new Set();
        for (const key of keys) {
            const hit = keyToGroup.get(key);
            if (hit && !hit.dropped && !seenGroups.has(hit)) {
                seenGroups.add(hit);
                matched.push(hit);
            }
        }
        let group = matched[0] || null;
        if (!group) {
            group = { row: { ...raw }, dropped: false };
            groups.push(group);
        } else {
            group.row = mergeChatIdentityRows(group.row, raw);
            for (let i = 1; i < matched.length; i++) {
                group.row = mergeChatIdentityRows(group.row, matched[i].row);
                dropGroup(matched[i]);
            }
        }
        for (const key of identityKeys(group.row)) keyToGroup.set(key, group);
    }
    return groups
        .filter((g) => !g.dropped)
        .map((g) => g.row)
        .filter((row) => !isGhostLidRow(row));
}

function preferredCreatePhone(row) {
    const identity = splitChatIdentity(row);
    if (identity.isGroup) return String((row && row.id) || '').trim();
    if (identity.phone) return identity.phone;
    if (identity.lid) return identity.lid;
    return String((row && (row.phone || row.requested || row.id)) || '').trim();
}

async function findCustomerByStoredLid(lidDigits, transaction) {
    if (!lidDigits) return null;
    const lid = String(lidDigits);
    const byPhone = await Customer.findOne({
        where: { phone: { [Op.in]: [lid, `${lid}@lid`] } },
        transaction,
    });
    if (byPhone) return byPhone;
    let rows = [];
    try {
        const dialect = sequelize.getDialect();
        if (dialect === 'postgres') {
            rows = await Customer.findAll({
                where: sequelize.where(sequelize.json('customFields.whatsappLid'), lid),
                limit: 8,
                transaction,
            });
        } else {
            rows = await Customer.findAll({
                where: sequelize.where(
                    sequelize.literal(`json_extract("customFields", '$.whatsappLid')`),
                    lid
                ),
                limit: 8,
                transaction,
            });
        }
    } catch (_) {
        rows = [];
    }
    return rows.find((c) => String((c.customFields || {}).whatsappLid || '') === lid) || null;
}

async function rememberCustomerLid(customer, lidDigits, transaction) {
    if (!customer || !lidDigits) return;
    const lid = String(lidDigits);
    const cf = { ...(customer.customFields || {}) };
    if (String(cf.whatsappLid || '') === lid) return;
    cf.whatsappLid = lid;
    await customer.update({ customFields: cf }, { transaction });
    customer.customFields = cf;
}

async function collapseOpenConversationsForCustomer(customerId, transaction) {
    if (!customerId) return;
    const rows = await Conversation.findAll({
        where: {
            customerId,
            status: { [Op.notIn]: ['closed', 'archived'] },
            isHiddenFromStaff: false,
        },
        order: [
            ['lastMessageAt', 'DESC'],
            ['updatedAt', 'DESC'],
        ],
        transaction,
    });
    for (let i = 1; i < rows.length; i++) {
        await rows[i].update({ status: 'archived', isHiddenFromStaff: true }, { transaction });
    }
}

function isPlaceholderCustomerName(name) {
    const s = String(name || '').trim();
    if (!s) return true;
    if (/^unknown user$/i.test(s)) return true;
    if (/^(مشتری|customer|müşteri)(\s|$)/i.test(s)) return true;
    if (looksLikeTechnicalWhatsAppLabel(s)) return true;
    const digits = canonicalizePhoneDigits(s);
    if (digits && isKnownPhoneDigits(digits) && extractDigits(s).length >= 8) return true;
    return false;
}

function preferCustomerName(current, incoming) {
    const cur = String(current || '').trim();
    const next = String(incoming || '').trim();
    if (!next) return cur;
    if (isPlaceholderCustomerName(next) && !isPlaceholderCustomerName(cur)) return cur;
    if (isPlaceholderCustomerName(cur)) return next;
    if (next.length > cur.length + 2) return next;
    return cur;
}

async function absorbIdentityDuplicates(keepCustomer, phones, transaction) {
    const list = uniqueNonEmpty(phones);
    if (!keepCustomer || !list.length) return;
    const extras = await Customer.findAll({
        where: {
            id: { [Op.ne]: keepCustomer.id },
            phone: { [Op.in]: list },
        },
        transaction,
    });
    let bestName = keepCustomer.name;
    for (const extra of extras) {
        bestName = preferCustomerName(bestName, extra.name);
        if (!extra.isRestrictedFromStaff) {
            await extra.update({ isRestrictedFromStaff: true }, { transaction });
        }
        await collapseOpenConversationsForCustomer(extra.id, transaction);
    }
    if (bestName && bestName !== keepCustomer.name) {
        await keepCustomer.update({ name: bestName }, { transaction });
        keepCustomer.name = bestName;
    }
}

function pickPreferredCustomer(matches, identity) {
    if (!matches || !matches.length) return null;
    if (matches.length === 1) return matches[0];
    const score = (c) => {
        const phone = String(c.phone || '');
        const canonical = canonicalizePhoneDigits(phone);
        const phoneBare = phone.replace(/@(c\.us|s\.whatsapp\.net)$/i, '');
        let n = 0;
        if (identity.phone && (phone === identity.phone || phoneBare === identity.phone)) n += 8;
        else if (identity.phone && canonical === identity.phone) n += 5;
        if (identity.phone && !isLikelyWhatsAppLid(phone) && phone === canonical && !/@/.test(phone) && !phone.startsWith('00')) n += 4;
        if (!c.isRestrictedFromStaff) n += 2;
        if ((c.customFields || {}).whatsappLid) n += 1;
        if (isPlaceholderCustomerName(c.name)) n -= 5;
        else n += Math.min(String(c.name || '').trim().length, 24) / 6;
        return n;
    };
    return [...matches].sort((a, b) => score(b) - score(a))[0];
}

async function canonicalizeStoredCustomerPhone(customer, identity, transaction) {
    if (!customer || isGroupJid(customer.phone)) return customer;
    const canonical = identity.phone || normalizePhone(customer.phone);
    if (!canonical || String(customer.phone) === canonical) return customer;
    const clash = await Customer.findOne({
        where: { phone: canonical },
        transaction,
    });
    if (!clash) {
        await customer.update({ phone: canonical }, { transaction });
        return customer;
    }
    if (clash.id !== customer.id) return clash;
    return customer;
}

async function findOrCreateSyncedCustomer(row, { transaction, chatName, isGroup } = {}) {
    const identity = splitChatIdentity(row);
    const uniqueVariants = identityVariants(row);
    let customer = null;
    if (uniqueVariants.length) {
        const matches = await Customer.findAll({
            where: { phone: { [Op.in]: uniqueVariants } },
            transaction,
        });
        customer = pickPreferredCustomer(matches, identity);
    }
    if (!customer && identity.lid) {
        customer = await findCustomerByStoredLid(identity.lid, transaction);
    }
    const createPhone = preferredCreatePhone(row);
    if (!customer && createPhone) {
        try {
            [customer] = await Customer.findOrCreate({
                where: { phone: createPhone },
                defaults: {
                    name: chatName || (isGroup ? `گروه ${row.id}` : 'مشتری'),
                    source: 'whatsapp',
                    isRestrictedFromStaff: false,
                    customFields: identity.lid ? { whatsappLid: identity.lid } : {},
                },
                transaction,
            });
        } catch (e) {
            if (e.name === 'SequelizeUniqueConstraintError') {
                customer = await Customer.findOne({
                    where: { phone: { [Op.in]: uniqueNonEmpty([...uniqueVariants, createPhone]) } },
                    transaction,
                });
            } else throw e;
        }
    }
    if (!customer) return null;

    if (
        identity.phone &&
        isLikelyWhatsAppLid(customer.phone) &&
        customer.phone !== identity.phone
    ) {
        const clash = await Customer.findOne({
            where: { phone: identity.phone },
            transaction,
        });
        if (!clash) {
            await customer.update({ phone: identity.phone }, { transaction });
        } else if (clash.id !== customer.id) {
            customer = clash;
        }
    }

    if (identity.lid) {
        await rememberCustomerLid(customer, identity.lid, transaction);
    }
    const kept = await canonicalizeStoredCustomerPhone(customer, identity, transaction);
    if (kept && kept.id !== customer.id) {
        await absorbIdentityDuplicates(
            kept,
            [...uniqueVariants, customer.phone, identity.lid, identity.lid ? `${identity.lid}@lid` : '', createPhone],
            transaction
        );
        customer = kept;
    }
    await absorbIdentityDuplicates(
        customer,
        [
            ...uniqueVariants,
            identity.lid,
            identity.lid ? `${identity.lid}@lid` : '',
            createPhone,
            customer.phone,
            ...(identity.phone ? phoneStorageVariants(identity.phone) : []),
        ],
        transaction
    );
    await collapseOpenConversationsForCustomer(customer.id, transaction);
    return customer;
}

let _identityRepairAt = 0;

async function collapseDuplicateOpenConversations(transaction) {
    const open = await Conversation.findAll({
        where: {
            status: { [Op.notIn]: ['closed', 'archived'] },
            isHiddenFromStaff: false,
        },
        attributes: ['id', 'customerId', 'lastMessageAt'],
        order: [['lastMessageAt', 'DESC']],
        transaction,
    });
    const seen = new Set();
    const dupCustomerIds = [];
    for (const row of open) {
        const cid = row.customerId;
        if (!cid) continue;
        if (seen.has(cid)) {
            if (!dupCustomerIds.includes(cid)) dupCustomerIds.push(cid);
        } else {
            seen.add(cid);
        }
    }
    for (const cid of dupCustomerIds) {
        await collapseOpenConversationsForCustomer(cid, transaction);
    }
    return dupCustomerIds.length;
}

async function repairDuplicateWhatsappIdentities() {
    const customers = await Customer.findAll({
        attributes: ['id', 'phone', 'name', 'isRestrictedFromStaff', 'customFields'],
    });
    const groups = new Map();
    for (const c of customers) {
        if (!c.phone || isGroupJid(c.phone)) continue;
        const key = normalizePhone(c.phone);
        if (!key || !isKnownPhoneDigits(key)) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(c);
    }
    let merged = 0;
    for (const [key, list] of groups) {
        if (!list.length) continue;
        const keep = pickPreferredCustomer(list, { phone: key }) || list[0];
        const t = await sequelize.transaction();
        try {
            const canonicalKeep = await canonicalizeStoredCustomerPhone(keep, { phone: key }, t);
            const target = canonicalKeep || keep;
            if (list.length > 1) {
                await absorbIdentityDuplicates(
                    target,
                    list.flatMap((c) => phoneStorageVariants(c.phone)),
                    t
                );
                merged += 1;
            }
            await collapseOpenConversationsForCustomer(target.id, t);
            await t.commit();
        } catch (_) {
            try {
                await t.rollback();
            } catch (__) {}
        }
    }
    const collapsed = await collapseDuplicateOpenConversations();
    return { merged, collapsed };
}

async function ensureDuplicateIdentityRepair() {
    if (process.env.NODE_ENV === 'test') return null;
    const now = Date.now();
    if (now - _identityRepairAt < 30000) return null;
    _identityRepairAt = now;
    try {
        return await repairDuplicateWhatsappIdentities();
    } catch (_) {
        return null;
    }
}

module.exports = {
    asJidString,
    realPhoneFromValue,
    lidDigitsFromValue,
    splitChatIdentity,
    identityVariants,
    dedupeChatRows,
    preferredCreatePhone,
    findOrCreateSyncedCustomer,
    findCustomerByStoredLid,
    rememberCustomerLid,
    preferCustomerName,
    isPlaceholderCustomerName,
    collapseOpenConversationsForCustomer,
    repairDuplicateWhatsappIdentities,
    ensureDuplicateIdentityRepair,
};
