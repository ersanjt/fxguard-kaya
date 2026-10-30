/**
 * Kaya CRM — حوزهٔ فعالیت سازمان و ماژول‌ها (عمومی / اختصاصی / اضافی)
 * @file    backend/lib/tenantSkills.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

/**
 * tier:
 *   general  — در همهٔ پنل‌ها همیشه روشن؛ خاموش نمی‌شود.
 *   industry — اختصاصی حوزه‌های industries؛ برای همان حوزه پیش‌فرض روشن، برای بقیه به‌عنوان افزونه قابل افزودن.
 *   addon    — افزونهٔ عمومی اختیاری برای هر حوزه.
 * pages: data-page سایدبار که با خاموش شدن ماژول مخفی می‌شود.
 * apiPrefixes: مسیرهایی که با خاموش شدن ماژول روی سرور 403 می‌گیرند.
 * requires: ماژول‌هایی که با روشن شدن این ماژول خودکار روشن می‌شوند.
 * comingSoon: هنوز پیاده نشده — فقط در کاتالوگ نشان داده می‌شود.
 */
const SKILLS = [
    { id: 'conversations', tier: 'general', pages: [], label: { fa: 'مکالمات و تمپلیت پیام', en: 'Conversations & templates', tr: 'Sohbetler ve şablonlar' } },
    { id: 'customers', tier: 'general', pages: [], label: { fa: 'مشتریان', en: 'Customers', tr: 'Müşteriler' } },
    { id: 'whatsapp', tier: 'general', pages: [], label: { fa: 'اتصال واتساپ', en: 'WhatsApp connection', tr: 'WhatsApp bağlantısı' } },
    { id: 'team', tier: 'general', pages: [], label: { fa: 'کاربران و دپارتمان‌ها', en: 'Users & departments', tr: 'Kullanıcılar ve departmanlar' } },
    { id: 'tickets', tier: 'general', pages: [], label: { fa: 'تیکت‌های داخلی', en: 'Internal tickets', tr: 'Dahili talepler' } },
    { id: 'tasks', tier: 'general', pages: [], label: { fa: 'وظایف و تسک‌ها', en: 'Tasks', tr: 'Görevler' } },
    { id: 'internal_chat', tier: 'general', pages: [], label: { fa: 'چت داخلی', en: 'Internal chat', tr: 'Dahili sohbet' } },
    { id: 'announcements', tier: 'general', pages: [], label: { fa: 'اعلان‌ها', en: 'Announcements', tr: 'Duyurular' } },
    { id: 'staff_monitoring', tier: 'general', pages: [], label: { fa: 'نظارت و حضور کارکنان', en: 'Staff supervision & presence', tr: 'Personel denetimi ve çevrimiçi durum' } },

    { id: 'processes', tier: 'addon', pages: ['processes'], label: { fa: 'فرایندهای کسب‌وکار', en: 'Business processes', tr: 'İş süreçleri' } },
    { id: 'branches', tier: 'addon', pages: ['branches'], label: { fa: 'چندشعبه', en: 'Multiple branches', tr: 'Çoklu şube' } },
    { id: 'invoicing', tier: 'addon', comingSoon: true, pages: [], label: { fa: 'پیش‌فاکتور و فاکتور', en: 'Quotes & invoices', tr: 'Teklif ve fatura' } },
    { id: 'contracts', tier: 'addon', comingSoon: true, pages: [], label: { fa: 'قراردادها و امضای دیجیتال', en: 'Contracts & e-signature', tr: 'Sözleşmeler ve e-imza' } },

    { id: 'fx_rates', tier: 'industry', industries: ['exchange'], pages: ['rates', 'rates-charts'], apiPrefixes: ['/api/rates', '/api/exchange'], label: { fa: 'نرخ و چارت ارز', en: 'FX rates & charts', tr: 'Döviz kurları ve grafikler' } },
    { id: 'exchange_services', tier: 'industry', industries: ['exchange'], pages: ['services'], apiPrefixes: ['/api/services'], label: { fa: 'خدمات صرافی', en: 'Exchange services', tr: 'Döviz hizmetleri' } },

    { id: 'patients', tier: 'industry', industries: ['health'], pages: ['clinic-patients'], apiPrefixes: ['/api/clinic/patients'], label: { fa: 'پرونده بیماران', en: 'Patient records', tr: 'Hasta kayıtları' } },
    { id: 'doctors', tier: 'industry', industries: ['health'], pages: ['clinic-doctors'], apiPrefixes: ['/api/clinic/doctors'], label: { fa: 'پزشکان و متخصصان', en: 'Doctors & specialists', tr: 'Doktorlar ve uzmanlar' } },
    { id: 'appointments', tier: 'industry', industries: ['health'], requires: ['patients', 'doctors'], pages: ['clinic-appointments'], apiPrefixes: ['/api/clinic/appointments'], label: { fa: 'نوبت‌دهی', en: 'Appointments', tr: 'Randevular' } },
    { id: 'treatment_packages', tier: 'industry', industries: ['health'], pages: ['clinic-packages'], apiPrefixes: ['/api/clinic/packages'], label: { fa: 'پکیج‌های درمانی (توریسم سلامت)', en: 'Treatment packages (health tourism)', tr: 'Tedavi paketleri (sağlık turizmi)' } },

    { id: 'tours', tier: 'industry', industries: ['travel'], comingSoon: true, pages: [], label: { fa: 'تورها', en: 'Tours', tr: 'Turlar' } },
    { id: 'bookings', tier: 'industry', industries: ['travel'], comingSoon: true, pages: [], label: { fa: 'رزرو بلیت و هتل', en: 'Ticket & hotel bookings', tr: 'Bilet ve otel rezervasyonları' } },
    { id: 'travel_documents', tier: 'industry', industries: ['travel'], comingSoon: true, pages: [], label: { fa: 'پاسپورت و ویزا', en: 'Passports & visas', tr: 'Pasaport ve vize' } },

    { id: 'property_listings', tier: 'industry', industries: ['real_estate'], comingSoon: true, pages: [], label: { fa: 'فایل‌های ملکی', en: 'Property listings', tr: 'Emlak ilanları' } },
    { id: 'construction_projects', tier: 'industry', industries: ['real_estate'], comingSoon: true, pages: [], label: { fa: 'پروژه‌های ساخت‌وساز', en: 'Construction projects', tr: 'İnşaat projeleri' } },
    { id: 'site_visits', tier: 'industry', industries: ['real_estate'], comingSoon: true, pages: [], label: { fa: 'بازدیدها', en: 'Site visits', tr: 'Yer ziyaretleri' } },

    { id: 'production_orders', tier: 'industry', industries: ['manufacturing'], comingSoon: true, pages: [], label: { fa: 'سفارش تولید', en: 'Production orders', tr: 'Üretim emirleri' } },
    { id: 'product_catalog', tier: 'industry', industries: ['manufacturing', 'food_distribution'], comingSoon: true, pages: [], label: { fa: 'کاتالوگ محصولات', en: 'Product catalog', tr: 'Ürün kataloğu' } },
    { id: 'sales_orders', tier: 'industry', industries: ['manufacturing', 'food_distribution'], comingSoon: true, pages: [], label: { fa: 'سفارش‌ها', en: 'Sales orders', tr: 'Satış siparişleri' } },
    { id: 'inventory', tier: 'industry', industries: ['manufacturing', 'food_distribution'], comingSoon: true, pages: [], label: { fa: 'انبار و موجودی', en: 'Inventory', tr: 'Stok' } },
    { id: 'delivery_routes', tier: 'industry', industries: ['food_distribution'], comingSoon: true, pages: [], label: { fa: 'مسیر پخش و رانندگان', en: 'Delivery routes & drivers', tr: 'Dağıtım rotaları ve sürücüler' } },
];

/**
 * addons: افزونه‌های اضافی که هنگام ساخت پنل برای این حوزه روشن می‌شوند (ماژول‌های اختصاصی خودکارند).
 * terminology: جایگزینی کلیدهای i18n داشبورد برای این حوزه.
 */
const INDUSTRIES = [
    {
        id: 'travel',
        label: { fa: 'آژانس مسافرتی و گردشگری', en: 'Travel agency & tourism', tr: 'Seyahat acentesi ve turizm' },
        addons: ['processes'],
        terminology: { nav_customers: { fa: 'مسافران', en: 'Travelers', tr: 'Yolcular' } },
    },
    {
        id: 'health',
        label: { fa: 'بیمارستان، کلینیک و توریسم سلامت', en: 'Hospital, clinic & health tourism', tr: 'Hastane, klinik ve sağlık turizmi' },
        addons: ['processes'],
        // «بیماران» منوی پرونده بیماران است؛ صفحهٔ مشتریان برای کلینیک مخاطبان واتساپ است
        terminology: { nav_customers: { fa: 'مخاطبان', en: 'Contacts', tr: 'Kişiler' } },
    },
    {
        id: 'exchange',
        label: { fa: 'صرافی', en: 'Currency exchange', tr: 'Döviz bürosu' },
        addons: ['branches'],
        terminology: {},
    },
    {
        id: 'manufacturing',
        label: { fa: 'کارخانه و تولید', en: 'Factory & manufacturing', tr: 'Fabrika ve üretim' },
        addons: ['processes'],
        terminology: { nav_customers: { fa: 'خریداران', en: 'Buyers', tr: 'Alıcılar' } },
    },
    {
        id: 'food_distribution',
        label: { fa: 'توزیع مواد غذایی', en: 'Food distribution', tr: 'Gıda dağıtımı' },
        addons: ['branches'],
        terminology: { nav_customers: { fa: 'فروشگاه‌ها و مشتریان', en: 'Retailers & customers', tr: 'Bayiler ve müşteriler' } },
    },
    {
        id: 'real_estate',
        label: { fa: 'املاک و ساخت‌وساز', en: 'Real estate & construction', tr: 'Emlak ve inşaat' },
        addons: ['processes'],
        terminology: { nav_customers: { fa: 'متقاضیان', en: 'Clients', tr: 'Müşteri adayları' } },
    },
    {
        id: 'general',
        label: { fa: 'سایر کسب‌وکارها', en: 'Other business', tr: 'Diğer işletmeler' },
        addons: ['processes', 'branches'],
        terminology: {},
    },
];

const SKILL_BY_ID = new Map(SKILLS.map((s) => [s.id, s]));
const INDUSTRY_BY_ID = new Map(INDUSTRIES.map((i) => [i.id, i]));
const DEFAULT_INDUSTRY = 'general';

/**
 * پنل‌های بدون enabledSkills (کایا/پلتفرم و پنل‌های قبل از این قابلیت) دقیقاً همان ماژول‌هایی را دارند
 * که پیش از معرفی ماژول‌های اختصاصی وجود داشت؛ ماژول‌های جدید حوزه‌ها خودکار به آن‌ها اضافه نمی‌شوند.
 */
const LEGACY_SKILLS = ['processes', 'branches', 'fx_rates', 'exchange_services'];

function isGeneralSkill(skill) {
    return !!skill && skill.tier === 'general';
}

function normalizeIndustry(raw) {
    const v = String(raw || '')
        .trim()
        .toLowerCase();
    return INDUSTRY_BY_ID.has(v) ? v : null;
}

/** فقط ماژول‌های معتبر غیرعمومی + وابستگی‌هایشان؛ ترتیب کاتالوگ حفظ می‌شود. */
function normalizeSkills(list) {
    const wanted = new Set(
        (Array.isArray(list) ? list : [])
            .map((s) => String(s || '').trim())
            .filter((id) => SKILL_BY_ID.has(id))
    );
    const queue = Array.from(wanted);
    while (queue.length) {
        const skill = SKILL_BY_ID.get(queue.pop());
        (skill.requires || []).forEach((dep) => {
            if (!wanted.has(dep)) {
                wanted.add(dep);
                queue.push(dep);
            }
        });
    }
    return SKILLS.filter((s) => !isGeneralSkill(s) && wanted.has(s.id)).map((s) => s.id);
}

function industryModules(industry) {
    const id = normalizeIndustry(industry);
    if (!id) return [];
    return SKILLS.filter((s) => s.tier === 'industry' && s.industries.indexOf(id) >= 0).map((s) => s.id);
}

function defaultSkillsFor(industry) {
    const id = normalizeIndustry(industry) || DEFAULT_INDUSTRY;
    const ind = INDUSTRY_BY_ID.get(id);
    return normalizeSkills(industryModules(id).concat(ind.addons));
}

function parseSkillsColumn(raw) {
    if (raw == null || raw === '') return null;
    if (Array.isArray(raw)) return normalizeSkills(raw);
    try {
        const parsed = JSON.parse(String(raw));
        return Array.isArray(parsed) ? normalizeSkills(parsed) : null;
    } catch (_) {
        return null;
    }
}

/** ماژول‌های روشن مؤثر این tenant (پلتفرم و پنل‌های قبلی → LEGACY_SKILLS). */
function enabledSkillsForTenant(tenant) {
    if (tenant && !tenant.isPlatform && Array.isArray(tenant.enabledSkills)) return tenant.enabledSkills;
    return LEGACY_SKILLS;
}

function isSkillEnabled(tenant, skillId) {
    const skill = SKILL_BY_ID.get(skillId);
    if (!skill) return false;
    if (isGeneralSkill(skill)) return true;
    return enabledSkillsForTenant(tenant).indexOf(skillId) >= 0;
}

function hiddenPagesForTenant(tenant) {
    const enabled = enabledSkillsForTenant(tenant);
    const out = [];
    SKILLS.forEach((s) => {
        if (isGeneralSkill(s) || enabled.indexOf(s.id) >= 0) return;
        s.pages.forEach((p) => {
            if (out.indexOf(p) < 0) out.push(p);
        });
    });
    return out;
}

function mergeSkillHidden(hiddenSections, tenant) {
    const hidden = Array.isArray(hiddenSections) ? hiddenSections.slice() : [];
    hiddenPagesForTenant(tenant).forEach((p) => {
        if (hidden.indexOf(p) < 0) hidden.push(p);
    });
    return hidden;
}

/** ماژولی که این مسیر API به آن تعلق دارد و برای این tenant خاموش است، یا null. */
function disabledSkillForPath(tenant, path) {
    const enabled = enabledSkillsForTenant(tenant);
    // Express مسیرها را بدون حساسیت به حروف و با اسلش تکراری هم مچ می‌کند
    const p = String(path || '')
        .split('?')[0]
        .toLowerCase()
        .replace(/\/{2,}/g, '/');
    for (const s of SKILLS) {
        if (isGeneralSkill(s) || !s.apiPrefixes || enabled.indexOf(s.id) >= 0) continue;
        const hit = s.apiPrefixes.some((prefix) => p === prefix || p.indexOf(prefix + '/') === 0);
        if (hit) return s;
    }
    return null;
}

function terminologyForIndustry(industry) {
    const ind = INDUSTRY_BY_ID.get(normalizeIndustry(industry) || '');
    return ind ? ind.terminology : {};
}

/** روی خروجی تنظیمات پنل: صفحات ماژول‌های خاموش به navHiddenSections + واژگان حوزه. */
function attachTenantSkillsToSettings(out, tenantArg) {
    let tenant = tenantArg;
    if (tenant === undefined) {
        const { getCurrentTenant } = require('./tenantContext');
        tenant = getCurrentTenant();
    }
    const base = out.navHiddenSections || out.hiddenSections;
    out.navHiddenSections = mergeSkillHidden(base, tenant);
    const industry = tenant && !tenant.isPlatform ? tenant.industry || null : null;
    out.industry = industry;
    out.terminology = terminologyForIndustry(industry);
    return out;
}

function publicCatalog() {
    return {
        industries: INDUSTRIES.map((i) => ({
            id: i.id,
            label: i.label,
            modules: industryModules(i.id),
            skills: defaultSkillsFor(i.id),
        })),
        skills: SKILLS.map((s) => ({
            id: s.id,
            tier: s.tier,
            industries: s.industries ? s.industries.slice() : [],
            requires: s.requires ? s.requires.slice() : [],
            label: s.label,
            comingSoon: !!s.comingSoon,
        })),
    };
}

module.exports = {
    SKILLS,
    INDUSTRIES,
    DEFAULT_INDUSTRY,
    LEGACY_SKILLS,
    normalizeIndustry,
    normalizeSkills,
    industryModules,
    defaultSkillsFor,
    parseSkillsColumn,
    enabledSkillsForTenant,
    isSkillEnabled,
    hiddenPagesForTenant,
    mergeSkillHidden,
    disabledSkillForPath,
    terminologyForIndustry,
    attachTenantSkillsToSettings,
    publicCatalog,
};
