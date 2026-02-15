const { DataTypes } = require('sequelize');

/**
 * History of each stage for a process instance (who did it, when, notes).
 */
module.exports = (sequelize) => {
    const ProcessInstanceStep = sequelize.define('ProcessInstanceStep', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        instanceId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'ProcessInstances', key: 'id' },
            onDelete: 'CASCADE'
        },
        stageIndex: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        stageName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        assignedTo: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'Users', key: 'id' }
        },
        startedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        completedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['instanceId'] },
            { fields: ['assignedTo'] }
        ]
    });

    ProcessInstanceStep.associate = (models) => {
        ProcessInstanceStep.belongsTo(models.ProcessInstance, { foreignKey: 'instanceId', as: 'instance' });
        ProcessInstanceStep.belongsTo(models.User, { foreignKey: 'assignedTo', as: 'assignee' });
    };

    return ProcessInstanceStep;
};
