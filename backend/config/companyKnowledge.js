/**
 * بانک اطلاعات شرکت برای استفاده در پاسخ‌های هوش مصنوعی
 * این اطلاعات به مدل داده می‌شود تا پاسخ‌های دقیق و حرفه‌ای بدهد.
 * می‌توان با env متغیر AI_COMPANY_KNOWLEDGE_JSON (JSON string) بازنویسی کرد.
 */

const defaultKnowledge = {
    ceo: 'علی رسول زاده',
    offices: {
        iran: ['تهران', 'تبریز', 'جلفا'],
        turkey: {
            istanbul: {
                main: 'دفتر اصلی استانبول برای دریافت و تحویل ارز',
                address: 'https://maps.app.goo.gl/82bpkmtmewoPSUrz9',
                activities: ['صرافی', 'دریافت و تحویل ارز']
            },
            magdiKoy: {
                activities: ['IT', 'بازارگانی'],
                note: 'مجدی‌کوی'
            },
            senirt: {
                activities: ['اداری'],
                note: 'اسنیورت، با نام‌های تجاری مختلف'
            }
        },
        dubai: ['چند دفتر'],
        other: ['نخجوان', 'آذربایجان', 'چین']
    },
    inSystemOnly: true, // همه تعاملات داخل همین چت/سیستم انجام می‌شود؛ مشتری نیازی به تماس تلفنی ندارد
    rules: [
        'هرگز به مشتری نگو که تماس بگیرد یا زنگ بزند',
        'همه چیز داخل همین چت انجام می‌شود؛ کارشناس در همین مکالمه پاسخ خواهد داد',
        'فقط اطلاعات دقیق این بانک را بده؛ حدس نزن'
    ]
};

function getCompanyKnowledge() {
    const raw = process.env.AI_COMPANY_KNOWLEDGE_JSON;
    if (raw && typeof raw === 'string') {
        try {
            return { ...defaultKnowledge, ...JSON.parse(raw) };
        } catch (e) {
            return defaultKnowledge;
        }
    }
    return defaultKnowledge;
}

function formatKnowledgeForPrompt(knowledge) {
    const parts = [];
    parts.push(`مدیرعامل: ${knowledge.ceo}`);
    parts.push('دفاتر:');
    if (knowledge.offices.iran?.length) parts.push(`  - ایران: ${knowledge.offices.iran.join('، ')}`);
    if (knowledge.offices.turkey) {
        const t = knowledge.offices.turkey;
        if (t.istanbul) {
            parts.push(`  - ترکیه - استانبول (دفتر اصلی صرافی): ${t.istanbul.address}`);
        }
        if (t.magdiKoy) parts.push(`  - ترکیه - مجدی‌کوی: IT و بازارگانی`);
        if (t.senirt) parts.push(`  - ترکیه - اسنیورت: اداری`);
    }
    if (knowledge.offices.dubai?.length) parts.push(`  - دبی: ${Array.isArray(knowledge.offices.dubai) ? knowledge.offices.dubai.join('، ') : knowledge.offices.dubai}`);
    if (knowledge.offices.other?.length) parts.push(`  - سایر: ${knowledge.offices.other.join('، ')}`);
    if (knowledge.rules?.length) parts.push('قوانین: ' + knowledge.rules.join('؛ '));
    return parts.join('\n');
}

module.exports = {
    getCompanyKnowledge,
    formatKnowledgeForPrompt,
    defaultKnowledge
};
