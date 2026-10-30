/**
 * Kaya CRM — موتور عمومی: تعریف فیلد (فرم‌ساز)
 * @file    backend/models/FieldDefinition.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * فیلدهای سفارشی برای: مشتری (entity=customer → Customer.customFields)،
 * رکورد یک شیء سفارشی (entity=record + objectId → CustomRecord.data)،
 * نوبت (entity=appointment → Appointment.data).
 */
const { DataTypes } = require('sequelize');

const FIELD_TYPES = [
    'text', 'textarea', 'number', 'money', 'date', 'datetime',
    'select', 'multiselect', 'boolean', 'phone', 'email', 'url',
    'user', 'customer'
];
const FIELD_ENTITIES = ['customer', 'record', 'appointment'];

module.exports = (sequelize) => {
    const FieldDefinition = sequelize.define('FieldDefinition', {
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
        entity: {
            type: DataTypes.STRING(24),
            allowNull: false,
            comment: 'customer | record | appointment'
        },
        objectId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'برای entity=record: شیء سفارشی'
        },
        key: {
            type: DataTypes.STRING(48),
            allowNull: false,
            comment: 'کلید داده (a-z0-9_)'
        },
        labels: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: {},
            comment: '{ fa, en, tr }'
        },
        type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'text'
        },
        options: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'select/multiselect: [{ value, labels:{fa,en,tr}, color }]'
        },
        required: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        showInList: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'ستون جدول باشد'
        },
        searchable: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        isTitle: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'مقدار این فیلد عنوان رکورد می‌شود'
        },
        defaultValue: {
            type: DataTypes.JSON,
            allowNull: true
        },
        placeholder: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '{ fa, en, tr }'
        },
        helpText: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '{ fa, en, tr }'
        },
        validation: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '{ min, max, minLength, maxLength, pattern, currency }'
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
        tableName: 'field_definitions',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['tenantId', 'entity', 'objectId', 'key'] },
            { fields: ['tenantId', 'entity', 'sortOrder'] }
        ]
    });

    FieldDefinition.associate = (models) => {
        if (models.CustomObject) {
            FieldDefinition.belongsTo(models.CustomObject, { foreignKey: 'objectId', as: 'object' });
        }
    };

    FieldDefinition.FIELD_TYPES = FIELD_TYPES;
    FieldDefinition.FIELD_ENTITIES = FIELD_ENTITIES;
    return FieldDefinition;
};

module.exports.FIELD_TYPES = FIELD_TYPES;
module.exports.FIELD_ENTITIES = FIELD_ENTITIES;
