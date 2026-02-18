const { DataTypes } = require('sequelize');

/**
 * صندوق — صندوق‌های نقدی صرافی (هر شعبه می‌تواند چند صندوق داشته باشد)
 */
module.exports = (sequelize) => {
    const CashBox = sequelize.define('CashBox', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'نام صندوق مثلاً صندوق ۱، صندوق دلار'
        },
        branchId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'Branches', key: 'id' },
            comment: 'شعبه مربوطه'
        },
        currency: {
            type: DataTypes.STRING(10),
            defaultValue: 'IRR',
            comment: 'واحد پول: IRR, USD, EUR, ...'
        },
        balance: {
            type: DataTypes.DECIMAL(18, 2),
            defaultValue: 0,
            comment: 'موجودی فعلی'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'توضیح'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        sortOrder: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    }, {
        timestamps: true,
        tableName: 'CashBoxes',
        indexes: [
            { fields: ['branchId'] },
            { fields: ['isActive'] }
        ]
    });

    CashBox.associate = (models) => {
        CashBox.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
    };

    return CashBox;
};
