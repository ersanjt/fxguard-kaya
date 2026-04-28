const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const TaskUpdate = sequelize.define('TaskUpdate', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        taskId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'متن پیگیری یا گزارش پیشرفت'
        },
        statusChange: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'تغییر وضعیت در این بروزرسانی مثلاً pending -> in_progress'
        }
    }, {
        timestamps: true,
        updatedAt: false,
        indexes: [
            { fields: ['taskId'] },
            { fields: ['userId'] }
        ]
    });

    TaskUpdate.associate = (models) => {
        TaskUpdate.belongsTo(models.Task, { foreignKey: 'taskId', as: 'task' });
        TaskUpdate.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    };

    return TaskUpdate;
};
