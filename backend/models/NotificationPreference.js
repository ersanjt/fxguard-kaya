const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const NotificationPreference = sequelize.define('NotificationPreference', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            comment: 'کاربری که تنظیمات برای او است'
        },
        // اعلان‌ها
        announceEmailEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'دریافت ایمیل برای اعلان‌های مهم'
        },
        announceSocketEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'دریافت اعلان فوری (Socket.IO)'
        },
        // ورود
        loginEmailEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'دریافت ایمیل برای هر ورود'
        },
        // تسک‌ها
        taskAssignedEmailEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'دریافت ایمیل هنگام تخصیص تسک'
        },
        taskDueEmailEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'دریافت یادآوری ایمیل برای تسک‌های نزدیک به مهلت'
        },
        // تیکت‌ها
        ticketAssignedEmailEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'دریافت ایمیل هنگام تخصیص تیکت'
        },
        ticketReplyEmailEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'دریافت ایمیل هنگام پاسخ به تیکت'
        },
        // چرخهٔ عمر حساب (ایجاد / تغییر نقش / مسدود و …)
        accountLifecycleEmailEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'ایمیل برای رویدادهای حساب کاربری'
        },
        accountLifecycleWhatsappEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'واتساپ برای رویدادهای حساب کاربری'
        },
        accountLifecycleTelegramEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'تلگرام برای رویدادهای حساب کاربری (در صورت لینک بودن)'
        },
        // دیگر
        digestEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'دریافت خلاصه روزانه/هفتگی اخبار'
        },
        digestFrequency: {
            type: DataTypes.ENUM('daily', 'weekly'),
            defaultValue: 'daily',
            comment: 'فرکانس ارسال خلاصه'
        },
        unsubscribeToken: {
            type: DataTypes.STRING(64),
            allowNull: true,
            unique: true,
            comment: 'توکن برای لغو اشتراک یکطرفه'
        }
    }, {
        timestamps: true,
        tableName: 'notification_preferences',
        indexes: [
            { unique: true, fields: ['userId'] },
            { fields: ['unsubscribeToken'] }
        ]
    });

    NotificationPreference.associate = (models) => {
        NotificationPreference.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    };

    return NotificationPreference;
};
