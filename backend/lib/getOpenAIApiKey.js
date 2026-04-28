/**
 * دریافت کلید API اوپن‌ای‌آی
 * اول از WhatsappConfig (تنظیمات پنل) و در صورت نبود از متغیر محیطی OPENAI_API_KEY
 */
const { WhatsappConfig } = require('../models');

let _cache = null;
let _cacheAt = 0;
const CACHE_TTL_MS = 30 * 1000;

async function getOpenAIApiKey() {
    const now = Date.now();
    if (_cache !== undefined && (now - _cacheAt) < CACHE_TTL_MS) {
        return _cache;
    }
    try {
        const [cfg] = await WhatsappConfig.findOrCreate({
            where: { id: 'default' },
            defaults: {}
        });
        const key = (cfg.openaiApiKey && String(cfg.openaiApiKey).trim()) || process.env.OPENAI_API_KEY || '';
        _cache = key || null;
        _cacheAt = now;
        return _cache;
    } catch (err) {
        _cache = process.env.OPENAI_API_KEY || null;
        _cacheAt = now;
        return _cache;
    }
}

function clearOpenAIApiKeyCache() {
    _cache = undefined;
    _cacheAt = 0;
}

module.exports = { getOpenAIApiKey, clearOpenAIApiKeyCache };
