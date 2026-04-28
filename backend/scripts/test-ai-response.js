#!/usr/bin/env node
/**
 * اسکریپت تست پاسخ هوش مصنوعی
 * اجرا: node scripts/test-ai-response.js
 * یا با پیام دلخواه: node scripts/test-ai-response.js "سلام، نرخ دلار چنده؟"
 */
require('dotenv').config();

const { generateAIResponse, isAIAnswerEnabled } = require('../services/aiResponseService');

async function main() {
    const testMessage = process.argv[2] || 'سلام، چطور می‌تونم حواله بفرستم؟';
    
    console.log('🔧 Testing AI Response Service...\n');
    const apiKey = (await require('../lib/getOpenAIApiKey').getOpenAIApiKey()) || process.env.OPENAI_API_KEY;
    console.log('OpenAI API Key:', apiKey ? '✅ Set (' + apiKey.slice(0, 10) + '...)' : '❌ NOT SET (set in panel or OPENAI_API_KEY in .env)');
    console.log('AI_ANSWER_ENABLED:', process.env.AI_ANSWER_ENABLED ?? '(default: true)');
    console.log('isAIAnswerEnabled():', await isAIAnswerEnabled());
    console.log('\n📩 Test message:', testMessage);
    console.log('---\n');

    const mockConversation = { id: 'test' };
    const mockCustomer = { name: 'مشتری تست', phone: '989121234567' };
    const mockHistory = [
        { direction: 'incoming', content: 'سلام' },
        { direction: 'outgoing', content: 'سلام! خوش اومدید. چطور می‌تونم کمک کنم؟' }
    ];

    try {
        const reply = await generateAIResponse({
            conversation: mockConversation,
            customer: mockCustomer,
            incomingMessage: testMessage,
            messageHistory: mockHistory,
            department: null
        });

        if (reply) {
            console.log('✅ AI Reply:\n', reply);
        } else {
            console.log('❌ AI returned null - check logs above for error details');
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.response?.data) console.error('API Error:', JSON.stringify(err.response.data, null, 2));
    }
}

main();
