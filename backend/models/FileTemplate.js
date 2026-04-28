const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FileTemplate = sequelize.define('FileTemplate', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'نام فایل برای نمایش در لیست'
        },
        description: {
            type: DataTypes.TEXT,
            comment: 'توضیحات اختیاری درباره فایل'
        },
        category: {
            type: DataTypes.STRING,
            comment: 'دسته‌بندی فایل (مثلاً: قراردادها، فرم‌ها، راهنماها، تصاویر)'
        },
        filename: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'نام فایل اصلی'
        },
        filepath: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'مسیر فایل در سرور'
        },
        filesize: {
            type: DataTypes.INTEGER,
            comment: 'حجم فایل به بایت'
        },
        mimetype: {
            type: DataTypes.STRING,
            comment: 'نوع MIME فایل'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'فایل فعال است یا خیر'
        },
        usageCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'تعداد دفعات استفاده از فایل'
        },
        uploadedBy: {
            type: DataTypes.UUID,
            comment: 'کاربری که فایل را بارگذاری کرده'
        },
        tags: {
            type: DataTypes.JSON,
            defaultValue: [],
            comment: 'برچسب‌های فایل برای جستجوی راحت‌تر'
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['category'] },
            { fields: ['isActive'] },
            { fields: ['uploadedBy'] },
            { fields: ['usageCount'] }
        ]
    });

    FileTemplate.associate = (models) => {
        FileTemplate.belongsTo(models.User, {
            foreignKey: 'uploadedBy',
            as: 'uploader'
        });
    };

    return FileTemplate;
};
