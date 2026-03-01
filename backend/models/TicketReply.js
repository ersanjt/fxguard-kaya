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
        },
        attachments: {
            type: DataTypes.JSON,
            defaultValue: [],
            comment: 'آرایه { name, url, size } برای فایل‌های پیوست'
        }
    }, {
        timestamps: true,
        tableName: 'TicketReplies',
        indexes: [
            { fields: ['ticketId'] },
            { fields: ['userId'] }
        ]
    });

    TicketReply.associate = (models) => {
        TicketReply.belongsTo(models.Ticket, { foreignKey: 'ticketId', as: 'ticket' });
        TicketReply.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    };

    return TicketReply;
};
