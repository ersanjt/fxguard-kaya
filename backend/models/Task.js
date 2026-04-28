const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Task = sequelize.define('Task', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        status: {
            type: DataTypes.ENUM('pending', 'in_progress', 'done', 'cancelled'),
            defaultValue: 'pending'
        },
        priority: {
            type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
            defaultValue: 'normal'
        },
        createdBy: {
            type: DataTypes.UUID,
            allowNull: false
        },
        assignedTo: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'کاربری که تسک به او داده شده؛ اگر خالی باشد تسک به دپارتمان داده شده'
        },
        assignedToDepartmentId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'دپارتمانی که تسک به آن داده شده'
        },
        branchId: {
            type: DataTypes.UUID,
            allowNull: true
        },
        dueDate: {
            type: DataTypes.DATE,
            allowNull: true
        },
        completedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        completedBy: {
            type: DataTypes.UUID,
            allowNull: true
        },
        metadata: {
            type: DataTypes.JSON,
            defaultValue: {}
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['createdBy'] },
            { fields: ['assignedTo'] },
            { fields: ['assignedToDepartmentId'] },
            { fields: ['status'] },
            { fields: ['dueDate'] },
            { fields: ['branchId'] }
        ]
    });

    Task.associate = (models) => {
        Task.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
        Task.belongsTo(models.User, { foreignKey: 'assignedTo', as: 'assignee' });
        Task.belongsTo(models.User, { foreignKey: 'completedBy', as: 'completedByUser' });
        Task.belongsTo(models.Department, { foreignKey: 'assignedToDepartmentId', as: 'department' });
        if (models.Branch) {
            Task.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        }
        if (models.TaskUpdate) {
            Task.hasMany(models.TaskUpdate, { foreignKey: 'taskId', as: 'updates' });
        }
    };

    return Task;
};
