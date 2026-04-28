const { DataTypes } = require('sequelize');

/**
 * حضور و غیاب — ثبت ورود/خروج کارکنان به تفکیک شعبه
 * منبع: دستی (دکمه ورود/خروج) یا خودکار (از ActivityLog user_login/user_logout)
 */
module.exports = (sequelize) => {
    const Attendance = sequelize.define('Attendance', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'Users', key: 'id' },
            comment: 'کاربر'
        },
        branchId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'Branches', key: 'id' },
            comment: 'شعبه'
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'تاریخ'
        },
        checkInAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'ساعت ورود'
        },
        checkOutAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'ساعت خروج'
        },
        minutes: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'جمع دقایق حضور (خروج - ورود)'
        },
        source: {
            type: DataTypes.STRING(30),
            defaultValue: 'system',
            comment: 'منبع: system=از ActivityLog، manual=ثبت دستی'
        },
        activityLogLoginId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'شناسه رکورد user_login در ActivityLog'
        },
        activityLogLogoutId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'شناسه رکورد user_logout در ActivityLog'
        }
    }, {
        timestamps: true,
        tableName: 'Attendances',
        indexes: [
            { fields: ['userId'] },
            { fields: ['branchId'] },
            { fields: ['date'] },
            { fields: ['userId', 'date'] }
        ]
    });

    Attendance.associate = (models) => {
        Attendance.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
        Attendance.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
    };

    return Attendance;
};
