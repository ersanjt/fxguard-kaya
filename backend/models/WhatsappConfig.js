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
        },
        alertUnansweredAfterMinutes: {
            type: DataTypes.INTEGER,
            defaultValue: 5,
            comment: 'بعد از چند دقیقه بدون پاسخ، اعلان به مسئول/دپارتمان'
        },
        escalateUnansweredAfterMinutes: {
            type: DataTypes.INTEGER,
            defaultValue: 15,
            comment: 'بعد از چند دقیقه بدون پاسخ، برگرداندن به دپارتمان پشتیبانی'
        },
        escalationDepartmentId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'دپارتمان مقصد برای escalation؛ خالی = دپارتمان پیش‌فرض'
        }
    }, {
        timestamps: true,
        tableName: 'whatsapp_configs'
    });

    return WhatsappConfig;
};
