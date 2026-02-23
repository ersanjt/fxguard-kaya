const axios = require('axios');

/**
 * سرویس پاسخ‌دهی هوش مصنوعی با OpenAI
 * برای پاسخ خودکار به پیام‌های مشتریان در CRM صرافی/حواله
 */

const MAX_HISTORY_MESSAGES = 10;
const MAX_RESPONSE_TOKENS = 500;
const REQUEST_TIMEOUT_MS = 15000;

/**
 * تولید پاسخ هوشمند با استفاده از OpenAI
 * @param {Object} options
 * @param {Object} options.conversation - مکالمه
 * @param {Object} options.customer - مشتری
 * @param {string} options.incomingMessage - متن پیام ورودی
 * @param {Object[]} options.messageHistory - تاریخچه پیام‌ها (اختیاری)
 * @param {Object} options.department - دپارتمان تخصیص‌یافته (اختیاری)
 * @returns {Promise<string|null>} متن پاسخ یا null در صورت خطا
 */
async function generateAIResponse({ conversation, customer, incomingMessage, messageHistory = [], department = null }) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || !incomingMessage || !String(incomingMessage).trim()) return null;

    const customerName = (customer && customer.name) || 'مشتری';
    const deptInfo = department ? `دپارتمان فعلی: ${department.name}. ${(department.description || '').slice(0, 150)}` : '';

    const historyText = messageHistory
        .slice(-MAX_HISTORY_MESSAGES)
        .map(m => {
            const role = m.direction === 'incoming' ? 'مشتری' : 'پشتیبانی';
            return `${role}: ${(m.content || '').slice(0, 300)}`;
        })
        .join('\n');

    const systemPrompt = `شما دستیار پشتیبانی یک صرافی/شرکت حواله هستید. به سوالات مشتریان به زبان فارسی پاسخ دهید.
- پاسخ‌ها باید کوتاه، مفید و حرفه‌ای باشند (مناسب واتساپ).
- اگر اطلاعات دقیق ندارید، از مشتری بخواهید با کارشناس تماس بگیرد یا شماره تماس را بدهید.
- هرگز اطلاعات مالی حساس یا رمز عبور ندهید.
- در صورت سوال درباره نرخ ارز، حواله، زمان واریز: به‌صورت کلی پاسخ دهید و برای جزئیات به کارشناس ارجاع دهید.
${deptInfo ? `\n${deptInfo}` : ''}`;

    const userContent = historyText
        ? `تاریخچه مکالمه:\n${historyText}\n\nآخرین پیام مشتری: ${incomingMessage}\n\nپاسخ مناسب:`
        : `مشتری (${customerName}): ${incomingMessage}\n\nپاسخ مناسب:`;

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent }
                ],
                temperature: 0.5,
                max_tokens: MAX_RESPONSE_TOKENS
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: REQUEST_TIMEOUT_MS
            }
        );

        const content = response.data?.choices?.[0]?.message?.content?.trim();
        if (!content) return null;

        // حذف نقل‌قول‌های اضافی و محدود کردن طول
        const cleaned = content.replace(/^["']|["']$/g, '').trim();
        return cleaned.slice(0, 1500) || null;
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
            console.warn('AI response generation failed:', err?.response?.data?.error?.message || err?.message);
        }
        return null;
    }
}

/**
 * بررسی فعال بودن پاسخ AI
 */
function isAIAnswerEnabled() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return false;
    const enabled = process.env.AI_ANSWER_ENABLED;
    return enabled === undefined || enabled === '' || enabled === 'true' || enabled === '1';
}

module.exports = {
    generateAIResponse,
    isAIAnswerEnabled
};
