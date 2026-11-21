const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const RateAdjustment = sequelize.define('RateAdjustment', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        tenantId: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        currencyKey: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: 'کلید ارز مثلاً usd, eur, gold — یکتا در هر سازمان'
        },
        adjustmentType: {
            type: DataTypes.ENUM('none', 'fixed', 'delta_toman', 'percent'),
            defaultValue: 'none',
            comment: 'none=بدون تغییر، fixed=قیمت ثابت، delta_toman=+/- تومان، percent=+/- درصد'
        },
        value: {
            type: DataTypes.DECIMAL(18, 4),
            allowNull: true,
            comment: 'برای fixed=قیمت نهایی، delta_toman=مبلغ تومان، percent=عدد درصد مثلاً 2 برای +2٪'
        }
    }, {
        timestamps: true,
        indexes: [
            { unique: true, fields: ['tenantId', 'currencyKey'] },
            { fields: ['tenantId'] },
        ]
    });

    return RateAdjustment;
};
