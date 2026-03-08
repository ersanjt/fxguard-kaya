(function() {
    let LANG = 'en';
    const TRANSLATIONS = {
        en: {
            logo: 'WhatsApp CRM',
            nav_why: 'Why CRM?', nav_features: 'Features', nav_panel: 'Panel', nav_pricing: 'Pricing', nav_contact: 'Contact', nav_panel_btn: 'Get Started',
            hero_badge: '🚀 Professional WhatsApp CRM Platform',
            hero_title: 'End WhatsApp Chaos. <span>One Panel.</span> All Teams.',
            hero_desc: 'One WhatsApp number. All staff reply from one panel. Customer management, bulk messaging, auto-response, reports — everything in one place. Monthly & yearly plans available.',
            hero_cta1: 'View Plans', hero_cta_wa: 'Consult via WhatsApp', hero_cta2: 'Contact Form',
            problems_title: 'Do You Face These Problems?', problems_sub: 'Many businesses struggle with WhatsApp. We built this panel to solve them.',
            p1_title: '❌ Multiple phones, one number', p1_desc: 'Staff use personal phones. Messages get lost. No unified view of conversations.',
            p2_title: '❌ Slow response, lost customers', p2_desc: 'Delayed replies. Customers leave. No tracking of response time or satisfaction.',
            p3_title: '❌ No customer history', p3_desc: 'Every conversation starts from zero. No tags, no notes, no CRM for WhatsApp.',
            p4_title: '❌ Manual bulk messaging', p4_desc: 'Sending announcements to hundreds? Copy-paste, one by one. Time-consuming and error-prone.',
            solution_title: '✅ WhatsApp CRM solves all of this', solution_desc: 'One number. One panel. All staff. Full history. Bulk messaging. Auto-response. Reports. Start with a monthly or yearly plan — or contact us for custom solutions.', solution_cta: 'See Plans & Pricing',
            features_title: 'Powerful Features', features_sub: 'Everything you need for professional WhatsApp management',
            f1_title: 'Customer Management', f1_desc: 'Full conversation history, tags, custom fields, customer profile — all at a glance.',
            f2_title: 'Real-time Messaging', f2_desc: 'Instant send/receive. Image, video, audio, documents. Status tracking.',
            f3_title: 'Bulk Messaging', f3_desc: 'Send to thousands with delay & variables. No more manual copy-paste.',
            f4_title: 'Auto-Response 24/7', f4_desc: 'Rules by keywords & time. Answer even when no one is online.',
            f5_title: 'Reports & Analytics', f5_desc: 'Dashboard, charts, satisfaction rate. Export to Excel/PDF.',
            f6_title: 'Security & Access', f6_desc: '2FA, role-based access, full activity logs.',
            panel_title: 'Panel Preview', panel_sub: 'See the dashboard on desktop and mobile. Works everywhere.', panel_desktop: 'Desktop Dashboard', panel_mobile: 'Mobile View',
            stat1: 'Modules', stat2: 'Access Levels', stat3: 'Auto-Reply', stat4: 'Integration',
            pricing_title: 'Simple, Transparent Pricing', pricing_sub: 'Choose monthly or yearly. Need custom? Contact us.',
            plan_monthly: 'Monthly', plan_yearly: 'Yearly', plan_custom: 'Custom', plan_mo: '/month', plan_yr: '/year', plan_save: 'Save 2 months!', plan_popular: 'Popular',
            plan_1: 'Full panel access', plan_2: 'Unlimited conversations', plan_3: 'Bulk messaging', plan_4: 'Reports & export', plan_5: 'Email support',
            plan_c1: 'Personalized setup', plan_c2: 'On-premise option', plan_c3: 'Multi-branch', plan_c4: 'Custom integrations', plan_c5: 'Dedicated support',
            plan_custom_price: 'On request', plan_btn: 'Contact to Buy', plan_contact: 'Contact Us',
            form_title: 'Contact Us', form_sub: 'Questions, custom quote, or demo request? Fill the form or WhatsApp us.',
            form_name: 'Name *', form_email: 'Email *', form_phone: 'Phone / WhatsApp', form_message: 'Message *', form_submit: 'Send Message', form_success: 'Thank you! We will contact you soon.', form_wa: 'Or contact via WhatsApp +90 501 067 6486',
            cta_title: 'Ready to Get Started?', cta_desc: 'Choose a plan, request a demo, or ask for a custom quote. We\'re here to help.', cta_plans: 'View Plans', cta_wa: 'WhatsApp', cta_form: 'Contact Form',
            trust_demo: 'Free demo', trust_24h: '24h response', trust_secure: 'Secure & reliable',
            footer_contact: 'Contact', footer_support: 'Support'
        },
        fa: {
            logo: 'WhatsApp CRM',
            nav_why: 'چرا CRM؟', nav_features: 'امکانات', nav_panel: 'پنل', nav_pricing: 'قیمت', nav_contact: 'تماس', nav_panel_btn: 'شروع کنید',
            hero_badge: '🚀 پلتفرم حرفه‌ای CRM واتساپ',
            hero_title: 'پایان آشفتگی واتساپ. <span>یک پنل.</span> همه تیم.',
            hero_desc: 'یک شماره واتساپ. همه کارمندان از یک پنل پاسخ می‌دهند. مدیریت مشتری، پیام انبوه، پاسخ خودکار، گزارشات — همه در یک جا. اشتراک ماهانه و سالانه.',
            hero_cta1: 'مشاهده پلن‌ها', hero_cta_wa: 'مشاوره واتساپ', hero_cta2: 'فرم تماس',
            problems_title: 'این مشکلات را دارید؟', problems_sub: 'بسیاری از کسب‌وکارها با واتساپ دست‌وپنجه نرم می‌کنند. این پنل برای حل آن‌هاست.',
            p1_title: '❌ چند گوشی، یک شماره', p1_desc: 'کارمندان از گوشی شخصی استفاده می‌کنند. پیام‌ها گم می‌شوند. نمای یکپارچه وجود ندارد.',
            p2_title: '❌ پاسخ دیر، مشتری از دست رفته', p2_desc: 'تأخیر در پاسخ. مشتری می‌رود. هیچ ردیابی از زمان پاسخ یا رضایت.',
            p3_title: '❌ بدون تاریخچه مشتری', p3_desc: 'هر مکالمه از صفر شروع می‌شود. بدون تگ، یادداشت یا CRM برای واتساپ.',
            p4_title: '❌ پیام انبوه دستی', p4_desc: 'ارسال اعلان به صدها نفر؟ کپی-پیست یکی یکی. زمان‌بر و پرخطا.',
            solution_title: '✅ CRM واتساپ همه را حل می‌کند', solution_desc: 'یک شماره. یک پنل. همه کارمندان. تاریخچه کامل. پیام انبوه. پاسخ خودکار. گزارشات. با اشتراک ماهانه یا سالانه شروع کنید — یا برای راه‌حل سفارشی با ما تماس بگیرید.', solution_cta: 'پلن‌ها و قیمت',
            features_title: 'امکانات قدرتمند', features_sub: 'هر آنچه برای مدیریت حرفه‌ای واتساپ نیاز دارید',
            f1_title: 'مدیریت مشتریان', f1_desc: 'تاریخچه کامل مکالمات، تگ، فیلدهای سفارشی، پروفایل مشتری — همه در یک نگاه.',
            f2_title: 'پیام لحظه‌ای', f2_desc: 'ارسال/دریافت فوری. تصویر، ویدیو، صوت، سند. ردیابی وضعیت.',
            f3_title: 'پیام انبوه', f3_desc: 'ارسال به هزاران با تأخیر و متغیر. دیگر کپی-پیست دستی نه.',
            f4_title: 'پاسخ خودکار ۲۴/۷', f4_desc: 'قوانین بر اساس کلمه کلیدی و زمان. پاسخ حتی وقتی کسی آنلاین نیست.',
            f5_title: 'گزارشات و تحلیل', f5_desc: 'داشبورد، نمودار، نرخ رضایت. خروجی Excel/PDF.',
            f6_title: 'امنیت و دسترسی', f6_desc: 'احراز دو مرحله‌ای، دسترسی نقش‌محور، لاگ کامل.',
            panel_title: 'نمایش پنل', panel_sub: 'داشبورد را روی دسکتاپ و موبایل ببینید. همه جا کار می‌کند.', panel_desktop: 'داشبورد دسکتاپ', panel_mobile: 'نمای موبایل',
            stat1: 'ماژول', stat2: 'سطح دسترسی', stat3: 'پاسخ خودکار', stat4: 'یکپارچه‌سازی',
            pricing_title: 'قیمت‌گذاری ساده و شفاف', pricing_sub: 'ماهانه یا سالانه انتخاب کنید. سفارشی می‌خواهید؟ تماس بگیرید.',
            plan_monthly: 'ماهانه', plan_yearly: 'سالانه', plan_custom: 'سفارشی', plan_mo: '/ماه', plan_yr: '/سال', plan_save: '۲ ماه رایگان!', plan_popular: 'محبوب',
            plan_1: 'دسترسی کامل پنل', plan_2: 'مکالمات نامحدود', plan_3: 'پیام انبوه', plan_4: 'گزارشات و خروجی', plan_5: 'پشتیبانی ایمیل',
            plan_c1: 'نصب شخصی‌سازی', plan_c2: 'گزینه On-premise', plan_c3: 'چند شعبه', plan_c4: 'یکپارچه‌سازی سفارشی', plan_c5: 'پشتیبانی اختصاصی',
            plan_custom_price: 'درخواستی', plan_btn: 'تماس برای خرید', plan_contact: 'تماس با ما',
            form_title: 'تماس با ما', form_sub: 'سؤال، پیشنهاد سفارشی یا درخواست دمو؟ فرم را پر کنید یا واتساپ بزنید.',
            form_name: 'نام *', form_email: 'ایمیل *', form_phone: 'تلفن / واتساپ', form_message: 'پیام *', form_submit: 'ارسال', form_success: 'متشکریم! به زودی با شما تماس می‌گیریم.', form_wa: 'یا واتساپ: ۰۰۹۰۵۰۱۰۶۷۶۴۸۶',
            cta_title: 'آماده شروع هستید؟', cta_desc: 'پلن انتخاب کنید، دمو بخواهید یا پیشنهاد سفارشی. ما اینجا هستیم.', cta_plans: 'پلن‌ها', cta_wa: 'واتساپ', cta_form: 'فرم تماس',
            trust_demo: 'دمو رایگان', trust_24h: 'پاسخ ۲۴ ساعته', trust_secure: 'امن و قابل اعتماد',
            footer_contact: 'تماس', footer_support: 'پشتیبانی'
        },
        tr: {
            logo: 'WhatsApp CRM',
            nav_why: 'Neden CRM?', nav_features: 'Özellikler', nav_panel: 'Panel', nav_pricing: 'Fiyat', nav_contact: 'İletişim', nav_panel_btn: 'Başlayın',
            hero_badge: '🚀 Profesyonel WhatsApp CRM Platformu',
            hero_title: 'WhatsApp Karmaşasına Son. <span>Tek Panel.</span> Tüm Ekipler.',
            hero_desc: 'Tek WhatsApp numarası. Tüm personel tek panelden yanıt verir. Müşteri yönetimi, toplu mesaj, otomatik yanıt, raporlar — hepsi tek yerde. Aylık ve yıllık planlar.',
            hero_cta1: 'Planları Gör', hero_cta_wa: 'WhatsApp ile Danışın', hero_cta2: 'İletişim Formu',
            problems_title: 'Bu Sorunlarla Karşılaşıyor musunuz?', problems_sub: 'Birçok işletme WhatsApp ile mücadele ediyor. Bu paneli bunları çözmek için yaptık.',
            p1_title: '❌ Birden fazla telefon, tek numara', p1_desc: 'Personel kişisel telefon kullanıyor. Mesajlar kayboluyor. Birleşik görünüm yok.',
            p2_title: '❌ Yavaş yanıt, kayıp müşteri', p2_desc: 'Gecikmeli yanıtlar. Müşteri gidiyor. Yanıt süresi veya memnuniyet takibi yok.',
            p3_title: '❌ Müşteri geçmişi yok', p3_desc: 'Her sohbet sıfırdan başlıyor. Etiket, not veya WhatsApp CRM yok.',
            p4_title: '❌ Manuel toplu mesaj', p4_desc: 'Yüzlerce kişiye duyuru? Kopyala-yapıştır, tek tek. Zaman alıcı ve hatalı.',
            solution_title: '✅ WhatsApp CRM hepsini çözer', solution_desc: 'Tek numara. Tek panel. Tüm personel. Tam geçmiş. Toplu mesaj. Otomatik yanıt. Raporlar. Aylık veya yıllık planla başlayın — veya özel çözüm için bize ulaşın.', solution_cta: 'Planlar ve Fiyat',
            features_title: 'Güçlü Özellikler', features_sub: 'Profesyonel WhatsApp yönetimi için ihtiyacınız olan her şey',
            f1_title: 'Müşteri Yönetimi', f1_desc: 'Tam sohbet geçmişi, etiketler, özel alanlar, müşteri profili — tek bakışta.',
            f2_title: 'Anlık Mesajlaşma', f2_desc: 'Anında gönder/al. Görsel, video, ses, belge. Durum takibi.',
            f3_title: 'Toplu Mesajlaşma', f3_desc: 'Gecikme ve değişkenlerle binlere gönderin. Artık manuel kopyala-yapıştır yok.',
            f4_title: '7/24 Otomatik Yanıt', f4_desc: 'Anahtar kelime ve zamana göre kurallar. Kimse çevrimiçi değilken bile yanıt verin.',
            f5_title: 'Raporlar ve Analiz', f5_desc: 'Panel, grafikler, memnuniyet oranı. Excel/PDF\'e aktarım.',
            f6_title: 'Güvenlik ve Erişim', f6_desc: '2FA, rol tabanlı erişim, tam aktivite günlükleri.',
            panel_title: 'Panel Önizleme', panel_sub: 'Masaüstü ve mobilde paneli görün. Her yerde çalışır.', panel_desktop: 'Masaüstü Paneli', panel_mobile: 'Mobil Görünüm',
            stat1: 'Modül', stat2: 'Erişim Seviyeleri', stat3: 'Otomatik Yanıt', stat4: 'Entegrasyon',
            pricing_title: 'Basit, Şeffaf Fiyatlandırma', pricing_sub: 'Aylık veya yıllık seçin. Özel mi? Bize ulaşın.',
            plan_monthly: 'Aylık', plan_yearly: 'Yıllık', plan_custom: 'Özel', plan_mo: '/ay', plan_yr: '/yıl', plan_save: '2 ay tasarruf!', plan_popular: 'Popüler',
            plan_1: 'Tam panel erişimi', plan_2: 'Sınırsız sohbet', plan_3: 'Toplu mesaj', plan_4: 'Raporlar ve dışa aktarma', plan_5: 'E-posta desteği',
            plan_c1: 'Kişiselleştirilmiş kurulum', plan_c2: 'On-premise seçeneği', plan_c3: 'Çok şubeli', plan_c4: 'Özel entegrasyonlar', plan_c5: 'Özel destek',
            plan_custom_price: 'Talep üzerine', plan_btn: 'Satın Almak İçin İletişim', plan_contact: 'Bize Ulaşın',
            form_title: 'Bize Ulaşın', form_sub: 'Sorular, özel teklif veya demo isteği? Formu doldurun veya WhatsApp yazın.',
            form_name: 'Ad *', form_email: 'E-posta *', form_phone: 'Telefon / WhatsApp', form_message: 'Mesaj *', form_submit: 'Gönder', form_success: 'Teşekkürler! Yakında sizinle iletişime geçeceğiz.', form_wa: 'Veya WhatsApp: +90 501 067 6486',
            cta_title: 'Başlamaya Hazır mısınız?', cta_desc: 'Plan seçin, demo isteyin veya özel teklif alın. Yardımcı olmaya hazırız.', cta_plans: 'Planlar', cta_wa: 'WhatsApp', cta_form: 'İletişim Formu',
            trust_demo: 'Ücretsiz demo', trust_24h: '24 saat yanıt', trust_secure: 'Güvenli ve güvenilir',
            footer_contact: 'İletişim', footer_support: 'Destek'
        }
    };

    function applyLang(lang) {
        LANG = lang;
        document.documentElement.lang = lang === 'fa' ? 'fa' : (lang === 'tr' ? 'tr' : 'en');
        document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
        const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
            const key = el.getAttribute('data-i18n');
            if (t[key]) el.innerHTML = t[key];
        });
        document.querySelectorAll('.lang-switch button').forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });
    }

    function detectAndSetLang() {
        const params = new URLSearchParams(window.location.search);
        const urlLang = params.get('lang');
        if (urlLang && TRANSLATIONS[urlLang]) { applyLang(urlLang); return; }
        const saved = localStorage.getItem('landing_lang');
        if (saved && TRANSLATIONS[saved]) { applyLang(saved); return; }
        const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase().split('-')[0];
        if (browserLang === 'fa') applyLang('fa');
        else if (browserLang === 'tr') applyLang('tr');
        else applyLang('en');
    }

    document.querySelectorAll('.lang-switch button').forEach(function(btn) {
        btn.addEventListener('click', function() {
            localStorage.setItem('landing_lang', this.getAttribute('data-lang'));
            applyLang(this.getAttribute('data-lang'));
        });
    });

    detectAndSetLang();

    /* Scroll reveal */
    const revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length && 'IntersectionObserver' in window) {
        const revealObs = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });
        revealEls.forEach(function(el) { revealObs.observe(el); });
    } else {
        revealEls.forEach(function(el) { el.classList.add('visible'); });
    }

    const url = (typeof PANEL_URL !== 'undefined') ? PANEL_URL : 'https://app.fxguard.io';
    document.querySelectorAll('#btnPanel, #btnPanelMob').forEach(function(btn){ if(btn) btn.href = url; });

    window.addEventListener('scroll', function() {
        const h = document.getElementById('header');
        if (h) h.classList.toggle('scrolled', window.scrollY > 50);
    });

    const navToggle = document.getElementById('navToggle');
    const navMobile = document.getElementById('navMobile');
    const navClose = document.getElementById('navClose');
    if (navToggle && navMobile) navToggle.addEventListener('click', function() { navMobile.classList.add('open'); });
    if (navClose && navMobile) navClose.addEventListener('click', function() { navMobile.classList.remove('open'); });
    navMobile && navMobile.querySelectorAll('a').forEach(function(a) {
        a.addEventListener('click', function() { navMobile.classList.remove('open'); });
    });

    const form = document.getElementById('contactForm');
    const formSuccess = document.getElementById('formSuccess');
    if (form && formSuccess) {
        form.addEventListener('submit', function(e) {
            if (form.getAttribute('action').indexOf('YOUR_FORM_ID') >= 0) {
                e.preventDefault();
                formSuccess.classList.add('show');
                form.style.display = 'none';
                return false;
            }
        });
    }
})();
