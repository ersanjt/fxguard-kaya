/**
 * پیکربندی Logger با Winston
 */
const winston = require('winston');

let DailyRotateFile;
try {
    DailyRotateFile = require('winston-daily-rotate-file');
} catch (_) {}

const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

const logTransports = [new winston.transports.Console()];

if (DailyRotateFile) {
    const logsDir = process.env.LOG_DIR || './logs';
    logTransports.push(new DailyRotateFile({
        filename: `${logsDir}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
    }));
    logTransports.push(new DailyRotateFile({
        filename: `${logsDir}/combined-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '30d',
        zippedArchive: true,
    }));
} else {
    logTransports.push(new winston.transports.File({ filename: 'error.log', level: 'error' }));
    logTransports.push(new winston.transports.File({ filename: 'combined.log' }));
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: logTransports,
});

module.exports = logger;
