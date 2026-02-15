const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        username: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: true,
            comment: 'نام کاربری برای ورود (غیر از ایمیل) — یکتا'
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: '',
            comment: 'نام نمایشی (نام + نام خانوادگی)'
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'نام'
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'نام خانوادگی'
        },
        dateOfBirth: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            comment: 'تاریخ تولد'
        },
        email: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false,
            validate: {
                isEmail: true
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('owner', 'admin', 'manager', 'agent', 'supervisor'),
            defaultValue: 'agent'
        },
        branchId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'مالک (owner) معمولاً بدون شعبه = دسترسی به همه'
        },
        departmentId: {
            type: DataTypes.UUID,
            allowNull: true
        },
        phone: {
            type: DataTypes.STRING
        },
        avatar: {
            type: DataTypes.STRING
        },
        status: {
            type: DataTypes.ENUM('online', 'offline', 'busy', 'away'),
            defaultValue: 'offline'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        permissions: {
            type: DataTypes.JSON,
            defaultValue: {}
        },
        lastLoginAt: {
            type: DataTypes.DATE
        },
        totpSecret: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'کلید مخفی Google Authenticator (TOTP)'
        },
        totpEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'احراز هویت دو مرحله‌ای فعال است'
        },
        settings: {
            type: DataTypes.JSON,
            defaultValue: {
                notifications: true,
                soundAlerts: true,
                autoAssign: true
            }
        }
    }, {
        timestamps: true,
        hooks: {
            beforeCreate: async (user) => {
                if (user.password) {
                    user.password = await bcrypt.hash(user.password, 10);
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    user.password = await bcrypt.hash(user.password, 10);
                }
            }
        }
    });

    User.prototype.comparePassword = async function(password) {
        return bcrypt.compare(password, this.password);
    };

    User.associate = (models) => {
        if (models.Branch) {
            User.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        }
        User.belongsTo(models.Department, {
            foreignKey: 'departmentId',
            as: 'department'
        });
        User.hasMany(models.Conversation, {
            foreignKey: 'assignedTo',
            as: 'conversations'
        });
        User.hasMany(models.Message, {
            foreignKey: 'userId',
            as: 'messages'
        });
        User.hasMany(models.ActivityLog, { foreignKey: 'userId', as: 'activities' });
        if (models.Announcement) User.hasMany(models.Announcement, { foreignKey: 'fromUserId', as: 'sentAnnouncements' });
        if (models.AnnouncementRead) User.hasMany(models.AnnouncementRead, { foreignKey: 'userId', as: 'announcementReads' });
        if (models.TicketReply) User.hasMany(models.TicketReply, { foreignKey: 'userId', as: 'ticketReplies' });
        if (models.InternalThread) User.belongsToMany(models.InternalThread, { through: models.InternalThreadParticipant, foreignKey: 'userId', otherKey: 'threadId', as: 'internalThreads' });
        if (models.InternalMessage) User.hasMany(models.InternalMessage, { foreignKey: 'fromUserId', as: 'internalMessages' });
    };

    return User;
};
