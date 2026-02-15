const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const TicketReply = sequelize.define('TicketReply', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        ticketId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    }, { timestamps: true, tableName: 'TicketReplies' });

    TicketReply.associate = (models) => {
        TicketReply.belongsTo(models.Ticket, { foreignKey: 'ticketId', as: 'ticket' });
        TicketReply.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    };

    return TicketReply;
};
