/**
 * Kaya CRM — نوبت‌دهی: نوبت / رزرو
 * @file    backend/models/Appointment.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 *
 * فقط CRM نوبت است (نه پروندهٔ پزشکی). فیلدهای اضافی هر صنعت در data (FieldDefinition entity=appointment).
 */
const { DataTypes } = require('sequelize');

const APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'arrived', 'completed', 'cancelled', 'no_show'];
const ACTIVE_STATUSES = ['scheduled', 'confirmed', 'arrived'];

module.exports = (sequelize) => {
    const Appointment = sequelize.define('Appointment', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        tenantId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'سازمان مالک — جداسازی داده در Cloud'
        },
        customerId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'Customers', key: 'id' }
        },
        serviceId: {
            type: DataTypes.UUID,
            allowNull: true
        },
        staffId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'Users', key: 'id' },
            comment: 'کارمند/پزشک/راهنما — برای بررسی تداخل'
        },
        branchId: {
            type: DataTypes.UUID,
            allowNull: true
        },
        conversationId: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'اگر از داخل گفتگو ثبت شده'
        },
        startAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        endAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'scheduled',
            validate: { isIn: [APPOINTMENT_STATUSES] }
        },
        source: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'panel',
            comment: 'panel | whatsapp | web | import'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        data: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: {},
            comment: 'فیلدهای سفارشی نوبت (FieldDefinition entity=appointment)'
        },
        reminderSentAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        confirmedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        cancelledAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        cancelReason: {
            type: DataTypes.STRING(300),
            allowNull: true
        },
        createdBy: {
            type: DataTypes.UUID,
            allowNull: true
        }
    }, {
        tableName: 'appointments',
        timestamps: true,
        indexes: [
            { fields: ['tenantId', 'startAt'] },
            { fields: ['staffId', 'startAt'] },
            { fields: ['customerId', 'startAt'] },
            { fields: ['status'] },
            { fields: ['branchId'] },
            { fields: ['reminderSentAt', 'startAt'] }
        ]
    });

    Appointment.associate = (models) => {
        Appointment.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
        Appointment.belongsTo(models.User, { foreignKey: 'staffId', as: 'staff' });
        Appointment.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
        if (models.BookableService) Appointment.belongsTo(models.BookableService, { foreignKey: 'serviceId', as: 'service' });
        if (models.Branch) Appointment.belongsTo(models.Branch, { foreignKey: 'branchId', as: 'branch' });
        if (models.Conversation) Appointment.belongsTo(models.Conversation, { foreignKey: 'conversationId', as: 'conversation' });
    };

    Appointment.STATUSES = APPOINTMENT_STATUSES;
    Appointment.ACTIVE_STATUSES = ACTIVE_STATUSES;
    return Appointment;
};

module.exports.APPOINTMENT_STATUSES = APPOINTMENT_STATUSES;
module.exports.ACTIVE_STATUSES = ACTIVE_STATUSES;
