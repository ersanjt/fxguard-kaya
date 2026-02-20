/**
 * دپارتمان‌های پیش‌فرض برای صرافی
 * در اولین راه‌اندازی یا وقتی فقط پشتیبانی وجود دارد، این دپارتمان‌ها ایجاد می‌شوند.
 */
const { Department } = require('../models');

const DEFAULT_DEPARTMENTS = [
    {
        name: 'حواله و انتقال',
        description: 'حواله ارز، وایر، انتقال به امارات، ترکیه، اروپا و سایر کشورها',
        keywords: 'حواله,حواله ای,وایر,انتقال,دلار,یورو,درهم,لیر,امارات,ترکیه,دبی,قیمت حواله,مبلغ حواله,swift,سوئیفت,انتقال وجه,انتقال ارز',
        color: '#10b981',
        isDefault: false
    },
    {
        name: 'خرید و فروش ارز',
        description: 'خرید و فروش نقدی ارز، تبدیل، نرخ لحظه',
        keywords: 'خرید,فروش,ارز,دلار,یورو,درهم,لیر,پوند,قیمت,نرخ,نرخ لحظه,تبدیل,تعویض,مبادله,صرافی,نقدی,چند,چقدر',
        color: '#3b82f6',
        isDefault: false
    },
    {
        name: 'پشتیبانی',
        description: 'پشتیبانی، راهنمایی، سوالات عمومی، شکایات',
        keywords: 'پشتیبانی,مشکل,راهنما,سوال,شکایت,کمک,راهنمایی,مشکلی,ایراد,خطا,چطور,چگونه,وضعیت,پیگیری',
        color: '#3498db',
        isDefault: true
    }
];

/**
 * دپارتمان‌های پیش‌فرض را ایجاد می‌کند اگر وجود نداشته باشند
 */
async function ensureDefaultDepartments() {
    try {
        const existing = await Department.findAll({ where: { isActive: true }, attributes: ['name'] });
        const existingNames = new Set(existing.map(d => d.name.trim().toLowerCase()));

        for (const dept of DEFAULT_DEPARTMENTS) {
            const nameKey = dept.name.trim().toLowerCase();
            if (existingNames.has(nameKey)) continue;

            await Department.create({
                name: dept.name,
                description: dept.description,
                keywords: dept.keywords,
                color: dept.color,
                isDefault: dept.isDefault,
                isActive: true
            });
            existingNames.add(nameKey);
        }
    } catch (err) {
        console.warn('ensureDefaultDepartments:', err?.message);
    }
}

module.exports = { ensureDefaultDepartments, DEFAULT_DEPARTMENTS };
