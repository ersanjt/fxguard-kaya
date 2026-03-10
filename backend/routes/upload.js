const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const logger = require('../config/logger');

const ALLOWED_MIME_TYPES = new Set([
    // تصاویر
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // ویدیو
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
    // صوت
    'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac', 'audio/mp4',
    // اسناد
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    // فشرده
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
]);

const BLOCKED_EXTENSIONS = new Set([
    '.php', '.php3', '.php4', '.php5', '.phtml',
    '.asp', '.aspx', '.jsp', '.jspx',
    '.exe', '.bat', '.cmd', '.sh', '.ps1', '.py', '.rb', '.pl',
    '.js', '.mjs', '.cjs', '.ts',
    '.html', '.htm', '.xhtml', '.xml',
    '.htaccess', '.htpasswd',
]);

const uploadDir = path.join(__dirname, '..', 'uploads');
try {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
} catch (e) {
    logger.error('Upload dir creation failed', { error: e.message });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (e) {
            cb(e);
        }
    },
    filename: (req, file, cb) => {
        const ext = (path.extname(file.originalname) || '').toLowerCase() || '.bin';
        const safe = Date.now() + '-' + (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
        cb(null, safe);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (BLOCKED_EXTENSIONS.has(ext)) {
            return cb(new Error(`نوع فایل مجاز نیست: ${ext}`));
        }
        // MIME type can include codec params like "audio/webm;codecs=opus" — check base type
        const baseMime = (file.mimetype || '').split(';')[0].trim().toLowerCase();
        if (!ALLOWED_MIME_TYPES.has(baseMime) && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
            return cb(new Error(`نوع فایل پشتیبانی نمی‌شود: ${file.mimetype}`));
        }
        cb(null, true);
    }
});

function handleUploadError(err, req, res, next) {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'حجم فایل بیش از ۱۵ مگابایت است' });
    if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'تعداد فایل‌ها بیش از حد مجاز است' });
    next(err);
}

router.post('/', upload.single('file'), handleUploadError, (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'فایلی انتخاب نشده است' });
        const url = '/uploads/' + req.file.filename;
        res.json({ url, name: req.file.originalname || req.file.filename, size: req.file.size });
    } catch (err) {
        next(err);
    }
});

router.post('/multiple', upload.array('files', 5), handleUploadError, (req, res, next) => {
    try {
        if (!req.files || !req.files.length) return res.status(400).json({ error: 'فایلی انتخاب نشده است' });
        const files = req.files.map(f => ({ url: '/uploads/' + f.filename, name: f.originalname || f.filename, size: f.size }));
        res.json({ files });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
