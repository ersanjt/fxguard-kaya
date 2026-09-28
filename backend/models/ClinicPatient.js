/**
 * Kaya CRM — پرونده بیمار (قابل اتصال به مشتری/مخاطب واتساپ)
 * @file    backend/models/ClinicPatient.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const { DataTypes } = require('sequelize');
const { PATIENT_GENDERS, PATIENT_SOURCES, BLOOD_TYPES } = require('../lib/clinicConstants');

module.exports = (sequelize) => {
    const ClinicPatient = sequelize.define(
        'ClinicPatient',
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            tenantId: { type: DataTypes.UUID, allowNull: true },
            customerId: {
                type: DataTypes.UUID,
                allowNull: true,
                comment: 'مشتری/مخاطب متناظر — مکالمات واتساپ بیمار',
            },
            fileNumber: {
                type: DataTypes.STRING(20),
                allowNull: false,
                comment: 'شماره پرونده یکتا در هر سازمان (P-000001)',
            },
            fullName: { type: DataTypes.STRING(160), allowNull: false },
            phone: { type: DataTypes.STRING(40), allowNull: true },
            email: { type: DataTypes.STRING(160), allowNull: true },
            gender: { type: DataTypes.STRING(10), allowNull: true, validate: { isIn: [PATIENT_GENDERS] } },
            birthDate: { type: DataTypes.DATEONLY, allowNull: true },
            nationality: { type: DataTypes.STRING(2), allowNull: true, comment: 'کد کشور ISO-3166 alpha-2' },
            passportNumber: { type: DataTypes.STRING(40), allowNull: true },
            bloodType: { type: DataTypes.STRING(3), allowNull: true, validate: { isIn: [BLOOD_TYPES] } },
            allergies: { type: DataTypes.TEXT, allowNull: true },
            medicalNotes: { type: DataTypes.TEXT, allowNull: true },
            source: {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'local',
                validate: { isIn: [PATIENT_SOURCES] },
            },
            isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            createdBy: { type: DataTypes.UUID, allowNull: true },
        },
        {
            tableName: 'clinic_patients',
            timestamps: true,
            indexes: [
                { fields: ['tenantId'] },
                { unique: true, fields: ['tenantId', 'fileNumber'], name: 'uniq_clinic_patients_tenant_file' },
                { unique: true, fields: ['tenantId', 'customerId'], name: 'uniq_clinic_patients_tenant_customer' },
                { fields: ['tenantId', 'fullName'] },
                { fields: ['tenantId', 'phone'] },
            ],
        }
    );

    ClinicPatient.associate = (models) => {
        ClinicPatient.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer', constraints: false });
        ClinicPatient.hasMany(models.ClinicAppointment, { foreignKey: 'patientId', as: 'appointments', constraints: false });
    };

    return ClinicPatient;
};
