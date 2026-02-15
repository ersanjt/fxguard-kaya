const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ActivityLog = sequelize.define('ActivityLog', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'کاربری که عمل را انجام داده'
        },
        branchId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'شعبه مربوط'
        },
        departmentId: {
            type: DataTypes.UUID,
            allowNull: true
        },
        action: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'مثلاً message_sent, conversation_assigned, ticket_created'
        },
        entityType: {
            type: DataTypes.STRING,
            comment: 'conversation, message, ticket, customer'
        },
        entityId: {
            type: DataTypes.UUID,
            allowNull: true
        },
        summary: {
            type: DataTypes.STRING,
            comment: 'خلاصه قابل نمایش برای مالک'
        },
        metadata: {
            type: DataTypes.JSON,
            defaultValue: {}
        }
    }, {
        timestamps: true,
        updatedAt: false,
        tableName: 'ActivityLogs',
        indexes: [
            { fields: ['userId'] },
            { fields: ['branchId'] },
            { fields: ['action'] },
            { fields: ['createdAt'] }
        ]
    });

    ActivityLog.associate = (models) => {
        ActivityLog.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
        ActivityLog.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        ActivityLog.belongsTo(models.Department, { foreignKey: 'departmentId', as: 'department' });
    };

    return ActivityLog;
};
