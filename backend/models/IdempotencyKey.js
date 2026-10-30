/**
 * Kaya CRM — کلید Idempotency برای POSTهای مالی
 * @file    backend/models/IdempotencyKey.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * یک کلید = یک اثر. تکرار همان درخواست (retry شبکه، دابل‌کلیک) همان پاسخ اول را برمی‌گرداند.
 * دامنهٔ یکتایی: سازمان + کاربر + مسیر + کلید — کلید یک کاربر روی مسیر دیگر بی‌اثر است.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const IdempotencyKey = sequelize.define('IdempotencyKey', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        tenantKey: {
            type: DataTypes.STRING(64),
            allowNull: false,
            defaultValue: 'platform',
            comment: 'tenantId یا platform — رشته تا NULL در ایندکس یکتا مشکل نسازد'
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'Users', key: 'id' },
            onDelete: 'CASCADE'
        },
        scope: {
            type: DataTypes.STRING(200),
            allowNull: false,
            comment: 'METHOD + مسیر کامل (با شناسهٔ منبع)'
        },
        key: {
            type: DataTypes.STRING(128),
            allowNull: false,
            comment: 'مقدار هدر Idempotency-Key'
        },
        requestHash: {
            type: DataTypes.STRING(64),
            allowNull: false,
            comment: 'SHA-256 بدنهٔ درخواست — همان کلید با بدنهٔ دیگر رد می‌شود'
        },
        state: {
            type: DataTypes.STRING(16),
            allowNull: false,
            defaultValue: 'in_progress',
            comment: 'in_progress | completed'
        },
        responseStatus: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        responseBody: {
            type: DataTypes.JSON,
            allowNull: true
        }
    }, {
        tableName: 'idempotency_keys',
        indexes: [
            { unique: true, fields: ['tenantKey', 'userId', 'scope', 'key'] },
            { fields: ['createdAt'] }
        ]
    });

    return IdempotencyKey;
};
