/**
 * Kaya CRM — سرنخ فرم تماس لندینگ
 * @file    backend/models/ContactLead.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */

'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ContactLead = sequelize.define(
        'ContactLead',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            purpose: {
                type: DataTypes.STRING(32),
                allowNull: false,
                defaultValue: 'other',
            },
            name: {
                type: DataTypes.STRING(200),
                allowNull: false,
            },
            email: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            phone: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },
            message: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            source: {
                type: DataTypes.STRING(64),
                allowNull: true,
                defaultValue: 'landing',
            },
        },
        {
            timestamps: true,
            updatedAt: false,
            tableName: 'contact_leads',
            indexes: [{ fields: ['purpose', 'createdAt'] }, { fields: ['createdAt'] }],
        }
    );

    return ContactLead;
};
