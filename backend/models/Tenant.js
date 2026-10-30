/**
 * Kaya CRM — سازمان خودخدمت (ساب‌دامین / دامنه)
 * @file    backend/models/Tenant.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Tenant = sequelize.define(
        'Tenant',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            slug: {
                type: DataTypes.STRING(24),
                allowNull: false,
                unique: true,
                comment: 'شناسه ساب‌دامین (acme.app.fxguard.io)',
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
                defaultValue: '',
            },
            customDomain: {
                type: DataTypes.STRING(255),
                allowNull: true,
                unique: true,
                comment: 'دامنهٔ اختصاصی مشتری پس از CNAME',
            },
            status: {
                type: DataTypes.STRING(32),
                allowNull: false,
                defaultValue: 'trial',
                comment: 'trial | active | past_due | suspended',
            },
            planTier: {
                type: DataTypes.STRING(32),
                allowNull: false,
                defaultValue: 'start',
            },
            trialEndsAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            panelKey: {
                type: DataTypes.STRING(32),
                allowNull: false,
                defaultValue: 'default',
                comment: 'کلید PanelSetting / WhatsappConnection',
            },
            stripeCustomerId: {
                type: DataTypes.STRING(64),
                allowNull: true,
            },
            stripeSubscriptionId: {
                type: DataTypes.STRING(64),
                allowNull: true,
            },
            cryptoTxId: {
                type: DataTypes.STRING(128),
                allowNull: true,
            },
            cryptoNetwork: {
                type: DataTypes.STRING(32),
                allowNull: true,
            },
            cryptoPaymentStatus: {
                type: DataTypes.STRING(32),
                allowNull: true,
                comment: 'pending | confirmed | rejected',
            },
            cryptoPaidAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            cryptoConfirmJti: {
                type: DataTypes.STRING(64),
                allowNull: true,
                comment: 'شناسه یک‌بارمصرف لینک تأیید کریپتو؛ بعد از مصرف پاک می‌شود',
            },
            billingProvider: {
                type: DataTypes.STRING(16),
                allowNull: true,
                comment: 'iyzico | paddle | stripe | crypto',
            },
            billingCustomerId: {
                type: DataTypes.STRING(64),
                allowNull: true,
            },
            billingSubscriptionId: {
                type: DataTypes.STRING(64),
                allowNull: true,
                comment: 'Paddle subscription id — رویدادهای اشتراک دیگر روی این سازمان اثر ندارند',
            },
            billingPaidUntil: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'پایان دورهٔ پرداخت‌شده برای پرداخت یک‌باره (iyzico)؛ خالی = اشتراک خودکار',
            },
            billingEventAt: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'زمان آخرین رویداد اشتراک اعمال‌شده — رویداد قدیمی‌تر نادیده گرفته می‌شود',
            },
        },
        {
            timestamps: true,
            tableName: 'tenants',
            indexes: [
                { unique: true, fields: ['slug'] },
                { unique: true, fields: ['customDomain'] },
                { fields: ['status'] },
                { fields: ['panelKey'] },
            ],
        }
    );

    Tenant.associate = (models) => {
        if (models.User) {
            Tenant.hasMany(models.User, { foreignKey: 'tenantId', as: 'users' });
        }
    };

    return Tenant;
};
