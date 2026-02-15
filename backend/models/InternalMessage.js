const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const InternalMessage = sequelize.define('InternalMessage', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        threadId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        fromUserId: {
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
    }, { timestamps: true, tableName: 'InternalMessages' });

    InternalMessage.associate = (models) => {
        InternalMessage.belongsTo(models.InternalThread, { foreignKey: 'threadId', as: 'thread' });
        InternalMessage.belongsTo(models.User, { foreignKey: 'fromUserId', as: 'fromUser' });
    };

    return InternalMessage;
};
