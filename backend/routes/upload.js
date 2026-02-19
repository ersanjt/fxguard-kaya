const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'uploads');
try {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
} catch (e) {
    console.error('Upload dir creation failed:', e.message);
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
    fileFilter: (req, file, cb) => { cb(null, true); }
});

function handleUploadError(err, req, res, next) {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'حجم فایل بیش از ۱۵ مگابایت است' });
    if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'تعداد فایل‌ها بیش از حد مجاز است' });
    res.status(500).json({ error: err.message || 'خطا در آپلود' });
}

router.post('/', upload.single('file'), handleUploadError, (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'فایلی انتخاب نشده است' });
        const url = '/uploads/' + req.file.filename;
        res.json({ url, name: req.file.originalname || req.file.filename, size: req.file.size });
    } catch (err) {
        res.status(500).json({ error: err.message || 'خطا در آپلود' });
    }
});

router.post('/multiple', upload.array('files', 5), handleUploadError, (req, res) => {
    try {
        if (!req.files || !req.files.length) return res.status(400).json({ error: 'فایلی انتخاب نشده است' });
        const files = req.files.map(f => ({ url: '/uploads/' + f.filename, name: f.originalname || f.filename, size: f.size }));
        res.json({ files });
    } catch (err) {
        res.status(500).json({ error: err.message || 'خطا در آپلود' });
    }
});

module.exports = router;
