/**
 * Kaya CRM — موتور عمومی: تعریف «شیء سفارشی» (ماژول‌ساز)
 * @file    backend/models/CustomObject.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * هر سازمان ماژول‌های خودش را تعریف می‌کند (درمان‌ها، تورها، محصولات، سفارش‌ها، ...).
 * فیلدها در FieldDefinition (entity = record) و داده در CustomRecord نگهداری می‌شوند.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CustomObject = sequelize.define('CustomObject', {
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
        key: {
            type: DataTypes.STRING(48),
            allowNull: false,
            comment: 'شناسهٔ یکتا در سازمان (a-z0-9_) — در URL و API استفاده می‌شود'
        },
        labels: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: {},
            comment: '{ fa, en, tr } نام ماژول (جمع)'
        },
        singularLabels: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '{ fa, en, tr } نام یک رکورد (مفرد) — برای دکمهٔ «افزودن …»'
        },
        icon: {
            type: DataTypes.STRING(32),
            allowNull: true,
            defaultValue: 'grid',
            comment: 'نام آیکون از مجموعهٔ پنل'
        },
        color: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        linkToCustomer: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'رکوردها به یک مشتری وصل می‌شوند (در پروندهٔ مشتری دیده می‌شوند)'
        },
        hasAssignee: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'رکورد مسئول (کارمند) دارد'
        },
        statuses: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '[{ key, labels:{fa,en,tr}, color, isFinal }] — خالی = بدون وضعیت'
        },
        allowedRoles: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'نقش‌های مجاز؛ null = همهٔ دارندگان دسترسی records'
        },
        showInMenu: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
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
            allowNull: true,
            comment: 'اگر از قالب صنعت آمده، کلید قالب'
        }
    }, {
        tableName: 'custom_objects',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['tenantId', 'key'] },
            { fields: ['tenantId', 'sortOrder'] }
        ]
    });

    CustomObject.associate = (models) => {
        if (models.FieldDefinition) {
            CustomObject.hasMany(models.FieldDefinition, { foreignKey: 'objectId', as: 'fields' });
        }
        if (models.CustomRecord) {
            CustomObject.hasMany(models.CustomRecord, { foreignKey: 'objectId', as: 'records' });
        }
    };

    return CustomObject;
};
