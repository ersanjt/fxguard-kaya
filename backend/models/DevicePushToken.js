/**
 * Kaya CRM — توکن پوش دستگاه کارکنان
 * @file    backend/models/DevicePushToken.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const DevicePushToken = sequelize.define('DevicePushToken', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'Users', key: 'id' },
            onDelete: 'CASCADE'
        },
        token: {
            type: DataTypes.STRING(512),
            allowNull: false,
            unique: true
        },
        platform: {
            type: DataTypes.STRING(16),
            allowNull: false,
            defaultValue: 'android',
            comment: 'android | ios'
        },
        appVersion: {
            type: DataTypes.STRING(32),
            allowNull: true
        }
    }, {
        tableName: 'device_push_tokens',
        indexes: [
            { unique: true, fields: ['token'] },
            { fields: ['userId'] },
            { fields: ['platform'] }
        ]
    });

    DevicePushToken.associate = (models) => {
        DevicePushToken.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    };

    return DevicePushToken;
};
