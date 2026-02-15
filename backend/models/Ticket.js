const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Ticket = sequelize.define('Ticket', {
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
        createdBy: {
            type: DataTypes.UUID,
            allowNull: false
        },
        assignedTo: {
            type: DataTypes.UUID
        },
        departmentId: {
            type: DataTypes.UUID
        },
        status: {
            type: DataTypes.ENUM('open', 'in_progress', 'closed'),
            defaultValue: 'open'
        },
        priority: {
            type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
            defaultValue: 'normal'
        },
        dueDate: {
            type: DataTypes.DATE
        },
        metadata: {
            type: DataTypes.JSON,
            defaultValue: {}
        }
    }, { timestamps: true });

    Ticket.associate = (models) => {
        Ticket.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
        Ticket.belongsTo(models.User, { foreignKey: 'assignedTo', as: 'assignee' });
        Ticket.belongsTo(models.Department, { foreignKey: 'departmentId', as: 'department' });
        if (models.TicketReply) Ticket.hasMany(models.TicketReply, { foreignKey: 'ticketId', as: 'replies' });
    };

    return Ticket;
};
