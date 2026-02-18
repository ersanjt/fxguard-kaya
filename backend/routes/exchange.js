const express = require('express');
const router = express.Router();
const { CashBox, BankAccount, Transaction, Branch, User, Customer } = require('../models');
const { Op } = require('sequelize');
const { literal } = require('sequelize');

function requireServices(req, res, next) {
    if (!req.canAccess('services')) return res.status(403).json({ error: 'دسترسی به بخش خدمات صرافی ندارید' });
    next();
}

// ========== Cash Boxes (صندوق‌ها) ==========
router.get('/cash-boxes', requireServices, async (req, res) => {
    try {
        const where = {};
        if (req.query.branchId) where.branchId = req.query.branchId;
        const list = await CashBox.findAll({
            where,
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
            order: [['sortOrder', 'ASC'], ['name', 'ASC']]
        });
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/cash-boxes', requireServices, async (req, res) => {
    try {
        const { name, branchId, currency, balance, description, isActive } = req.body;
        const item = await CashBox.create({
            name: name || 'صندوق جدید',
            branchId: branchId || null,
            currency: currency || 'IRR',
            balance: parseFloat(balance) || 0,
            description: description || null,
            isActive: isActive !== false
        });
        res.status(201).json(item);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/cash-boxes/:id', requireServices, async (req, res) => {
    try {
        const item = await CashBox.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'صندوق یافت نشد' });
        const { name, branchId, currency, balance, description, isActive } = req.body;
        if (name !== undefined) item.name = name;
        if (branchId !== undefined) item.branchId = branchId || null;
        if (currency !== undefined) item.currency = currency;
        if (balance !== undefined) item.balance = parseFloat(balance);
        if (description !== undefined) item.description = description;
        if (isActive !== undefined) item.isActive = isActive;
        await item.save();
        res.json(item);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/cash-boxes/:id', requireServices, async (req, res) => {
    try {
        const item = await CashBox.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'صندوق یافت نشد' });
        await item.destroy();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ========== Bank Accounts (حساب‌های بانکی) ==========
router.get('/bank-accounts', requireServices, async (req, res) => {
    try {
        const where = {};
        if (req.query.branchId) where.branchId = req.query.branchId;
        const list = await BankAccount.findAll({
            where,
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
            order: [['sortOrder', 'ASC'], ['name', 'ASC']]
        });
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/bank-accounts', requireServices, async (req, res) => {
    try {
        const { name, bankName, accountNumber, iban, branchId, currency, balance, description, isActive } = req.body;
        const item = await BankAccount.create({
            name: name || 'حساب جدید',
            bankName: bankName || null,
            accountNumber: accountNumber || null,
            iban: iban || null,
            branchId: branchId || null,
            currency: currency || 'IRR',
            balance: parseFloat(balance) || 0,
            description: description || null,
            isActive: isActive !== false
        });
        res.status(201).json(item);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/bank-accounts/:id', requireServices, async (req, res) => {
    try {
        const item = await BankAccount.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'حساب بانکی یافت نشد' });
        const { name, bankName, accountNumber, iban, branchId, currency, balance, description, isActive } = req.body;
        if (name !== undefined) item.name = name;
        if (bankName !== undefined) item.bankName = bankName;
        if (accountNumber !== undefined) item.accountNumber = accountNumber;
        if (iban !== undefined) item.iban = iban;
        if (branchId !== undefined) item.branchId = branchId || null;
        if (currency !== undefined) item.currency = currency;
        if (balance !== undefined) item.balance = parseFloat(balance);
        if (description !== undefined) item.description = description;
        if (isActive !== undefined) item.isActive = isActive;
        await item.save();
        res.json(item);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/bank-accounts/:id', requireServices, async (req, res) => {
    try {
        const item = await BankAccount.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'حساب بانکی یافت نشد' });
        await item.destroy();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ========== Transactions (تراکنش‌ها) ==========
router.get('/transactions', requireServices, async (req, res) => {
    try {
        const where = {};
        if (req.query.branchId) where.branchId = req.query.branchId;
        if (req.query.type) where.type = req.query.type;
        if (req.query.fromDate || req.query.toDate) {
            where.transactionDate = {};
            if (req.query.fromDate) where.transactionDate[Op.gte] = req.query.fromDate;
            if (req.query.toDate) where.transactionDate[Op.lte] = req.query.toDate;
        }
        if (req.query.cashBoxId) {
            where[Op.or] = [
                { fromCashBoxId: req.query.cashBoxId },
                { toCashBoxId: req.query.cashBoxId }
            ];
        }
        if (req.query.bankAccountId) {
            where[Op.or] = [
                { fromBankAccountId: req.query.bankAccountId },
                { toBankAccountId: req.query.bankAccountId }
            ];
        }
        if (req.query.customerId) where.customerId = req.query.customerId;
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const offset = parseInt(req.query.offset) || 0;
        const list = await Transaction.findAndCountAll({
            where,
            include: [
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
                { model: User, as: 'user', attributes: ['id', 'fullName'] },
                { model: CashBox, as: 'fromCashBox', attributes: ['id', 'name'] },
                { model: CashBox, as: 'toCashBox', attributes: ['id', 'name'] },
                { model: BankAccount, as: 'fromBankAccount', attributes: ['id', 'name', 'bankName'] },
                { model: BankAccount, as: 'toBankAccount', attributes: ['id', 'name', 'bankName'] },
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'], required: false }
            ],
            order: [['transactionDate', 'DESC'], ['createdAt', 'DESC']],
            limit,
            offset
        });
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// تابع به‌روزرسانی موجودی (فقط هنگام تایید)
async function applyTransactionBalance(tx) {
    const updateBalance = async (Model, id, delta) => {
        if (!id) return;
        const item = await Model.findByPk(id);
        if (item) {
            item.balance = parseFloat(item.balance) + delta;
            await item.save();
        }
    };
    const amt = parseFloat(tx.amount);
    const type = tx.type;
    switch (type) {
        case 'cash_in':
            await updateBalance(CashBox, tx.toCashBoxId, amt);
            break;
        case 'cash_out':
            await updateBalance(CashBox, tx.fromCashBoxId, -amt);
            break;
        case 'transfer_box':
            await updateBalance(CashBox, tx.fromCashBoxId, -amt);
            await updateBalance(CashBox, tx.toCashBoxId, amt);
            break;
        case 'bank_deposit':
            await updateBalance(CashBox, tx.fromCashBoxId, -amt);
            await updateBalance(BankAccount, tx.toBankAccountId, amt);
            break;
        case 'bank_withdraw':
            await updateBalance(BankAccount, tx.fromBankAccountId, -amt);
            await updateBalance(CashBox, tx.toCashBoxId, amt);
            break;
        case 'transfer_account':
            await updateBalance(BankAccount, tx.fromBankAccountId, -amt);
            await updateBalance(BankAccount, tx.toBankAccountId, amt);
            break;
        case 'income':
            await updateBalance(CashBox, tx.toCashBoxId, amt);
            break;
        case 'expense':
            await updateBalance(CashBox, tx.fromCashBoxId, -amt);
            break;
    }
}

router.post('/transactions', requireServices, async (req, res) => {
    try {
        const {
            type, amount, currency,
            fromCashBoxId, toCashBoxId, fromBankAccountId, toBankAccountId,
            description, reference, transactionDate, branchId, customerId
        } = req.body;
        const amt = parseFloat(amount);
        if (!type || isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'نوع و مبلغ معتبر الزامی است' });

        const tx = await Transaction.create({
            type,
            amount: amt,
            currency: currency || 'IRR',
            fromCashBoxId: fromCashBoxId || null,
            toCashBoxId: toCashBoxId || null,
            fromBankAccountId: fromBankAccountId || null,
            toBankAccountId: toBankAccountId || null,
            description: description || null,
            reference: reference || null,
            transactionDate: transactionDate || new Date().toISOString().slice(0, 10),
            branchId: branchId || null,
            userId: req.user?.id || null,
            customerId: customerId || null,
            status: 'pending'
        });
        res.status(201).json(tx);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/transactions/:id', requireServices, async (req, res) => {
    try {
        const tx = await Transaction.findByPk(req.params.id);
        if (!tx) return res.status(404).json({ error: 'تراکنش یافت نشد' });
        const { description, reference, transactionDate, customerId, type, amount, currency, fromCashBoxId, toCashBoxId, fromBankAccountId, toBankAccountId } = req.body;
        const isApproved = (tx.status || 'approved') === 'approved';
        if (isApproved) {
            if (type !== undefined || amount !== undefined || fromCashBoxId !== undefined || toCashBoxId !== undefined || fromBankAccountId !== undefined || toBankAccountId !== undefined || currency !== undefined) {
                return res.status(400).json({ error: 'تراکنش تاییدشده فقط شرح، مرجع و تاریخ قابل ویرایش است' });
            }
            if (description !== undefined) tx.description = description;
            if (reference !== undefined) tx.reference = reference;
            if (transactionDate !== undefined) tx.transactionDate = transactionDate;
            if (customerId !== undefined) tx.customerId = customerId || null;
        } else {
            if (description !== undefined) tx.description = description;
            if (reference !== undefined) tx.reference = reference;
            if (transactionDate !== undefined) tx.transactionDate = transactionDate;
            if (customerId !== undefined) tx.customerId = customerId || null;
            if (type !== undefined) tx.type = type;
            if (amount !== undefined) tx.amount = parseFloat(amount);
            if (currency !== undefined) tx.currency = currency;
            if (fromCashBoxId !== undefined) tx.fromCashBoxId = fromCashBoxId || null;
            if (toCashBoxId !== undefined) tx.toCashBoxId = toCashBoxId || null;
            if (fromBankAccountId !== undefined) tx.fromBankAccountId = fromBankAccountId || null;
            if (toBankAccountId !== undefined) tx.toBankAccountId = toBankAccountId || null;
        }
        await tx.save();
        res.json(tx);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/transactions/:id/approve', requireServices, async (req, res) => {
    try {
        const tx = await Transaction.findByPk(req.params.id);
        if (!tx) return res.status(404).json({ error: 'تراکنش یافت نشد' });
        if (tx.status === 'approved') return res.status(400).json({ error: 'این تراکنش قبلاً تایید شده است' });
        if (tx.status === 'rejected') return res.status(400).json({ error: 'تراکنش رد شده قابل تایید نیست' });
        const role = req.user?.role || '';
        if (!['owner', 'admin', 'manager'].includes(role)) return res.status(403).json({ error: 'فقط مدیر، ادمین یا مالک می‌تواند تراکنش را تایید کند' });
        await applyTransactionBalance(tx);
        tx.status = 'approved';
        tx.approvedBy = req.user?.id || null;
        tx.approvedAt = new Date();
        tx.rejectedBy = null;
        tx.rejectedAt = null;
        await tx.save();
        res.json(tx);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/transactions/:id/reject', requireServices, async (req, res) => {
    try {
        const tx = await Transaction.findByPk(req.params.id);
        if (!tx) return res.status(404).json({ error: 'تراکنش یافت نشد' });
        if (tx.status === 'approved') return res.status(400).json({ error: 'تراکنش تاییدشده قابل رد نیست' });
        if (tx.status === 'rejected') return res.status(400).json({ error: 'این تراکنش قبلاً رد شده است' });
        const role = req.user?.role || '';
        if (!['owner', 'admin', 'manager'].includes(role)) return res.status(403).json({ error: 'فقط مدیر، ادمین یا مالک می‌تواند تراکنش را رد کند' });
        tx.status = 'rejected';
        tx.rejectedBy = req.user?.id || null;
        tx.rejectedAt = new Date();
        tx.approvedBy = null;
        tx.approvedAt = null;
        await tx.save();
        res.json(tx);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// خلاصه موجودی‌ها
router.get('/summary', requireServices, async (req, res) => {
    try {
        const [cashBoxes, bankAccounts] = await Promise.all([
            CashBox.findAll({ where: { isActive: true }, include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }] }),
            BankAccount.findAll({ where: { isActive: true }, include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }] })
        ]);
        const totalCash = cashBoxes.reduce((s, b) => s + parseFloat(b.balance || 0), 0);
        const totalBank = bankAccounts.reduce((s, b) => s + parseFloat(b.balance || 0), 0);
        res.json({
            cashBoxes,
            bankAccounts,
            totalCash,
            totalBank,
            total: totalCash + totalBank
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
