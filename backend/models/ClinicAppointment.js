/**
 * Kaya CRM — نوبت بیمار نزد پزشک
 * @file    backend/models/ClinicAppointment.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { DataTypes } = require('sequelize');
const { APPOINTMENT_STATUSES } = require('../lib/clinicConstants');

module.exports = (sequelize) => {
    const ClinicAppointment = sequelize.define(
        'ClinicAppointment',
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            tenantId: { type: DataTypes.UUID, allowNull: true },
            patientId: { type: DataTypes.UUID, allowNull: false },
            doctorId: { type: DataTypes.UUID, allowNull: false },
            packageId: { type: DataTypes.UUID, allowNull: true },
            startsAt: { type: DataTypes.DATE, allowNull: false },
            endsAt: { type: DataTypes.DATE, allowNull: false },
            status: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'scheduled',
                validate: { isIn: [APPOINTMENT_STATUSES] },
            },
            reason: { type: DataTypes.STRING(255), allowNull: true },
            notes: { type: DataTypes.TEXT, allowNull: true },
            createdBy: { type: DataTypes.UUID, allowNull: true },
            cancelledAt: { type: DataTypes.DATE, allowNull: true },
        },
        {
            tableName: 'clinic_appointments',
            timestamps: true,
            indexes: [
                { fields: ['tenantId'] },
                { fields: ['tenantId', 'doctorId', 'startsAt'] },
                { fields: ['tenantId', 'patientId'] },
                { fields: ['tenantId', 'status'] },
            ],
        }
    );

    ClinicAppointment.associate = (models) => {
        ClinicAppointment.belongsTo(models.ClinicPatient, { foreignKey: 'patientId', as: 'patient', constraints: false });
        ClinicAppointment.belongsTo(models.ClinicDoctor, { foreignKey: 'doctorId', as: 'doctor', constraints: false });
        ClinicAppointment.belongsTo(models.ClinicTreatmentPackage, {
            foreignKey: 'packageId',
            as: 'package',
            constraints: false,
        });
    };

    return ClinicAppointment;
};
