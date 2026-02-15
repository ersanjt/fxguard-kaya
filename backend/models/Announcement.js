const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Announcement = sequelize.define('Announcement', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        fromUserId: {
            type: DataTypes.UUID,
            allowNull: false,
            comment: 'فرستنده (مدیر/مالک/ادمین)'
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        isImportant: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'پیام مهم = پاپ‌آپ و صدا برای گیرنده'
        },
        targetType: {
            type: DataTypes.ENUM('user', 'department', 'all'),
            allowNull: false,
            comment: 'user=یک نفر، department=یک دپارتمان، all=همه'
        },
        targetId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'userId یا departmentId بر اساس targetType؛ برای all خالی'
        }
    }, { timestamps: true, tableName: 'Announcements' });

    Announcement.associate = (models) => {
        Announcement.belongsTo(models.User, { foreignKey: 'fromUserId', as: 'fromUser' });
        Announcement.hasMany(models.AnnouncementRead, { foreignKey: 'announcementId', as: 'reads' });
    };

    return Announcement;
};
