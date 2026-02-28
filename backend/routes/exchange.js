const express = require('express');
const router = express.Router();
const { CashBox, BankAccount, Transaction, Branch, User, Customer } = require('../models');
const { Op } = require('sequelize');
const { literal } = require('sequelize');
const { isValidUUID } = require('../lib/validation');

function requireServices(req, res, next) {
    if (!req.canAccess('services')) return res.status(403).json({ error: 'دسترسی به بخش خدمات صرافی ندارید' });
    next();
}

function safeParseFloat(val, defaultValue = 0) {
    const n = parseFloat(val);
    return Number.isNaN(n) ? defaultValue : n;
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
        case 'buy':
            await updateBalance(CashBox, tx.fromCashBoxId, -amt);
            break;
        case 'sell':
            await updateBalance(CashBox, tx.toCashBoxId, amt);
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
                let runningBalance = 0;
                const items = txs.map(tx => {
                    const side = classifyTx(tx);
                    const amt = parseFloat(tx.amount) || 0;
                    const debit = side === 'debit' ? amt : 0;
                    const credit = side === 'credit' ? amt : 0;
                    runningBalance += credit - debit;
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
                        balance: runningBalance,
                        sign: runningBalance >= 0 ? 'Cr' : 'Dr',
                        customer: tx.customer,
                        user: tx.user,
                        fromCashBox: tx.fromCashBox,
                        toCashBox: tx.toCashBox,
                        fromBankAccount: tx.fromBankAccount,
                        toBankAccount: tx.toBankAccount,
                        metadata: tx.metadata
                    };
                });
                const totalDebit = items.reduce((s, i) => s + i.debit, 0);
                const totalCredit = items.reduce((s, i) => s + i.credit, 0);
                statement[curr] = {
                    items,
                    totalDebit,
                    totalCredit,
                    balanceCF: runningBalance,
                    balanceCFSign: runningBalance >= 0 ? 'Cr' : 'Dr'
                };
            }
        } else {
            let runningBalance = 0;
            const items = rows.map(tx => {
                const side = classifyTx(tx);
                const amt = parseFloat(tx.amount) || 0;
                const debit = side === 'debit' ? amt : 0;
                const credit = side === 'credit' ? amt : 0;
                runningBalance += credit - debit;
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
                    balance: runningBalance,
                    sign: runningBalance >= 0 ? 'Cr' : 'Dr',
                    customer: tx.customer,
                    user: tx.user,
                    fromCashBox: tx.fromCashBox,
                    toCashBox: tx.toCashBox,
                    fromBankAccount: tx.fromBankAccount,
                    toBankAccount: tx.toBankAccount,
                    metadata: tx.metadata
                };
            });
            const totalDebit = items.reduce((s, i) => s + i.debit, 0);
            const totalCredit = items.reduce((s, i) => s + i.credit, 0);
            statement = {
                items,
                totalDebit,
                totalCredit,
                balanceCF: runningBalance,
                balanceCFSign: runningBalance >= 0 ? 'Cr' : 'Dr'
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

        const currencyTotals = {};
        cashBoxes.forEach(cb => {
            const c = cb.currency || 'IRR';
            if (!currencyTotals[c]) currencyTotals[c] = { cashBoxes: 0, bankAccounts: 0, total: 0 };
            currencyTotals[c].cashBoxes += parseFloat(cb.balance || 0);
            currencyTotals[c].total += parseFloat(cb.balance || 0);
        });
        bankAccounts.forEach(ba => {
            const c = ba.currency || 'IRR';
            if (!currencyTotals[c]) currencyTotals[c] = { cashBoxes: 0, bankAccounts: 0, total: 0 };
            currencyTotals[c].bankAccounts += parseFloat(ba.balance || 0);
            currencyTotals[c].total += parseFloat(ba.balance || 0);
        });

        const pendingWhere = { status: 'pending' };
        const pendingTx = await Transaction.findAll({ where: pendingWhere, attributes: ['type', 'amount', 'currency'] });

        const pendingInward = {};
        const pendingOutward = {};
        pendingTx.forEach(tx => {
            const curr = tx.currency || 'IRR';
            const amt = parseFloat(tx.amount) || 0;
            const inTypes = ['cash_in', 'income', 'sell', 'bank_deposit'];
            const outTypes = ['cash_out', 'expense', 'buy', 'bank_withdraw'];
            if (inTypes.includes(tx.type)) {
                pendingInward[curr] = (pendingInward[curr] || 0) + amt;
            } else if (outTypes.includes(tx.type)) {
                pendingOutward[curr] = (pendingOutward[curr] || 0) + amt;
            }
        });

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

        const balanceByCurrency = {};
        transactions.forEach(tx => {
            const curr = tx.currency || 'IRR';
            if (!balanceByCurrency[curr]) balanceByCurrency[curr] = { totalDebit: 0, totalCredit: 0, balance: 0 };
            const amt = parseFloat(tx.amount) || 0;
            if (debitTypes.includes(tx.type)) {
                balanceByCurrency[curr].totalDebit += amt;
                balanceByCurrency[curr].balance -= amt;
            } else if (creditTypes.includes(tx.type)) {
                balanceByCurrency[curr].totalCredit += amt;
                balanceByCurrency[curr].balance += amt;
            }
        });

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
        cashBoxes.forEach(cb => { accountMap['cb_' + cb.id] = { name: cb.name, type: 'cashbox', currency: cb.currency, balance: parseFloat(cb.balance || 0), debit: 0, credit: 0 }; });
        bankAccounts.forEach(ba => { accountMap['ba_' + ba.id] = { name: ba.name + (ba.bankName ? ' (' + ba.bankName + ')' : ''), type: 'bank', currency: ba.currency, balance: parseFloat(ba.balance || 0), debit: 0, credit: 0 }; });

        const debitFrom = ['cash_out', 'transfer_box', 'bank_deposit', 'expense', 'buy'];
        const creditTo = ['cash_in', 'transfer_box', 'bank_withdraw', 'income', 'sell'];

        txs.forEach(tx => {
            const amt = parseFloat(tx.amount) || 0;
            if (tx.fromCashBoxId && debitFrom.includes(tx.type)) {
                const key = 'cb_' + tx.fromCashBoxId;
                if (accountMap[key]) accountMap[key].debit += amt;
            }
            if (tx.toCashBoxId && creditTo.includes(tx.type)) {
                const key = 'cb_' + tx.toCashBoxId;
                if (accountMap[key]) accountMap[key].credit += amt;
            }
            if (tx.fromBankAccountId && ['bank_withdraw', 'transfer_account'].includes(tx.type)) {
                const key = 'ba_' + tx.fromBankAccountId;
                if (accountMap[key]) accountMap[key].debit += amt;
            }
            if (tx.toBankAccountId && ['bank_deposit', 'transfer_account'].includes(tx.type)) {
                const key = 'ba_' + tx.toBankAccountId;
                if (accountMap[key]) accountMap[key].credit += amt;
            }
        });

        const result = Object.values(accountMap).map(a => ({
            ...a,
            turnover: a.debit + a.credit,
            net: a.credit - a.debit
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

        let totalIncome = 0, totalExpense = 0, totalBuy = 0, totalSell = 0;
        const byCurrency = {};

        txs.forEach(tx => {
            const amt = parseFloat(tx.amount) || 0;
            const curr = tx.currency || 'IRR';
            if (!byCurrency[curr]) byCurrency[curr] = { income: 0, expense: 0, buy: 0, sell: 0, profit: 0 };
            if (tx.type === 'income') { totalIncome += amt; byCurrency[curr].income += amt; }
            if (tx.type === 'expense') { totalExpense += amt; byCurrency[curr].expense += amt; }
            if (tx.type === 'buy') { totalBuy += amt; byCurrency[curr].buy += amt; }
            if (tx.type === 'sell') { totalSell += amt; byCurrency[curr].sell += amt; }
        });

        Object.values(byCurrency).forEach(c => { c.profit = (c.income + c.sell) - (c.expense + c.buy); });

        res.json({
            totalIncome,
            totalExpense,
            totalBuy,
            totalSell,
            grossProfit: (totalIncome + totalSell) - (totalExpense + totalBuy),
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

        const totalAmount = rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);

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

        const byCurrency = {};
        cashBoxes.forEach(cb => {
            const c = cb.currency || 'IRR';
            if (!byCurrency[c]) byCurrency[c] = { cashBoxes: [], bankAccounts: [], totalCash: 0, totalBank: 0, total: 0 };
            const bal = parseFloat(cb.balance || 0);
            byCurrency[c].cashBoxes.push({ id: cb.id, name: cb.name, balance: bal, isActive: cb.isActive, branch: cb.branch ? cb.branch.name : null });
            byCurrency[c].totalCash += bal;
            byCurrency[c].total += bal;
        });
        bankAccounts.forEach(ba => {
            const c = ba.currency || 'IRR';
            if (!byCurrency[c]) byCurrency[c] = { cashBoxes: [], bankAccounts: [], totalCash: 0, totalBank: 0, total: 0 };
            const bal = parseFloat(ba.balance || 0);
            byCurrency[c].bankAccounts.push({ id: ba.id, name: ba.name, bankName: ba.bankName, accountNumber: ba.accountNumber, balance: bal, isActive: ba.isActive, branch: ba.branch ? ba.branch.name : null });
            byCurrency[c].totalBank += bal;
            byCurrency[c].total += bal;
        });

        res.json(byCurrency);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
