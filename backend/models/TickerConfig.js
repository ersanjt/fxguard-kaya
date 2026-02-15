const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const TickerConfig = sequelize.define('TickerConfig', {
        id: {
            type: DataTypes.STRING(32),
            defaultValue: 'default',
            primaryKey: true,
            comment: 'کلید تنظیم (فقط default)'
        },
        visibleKeys: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: null,
            comment: 'آرایه کلید ارزهای قابل نمایش در نوار قیمت، مثلاً ["usd","eur","gbp"] — null = همه'
        }
    }, {
        timestamps: true,
        tableName: 'ticker_configs'
    });

    return TickerConfig;
};
