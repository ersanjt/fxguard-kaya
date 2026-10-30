#!/usr/bin/env node
/**
 * بازنشانی رمز مدیر پنل سکو (شناسهٔ پنل: platform) — فقط کاربر همان پنل، نه کاربر هم‌ایمیل در سازمان‌های مشتری.
 * اگر کاربر در پنل سکو نباشد با نقش owner ساخته می‌شود.
 *
 * استفاده (از پوشهٔ backend):
 *   NEW_PASSWORD='...' node scripts/reset-platform-admin-password.js admin@example.com
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Op } = require('sequelize');
const { Tenant, User, sequelize } = require('../models');
const { PLATFORM_SLUG } = require('../lib/tenantHost');

async function main() {
    const email = String(process.argv[2] || '').trim().toLowerCase();
    const password = String(process.env.NEW_PASSWORD || '');
    if (!email || email.indexOf('@') < 0) throw new Error('ایمیل را به‌عنوان آرگومان بدهید');
    if (password.length < 8) throw new Error('NEW_PASSWORD حداقل ۸ کاراکتر باشد');

    const platform = await Tenant.findOne({ where: { slug: PLATFORM_SLUG } });
    if (!platform) throw new Error('سازمان platform پیدا نشد؛ یک بار بکند را اجرا کنید');

    const emailMatch = sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), email);
    let user = await User.findOne({
        where: { [Op.and]: [emailMatch, { [Op.or]: [{ tenantId: platform.id }, { tenantId: null }] }] },
        skipTenantScope: true,
    });

    if (user) {
        user.password = password;
        user.isActive = true;
        if (!user.tenantId) user.tenantId = platform.id;
        await user.save();
        console.log('✓ رمز مدیر پنل platform به‌روز شد:', user.email, '| نقش:', user.role);
    } else {
        const other = await User.findOne({ where: emailMatch, skipTenantScope: true });
        if (other) {
            const owner = other.tenantId ? await Tenant.findByPk(other.tenantId) : null;
            throw new Error(
                'این ایمیل مال کاربر پنل «' + ((owner && owner.slug) || other.tenantId) + '» است؛ برای مدیر سکو ایمیل دیگری بدهید'
            );
        }
        user = await User.create(
            { name: email.split('@')[0], email, password, role: 'owner', isActive: true, tenantId: platform.id },
            { skipTenantScope: true }
        );
        console.log('✓ مدیر پنل platform ساخته شد:', user.email);
    }
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('✗', err.message || err);
        process.exit(1);
    });
