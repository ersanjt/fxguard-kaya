const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PasswordResetToken = sequelize.define('PasswordResetToken', {
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
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        tableName: 'password_reset_tokens',
        indexes: [
            { fields: ['token'], unique: true },
            { fields: ['userId'] },
            { fields: ['expiresAt'] }
        ]
    });

    PasswordResetToken.associate = (models) => {
        PasswordResetToken.belongsTo(models.User, { foreignKey: 'userId' });
    };

    return PasswordResetToken;
};
