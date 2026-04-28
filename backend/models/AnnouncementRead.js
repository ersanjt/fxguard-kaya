const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const AnnouncementRead = sequelize.define('AnnouncementRead', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        announcementId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        readAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, { timestamps: false, tableName: 'AnnouncementReads', indexes: [{ unique: true, fields: ['announcementId', 'userId'] }] });

    AnnouncementRead.associate = (models) => {
        AnnouncementRead.belongsTo(models.Announcement, { foreignKey: 'announcementId', as: 'announcement' });
        AnnouncementRead.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    };

    return AnnouncementRead;
};
