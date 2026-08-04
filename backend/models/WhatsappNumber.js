const { DataTypes } = require('sequelize');

/**
 * اسلات‌های شماره واتساپ (اصلی + پشتیبان) برای کاهش ریسک بلاک.
 * اتصال فعلی در WhatsappConnection می‌ماند؛ این جدول چند شماره را مدیریت می‌کند.
 */
module.exports = (sequelize) => {
    const WhatsappNumber = sequelize.define('WhatsappNumber', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        slotKey: {
            type: DataTypes.STRING(32),
            allowNull: false,
            unique: true,
            comment: 'primary | standby-1 | standby-2 …',
        },
        label: {
            type: DataTypes.STRING(128),
            allowNull: true,
            comment: 'برچسب نمایشی (مثلاً خط اصلی / پشتیبان)',
        },
        role: {
            type: DataTypes.STRING(16),
            allowNull: false,
            defaultValue: 'standby',
            comment: 'primary | standby',
        },
        priority: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 100,
            comment: 'اولویت ارسال؛ کمتر = زودتر (primary معمولاً 0)',
        },
        enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        transportPreference: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: 'inherit',
            comment: 'inherit | cloud | gateway | cloud_first',
        },
        displayPhone: {
            type: DataTypes.STRING(32),
            allowNull: true,
            comment: 'شماره نمایشی E.164 (اختیاری)',
        },
        cloudAccessToken: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        cloudPhoneNumberId: {
            type: DataTypes.STRING(64),
            allowNull: true,
        },
        cloudVerifyToken: {
            type: DataTypes.STRING(128),
            allowNull: true,
        },
        gatewayUrl: {
            type: DataTypes.STRING(512),
            allowNull: true,
            comment: 'Override برای Gateway جدا (آینده)؛ خالی = مشترک با اتصال اصلی',
        },
        gatewayApiSecret: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        gatewaySessionKey: {
            type: DataTypes.STRING(64),
            allowNull: true,
            comment: 'کلید نشست چندگانه Gateway (آینده)',
        },
        useSharedGateway: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'استفاده از Gateway مشترک تا زمان راه‌اندازی نشست دوم',
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        lastHealthyAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        lastError: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        lastUsedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
        },
    }, {
        timestamps: true,
        tableName: 'whatsapp_numbers',
        indexes: [
            { fields: ['role'] },
            { fields: ['enabled', 'priority'] },
        ],
    });

    return WhatsappNumber;
};
