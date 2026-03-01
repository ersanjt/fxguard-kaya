const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const InternalThread = sequelize.define('InternalThread', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        lastMessageAt: {
            type: DataTypes.DATE
        }
    }, {
        timestamps: true,
        tableName: 'InternalThreads',
        indexes: [
            { fields: ['lastMessageAt'] }
        ]
    });

    InternalThread.associate = (models) => {
        InternalThread.belongsToMany(models.User, {
            through: models.InternalThreadParticipant,
            foreignKey: 'threadId',
            otherKey: 'userId',
            as: 'participants'
        });
        InternalThread.hasMany(models.InternalMessage, { foreignKey: 'threadId', as: 'messages' });
        InternalThread.hasMany(models.InternalThreadParticipant, { foreignKey: 'threadId', as: 'threadParticipants' });
    };

    return InternalThread;
};
