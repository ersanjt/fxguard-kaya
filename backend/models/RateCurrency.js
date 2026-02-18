const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const RateCurrency = sequelize.define('RateCurrency', {
        key: {
            type: DataTypes.STRING(32),
            allowNull: false,
            primaryKey: true,
            comment: 'کلید ارز مثلاً usd, eur, gold'
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
        indexes: [{ unique: true, fields: ['key'] }]
    });

    return RateCurrency;
};
