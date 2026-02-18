const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PanelSetting = sequelize.define('PanelSetting', {
        id: {
            type: DataTypes.STRING(32),
            defaultValue: 'default',
            primaryKey: true,
            comment: 'کلید تنظیم (فقط default)'
        },
        siteName: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'نام سایت/شرکت (مثلاً صرافی کایا)'
        },
        logoUrl: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'آدرس تصویر لوگو (URL)'
        },
        faviconUrl: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'آدرس فاویکون (URL)'
        },
        loginTitle: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'عنوان صفحه ورود (مثلاً پورتال کارکنان کایا)'
        },
        pageTitle: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'عنوان تب مرورگر (مثلاً پورتال کارکنان کایا | صرافی کایا)'
        },
        footerText: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'متن فوتر (مثلاً صرافی کایا — پورتال کارکنان)'
        }
    }, {
        timestamps: true,
        tableName: 'panel_settings'
    });

    return PanelSetting;
};
