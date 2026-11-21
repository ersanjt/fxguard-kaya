const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const RateCurrency = sequelize.define('RateCurrency', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        tenantId: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        key: {
            type: DataTypes.STRING(32),
            allowNull: false,
            comment: 'کلید ارز مثلاً usd, eur, gold — یکتا در هر سازمان'
        },
        label: {
            type: DataTypes.STRING(120),
            allowNull: false,
            defaultValue: '',
            comment: 'نام نمایشی ارز'
        },
        apiKeys: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
            comment: 'آرایه کلیدهای API ناواسان برای خواندن مقدار، مثلاً ["usd_sell","usd_buy"]'
        },
        sortOrder: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'ترتیب نمایش'
        }
    }, {
        timestamps: true,
        tableName: 'rate_currencies',
        indexes: [
            { unique: true, fields: ['tenantId', 'key'] },
            { fields: ['tenantId'] },
        ]
    });

    return RateCurrency;
};
