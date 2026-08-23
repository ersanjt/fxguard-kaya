/**
 * Kaya CRM — نظرسنجی Sean Ellis تناسب محصول
 * @file    backend/models/ProductFitSurvey.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */

'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProductFitSurvey = sequelize.define(
        'ProductFitSurvey',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            answer: {
                type: DataTypes.ENUM('very', 'somewhat', 'not'),
                allowNull: false,
                comment: 'very = خیلی ناامید می‌شدم اگر محصول ناپدید شود',
            },
        },
        {
            timestamps: true,
            updatedAt: false,
            tableName: 'product_fit_surveys',
            indexes: [{ fields: ['userId', 'createdAt'] }],
        }
    );

    ProductFitSurvey.associate = (models) => {
        ProductFitSurvey.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    };

    return ProductFitSurvey;
};
