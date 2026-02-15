const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const InternalThreadParticipant = sequelize.define('InternalThreadParticipant', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        threadId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        }
    }, { timestamps: false, tableName: 'InternalThreadParticipants' });

    InternalThreadParticipant.associate = (models) => {
        InternalThreadParticipant.belongsTo(models.InternalThread, { foreignKey: 'threadId', as: 'thread' });
        InternalThreadParticipant.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    };

    return InternalThreadParticipant;
};
