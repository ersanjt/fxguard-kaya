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
        },
        // اطلاعات شخصی
        birthDate: {
            type: DataTypes.DATEONLY
        },
        nationalId: {
            type: DataTypes.STRING
        },
        nationality: {
            type: DataTypes.STRING
        },
        gender: {
            type: DataTypes.ENUM('male', 'female', 'other')
        },
        occupation: {
            type: DataTypes.STRING
        },
        companyName: {
            type: DataTypes.STRING
        },
        // آدرس
        address: {
            type: DataTypes.TEXT
        },
        city: {
            type: DataTypes.STRING
        },
        country: {
            type: DataTypes.STRING
        },
        postalCode: {
            type: DataTypes.STRING
        },
        // باشگاه مشتریان
        loyaltyPoints: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        loyaltyTier: {
            type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum'),
            defaultValue: 'bronze'
        },
        referredBy: {
            type: DataTypes.UUID
        },
        // شبکه‌های اجتماعی
        instagram: {
            type: DataTypes.STRING
        },
        telegram: {
            type: DataTypes.STRING
        },
        website: {
            type: DataTypes.STRING
        },
        isRestrictedFromStaff: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'محدود از کارکنان — فقط ادمین سطح بالا یا دارندگان اعطای دسترسی می‌بینند'
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['phone'] },
            { fields: ['email'] },
            { fields: ['status'] },
            { fields: ['birthDate'] },
            { fields: ['loyaltyTier'] },
            { fields: ['isRestrictedFromStaff'] }
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
        if (models.CustomerDocument) {
            Customer.hasMany(models.CustomerDocument, { foreignKey: 'customerId', as: 'documents' });
        }
        if (models.StaffResourceGrant) {
            Customer.hasMany(models.StaffResourceGrant, {
                foreignKey: 'resourceId',
                constraints: false,
                scope: { resourceType: 'customer' },
                as: 'accessGrants'
            });
        }
    };

    return Customer;
};
