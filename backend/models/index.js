const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const cfg = config[env] || config.development;
const isSqlite = cfg.dialect === 'sqlite';
const databaseUrl = process.env.DATABASE_URL;

// SSL options: rejectUnauthorized defaults to true in production
const sslEnabled = process.env.DATABASE_SSL !== 'false';
const sslRejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';
const sslOptions = sslEnabled ? { ssl: { require: true, rejectUnauthorized: sslRejectUnauthorized } } : {};

const sequelize = isSqlite
    ? new Sequelize({ storage: cfg.storage, dialect: 'sqlite', logging: false })
    : databaseUrl
        ? new Sequelize(databaseUrl, {
            dialect: 'postgres',
            logging: false,
            pool: { max: parseInt(process.env.DB_POOL_MAX) || 10, min: 0, acquire: 30000, idle: 10000 },
            dialectOptions: (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) ? sslOptions : {}
          })
        : new Sequelize(
            process.env.DB_NAME || cfg.database,
            process.env.DB_USER || cfg.username,
            process.env.DB_PASSWORD || cfg.password,
            {
                host: process.env.DB_HOST || cfg.host,
                port: process.env.DB_PORT || cfg.port || 5432,
                dialect: 'postgres',
                logging: false,
                pool: cfg.pool || { max: 10, min: 0, acquire: 30000, idle: 10000 },
                dialectOptions: cfg.dialectOptions || {}
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
    FileTemplate: require('./FileTemplate')(sequelize),
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
    RateCurrency: require('./RateCurrency')(sequelize),
    TickerConfig: require('./TickerConfig')(sequelize),
    WhatsappConfig: require('./WhatsappConfig')(sequelize),
    ProcessTemplate: require('./ProcessTemplate')(sequelize),
    ProcessInstance: require('./ProcessInstance')(sequelize),
    ProcessInstanceStep: require('./ProcessInstanceStep')(sequelize),
    ExchangeService: require('./ExchangeService')(sequelize),
    CustomerNote: require('./CustomerNote')(sequelize),
    CustomerDocument: require('./CustomerDocument')(sequelize),
    CashBox: require('./CashBox')(sequelize),
    BankAccount: require('./BankAccount')(sequelize),
    Transaction: require('./Transaction')(sequelize),
    PanelSetting: require('./PanelSetting')(sequelize),
    PasswordResetToken: require('./PasswordResetToken')(sequelize),
    CompanyEmail: require('./CompanyEmail')(sequelize),
    Attendance: require('./Attendance')(sequelize),
    NotificationPreference: require('./NotificationPreference')(sequelize)
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
