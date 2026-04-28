const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const CustomerDocument = sequelize.define('CustomerDocument', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        customerId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        // نوع سند: identity=مدارک هویتی, contract=قرارداد, media=رسانه, other=سایر
        category: {
            type: DataTypes.ENUM('identity', 'contract', 'financial', 'media', 'other'),
            defaultValue: 'other'
        },
        // عنوان سند
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        // مسیر فایل ذخیره شده
        filePath: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        fileName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        fileSize: {
            type: DataTypes.INTEGER
        },
        mimeType: {
            type: DataTypes.STRING
        },
        // نوع فایل برای نمایش سریع
        fileType: {
            type: DataTypes.ENUM('image', 'video', 'audio', 'document', 'other'),
            defaultValue: 'other'
        },
        // منبع: manual=دستی توسط کاربر, conversation=از مکالمه
        source: {
            type: DataTypes.ENUM('manual', 'conversation'),
            defaultValue: 'manual'
        },
        // اگر از مکالمه آمده، شناسه پیام
        messageId: {
            type: DataTypes.UUID
        },
        conversationId: {
            type: DataTypes.UUID
        },
        // کاربری که آپلود کرده
        uploadedBy: {
            type: DataTypes.UUID
        },
        // تاریخ انقضا (برای مدارک هویتی)
        expiresAt: {
            type: DataTypes.DATEONLY
        },
        tags: {
            type: DataTypes.JSON,
            defaultValue: []
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['customerId'] },
            { fields: ['category'] },
            { fields: ['fileType'] },
            { fields: ['source'] },
            { fields: ['conversationId'] }
        ]
    });

    CustomerDocument.associate = (models) => {
        CustomerDocument.belongsTo(models.Customer, {
            foreignKey: 'customerId',
            as: 'customer'
        });
        if (models.User) {
            CustomerDocument.belongsTo(models.User, {
                foreignKey: 'uploadedBy',
                as: 'uploader'
            });
        }
    };

    return CustomerDocument;
};
