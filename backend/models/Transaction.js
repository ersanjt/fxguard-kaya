const { DataTypes } = require('sequelize');

/**
 * تراکنش — عملیات مالی (ورود/خروج صندوق، انتقال، واریز، برداشت)
 */
module.exports = (sequelize) => {
    const Transaction = sequelize.define('Transaction', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        type: {
            type: DataTypes.STRING(30),
            allowNull: false,
            comment: 'نوع: cash_in, cash_out, transfer_box, transfer_account, bank_deposit, bank_withdraw, buy, sell, expense, income'
        },
        amount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            comment: 'مبلغ'
        },
        currency: {
            type: DataTypes.STRING(10),
            defaultValue: 'IRR',
            comment: 'واحد پول'
        },
        fromCashBoxId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'CashBoxes', key: 'id' },
            comment: 'صندوق مبدا (برای انتقال/برداشت)'
        },
        toCashBoxId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'CashBoxes', key: 'id' },
            comment: 'صندوق مقصد'
        },
        fromBankAccountId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'BankAccounts', key: 'id' },
            comment: 'حساب بانکی مبدا'
        },
        toBankAccountId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'BankAccounts', key: 'id' },
            comment: 'حساب بانکی مقصد'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'شرح تراکنش'
        },
        reference: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'شماره مرجع، رسید، فاکتور'
        },
        transactionDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            comment: 'تاریخ تراکنش'
        },
        branchId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'Branches', key: 'id' }
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'Users', key: 'id' },
            comment: 'کاربر ثبت‌کننده'
        },
        customerId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'Customers', key: 'id' },
            comment: 'مشتری مرتبط با تراکنش'
        },
        metadata: {
            type: DataTypes.JSON,
            defaultValue: {},
            comment: 'اطلاعات اضافی'
        }
    }, {
        timestamps: true,
        tableName: 'Transactions',
        indexes: [
            { fields: ['type'] },
            { fields: ['transactionDate'] },
            { fields: ['branchId'] },
            { fields: ['fromCashBoxId', 'toCashBoxId'] },
            { fields: ['fromBankAccountId', 'toBankAccountId'] },
            { fields: ['customerId'] }
        ]
    });

    Transaction.associate = (models) => {
        Transaction.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        Transaction.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
        Transaction.belongsTo(models.CashBox, { foreignKey: 'fromCashBoxId', as: 'fromCashBox' });
        Transaction.belongsTo(models.CashBox, { foreignKey: 'toCashBoxId', as: 'toCashBox' });
        Transaction.belongsTo(models.BankAccount, { foreignKey: 'fromBankAccountId', as: 'fromBankAccount' });
        Transaction.belongsTo(models.BankAccount, { foreignKey: 'toBankAccountId', as: 'toBankAccount' });
        if (models.Customer) Transaction.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
    };

    return Transaction;
};
