const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Customer = sequelize.define('Customer', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        phone: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            validate: {
                isEmail: true
            }
        },
        profilePic: {
            type: DataTypes.TEXT
        },
        source: {
            type: DataTypes.ENUM('whatsapp', 'web', 'manual'),
            defaultValue: 'whatsapp'
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'blocked'),
            defaultValue: 'active'
        },
        customFields: {
            type: DataTypes.JSON,
            defaultValue: {}
        },
        notes: {
            type: DataTypes.TEXT
        },
        totalConversations: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        totalMessages: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        firstContactAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        lastContactAt: {
            type: DataTypes.DATE
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['phone'] },
            { fields: ['email'] },
            { fields: ['status'] }
        ]
    });

    Customer.associate = (models) => {
        Customer.hasMany(models.Conversation, {
            foreignKey: 'customerId',
            as: 'conversations'
        });
        Customer.hasMany(models.Message, {
            foreignKey: 'customerId',
            as: 'messages'
        });
        Customer.belongsToMany(models.Tag, {
            through: 'CustomerTags',
            as: 'tags'
        });
        if (models.CustomerNote) {
            Customer.hasMany(models.CustomerNote, { foreignKey: 'customerId', as: 'customerNotes' });
        }
        if (models.Transaction) {
            Customer.hasMany(models.Transaction, { foreignKey: 'customerId', as: 'transactions' });
        }
    };

    return Customer;
};
