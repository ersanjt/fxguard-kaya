/**
 * FXGuard — دفتر پرداخت درگاه‌ها (iyzico / Paddle)
 * @file    backend/models/BillingPayment.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * هر پرداخت تأییدشده یک ردیف — ایندکس یکتای (provider, providerPaymentId) تضمین می‌کند
 * callback و webhook تکراری فقط یک بار سازمان را فعال/تمدید کنند. ردیف‌ها حذف یا ویرایش مالی نمی‌شوند.
 */
'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const BillingPayment = sequelize.define(
        'BillingPayment',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            tenantId: {
                type: DataTypes.UUID,
                allowNull: true,
            },
            provider: {
                type: DataTypes.STRING(16),
                allowNull: false,
                comment: 'iyzico | paddle',
            },
            providerPaymentId: {
                type: DataTypes.STRING(128),
                allowNull: false,
                comment: 'iyzico paymentId یا Paddle transaction id',
            },
            subscriptionId: {
                type: DataTypes.STRING(64),
                allowNull: true,
            },
            customerId: {
                type: DataTypes.STRING(64),
                allowNull: true,
            },
            amountMinor: {
                type: DataTypes.BIGINT,
                allowNull: false,
                comment: 'مبلغ به کوچک‌ترین واحد ارز (کوروش/سنت) — بدون float',
            },
            currency: {
                type: DataTypes.STRING(3),
                allowNull: false,
            },
            periodEnd: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            consentVersion: {
                type: DataTypes.STRING(16),
                allowNull: true,
                comment: 'نسخهٔ قرارداد فروش از راه دور / سیاست بازپرداخت که خریدار پذیرفت',
            },
            consentAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            timestamps: true,
            updatedAt: false,
            tableName: 'billing_payments',
            indexes: [
                { unique: true, fields: ['provider', 'providerPaymentId'] },
                { fields: ['tenantId', 'createdAt'] },
            ],
        }
    );

    return BillingPayment;
};
