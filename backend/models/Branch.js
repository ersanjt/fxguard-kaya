const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Branch = sequelize.define('Branch', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'نام شعبه مثلاً دفتر تبریز'
        },
        city: {
            type: DataTypes.STRING,
            comment: 'شهر'
        },
        country: {
            type: DataTypes.STRING,
            comment: 'کشور'
        },
        timezone: {
            type: DataTypes.STRING,
            defaultValue: 'Asia/Tehran'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        metadata: {
            type: DataTypes.JSON,
            defaultValue: {}
        }
    }, {
        timestamps: true,
        tableName: 'Branches'
    });

    Branch.associate = (models) => {
        Branch.hasMany(models.User, { foreignKey: 'branchId', as: 'users' });
        Branch.hasMany(models.Department, { foreignKey: 'branchId', as: 'departments' });
        Branch.hasMany(models.Conversation, { foreignKey: 'branchId', as: 'conversations' });
        Branch.hasMany(models.ActivityLog, { foreignKey: 'branchId', as: 'activities' });
    };

    return Branch;
};
