const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const WhatsappConfig = sequelize.define('WhatsappConfig', {
        id: {
            type: DataTypes.STRING(32),
            defaultValue: 'default',
            primaryKey: true
        },
        welcomeMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null,
            comment: 'پیام خوش‌آمدگویی برای اولین تماس — خالی = غیرفعال'
        },
        welcomeEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'فعال بودن پاسخ خودکار به اولین پیام'
        }
    }, {
        timestamps: true,
        tableName: 'whatsapp_configs'
    });

    return WhatsappConfig;
};
