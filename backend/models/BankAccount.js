const { DataTypes } = require('sequelize');

/**
 * حساب بانکی — حساب‌های بانکی صرافی
 */
module.exports = (sequelize) => {
    const BankAccount = sequelize.define('BankAccount', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'نام حساب مثلاً حساب تجاری بانک ملی'
        },
        bankName: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'نام بانک'
        },
        accountNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'شماره حساب'
        },
        iban: {
            type: DataTypes.STRING(34),
            allowNull: true,
            comment: 'شماره شبا'
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
            comment: 'واحد پول'
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
        tableName: 'BankAccounts',
        indexes: [
            { fields: ['branchId'] },
            { fields: ['isActive'] }
        ]
    });

    BankAccount.associate = (models) => {
        BankAccount.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
    };

    return BankAccount;
};
