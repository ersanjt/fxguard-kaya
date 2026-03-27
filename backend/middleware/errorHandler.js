/**
 * Centralized error handler middleware
 * - Sanitizes error details in production
 * - Logs all errors with request context
 * - Handles known error types (Sequelize, JWT, Multer, etc.)
 */
const logger = require('../config/logger');
const { sendAdminSecurityAlert } = require('../services/adminAlertService');

const isDev = process.env.NODE_ENV !== 'production';

function getHttpStatus(err) {
    if (err.status) return err.status;
    if (err.statusCode) return err.statusCode;
    // Sequelize validation errors
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') return 422;
    if (err.name === 'SequelizeForeignKeyConstraintError') return 409;
    if (err.name === 'SequelizeDatabaseError') return 500;
    // JWT errors
    if (err.name === 'JsonWebTokenError') return 401;
    if (err.name === 'TokenExpiredError') return 401;
    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') return 400;
    if (err.code === 'LIMIT_FILE_COUNT') return 400;
    if (err.code === 'LIMIT_UNEXPECTED_FILE') return 400;
    return 500;
}

function getUserMessage(err, status) {
    // Sequelize errors — safe public messages
    if (err.name === 'SequelizeValidationError') {
        const fields = err.errors ? err.errors.map(e => e.path).filter(Boolean).join(', ') : '';
        return fields ? `اعتبارسنجی ناموفق: ${fields}` : 'داده‌های ورودی نامعتبر است';
    }
    if (err.name === 'SequelizeUniqueConstraintError') return 'این مقدار قبلاً ثبت شده است';
    if (err.name === 'SequelizeForeignKeyConstraintError') return 'رکورد مرجع یافت نشد یا قابل حذف نیست';
    if (err.name === 'SequelizeDatabaseError') return 'خطای پایگاه داده';
    // JWT errors
    if (err.name === 'JsonWebTokenError') return 'توکن نامعتبر است';
    if (err.name === 'TokenExpiredError') return 'توکن منقضی شده است. دوباره وارد شوید.';
    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') return 'حجم فایل بیش از حد مجاز است';
    if (err.code === 'LIMIT_FILE_COUNT') return 'تعداد فایل‌ها بیش از حد مجاز است';
    if (err.code === 'LIMIT_UNEXPECTED_FILE') return 'فیلد فایل نامعتبر است';
    // Client errors (4xx) — pass through the message
    if (status >= 400 && status < 500 && err.message) return err.message;
    // Server errors — generic message in production
    return isDev ? (err.message || 'خطای داخلی سرور') : 'خطای داخلی سرور';
}

function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);

    const status = getHttpStatus(err);
    const message = getUserMessage(err, status);

    logger.error('Request error', {
        requestId: req.id,
        method: req.method,
        path: req.path,
        status,
        errorName: err.name,
        errorMessage: err.message,
        ...(isDev && { stack: err.stack })
    });

    if (status >= 500) {
        setImmediate(async () => {
            try {
                await sendAdminSecurityAlert('backend_error', {
                    userEmail: req.user && req.user.email ? req.user.email : null,
                    ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim(),
                    userAgent: (req.get && req.get('user-agent')) || null,
                    path: req.originalUrl || req.path,
                    errorMessage: err.message || 'Internal server error'
                });
            } catch (_) {}
        });
    }

    res.status(status).json({
        error: message,
        requestId: req.id,
        ...(isDev && status >= 500 && { debug: err.message })
    });
}

module.exports = errorHandler;
