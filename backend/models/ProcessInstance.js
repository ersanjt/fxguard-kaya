const { DataTypes } = require('sequelize');

/**
 * A running instance of a process (one workflow execution).
 * Linked optionally to a ticket, task, or conversation.
 */
module.exports = (sequelize) => {
    const ProcessInstance = sequelize.define('ProcessInstance', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        templateId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'ProcessTemplates', key: 'id' }
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Display title (e.g. "Support for Ticket #123")'
        },
        referenceType: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'ticket | task | conversation'
        },
        referenceId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'ID of linked Ticket, Task, or Conversation'
        },
        currentStageIndex: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '0-based index into template.stages'
        },
        status: {
            type: DataTypes.ENUM('active', 'completed', 'cancelled'),
            defaultValue: 'active'
        },
        createdBy: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'Users', key: 'id' }
        },
        assignedTo: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'Users', key: 'id' },
            comment: 'Current step assignee'
        },
        completedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        metadata: {
            type: DataTypes.JSON,
            defaultValue: {}
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['templateId'] },
            { fields: ['status'] },
            { fields: ['createdBy'] },
            { fields: ['assignedTo'] },
            { fields: ['referenceType', 'referenceId'] }
        ]
    });

    ProcessInstance.associate = (models) => {
        ProcessInstance.belongsTo(models.ProcessTemplate, { foreignKey: 'templateId', as: 'template' });
        ProcessInstance.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
        ProcessInstance.belongsTo(models.User, { foreignKey: 'assignedTo', as: 'assignee' });
        ProcessInstance.hasMany(models.ProcessInstanceStep, { foreignKey: 'instanceId', as: 'steps' });
    };

    return ProcessInstance;
};
