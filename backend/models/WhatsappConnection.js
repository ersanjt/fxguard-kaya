const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const WhatsappConnection = sequelize.define('WhatsappConnection', {
        id: {
            type: DataTypes.STRING(32),
            defaultValue: 'default',
            primaryKey: true,
            comment: 'تنظیمات اتصال واتساپ (فقط default)',
        },
        connectionMode: {
            type: DataTypes.STRING(32),
            allowNull: true,
            defaultValue: 'cloud_first',
            comment: 'cloud | gateway | cloud_first (اول Cloud API، در صورت نبود Gateway)',
        },
        cloudEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            comment: 'فعال بودن Cloud API',
        },
        cloudAccessToken: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Meta Access Token برای Cloud API',
        },
        cloudPhoneNumberId: {
            type: DataTypes.STRING(64),
            allowNull: true,
            comment: 'Phone Number ID از Meta',
        },
        cloudVerifyToken: {
            type: DataTypes.STRING(128),
            allowNull: true,
            comment: 'Verify Token برای Webhook Meta',
        },
        gatewayEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            comment: 'فعال بودن Gateway (QR)',
        },
        gatewayUrl: {
            type: DataTypes.STRING(512),
            allowNull: true,
            comment: 'آدرس Gateway (مثلاً http://localhost:3001)',
        },
        gatewayApiSecret: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'X-Gateway-Secret برای احراز هویت Gateway',
        },
    }, {
        timestamps: true,
        tableName: 'whatsapp_connections',
    });

    return WhatsappConnection;
};
