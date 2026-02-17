const { DataTypes } = require('sequelize');

// ==================== Conversation Model ====================
const ConversationModel = (sequelize) => {
    const Conversation = sequelize.define('Conversation', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        customerId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        branchId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'شعبه‌ای که مکالمه به آن تخصیص داده شده'
        },
        departmentId: {
            type: DataTypes.UUID
        },
        assignedTo: {
            type: DataTypes.UUID
        },
        status: {
            type: DataTypes.ENUM('open', 'pending', 'closed', 'resolved'),
            defaultValue: 'open'
        },
        priority: {
            type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
            defaultValue: 'normal'
        },
        source: {
            type: DataTypes.STRING,
            defaultValue: 'whatsapp'
        },
        subject: {
            type: DataTypes.STRING
        },
        unreadCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        lastMessageAt: {
            type: DataTypes.DATE
        },
        lastIncomingMessageAt: {
            type: DataTypes.DATE,
            comment: 'زمان آخرین پیام ورودی مشتری — برای تشخیص مکالمات بدون پاسخ'
        },
        lastOutgoingMessageAt: {
            type: DataTypes.DATE,
            comment: 'زمان آخرین پاسخ ما — unanswered = lastIncoming > lastOutgoing'
        },
        lastMessagePreview: {
            type: DataTypes.STRING(500),
            comment: 'پیش‌نمایش آخرین پیام برای لیست'
        },
        assignedAt: {
            type: DataTypes.DATE
        },
        closedAt: {
            type: DataTypes.DATE
        },
        closedBy: {
            type: DataTypes.UUID
        },
        rating: {
            type: DataTypes.INTEGER,
            validate: {
                min: 1,
                max: 5
            }
        },
        feedback: {
            type: DataTypes.TEXT
        },
        metadata: {
            type: DataTypes.JSON,
            defaultValue: {}
        },
        unansweredAlertSentAt: {
            type: DataTypes.DATE,
            comment: 'زمان آخرین اعلان بدون پاسخ'
        },
        escalatedAt: {
            type: DataTypes.DATE,
            comment: 'زمان آخرین escalation به پشتیبانی'
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['customerId'] },
            { fields: ['assignedTo'] },
            { fields: ['status'] },
            { fields: ['departmentId'] },
            { fields: ['branchId'] },
            { fields: ['status', 'lastMessageAt'] },
            { fields: ['lastMessageAt'] },
            { fields: ['lastIncomingMessageAt'] },
            { fields: ['lastOutgoingMessageAt'] },
            { fields: ['status', 'lastIncomingMessageAt'] }
        ]
    });

    Conversation.associate = (models) => {
        Conversation.belongsTo(models.Customer, {
            foreignKey: 'customerId',
            as: 'customer'
        });
        if (models.Branch) {
            Conversation.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        }
        Conversation.belongsTo(models.Department, {
            foreignKey: 'departmentId',
            as: 'department'
        });
        Conversation.belongsTo(models.User, {
            foreignKey: 'assignedTo',
            as: 'assignee'
        });
        Conversation.hasMany(models.Message, {
            foreignKey: 'conversationId',
            as: 'messages'
        });
        Conversation.belongsToMany(models.Tag, {
            through: 'ConversationTags',
            as: 'tags'
        });
    };

    return Conversation;
};

// ==================== Message Model ====================
const MessageModel = (sequelize) => {
    const Message = sequelize.define('Message', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        conversationId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        customerId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        userId: {
            type: DataTypes.UUID
        },
        whatsappId: {
            type: DataTypes.STRING
        },
        direction: {
            type: DataTypes.ENUM('incoming', 'outgoing'),
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT
        },
        type: {
            type: DataTypes.ENUM('text', 'image', 'video', 'audio', 'document', 'location', 'contact'),
            defaultValue: 'text'
        },
        hasMedia: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        mediaData: {
            type: DataTypes.JSON
        },
        status: {
            type: DataTypes.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
            defaultValue: 'pending'
        },
        isAutoReply: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        metadata: {
            type: DataTypes.JSON,
            defaultValue: {}
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['conversationId'] },
            { fields: ['customerId'] },
            { fields: ['userId'] },
            { fields: ['timestamp'] }
        ]
    });

    Message.associate = (models) => {
        Message.belongsTo(models.Conversation, {
            foreignKey: 'conversationId',
            as: 'conversation'
        });
        Message.belongsTo(models.Customer, {
            foreignKey: 'customerId',
            as: 'customer'
        });
        Message.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
    };

    return Message;
};

// ==================== Department Model ====================
const DepartmentModel = (sequelize) => {
    const Department = sequelize.define('Department', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        branchId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'شعبه‌ای که این دپارتمان به آن تعلق دارد'
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        keywords: {
            type: DataTypes.TEXT,
            comment: 'کلمات کلیدی جدا شده با کاما برای تخصیص خودکار'
        },
        isDefault: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        color: {
            type: DataTypes.STRING,
            defaultValue: '#3498db'
        },
        settings: {
            type: DataTypes.JSON,
            defaultValue: {}
        }
    }, {
        timestamps: true
    });

    Department.associate = (models) => {
        if (models.Branch) {
            Department.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        }
        Department.hasMany(models.User, {
            foreignKey: 'departmentId',
            as: 'users'
        });
        Department.hasMany(models.Conversation, {
            foreignKey: 'departmentId',
            as: 'conversations'
        });
    };

    return Department;
};

// ==================== AutoResponse Model ====================
const AutoResponseModel = (sequelize) => {
    const AutoResponse = sequelize.define('AutoResponse', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        keywords: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'کلمات کلیدی جدا شده با کاما'
        },
        response: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        priority: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        conditions: {
            type: DataTypes.JSON,
            defaultValue: {}
        }
    }, {
        timestamps: true
    });

    return AutoResponse;
};

// ==================== Template Model ====================
const TemplateModel = (sequelize) => {
    const Template = sequelize.define('Template', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        category: {
            type: DataTypes.STRING
        },
        variables: {
            type: DataTypes.JSON,
            defaultValue: []
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        usageCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    }, {
        timestamps: true
    });

    return Template;
};

// ==================== Tag Model ====================
const TagModel = (sequelize) => {
    const Tag = sequelize.define('Tag', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        color: {
            type: DataTypes.STRING,
            defaultValue: '#95a5a6'
        },
        description: {
            type: DataTypes.TEXT
        }
    }, {
        timestamps: true
    });

    Tag.associate = (models) => {
        Tag.belongsToMany(models.Customer, {
            through: 'CustomerTags',
            as: 'customers'
        });
        Tag.belongsToMany(models.Conversation, {
            through: 'ConversationTags',
            as: 'conversations'
        });
    };

    return Tag;
};

module.exports = {
    Conversation: ConversationModel,
    Message: MessageModel,
    Department: DepartmentModel,
    AutoResponse: AutoResponseModel,
    Template: TemplateModel,
    Tag: TagModel
};
