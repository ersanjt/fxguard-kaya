const { DataTypes } = require('sequelize');

/**
 * اعطای دسترسی صریح ادمین سطح بالا به مشتری/مکالمهٔ محدودشده
 * (مثلاً پس از تعویض شماره واتساپ و قفل دادهٔ قبلی).
 */
module.exports = (sequelize) => {
    const StaffResourceGrant = sequelize.define('StaffResourceGrant', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            comment: 'کاربری که دسترسی دریافت می‌کند',
        },
        resourceType: {
            type: DataTypes.ENUM('customer', 'conversation'),
            allowNull: false,
        },
        resourceId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        grantedBy: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'ادمین اعطاکننده',
        },
    }, {
        timestamps: true,
        updatedAt: false,
        tableName: 'StaffResourceGrants',
        indexes: [
            { fields: ['userId'] },
            { fields: ['resourceType', 'resourceId'] },
            { unique: true, fields: ['userId', 'resourceType', 'resourceId'] },
        ],
    });

    StaffResourceGrant.associate = (models) => {
        StaffResourceGrant.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
        StaffResourceGrant.belongsTo(models.User, { foreignKey: 'grantedBy', as: 'granter' });
    };

    return StaffResourceGrant;
};
