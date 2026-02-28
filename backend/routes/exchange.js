const express = require('express');
const router = express.Router();
const { CashBox, BankAccount, Transaction, Branch, User, Customer, sequelize } = require('../models');
const { Op } = require('sequelize');
const { literal } = require('sequelize');
const { isValidUUID } = require('../lib/validation');
const Decimal = require('decimal.js');

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

function requireServices(req, res, next) {
    if (!req.canAccess('services')) return res.status(403).json({ error: 'دسترسی به بخش خدمات صرافی ندارید' });
    next();
}

function safeDecimal(val, defaultValue = 0) {
    try {
        const n = new Decimal(val == null ? defaultValue : val);
        return n.isNaN() || !n.isFinite() ? new Decimal(defaultValue) : n;
    } catch (_) {
        return new Decimal(defaultValue);
    }
}

function safeParseFloat(val, defaultValue = 0) {
    return safeDecimal(val, defaultValue).toNumber();
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
            balance: safeParseFloat(balance, 0),
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
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const item = await CashBox.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'صندوق یافت نشد' });
        const { name, branchId, currency, balance, description, isActive } = req.body;
        if (name !== undefined) item.name = name;
        if (branchId !== undefined) item.branchId = branchId || null;
        if (currency !== undefined) item.currency = currency;
        if (balance !== undefined) {
            const val = safeParseFloat(balance, null);
            if (val === null) return res.status(400).json({ error: 'مقدار تراز نامعتبر است' });
            item.balance = val;
        }
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
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
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
            balance: safeParseFloat(balance, 0),
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
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const item = await BankAccount.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'حساب بانکی یافت نشد' });
        const { name, bankName, accountNumber, iban, branchId, currency, balance, description, isActive } = req.body;
        if (name !== undefined) item.name = name;
        if (bankName !== undefined) item.bankName = bankName;
        if (accountNumber !== undefined) item.accountNumber = accountNumber;
        if (iban !== undefined) item.iban = iban;
        if (branchId !== undefined) item.branchId = branchId || null;
        if (currency !== undefined) item.currency = currency;
        if (balance !== undefined) {
            const val = safeParseFloat(balance, null);
            if (val === null) return res.status(400).json({ error: 'مقدار تراز نامعتبر است' });
            item.balance = val;
        }
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
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
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
        if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) where.status = req.query.status;
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const offset = parseInt(req.query.offset) || 0;
        const list = await Transaction.findAndCountAll({
            where,
            include: [
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
                { model: User, as: 'user', attributes: ['id', 'name'] },
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

router.get('/transactions/:id', requireServices, async (req, res) => {
    try {
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
        const tx = await Transaction.findByPk(req.params.id, {
            include: [
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
                { model: User, as: 'user', attributes: ['id', 'name'] },
                { model: CashBox, as: 'fromCashBox', attributes: ['id', 'name'] },
                { model: CashBox, as: 'toCashBox', attributes: ['id', 'name'] },
                { model: BankAccount, as: 'fromBankAccount', attributes: ['id', 'name', 'bankName'] },
                { model: BankAccount, as: 'toBankAccount', attributes: ['id', 'name', 'bankName'] },
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'], required: false }
            ]
        });
        if (!tx) return res.status(404).json({ error: 'تراکنش یافت نشد' });
        res.json(tx);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// تابع به‌روزرسانی موجودی (فقط هنگام تایید) — همه عملیات در یک transaction انجام می‌شود
async function applyTransactionBalance(tx) {
    const t = await sequelize.transaction();
    try {
        const updateBalance = async (Model, id, delta) => {
            if (!id) return;
            const item = await Model.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
            if (item) {
                item.balance = safeDecimal(item.balance).plus(delta).toNumber();
                await item.save({ transaction: t });
            }
        };
        const amt = safeDecimal(tx.amount);
        const type = tx.type;
        const pos = amt.toNumber();
        const neg = amt.negated().toNumber();
        switch (type) {
            case 'cash_in':
                await updateBalance(CashBox, tx.toCashBoxId, pos);
                break;
            case 'cash_out':
                await updateBalance(CashBox, tx.fromCashBoxId, neg);
                break;
            case 'transfer_box':
                await updateBalance(CashBox, tx.fromCashBoxId, neg);
                await updateBalance(CashBox, tx.toCashBoxId, pos);
                break;
            case 'bank_deposit':
                await updateBalance(CashBox, tx.fromCashBoxId, neg);
                await updateBalance(BankAccount, tx.toBankAccountId, pos);
                break;
            case 'bank_withdraw':
                await updateBalance(BankAccount, tx.fromBankAccountId, neg);
                await updateBalance(CashBox, tx.toCashBoxId, pos);
                break;
            case 'transfer_account':
                await updateBalance(BankAccount, tx.fromBankAccountId, neg);
                await updateBalance(BankAccount, tx.toBankAccountId, pos);
                break;
            case 'income':
                await updateBalance(CashBox, tx.toCashBoxId, pos);
                break;
            case 'expense':
                await updateBalance(CashBox, tx.fromCashBoxId, neg);
                break;
            case 'buy':
                await updateBalance(CashBox, tx.fromCashBoxId, neg);
                break;
            case 'sell':
                await updateBalance(CashBox, tx.toCashBoxId, pos);
                break;
        }
        await t.commit();
    } catch (err) {
        await t.rollback();
        throw err;
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
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
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
            if (amount !== undefined) {
                const val = safeParseFloat(amount, null);
                if (val === null || val <= 0) return res.status(400).json({ error: 'مبلغ تراکنش باید عدد مثبت باشد' });
                tx.amount = val;
            }
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
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
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
        if (!isValidUUID(req.params.id)) return res.status(400).json({ error: 'شناسه نامعتبر است' });
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
        const totalCash = cashBoxes.reduce((s, b) => s.plus(safeDecimal(b.balance)), new Decimal(0)).toNumber();
        const totalBank = bankAccounts.reduce((s, b) => s.plus(safeDecimal(b.balance)), new Decimal(0)).toNumber();
        res.json({
            cashBoxes,
            bankAccounts,
            totalCash,
            totalBank,
            total: new Decimal(totalCash).plus(totalBank).toNumber()
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ========== صورت حساب — Statement of Account ==========
router.get('/statement', requireServices, async (req, res) => {
    try {
        const where = { status: 'approved' };
        if (req.query.customerId) where.customerId = req.query.customerId;
        if (req.query.type) where.type = req.query.type;
        if (req.query.currency) where.currency = req.query.currency;
        if (req.query.fromDate || req.query.toDate) {
            where.transactionDate = {};
            if (req.query.fromDate) where.transactionDate[Op.gte] = req.query.fromDate;
            if (req.query.toDate) where.transactionDate[Op.lte] = req.query.toDate;
        }
        if (req.query.narration) {
            where.description = { [Op.like]: '%' + req.query.narration + '%' };
        }
        if (req.query.amount) {
            where.amount = parseFloat(req.query.amount);
        }
        if (req.query.debitCredit === 'debit') {
            where.type = { [Op.in]: ['cash_out', 'bank_withdraw', 'expense', 'buy', 'transfer_box', 'bank_deposit', 'transfer_account'] };
        } else if (req.query.debitCredit === 'credit') {
            where.type = { [Op.in]: ['cash_in', 'bank_deposit', 'income', 'sell', 'transfer_box', 'bank_withdraw', 'transfer_account'] };
        }
        if (req.query.userId) where.userId = req.query.userId;
        if (req.query.branchId) where.branchId = req.query.branchId;
        if (req.query.cashBoxId) {
            where[Op.or] = where[Op.or] || [];
            where[Op.or].push({ fromCashBoxId: req.query.cashBoxId }, { toCashBoxId: req.query.cashBoxId });
        }
        if (req.query.bankAccountId) {
            where[Op.or] = where[Op.or] || [];
            where[Op.or].push({ fromBankAccountId: req.query.bankAccountId }, { toBankAccountId: req.query.bankAccountId });
        }

        const rows = await Transaction.findAll({
            where,
            include: [
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
                { model: User, as: 'user', attributes: ['id', 'name'] },
                { model: CashBox, as: 'fromCashBox', attributes: ['id', 'name'] },
                { model: CashBox, as: 'toCashBox', attributes: ['id', 'name'] },
                { model: BankAccount, as: 'fromBankAccount', attributes: ['id', 'name', 'bankName'] },
                { model: BankAccount, as: 'toBankAccount', attributes: ['id', 'name', 'bankName'] },
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'], required: false }
            ],
            order: [['transactionDate', 'ASC'], ['createdAt', 'ASC']],
            limit: 1000
        });

        const groupByCurrency = req.query.groupByCurrency === 'true';
        const debitTypes = ['cash_out', 'bank_withdraw', 'expense', 'buy'];
        const creditTypes = ['cash_in', 'bank_deposit', 'income', 'sell'];

        const classifyTx = (tx) => {
            const type = tx.type;
            if (debitTypes.includes(type)) return 'debit';
            if (creditTypes.includes(type)) return 'credit';
            if (type === 'transfer_box' || type === 'transfer_account') return 'debit';
            return 'debit';
        };

        const typeLabels = {
            cash_in: 'CI', cash_out: 'CO', transfer_box: 'TRF',
            bank_deposit: 'BD', bank_withdraw: 'BW', transfer_account: 'TRA',
            income: 'INC', expense: 'EXP', buy: 'BUY', sell: 'SELL'
        };

        let statement;
        if (groupByCurrency) {
            const byCurrency = {};
            rows.forEach(tx => {
                const curr = tx.currency || 'IRR';
                if (!byCurrency[curr]) byCurrency[curr] = [];
                byCurrency[curr].push(tx);
            });
            statement = {};
            for (const [curr, txs] of Object.entries(byCurrency)) {
                let runningBalance = new Decimal(0);
                const items = txs.map(tx => {
                    const side = classifyTx(tx);
                    const amt = safeDecimal(tx.amount);
                    const debit = side === 'debit' ? amt.toNumber() : 0;
                    const credit = side === 'credit' ? amt.toNumber() : 0;
                    runningBalance = runningBalance.plus(credit).minus(debit);
                    const bal = runningBalance.toNumber();
                    return {
                        id: tx.id,
                        date: tx.transactionDate,
                        type: typeLabels[tx.type] || tx.type,
                        typeRaw: tx.type,
                        number: tx.reference || '',
                        narration: tx.description || '',
                        currency: curr,
                        debit,
                        credit,
                        balance: bal,
                        sign: bal >= 0 ? 'Cr' : 'Dr',
                        customer: tx.customer,
                        user: tx.user,
                        fromCashBox: tx.fromCashBox,
                        toCashBox: tx.toCashBox,
                        fromBankAccount: tx.fromBankAccount,
                        toBankAccount: tx.toBankAccount,
                        metadata: tx.metadata
                    };
                });
                const totalDebit = items.reduce((s, i) => new Decimal(s).plus(i.debit).toNumber(), 0);
                const totalCredit = items.reduce((s, i) => new Decimal(s).plus(i.credit).toNumber(), 0);
                const balCF = runningBalance.toNumber();
                statement[curr] = {
                    items,
                    totalDebit,
                    totalCredit,
                    balanceCF: balCF,
                    balanceCFSign: balCF >= 0 ? 'Cr' : 'Dr'
                };
            }
        } else {
            let runningBalance = new Decimal(0);
            const items = rows.map(tx => {
                const side = classifyTx(tx);
                const amt = safeDecimal(tx.amount);
                const debit = side === 'debit' ? amt.toNumber() : 0;
                const credit = side === 'credit' ? amt.toNumber() : 0;
                runningBalance = runningBalance.plus(credit).minus(debit);
                const bal = runningBalance.toNumber();
                return {
                    id: tx.id,
                    date: tx.transactionDate,
                    type: typeLabels[tx.type] || tx.type,
                    typeRaw: tx.type,
                    number: tx.reference || '',
                    narration: tx.description || '',
                    currency: tx.currency || 'IRR',
                    debit,
                    credit,
                    balance: bal,
                    sign: bal >= 0 ? 'Cr' : 'Dr',
                    customer: tx.customer,
                    user: tx.user,
                    fromCashBox: tx.fromCashBox,
                    toCashBox: tx.toCashBox,
                    fromBankAccount: tx.fromBankAccount,
                    toBankAccount: tx.toBankAccount,
                    metadata: tx.metadata
                };
            });
            const totalDebit = items.reduce((s, i) => new Decimal(s).plus(i.debit).toNumber(), 0);
            const totalCredit = items.reduce((s, i) => new Decimal(s).plus(i.credit).toNumber(), 0);
            const balCF = runningBalance.toNumber();
            statement = {
                items,
                totalDebit,
                totalCredit,
                balanceCF: balCF,
                balanceCFSign: balCF >= 0 ? 'Cr' : 'Dr'
            };
        }

        res.json({
            grouped: groupByCurrency,
            customerName: rows.length > 0 && rows[0].customer ? rows[0].customer.name : null,
            statement
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ========== Currency Position — وضعیت ارزی ==========
router.get('/currency-position', requireServices, async (req, res) => {
    try {
        const [cashBoxes, bankAccounts] = await Promise.all([
            CashBox.findAll({ where: { isActive: true }, include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }] }),
            BankAccount.findAll({ where: { isActive: true }, include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }] })
        ]);

        const currencyTotalsDec = {};
        cashBoxes.forEach(cb => {
            const c = cb.currency || 'IRR';
            if (!currencyTotalsDec[c]) currencyTotalsDec[c] = { cashBoxes: new Decimal(0), bankAccounts: new Decimal(0) };
            currencyTotalsDec[c].cashBoxes = currencyTotalsDec[c].cashBoxes.plus(safeDecimal(cb.balance));
        });
        bankAccounts.forEach(ba => {
            const c = ba.currency || 'IRR';
            if (!currencyTotalsDec[c]) currencyTotalsDec[c] = { cashBoxes: new Decimal(0), bankAccounts: new Decimal(0) };
            currencyTotalsDec[c].bankAccounts = currencyTotalsDec[c].bankAccounts.plus(safeDecimal(ba.balance));
        });
        const currencyTotals = {};
        for (const [c, v] of Object.entries(currencyTotalsDec)) {
            const total = v.cashBoxes.plus(v.bankAccounts).toNumber();
            currencyTotals[c] = { cashBoxes: v.cashBoxes.toNumber(), bankAccounts: v.bankAccounts.toNumber(), total };
        }

        const pendingWhere = { status: 'pending' };
        const pendingTx = await Transaction.findAll({ where: pendingWhere, attributes: ['type', 'amount', 'currency'] });

        const pendingInwardDec = {};
        const pendingOutwardDec = {};
        pendingTx.forEach(tx => {
            const curr = tx.currency || 'IRR';
            const amt = safeDecimal(tx.amount);
            const inTypes = ['cash_in', 'income', 'sell', 'bank_deposit'];
            const outTypes = ['cash_out', 'expense', 'buy', 'bank_withdraw'];
            if (inTypes.includes(tx.type)) {
                pendingInwardDec[curr] = (pendingInwardDec[curr] || new Decimal(0)).plus(amt);
            } else if (outTypes.includes(tx.type)) {
                pendingOutwardDec[curr] = (pendingOutwardDec[curr] || new Decimal(0)).plus(amt);
            }
        });
        const pendingInward = {};
        const pendingOutward = {};
        for (const [c, v] of Object.entries(pendingInwardDec)) pendingInward[c] = v.toNumber();
        for (const [c, v] of Object.entries(pendingOutwardDec)) pendingOutward[c] = v.toNumber();

        const outstandingBalance = [];
        cashBoxes.forEach(cb => {
            if (parseFloat(cb.balance || 0) !== 0) {
                outstandingBalance.push({
                    account: cb.name,
                    type: 'cashbox',
                    currency: cb.currency || 'IRR',
                    balance: parseFloat(cb.balance || 0),
                    branch: cb.branch ? cb.branch.name : null
                });
            }
        });
        bankAccounts.forEach(ba => {
            if (parseFloat(ba.balance || 0) !== 0) {
                outstandingBalance.push({
                    account: ba.name,
                    type: 'bank',
                    currency: ba.currency || 'IRR',
                    balance: parseFloat(ba.balance || 0),
                    branch: ba.branch ? ba.branch.name : null
                });
            }
        });

        res.json({
            currencyPosition: currencyTotals,
            pendingInward,
            pendingOutward,
            outstandingBalance,
            cashBoxes: cashBoxes.map(cb => ({
                id: cb.id, name: cb.name, currency: cb.currency, balance: parseFloat(cb.balance || 0),
                branch: cb.branch ? cb.branch.name : null
            })),
            bankAccounts: bankAccounts.map(ba => ({
                id: ba.id, name: ba.name, bankName: ba.bankName, currency: ba.currency, balance: parseFloat(ba.balance || 0),
                branch: ba.branch ? ba.branch.name : null
            }))
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ========== Account Balance — موجودی حساب ==========
router.get('/account-balance', requireServices, async (req, res) => {
    try {
        const customerId = req.query.customerId;
        if (!customerId) return res.status(400).json({ error: 'customerId الزامی است' });

        const where = { customerId, status: 'approved' };
        if (req.query.currency) where.currency = req.query.currency;

        const transactions = await Transaction.findAll({
            where,
            attributes: ['type', 'amount', 'currency'],
            order: [['transactionDate', 'ASC']]
        });

        const debitTypes = ['cash_out', 'bank_withdraw', 'expense', 'buy'];
        const creditTypes = ['cash_in', 'bank_deposit', 'income', 'sell'];

        const balanceByCurrencyDec = {};
        transactions.forEach(tx => {
            const curr = tx.currency || 'IRR';
            if (!balanceByCurrencyDec[curr]) balanceByCurrencyDec[curr] = { totalDebit: new Decimal(0), totalCredit: new Decimal(0), balance: new Decimal(0) };
            const amt = safeDecimal(tx.amount);
            if (debitTypes.includes(tx.type)) {
                balanceByCurrencyDec[curr].totalDebit = balanceByCurrencyDec[curr].totalDebit.plus(amt);
                balanceByCurrencyDec[curr].balance = balanceByCurrencyDec[curr].balance.minus(amt);
            } else if (creditTypes.includes(tx.type)) {
                balanceByCurrencyDec[curr].totalCredit = balanceByCurrencyDec[curr].totalCredit.plus(amt);
                balanceByCurrencyDec[curr].balance = balanceByCurrencyDec[curr].balance.plus(amt);
            }
        });
        const balanceByCurrency = {};
        for (const [curr, v] of Object.entries(balanceByCurrencyDec)) {
            balanceByCurrency[curr] = {
                totalDebit: v.totalDebit.toNumber(),
                totalCredit: v.totalCredit.toNumber(),
                balance: v.balance.toNumber()
            };
        }

        res.json(balanceByCurrency);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ========== Account Turnover — گردش حساب ==========
router.get('/account-turnover', requireServices, async (req, res) => {
    try {
        const where = { status: 'approved' };
        if (req.query.fromDate || req.query.toDate) {
            where.transactionDate = {};
            if (req.query.fromDate) where.transactionDate[Op.gte] = req.query.fromDate;
            if (req.query.toDate) where.transactionDate[Op.lte] = req.query.toDate;
        }
        if (req.query.currency) where.currency = req.query.currency;

        const txs = await Transaction.findAll({
            where,
            attributes: ['type', 'amount', 'currency', 'fromCashBoxId', 'toCashBoxId', 'fromBankAccountId', 'toBankAccountId'],
        });

        const [cashBoxes, bankAccounts] = await Promise.all([
            CashBox.findAll({ where: { isActive: true }, attributes: ['id', 'name', 'currency', 'balance'] }),
            BankAccount.findAll({ where: { isActive: true }, attributes: ['id', 'name', 'bankName', 'currency', 'balance'] })
        ]);

        const accountMap = {};
        cashBoxes.forEach(cb => { accountMap['cb_' + cb.id] = { name: cb.name, type: 'cashbox', currency: cb.currency, balance: safeDecimal(cb.balance).toNumber(), debit: new Decimal(0), credit: new Decimal(0) }; });
        bankAccounts.forEach(ba => { accountMap['ba_' + ba.id] = { name: ba.name + (ba.bankName ? ' (' + ba.bankName + ')' : ''), type: 'bank', currency: ba.currency, balance: safeDecimal(ba.balance).toNumber(), debit: new Decimal(0), credit: new Decimal(0) }; });

        const debitFrom = ['cash_out', 'transfer_box', 'bank_deposit', 'expense', 'buy'];
        const creditTo = ['cash_in', 'transfer_box', 'bank_withdraw', 'income', 'sell'];

        txs.forEach(tx => {
            const amt = safeDecimal(tx.amount);
            if (tx.fromCashBoxId && debitFrom.includes(tx.type)) {
                const key = 'cb_' + tx.fromCashBoxId;
                if (accountMap[key]) accountMap[key].debit = accountMap[key].debit.plus(amt);
            }
            if (tx.toCashBoxId && creditTo.includes(tx.type)) {
                const key = 'cb_' + tx.toCashBoxId;
                if (accountMap[key]) accountMap[key].credit = accountMap[key].credit.plus(amt);
            }
            if (tx.fromBankAccountId && ['bank_withdraw', 'transfer_account'].includes(tx.type)) {
                const key = 'ba_' + tx.fromBankAccountId;
                if (accountMap[key]) accountMap[key].debit = accountMap[key].debit.plus(amt);
            }
            if (tx.toBankAccountId && ['bank_deposit', 'transfer_account'].includes(tx.type)) {
                const key = 'ba_' + tx.toBankAccountId;
                if (accountMap[key]) accountMap[key].credit = accountMap[key].credit.plus(amt);
            }
        });

        const result = Object.values(accountMap).map(a => ({
            name: a.name,
            type: a.type,
            currency: a.currency,
            balance: a.balance,
            debit: a.debit.toNumber(),
            credit: a.credit.toNumber(),
            turnover: a.debit.plus(a.credit).toNumber(),
            net: a.credit.minus(a.debit).toNumber()
        }));

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ========== Exchange Profit & Loss — سود و زیان ==========
router.get('/profit-loss', requireServices, async (req, res) => {
    try {
        const where = { status: 'approved' };
        if (req.query.fromDate || req.query.toDate) {
            where.transactionDate = {};
            if (req.query.fromDate) where.transactionDate[Op.gte] = req.query.fromDate;
            if (req.query.toDate) where.transactionDate[Op.lte] = req.query.toDate;
        }

        const txs = await Transaction.findAll({
            where,
            attributes: ['type', 'amount', 'currency', 'transactionDate'],
            order: [['transactionDate', 'ASC']]
        });

        let totalIncome = new Decimal(0), totalExpense = new Decimal(0), totalBuy = new Decimal(0), totalSell = new Decimal(0);
        const byCurrencyDec = {};

        txs.forEach(tx => {
            const amt = safeDecimal(tx.amount);
            const curr = tx.currency || 'IRR';
            if (!byCurrencyDec[curr]) byCurrencyDec[curr] = { income: new Decimal(0), expense: new Decimal(0), buy: new Decimal(0), sell: new Decimal(0) };
            if (tx.type === 'income') { totalIncome = totalIncome.plus(amt); byCurrencyDec[curr].income = byCurrencyDec[curr].income.plus(amt); }
            if (tx.type === 'expense') { totalExpense = totalExpense.plus(amt); byCurrencyDec[curr].expense = byCurrencyDec[curr].expense.plus(amt); }
            if (tx.type === 'buy') { totalBuy = totalBuy.plus(amt); byCurrencyDec[curr].buy = byCurrencyDec[curr].buy.plus(amt); }
            if (tx.type === 'sell') { totalSell = totalSell.plus(amt); byCurrencyDec[curr].sell = byCurrencyDec[curr].sell.plus(amt); }
        });

        const byCurrency = {};
        for (const [curr, c] of Object.entries(byCurrencyDec)) {
            byCurrency[curr] = {
                income: c.income.toNumber(),
                expense: c.expense.toNumber(),
                buy: c.buy.toNumber(),
                sell: c.sell.toNumber(),
                profit: c.income.plus(c.sell).minus(c.expense).minus(c.buy).toNumber()
            };
        }

        res.json({
            totalIncome: totalIncome.toNumber(),
            totalExpense: totalExpense.toNumber(),
            totalBuy: totalBuy.toNumber(),
            totalSell: totalSell.toNumber(),
            grossProfit: totalIncome.plus(totalSell).minus(totalExpense).minus(totalBuy).toNumber(),
            byCurrency
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ========== Expense Journal — دفتر هزینه ==========
router.get('/expense-journal', requireServices, async (req, res) => {
    try {
        const where = { status: 'approved', type: { [Op.in]: ['expense', 'buy'] } };
        if (req.query.fromDate || req.query.toDate) {
            where.transactionDate = {};
            if (req.query.fromDate) where.transactionDate[Op.gte] = req.query.fromDate;
            if (req.query.toDate) where.transactionDate[Op.lte] = req.query.toDate;
        }
        if (req.query.currency) where.currency = req.query.currency;

        const rows = await Transaction.findAll({
            where,
            include: [
                { model: User, as: 'user', attributes: ['id', 'name'] },
                { model: CashBox, as: 'fromCashBox', attributes: ['id', 'name'] },
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'], required: false }
            ],
            order: [['transactionDate', 'DESC'], ['createdAt', 'DESC']],
            limit: 500
        });

        const totalAmount = rows.reduce((s, r) => s.plus(safeDecimal(r.amount)), new Decimal(0)).toNumber();

        res.json({
            rows: rows.map(r => ({
                id: r.id,
                date: r.transactionDate,
                type: r.type,
                amount: parseFloat(r.amount || 0),
                currency: r.currency,
                description: r.description,
                reference: r.reference,
                user: r.user,
                fromCashBox: r.fromCashBox,
                customer: r.customer
            })),
            totalAmount,
            count: rows.length
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ========== Cash Bank Status — وضعیت صندوق و بانک ==========
router.get('/cash-bank-status', requireServices, async (req, res) => {
    try {
        const [cashBoxes, bankAccounts] = await Promise.all([
            CashBox.findAll({
                include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
                order: [['currency', 'ASC'], ['name', 'ASC']]
            }),
            BankAccount.findAll({
                include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
                order: [['currency', 'ASC'], ['name', 'ASC']]
            })
        ]);

        const byCurrencyDec = {};
        cashBoxes.forEach(cb => {
            const c = cb.currency || 'IRR';
            if (!byCurrencyDec[c]) byCurrencyDec[c] = { cashBoxes: [], bankAccounts: [], totalCash: new Decimal(0), totalBank: new Decimal(0) };
            const bal = safeDecimal(cb.balance).toNumber();
            byCurrencyDec[c].cashBoxes.push({ id: cb.id, name: cb.name, balance: bal, isActive: cb.isActive, branch: cb.branch ? cb.branch.name : null });
            byCurrencyDec[c].totalCash = byCurrencyDec[c].totalCash.plus(bal);
        });
        bankAccounts.forEach(ba => {
            const c = ba.currency || 'IRR';
            if (!byCurrencyDec[c]) byCurrencyDec[c] = { cashBoxes: [], bankAccounts: [], totalCash: new Decimal(0), totalBank: new Decimal(0) };
            const bal = safeDecimal(ba.balance).toNumber();
            byCurrencyDec[c].bankAccounts.push({ id: ba.id, name: ba.name, bankName: ba.bankName, accountNumber: ba.accountNumber, balance: bal, isActive: ba.isActive, branch: ba.branch ? ba.branch.name : null });
            byCurrencyDec[c].totalBank = byCurrencyDec[c].totalBank.plus(bal);
        });
        const byCurrency = {};
        for (const [c, v] of Object.entries(byCurrencyDec)) {
            const totalCash = v.totalCash.toNumber();
            const totalBank = v.totalBank.toNumber();
            byCurrency[c] = {
                cashBoxes: v.cashBoxes,
                bankAccounts: v.bankAccounts,
                totalCash,
                totalBank,
                total: new Decimal(totalCash).plus(totalBank).toNumber()
            };
        }

        res.json(byCurrency);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
