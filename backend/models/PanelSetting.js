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
        loginLogoUrl: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'لوگوی مخصوص صفحه ورود؛ خالی = همان لوگوی پنل'
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
        footerStyle: {
            type: DataTypes.STRING(32),
            allowNull: true,
            defaultValue: 'accent',
            comment: 'طراحی فوتر: accent | minimal | compact | line'
        },
        smtpHost: { type: DataTypes.STRING(255), allowNull: true, comment: 'SMTP host' },
        smtpPort: { type: DataTypes.STRING(20), allowNull: true, comment: 'SMTP port' },
        smtpUser: { type: DataTypes.STRING(255), allowNull: true, comment: 'SMTP user' },
        smtpPass: { type: DataTypes.TEXT, allowNull: true, comment: 'SMTP password' },
        smtpFrom: { type: DataTypes.STRING(255), allowNull: true, comment: 'آدرس فرستنده ایمیل' },
        smtpFromName: { type: DataTypes.STRING(255), allowNull: true, comment: 'نام فرستنده' },
        smtpSecure: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false, comment: 'استفاده از SSL/TLS' },
        emailLoginNotification: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false, comment: 'اعلان ورود به ایمیل' },
        adminAlertsEnabled: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true, comment: 'فعال بودن اعلان‌های مدیر' },
        adminAlertEmails: { type: DataTypes.TEXT, allowNull: true, comment: 'ایمیل‌های مدیر برای اعلان (comma separated)' },
        telegramBotToken: { type: DataTypes.TEXT, allowNull: true, comment: 'توکن ربات تلگرام' },
        telegramChatIds: { type: DataTypes.TEXT, allowNull: true, comment: 'Chat ID های تلگرام (comma separated)' },
        telegramTimeoutMs: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 12000, comment: 'تایم‌اوت تلگرام بر حسب ms' },
        clientErrorReportingEnabled: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true, comment: 'فعال بودن گزارش خطای فرانت/بک‌اند' },
        telegramNotifyAllEvents: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false, comment: 'ارسال همه رویدادهای سیستم به تلگرام' },
        telegramNotifyApiRequests: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false, comment: 'ارسال لاگ درخواست‌های API به تلگرام' },
        telegramNotifyAuthEvents: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true, comment: 'ارسال رویدادهای ورود/خروج به تلگرام' },
        telegramNotifySocketEvents: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false, comment: 'ارسال رویدادهای Socket.IO به تلگرام' },
        telegramNotifyIncomingMessages: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true, comment: 'ارسال رویداد پیام‌های ورودی به تلگرام' },
        telegramNotifySystemEvents: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true, comment: 'ارسال رویدادهای سیستمی به تلگرام' },
        telegramNotifyErrorEvents: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true, comment: 'ارسال خطاها به تلگرام' },
        hiddenSections: { type: DataTypes.TEXT, allowNull: true, comment: 'بخش‌های مخفی در منو (JSON array)' },
        languageMode: { type: DataTypes.STRING(32), allowNull: true, defaultValue: 'trilingual', comment: 'حالت زبان: single | single_en | single_tr | bilingual | bilingual_fa_tr | bilingual_en_tr | trilingual' },
        defaultLanguage: { type: DataTypes.STRING(10), allowNull: true, defaultValue: 'fa', comment: 'زبان پیش‌فرض هنگام چندزبانگی: fa | en | tr' },
        primaryColor: { type: DataTypes.STRING(20), allowNull: true, comment: 'رنگ اصلی/اکسن (مثلاً #10b981)' },
        fontFamily: { type: DataTypes.STRING(64), allowNull: true, comment: 'خانواده فونت: Vazirmatn, Inter, Tahoma, ...' },
        fontSize: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'medium', comment: 'سایز فونت: small | medium | large' },
        fontWeight: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'normal', comment: 'وزن فونت: normal | medium | bold' },
        uiTheme: { type: DataTypes.STRING(32), allowNull: true, defaultValue: 'default', comment: 'قالب ظاهری: default | minimal | dark | light | ocean | warm' },
        sidebarOrder: { type: DataTypes.TEXT, allowNull: true, comment: 'ترتیب منو (JSON array از data-section)' },
        iosAppUrl: { type: DataTypes.TEXT, allowNull: true, comment: 'لینک دانلود اپ iOS (App Store/TestFlight/itms-services)' },
        androidAppUrl: { type: DataTypes.TEXT, allowNull: true, comment: 'لینک دانلود اپ Android (Play Store یا APK)' }
    }, {
        timestamps: true,
        tableName: 'panel_settings'
    });

    return PanelSetting;
};
