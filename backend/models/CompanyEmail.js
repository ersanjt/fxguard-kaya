const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CompanyEmail = sequelize.define('CompanyEmail', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            comment: 'آدرس ایمیل شرکتی (مثلاً support@company.com)'
        },
        label: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'عنوان یا کاربرد (مثلاً پشتیبانی، فروش)'
        },
        assignedUserId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'کاربری که این ایمیل به او اختصاص داده شده (اختیاری)'
        },
        passwordEnc: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'رمز عبور ایمیل (ذخیره رمزنگاری‌شده)'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'یادداشت'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'فعال / غیرفعال'
        }
    }, {
        timestamps: true,
        tableName: 'company_emails',
        indexes: [
            { unique: true, fields: ['email'] },
            { fields: ['assignedUserId'] },
            { fields: ['isActive'] }
        ]
    });

    CompanyEmail.associate = (models) => {
        CompanyEmail.belongsTo(models.User, { foreignKey: 'assignedUserId', as: 'assignedUser' });
    };

    return CompanyEmail;
};
