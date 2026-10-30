/**
 * Kaya CRM — موتور عمومی: رکورد یک شیء سفارشی
 * @file    backend/models/CustomRecord.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CustomRecord = sequelize.define('CustomRecord', {
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
        objectId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        customerId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'Customers', key: 'id' },
            comment: 'مشتری مرتبط (اگر شیء linkToCustomer باشد)'
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
            defaultValue: '',
            comment: 'عنوان نمایشی — از فیلد isTitle یا ورودی صریح'
        },
        status: {
            type: DataTypes.STRING(48),
            allowNull: true,
            comment: 'کلید وضعیت از CustomObject.statuses'
        },
        assignedTo: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'Users', key: 'id' }
        },
        branchId: {
            type: DataTypes.UUID,
            allowNull: true
        },
        createdBy: {
            type: DataTypes.UUID,
            allowNull: true
        },
        data: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: {},
            comment: 'مقادیر فیلدها بر اساس FieldDefinition'
        },
        searchText: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'متن قابل جست‌وجو (عنوان + فیلدهای searchable) — lowercase'
        }
    }, {
        tableName: 'custom_records',
        timestamps: true,
        indexes: [
            { fields: ['tenantId', 'objectId'] },
            { fields: ['objectId', 'status'] },
            { fields: ['customerId'] },
            { fields: ['assignedTo'] },
            { fields: ['branchId'] }
        ]
    });

    CustomRecord.associate = (models) => {
        CustomRecord.belongsTo(models.CustomObject, { foreignKey: 'objectId', as: 'object' });
        CustomRecord.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
        CustomRecord.belongsTo(models.User, { foreignKey: 'assignedTo', as: 'assignee' });
        CustomRecord.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
        if (models.Branch) CustomRecord.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
    };

    return CustomRecord;
};
