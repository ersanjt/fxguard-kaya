/**
 * Kaya CRM — پکیج درمانی / توریسم سلامت
 * @file    backend/models/ClinicTreatmentPackage.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ClinicTreatmentPackage = sequelize.define(
        'ClinicTreatmentPackage',
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            tenantId: { type: DataTypes.UUID, allowNull: true },
            name: { type: DataTypes.STRING(160), allowNull: false },
            procedure: { type: DataTypes.STRING(160), allowNull: true, comment: 'عمل/درمان اصلی' },
            description: { type: DataTypes.TEXT, allowNull: true },
            durationDays: { type: DataTypes.INTEGER, allowNull: true },
            price: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
            currency: { type: DataTypes.STRING(3), allowNull: true, comment: 'ISO-4217' },
            includes: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: [],
                comment: 'خدمات همراه: hotel, airport_transfer, interpreter, visa_support, follow_up',
            },
            isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        {
            tableName: 'clinic_treatment_packages',
            timestamps: true,
            indexes: [{ fields: ['tenantId'] }, { fields: ['tenantId', 'isActive'] }],
        }
    );

    ClinicTreatmentPackage.associate = (models) => {
        ClinicTreatmentPackage.hasMany(models.ClinicAppointment, {
            foreignKey: 'packageId',
            as: 'appointments',
            constraints: false,
        });
    };

    return ClinicTreatmentPackage;
};
