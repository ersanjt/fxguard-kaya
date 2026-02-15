const { DataTypes } = require('sequelize');

/**
 * خدمات صرافی — سرویس‌هایی که صرافی ارائه می‌دهد (خرید/فروش ارز، حواله، و غیره)
 */
module.exports = (sequelize) => {
    const ExchangeService = sequelize.define('ExchangeService', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'نام سرویس مثلاً خرید دلار، فروش یورو، حواله بانکی'
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'کد کوتاه برای نمایش یا یکپارچه‌سازی'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'توضیح کوتاه درباره سرویس'
        },
        category: {
            type: DataTypes.STRING(80),
            allowNull: true,
            comment: 'دسته‌بندی مثلاً نقد، حواله، کارمزد'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        sortOrder: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'ترتیب نمایش (عدد کمتر = بالاتر)'
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['isActive'] },
            { fields: ['sortOrder'] }
        ]
    });

    return ExchangeService;
};
