/**
 * ورود مخاطبین از فایل Excel
 * ستون‌های مورد انتظار: name, phone, email (اختیاری)
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { Customer } = require('../models');
const { getAccessibleCustomerIds } = require('../lib/customerAccess');
const { normalizePhone } = require('../lib/phoneUtils');
const { logActivity } = require('../services/activityLog');

const uploadDir = path.join(__dirname, '..', 'uploads', 'import');
try { if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) {}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, 'import-' + Date.now() + '-' + (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

async function parseExcelBuffer(buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];
    const rows = [];
    sheet.eachRow((row) => {
        rows.push(row.values.slice(1)); // values[0] is undefined in exceljs
    });
    if (rows.length < 2) return [];
    const headers = (rows[0] || []).map(h => String(h || '').toLowerCase().trim());
    const nameIdx = headers.findIndex(h => h === 'name' || h === 'نام');
    const phoneIdx = headers.findIndex(h => h === 'phone' || h === 'tel' || h === 'شماره' || h === 'mobile');
    const emailIdx = headers.findIndex(h => h === 'email' || h === 'ایمیل');
    if (nameIdx < 0 && phoneIdx < 0) return [];
    const result = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const name = (row[nameIdx] != null ? String(row[nameIdx]).trim() : '') || (row[0] != null ? String(row[0]).trim() : '');
        const phone = (row[phoneIdx] != null ? String(row[phoneIdx]).trim() : '') || (row[1] != null ? String(row[1]).trim() : '');
        const email = emailIdx >= 0 && row[emailIdx] != null ? String(row[emailIdx]).trim() : '';
        if (phone) result.push({ name: name || 'مشتری', phone, email });
    }
    return result;
}

router.post('/upload', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        if (!req.file) return res.status(400).json({ error: 'فایلی انتخاب نشده است' });
        const buffer = fs.readFileSync(req.file.path);
        const rows = await parseExcelBuffer(buffer);
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        if (rows.length === 0) return res.status(400).json({ error: 'هیچ ردیف معتبری در فایل یافت نشد. ستون‌های name و phone الزامی‌اند.' });
        res.json({ rows, total: rows.length });
    } catch (err) {
        next(err);
    }
});

router.post('/import', async (req, res, next) => {
    try {
        if (!req.canAccess('customers')) return res.status(403).json({ error: 'دسترسی به بخش مشتریان ندارید' });
        const { rows } = req.body;
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: 'داده‌ای برای ورود وجود ندارد' });
        }
        if (rows.length > 2000) {
            return res.status(400).json({ error: 'حداکثر ۲۰۰۰ ردیف در هر بار ورود مجاز است' });
        }
        const accessibleIds = await getAccessibleCustomerIds(req);
        let created = 0, updated = 0, skipped = 0;
        for (const r of rows) {
            const phone = normalizePhone(r.phone) || r.phone;
            if (!phone) { skipped++; continue; }
            const existing = await Customer.findOne({ where: { phone } });
            if (existing) {
                if (accessibleIds && !accessibleIds.includes(existing.id)) { skipped++; continue; }
                await existing.update({
                    name: r.name || existing.name,
                    email: r.email || existing.email || null
                });
                updated++;
            } else {
                await Customer.create({
                    phone,
                    name: r.name || 'مشتری',
                    email: r.email || null,
                    status: 'active',
                    source: 'import'
                });
                created++;
            }
        }
        await logActivity({
            userId: req.userId,
            branchId: req.user.branchId,
            departmentId: req.user.departmentId,
            action: 'customers_imported',
            summary: `ورود از Excel: ${created} ایجاد، ${updated} بروزرسانی، ${skipped} رد شد`,
            metadata: { created, updated, skipped }
        });
        res.json({ ok: true, created, updated, skipped });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
