/**
 * سرویس بات تلگرام — دریافت پیام از کاربران و پاسخ به دستورات
 * دستورات پشتیبانی‌شده:
 *   /start          — خوش‌آمدگویی و راهنمای اتصال حساب
 *   /link <token>   — اتصال حساب CRM با توکن از پنل
 *   /me             — نمایش اطلاعات حساب شخصی
 *   /rates          — نمایش نرخ ارز لحظه‌ای
 *   /help           — راهنمای دستورات
 *   /unlink         — قطع اتصال حساب تلگرام
 */

const axios = require('axios');
const logger = require('../config/logger');

function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

let _pollingActive = false;
let _lastUpdateId = 0;
let _pollingTimeout = null;
let _appModels = null;
let _botConfig = null;

const POLL_INTERVAL_MS = 2000;
const LONG_POLL_TIMEOUT_SEC = 25;
const REQUEST_TIMEOUT_MS = 30000;

function setBotConfig(config) {
    _botConfig = config;
}

function setModels(models) {
    _appModels = models;
}

function getToken() {
    if (_botConfig && _botConfig.botToken) return String(_botConfig.botToken).trim();
    return (process.env.TELEGRAM_BOT_TOKEN || '').trim();
}

function isConfigured() {
    return !!getToken();
}

async function apiCall(method, params = {}) {
    const token = getToken();
    if (!token) return null;
    const url = `https://api.telegram.org/bot${token}/${method}`;
    try {
        const res = await axios.post(url, params, { timeout: REQUEST_TIMEOUT_MS });
        return res.data;
    } catch (err) {
        logger.warn(`Telegram API call failed: ${method}`, { error: err.message });
        return null;
    }
}

async function sendReply(chatId, text, opts = {}) {
    return apiCall('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...opts
    });
}

async function getUpdates(offset = 0) {
    const token = getToken();
    if (!token) return [];
    const url = `https://api.telegram.org/bot${token}/getUpdates`;
    try {
        const res = await axios.post(url, {
            offset,
            timeout: LONG_POLL_TIMEOUT_SEC,
            allowed_updates: ['message']
        }, { timeout: REQUEST_TIMEOUT_MS + 5000 });
        if (res.data && res.data.ok && Array.isArray(res.data.result)) {
            return res.data.result;
        }
        return [];
    } catch (err) {
        if (err.code !== 'ECONNABORTED' && err.code !== 'ETIMEDOUT') {
            logger.warn('Telegram getUpdates error', { error: err.message });
        }
        return [];
    }
}

async function getRatesText() {
    try {
        const NAVASAN_API_KEY = process.env.NAVASAN_API_KEY || '';
        if (!NAVASAN_API_KEY) return null;

        const { RateAdjustment, RateCurrency, TickerConfig } = _appModels || require('../models');
        const defaultRateCurrencies = require('../lib/defaultRateCurrencies');

        const raw = await axios.get(
            `https://api.navasan.tech/latest/?api_key=${NAVASAN_API_KEY}`,
            { timeout: 12000 }
        ).then(r => r.data || {}).catch(() => ({}));

        const rows = await RateCurrency.findAll({ order: [['sortOrder', 'ASC'], ['key', 'ASC']] });
        const RATES_KEYS = rows.length > 0
            ? rows.map(r => ({ key: r.key, label: r.label || r.key, apiKeys: Array.isArray(r.apiKeys) ? r.apiKeys : [] }))
            : defaultRateCurrencies.map(({ key, label, apiKeys }) => ({ key, label, apiKeys: apiKeys || [] }));

        const adjRows = await RateAdjustment.findAll();
        const adjustments = {};
        adjRows.forEach(r => { adjustments[r.currencyKey] = r; });

        let visibleKeys = null;
        try {
            const cfg = await TickerConfig.findByPk('default');
            if (cfg && cfg.visibleKeys && Array.isArray(cfg.visibleKeys) && cfg.visibleKeys.length > 0) {
                visibleKeys = cfg.visibleKeys;
            }
        } catch (_) {}

        const items = [];
        for (const { key, label, apiKeys } of RATES_KEYS) {
            if (visibleKeys && !visibleKeys.includes(key)) continue;
            let rawVal = null;
            for (const k of apiKeys) {
                const obj = raw[k];
                if (!obj) continue;
                let v = obj.value;
                if (v == null) continue;
                if (typeof v === 'string') v = parseFloat(v.replace(/[^\d.-]/g, ''));
                const num = Number(v);
                if (!isNaN(num)) { rawVal = num; break; }
            }
            const adj = adjustments[key];
            let finalVal = rawVal;
            if (adj && adj.adjustmentType !== 'none') {
                const val = adj.value != null ? Number(adj.value) : 0;
                if (adj.adjustmentType === 'fixed') finalVal = val;
                else if (adj.adjustmentType === 'delta_toman') finalVal = (rawVal || 0) + val;
                else if (adj.adjustmentType === 'percent') finalVal = (rawVal || 0) * (1 + val / 100);
            }
            if (finalVal != null) {
                items.push({ label, value: finalVal });
            }
        }

        if (items.length === 0) return null;

        const now = new Date().toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
        const lines = items.map(i => {
            const formatted = i.value.toLocaleString('fa-IR');
            return `• <b>${i.label}:</b> ${formatted} تومان`;
        });
        return `💱 <b>نرخ ارز لحظه‌ای</b>\n🕐 ${now}\n\n${lines.join('\n')}`;
    } catch (err) {
        logger.warn('getRatesText error', { error: err.message });
        return null;
    }
}

async function getUserInfo(userId) {
    try {
        const { User, Department, Branch } = _appModels || require('../models');
        const user = await User.findByPk(userId, {
            include: [
                { association: 'branch', required: false },
                { association: 'department', required: false }
            ],
            attributes: ['id', 'name', 'email', 'username', 'role', 'status', 'lastLoginAt', 'departmentId', 'branchId', 'isActive']
        });
        return user;
    } catch (_) {
        return null;
    }
}

const ROLE_LABELS = {
    owner: '👑 مالک',
    admin: '🔑 مدیر',
    manager: '📋 مدیر میانی',
    supervisor: '👁 سرپرست',
    agent: '💼 کارشناس'
};

const STATUS_LABELS = {
    online: '🟢 آنلاین',
    offline: '⚫ آفلاین',
    busy: '🔴 مشغول',
    away: '🟡 دور'
};

async function handleCommand(chatId, text, fromUser) {
    const parts = text.trim().split(/\s+/);
    const cmd = (parts[0] || '').toLowerCase().split('@')[0];

    if (cmd === '/start') {
        if (parts[1]) {
            await handleLink(chatId, parts[1], fromUser);
            return;
        }
        const firstName = esc(fromUser.first_name || '');
        await sendReply(chatId,
            `👋 سلام ${firstName}!\n\n` +
            `🤖 <b>بات مدیریت کایا CRM</b>\n\n` +
            `برای استفاده از امکانات بات، ابتدا حساب CRM خود را متصل کنید:\n\n` +
            `1️⃣ وارد پنل CRM شوید\n` +
            `2️⃣ به <b>پروفایل من ← اتصال تلگرام</b> بروید\n` +
            `3️⃣ روی <b>دریافت کد اتصال</b> کلیک کنید\n` +
            `4️⃣ کد دریافتی را اینجا بفرستید:\n` +
            `   <code>/link کد_شما</code>\n\n` +
            `📋 <b>دستورات موجود:</b>\n` +
            `/me — اطلاعات حساب من\n` +
            `/rates — نرخ ارز لحظه‌ای\n` +
            `/help — راهنما`
        );
        return;
    }

    if (cmd === '/link') {
        await handleLink(chatId, parts[1], fromUser);
        return;
    }

    if (cmd === '/unlink') {
        await handleUnlink(chatId);
        return;
    }

    if (cmd === '/me') {
        await handleMe(chatId);
        return;
    }

    if (cmd === '/rates') {
        await handleRates(chatId);
        return;
    }

    if (cmd === '/help') {
        await sendReply(chatId,
            `📖 <b>راهنمای بات کایا CRM</b>\n\n` +
            `/start — شروع و راهنمای اتصال\n` +
            `/link <code>توکن</code> — اتصال حساب CRM\n` +
            `/me — نمایش اطلاعات حساب شخصی\n` +
            `/rates — نرخ ارز لحظه‌ای\n` +
            `/unlink — قطع اتصال حساب\n` +
            `/help — این راهنما\n\n` +
            `💡 برای اتصال حساب، از پنل CRM یک توکن دریافت کنید.`
        );
        return;
    }

    const linkedUser = await findUserByChatId(chatId);
    if (!linkedUser) {
        await sendReply(chatId,
            `❓ دستور نامشخص یا حساب متصل نیست.\n` +
            `برای شروع: /start\n` +
            `برای راهنما: /help`
        );
    } else {
        await sendReply(chatId,
            `❓ دستور نامشخص. برای راهنما: /help`
        );
    }
}

async function findUserByChatId(chatId) {
    try {
        const { User } = _appModels || require('../models');
        return await User.findOne({ where: { telegramChatId: String(chatId) } });
    } catch (_) {
        return null;
    }
}

async function handleLink(chatId, token, fromUser) {
    if (!token) {
        await sendReply(chatId,
            `⚠️ لطفاً توکن را وارد کنید:\n` +
            `<code>/link توکن_شما</code>\n\n` +
            `توکن را از پنل CRM ← پروفایل من ← اتصال تلگرام دریافت کنید.`
        );
        return;
    }

    try {
        const { User } = _appModels || require('../models');
        const user = await User.findOne({
            where: { telegramLinkToken: token }
        });

        if (!user) {
            await sendReply(chatId, '❌ توکن نامعتبر است. دوباره از پنل یک توکن جدید دریافت کنید.');
            return;
        }

        if (user.telegramLinkTokenExpiry && new Date() > user.telegramLinkTokenExpiry) {
            await sendReply(chatId, '⏰ توکن منقضی شده است. دوباره از پنل یک توکن جدید دریافت کنید.');
            return;
        }

        const existing = await User.findOne({ where: { telegramChatId: String(chatId) } });
        if (existing && existing.id !== user.id) {
            await sendReply(chatId, '⚠️ این تلگرام قبلاً به حساب دیگری متصل شده است. ابتدا /unlink بفرستید.');
            return;
        }

        await user.update({
            telegramChatId: String(chatId),
            telegramLinkToken: null,
            telegramLinkTokenExpiry: null
        });

        const roleName = ROLE_LABELS[user.role] || esc(user.role) || '';
        await sendReply(chatId,
            `✅ <b>حساب شما با موفقیت متصل شد!</b>\n\n` +
            `👤 <b>${esc(user.name)}</b>\n` +
            `📧 ${esc(user.email)}\n` +
            `🎭 نقش: ${roleName}\n\n` +
            `اکنون می‌توانید از دستورات زیر استفاده کنید:\n` +
            `/me — اطلاعات حساب\n` +
            `/rates — نرخ ارز\n` +
            `/help — راهنما`
        );
        logger.info(`Telegram linked: user ${user.email} → chatId ${chatId}`);
    } catch (err) {
        logger.error('Telegram link error', { error: err.message });
        await sendReply(chatId, '❌ خطا در اتصال حساب. لطفاً دوباره امتحان کنید.');
    }
}

async function handleUnlink(chatId) {
    try {
        const { User } = _appModels || require('../models');
        const user = await User.findOne({ where: { telegramChatId: String(chatId) } });
        if (!user) {
            await sendReply(chatId, 'ℹ️ هیچ حسابی به این تلگرام متصل نیست.');
            return;
        }
        await user.update({ telegramChatId: null });
        await sendReply(chatId, '✅ اتصال تلگرام شما قطع شد.');
    } catch (err) {
        logger.error('handleUnlink error', { chatId, error: err.message });
        await sendReply(chatId, '❌ خطا در قطع اتصال. لطفاً دوباره امتحان کنید.');
    }
}

async function handleMe(chatId) {
    const user = await findUserByChatId(chatId);
    if (!user) {
        await sendReply(chatId,
            '🔗 حساب CRM شما هنوز متصل نیست.\n\n' +
            'برای اتصال: /start'
        );
        return;
    }

    try {
        const fullUser = await getUserInfo(user.id);
        if (!fullUser) {
            await sendReply(chatId, '❌ اطلاعات حساب در دسترس نیست.');
            return;
        }

        const roleName = ROLE_LABELS[fullUser.role] || esc(fullUser.role) || '';
        const statusName = STATUS_LABELS[fullUser.status] || esc(fullUser.status) || '';
        const lastLogin = fullUser.lastLoginAt
            ? new Date(fullUser.lastLoginAt).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })
            : 'نامشخص';
        const dept = fullUser.department ? esc(fullUser.department.name) : '—';
        const branch = fullUser.branch ? esc(fullUser.branch.name) : '—';

        await sendReply(chatId,
            `👤 <b>اطلاعات حساب شما</b>\n\n` +
            `📛 <b>نام:</b> ${esc(fullUser.name)}\n` +
            `📧 <b>ایمیل:</b> ${esc(fullUser.email)}\n` +
            (fullUser.username ? `🆔 <b>نام کاربری:</b> ${esc(fullUser.username)}\n` : '') +
            `🎭 <b>نقش:</b> ${roleName}\n` +
            `📊 <b>وضعیت:</b> ${statusName}\n` +
            `🏢 <b>شعبه:</b> ${branch}\n` +
            `🏬 <b>بخش:</b> ${dept}\n` +
            `🕐 <b>آخرین ورود:</b> ${lastLogin}`
        );
    } catch (err) {
        logger.error('handleMe error', { error: err.message });
        await sendReply(chatId, '❌ خطا در دریافت اطلاعات حساب.');
    }
}

async function handleRates(chatId) {
    await sendReply(chatId, '⏳ در حال دریافت نرخ ارز...');
    const text = await getRatesText();
    if (!text) {
        await sendReply(chatId,
            '❌ نرخ ارز در حال حاضر در دسترس نیست.\n' +
            '(کلید API نواسان تنظیم نشده یا سرویس موقتاً خارج از دسترس است)'
        );
        return;
    }
    await sendReply(chatId, text);
}

async function processUpdate(update) {
    try {
        if (!update || !update.message) return;
        const msg = update.message;
        const chatId = msg.chat && msg.chat.id;
        const text = msg.text || '';
        const fromUser = msg.from || {};

        if (!chatId || !text) return;
        if (text.startsWith('/')) {
            await handleCommand(chatId, text, fromUser);
        }
    } catch (err) {
        logger.warn('processUpdate error', { error: err.message });
    }
}

async function pollOnce() {
    const updates = await getUpdates(_lastUpdateId);
    for (const update of updates) {
        // advance offset first so a crashed handler doesn't block the queue forever
        if (update.update_id >= _lastUpdateId) {
            _lastUpdateId = update.update_id + 1;
        }
        try {
            await processUpdate(update);
        } catch (err) {
            logger.warn('Telegram update handler error', { update_id: update.update_id, error: err.message });
        }
    }
}

async function startPolling(models, config = null) {
    if (_pollingActive) return;
    if (models) _appModels = models;
    if (config) _botConfig = config;

    const token = getToken();
    if (!token) {
        logger.info('Telegram bot: no token configured, polling disabled');
        return;
    }

    _pollingActive = true;
    logger.info('🤖 Telegram bot polling started');

    const poll = async () => {
        if (!_pollingActive) return;
        try {
            await pollOnce();
        } catch (err) {
            logger.warn('Telegram polling cycle error', { error: err.message });
        }
        if (_pollingActive) {
            _pollingTimeout = setTimeout(poll, POLL_INTERVAL_MS);
        }
    };

    poll();
}

function stopPolling() {
    _pollingActive = false;
    if (_pollingTimeout) {
        clearTimeout(_pollingTimeout);
        _pollingTimeout = null;
    }
    logger.info('Telegram bot polling stopped');
}

/**
 * ارسال پیام مستقیم به کاربر CRM از طریق تلگرام
 */
async function sendToUser(userId, text) {
    try {
        const { User } = _appModels || require('../models');
        const user = await User.findByPk(userId, { attributes: ['telegramChatId'] });
        if (!user || !user.telegramChatId) return false;
        await sendReply(user.telegramChatId, text);
        return true;
    } catch (_) {
        return false;
    }
}

module.exports = {
    startPolling,
    stopPolling,
    isConfigured,
    getRatesText,
    sendReply,
    sendToUser,
    setBotConfig,
    setModels
};
