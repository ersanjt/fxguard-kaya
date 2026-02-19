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
        },
        showFooter: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: true,
            comment: 'نمایش فوتر (true = نمایش، false = مخفی)'
        },
        smtpHost: { type: DataTypes.STRING(255), allowNull: true, comment: 'SMTP host' },
        smtpPort: { type: DataTypes.STRING(20), allowNull: true, comment: 'SMTP port' },
        smtpUser: { type: DataTypes.STRING(255), allowNull: true, comment: 'SMTP user' },
        smtpPass: { type: DataTypes.TEXT, allowNull: true, comment: 'SMTP password' },
        smtpFrom: { type: DataTypes.STRING(255), allowNull: true, comment: 'آدرس فرستنده ایمیل' },
        smtpFromName: { type: DataTypes.STRING(255), allowNull: true, comment: 'نام فرستنده' },
        smtpSecure: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false, comment: 'استفاده از SSL/TLS' },
        emailLoginNotification: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false, comment: 'اعلان ورود به ایمیل' },
        hiddenSections: { type: DataTypes.TEXT, allowNull: true, comment: 'بخش‌های مخفی در منو (JSON array)' },
        languageMode: { type: DataTypes.STRING(32), allowNull: true, defaultValue: 'trilingual', comment: 'حالت زبان: single | single_en | single_tr | bilingual | bilingual_fa_tr | bilingual_en_tr | trilingual' },
        defaultLanguage: { type: DataTypes.STRING(10), allowNull: true, defaultValue: 'fa', comment: 'زبان پیش‌فرض هنگام چندزبانگی: fa | en | tr' }
    }, {
        timestamps: true,
        tableName: 'panel_settings'
    });

    return PanelSetting;
};
