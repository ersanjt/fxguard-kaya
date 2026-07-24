const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const InternalThread = sequelize.define('InternalThread', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(120),
            allowNull: true,
            comment: 'نام گروه (برای DM خالی است)'
        },
        type: {
            type: DataTypes.STRING(16),
            allowNull: false,
            defaultValue: 'dm',
            comment: 'dm | group'
        },
        createdById: {
            type: DataTypes.UUID,
            allowNull: true
        },
        lastMessageAt: {
            type: DataTypes.DATE
        }
    }, {
        timestamps: true,
        tableName: 'InternalThreads',
        indexes: [
            { fields: ['lastMessageAt'] },
            { fields: ['type'] }
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
        InternalThread.belongsTo(models.User, { foreignKey: 'createdById', as: 'createdBy' });
    };

    return InternalThread;
};
