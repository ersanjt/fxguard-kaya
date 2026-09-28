/**
 * Kaya CRM — پزشک / متخصص کلینیک
 * @file    backend/models/ClinicDoctor.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ClinicDoctor = sequelize.define(
        'ClinicDoctor',
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            tenantId: { type: DataTypes.UUID, allowNull: true },
            userId: {
                type: DataTypes.UUID,
                allowNull: true,
                comment: 'کاربر پنل متناظر (اختیاری)',
            },
            name: { type: DataTypes.STRING(120), allowNull: false },
            specialty: { type: DataTypes.STRING(120), allowNull: true },
            phone: { type: DataTypes.STRING(40), allowNull: true },
            email: { type: DataTypes.STRING(160), allowNull: true },
            languages: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: [],
                comment: 'زبان‌های قابل ارائه به بیمار (کد ISO)',
            },
            bio: { type: DataTypes.TEXT, allowNull: true },
            slotMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
            isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        {
            tableName: 'clinic_doctors',
            timestamps: true,
            indexes: [{ fields: ['tenantId'] }, { fields: ['tenantId', 'isActive'] }, { fields: ['userId'] }],
        }
    );

    ClinicDoctor.associate = (models) => {
        ClinicDoctor.belongsTo(models.User, { foreignKey: 'userId', as: 'user', constraints: false });
        ClinicDoctor.hasMany(models.ClinicAppointment, { foreignKey: 'doctorId', as: 'appointments', constraints: false });
    };

    return ClinicDoctor;
};
