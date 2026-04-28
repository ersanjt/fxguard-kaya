const { DataTypes } = require('sequelize');

/**
 * Business Process Template: defines a workflow with ordered stages.
 * Example: "پشتیبانی تیکت" → [دریافت، بررسی، پاسخ، بستن]
 */
module.exports = (sequelize) => {
    const ProcessTemplate = sequelize.define('ProcessTemplate', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Template name (e.g. Ticket support, Onboarding)'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        /** Ordered stages: [{ name: string, order: number }] */
        stages: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
            comment: 'Array of { name, order } for workflow steps'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        /** Optional: link type for context (ticket, task, conversation) */
        referenceType: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'ticket | task | conversation | none'
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['isActive'] }
        ]
    });

    ProcessTemplate.associate = (models) => {
        ProcessTemplate.hasMany(models.ProcessInstance, { foreignKey: 'templateId', as: 'instances' });
    };

    return ProcessTemplate;
};
