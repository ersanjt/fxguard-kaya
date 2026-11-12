/**
 * کلید OpenAI: اول از پنل سازمان، بعد OPENAI_API_KEY.
 * کش با بقیهٔ سرویس‌ها یکی است.
 */
const { getConfiguredKey, clearAiProviderCache } = require('./aiProviders');

async function getOpenAIApiKey() {
    return getConfiguredKey('openai');
}

function clearOpenAIApiKeyCache() {
    clearAiProviderCache();
}

module.exports = { getOpenAIApiKey, clearOpenAIApiKeyCache };
