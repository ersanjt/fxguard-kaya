const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Ticket = sequelize.define('Ticket', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        ticketNumber: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
            comment: 'شماره رسمی تیکت مثلاً TKT-20250216-1234'
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
            type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
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
    }, { timestamps: true, indexes: [{ fields: ['ticketNumber'] }, { fields: ['status'] }, { fields: ['dueDate'] }] });

    Ticket.beforeCreate(async (ticket) => {
        if (!ticket.ticketNumber) {
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const rnd = Math.floor(1000 + Math.random() * 9000);
            ticket.ticketNumber = 'TKT-' + date + '-' + rnd;
        }
    });

    Ticket.associate = (models) => {
        Ticket.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
        Ticket.belongsTo(models.User, { foreignKey: 'assignedTo', as: 'assignee' });
        Ticket.belongsTo(models.Department, { foreignKey: 'departmentId', as: 'department' });
        if (models.TicketReply) Ticket.hasMany(models.TicketReply, { foreignKey: 'ticketId', as: 'replies' });
    };

    return Ticket;
};
