const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
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
        const allowed = /\.(pdf|doc|docx|xls|xlsx|txt|zip|rar|png|jpg|jpeg|gif|webp)$/i;
        const name = file.originalname || '';
        if (allowed.test(name)) return cb(null, true);
        cb(null, true);
    }
});

router.post('/', upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'فایلی انتخاب نشده است' });
        const url = '/uploads/' + req.file.filename;
        res.json({ url, name: req.file.originalname || req.file.filename, size: req.file.size });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/multiple', upload.array('files', 5), (req, res) => {
    try {
        if (!req.files || !req.files.length) return res.status(400).json({ error: 'فایلی انتخاب نشده است' });
        const files = req.files.map(f => ({ url: '/uploads/' + f.filename, name: f.originalname || f.filename, size: f.size }));
        res.json({ files });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
