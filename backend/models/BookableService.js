/**
 * Kaya CRM — نوبت‌دهی: خدمت قابل رزرو (ویزیت، لیزر، تور یک‌روزه، مشاوره، ...)
 * @file    backend/models/BookableService.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const BookableService = sequelize.define('BookableService', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        tenantId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'سازمان مالک — جداسازی داده در Cloud'
        },
        name: {
            type: DataTypes.STRING(120),
            allowNull: false
        },
        labels: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '{ fa, en, tr } — اختیاری؛ در نبود، name'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        durationMin: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 30,
            comment: 'مدت پیش‌فرض نوبت (دقیقه)'
        },
        bufferMin: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'فاصلهٔ آماده‌سازی بعد از هر نوبت (دقیقه)'
        },
        price: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true
        },
        currency: {
            type: DataTypes.STRING(8),
            allowNull: true
        },
        color: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        branchId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'اگر فقط در یک شعبه ارائه می‌شود'
        },
        staffIds: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'کارکنان ارائه‌دهنده (UUID[]) — null = همه'
        },
        sortOrder: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        templateKey: {
            type: DataTypes.STRING(48),
            allowNull: true
        }
    }, {
        tableName: 'bookable_services',
        timestamps: true,
        indexes: [
            { fields: ['tenantId', 'isActive', 'sortOrder'] },
            { fields: ['branchId'] }
        ]
    });

    BookableService.associate = (models) => {
        if (models.Appointment) {
            BookableService.hasMany(models.Appointment, { foreignKey: 'serviceId', as: 'appointments' });
        }
        if (models.Branch) BookableService.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
    };

    return BookableService;
};
