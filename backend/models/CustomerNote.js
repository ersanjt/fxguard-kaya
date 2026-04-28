const { DataTypes } = require('sequelize');

/**
 * گزارش/یادداشت کارمند درباره مشتری — هر کارمند می‌تواند گزارش مربوط به مشتری را ذخیره کند
 * و بعداً به آن مراجعه کند (تاریخچه هر کارمند).
 */
module.exports = (sequelize) => {
    const CustomerNote = sequelize.define('CustomerNote', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        customerId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'Customers', key: 'id' }
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            comment: 'کاربری که این گزارش/یادداشت را ثبت کرده'
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'متن گزارش یا یادداشت'
        }
    }, {
        timestamps: true,
        updatedAt: false,
        tableName: 'CustomerNotes',
        indexes: [
            { fields: ['customerId'] },
            { fields: ['userId'] },
            { fields: ['createdAt'] }
        ]
    });

    CustomerNote.associate = (models) => {
        CustomerNote.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
        CustomerNote.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    };

    return CustomerNote;
};
