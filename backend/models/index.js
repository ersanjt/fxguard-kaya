const { Sequelize } = require('sequelize');
const config = require('../config/database');

const dev = config.development;
const isSqlite = dev.dialect === 'sqlite';
const databaseUrl = process.env.DATABASE_URL;

const sequelize = isSqlite
    ? new Sequelize({ storage: dev.storage, dialect: 'sqlite', logging: false })
    : databaseUrl
        ? new Sequelize(databaseUrl, { dialect: 'postgres', logging: false, pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }, dialectOptions: databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://') ? { ssl: process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false } : {} })
        : new Sequelize(
            process.env.DB_NAME || dev.database,
            process.env.DB_USER || dev.username,
            process.env.DB_PASSWORD || dev.password,
            {
                host: process.env.DB_HOST || dev.host,
                dialect: 'postgres',
                logging: false,
                pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
            }
        );

const convModels = require('./Conversation');
const models = {
    Branch: require('./Branch')(sequelize),
    ActivityLog: require('./ActivityLog')(sequelize),
    User: require('./User')(sequelize),
    Customer: require('./Customer')(sequelize),
    Department: convModels.Department(sequelize),
    Conversation: convModels.Conversation(sequelize),
    Message: convModels.Message(sequelize),
    AutoResponse: convModels.AutoResponse(sequelize),
    Template: convModels.Template(sequelize),
    Tag: convModels.Tag(sequelize),
    Ticket: require('./Ticket')(sequelize),
    TicketReply: require('./TicketReply')(sequelize),
    Announcement: require('./Announcement')(sequelize),
    AnnouncementRead: require('./AnnouncementRead')(sequelize),
    InternalThread: require('./InternalThread')(sequelize),
    InternalThreadParticipant: require('./InternalThreadParticipant')(sequelize),
    InternalMessage: require('./InternalMessage')(sequelize),
    Task: require('./Task')(sequelize),
    TaskUpdate: require('./TaskUpdate')(sequelize),
    RateAdjustment: require('./RateAdjustment')(sequelize),
    ProcessTemplate: require('./ProcessTemplate')(sequelize),
    ProcessInstance: require('./ProcessInstance')(sequelize),
    ProcessInstanceStep: require('./ProcessInstanceStep')(sequelize),
    ExchangeService: require('./ExchangeService')(sequelize),
    CustomerNote: require('./CustomerNote')(sequelize)
};

// تعریف روابط
Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
        models[modelName].associate(models);
    }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
