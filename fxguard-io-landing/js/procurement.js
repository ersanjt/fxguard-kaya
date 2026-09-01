/**
 * FXGuard storefront — procurement page i18n
 * @file    fxguard-io-landing/js/procurement.js
 */
(function () {
    var T = {
        ar: {
            h1: 'ملخص الأمن والمشتريات',
            intro: 'صفحة واحدة للمالية وتقنية المعلومات التي تحتاج فاتورة أو أمر شراء. ليست شهادة SOC 2 / ISO. تصف المنتج المستضاف على <a href="https://app.fxguard.io">app.fxguard.io</a>. الموقع: <a href="https://fxguard.io">fxguard.io</a>.',
            print: 'طباعة / حفظ PDF',
            who_h: 'البائع',
            who_p: 'البائع: <strong>ERST IT Solutions Bilişim Teknolojileri Sanayi ve Ticaret Ltd. Şti.</strong> (المنتج: FXGuard). المبيعات: <a href="mailto:sales@fxguard.io">sales@fxguard.io</a> · الدعم: <a href="mailto:support@fxguard.io">support@fxguard.io</a> · واتساب: <a href="https://wa.me/905010676486">+90 501 067 6486</a>.',
            buy_h: 'كيف تشتري',
            buy_1: '<strong>Cloud Start — 49$ شهرياً</strong> — فرع واحد، حتى 3 موظفين. واتساب. صندوق وارد وطلبات ومهام. بدون وحدة أسعار صرف.',
            buy_2: '<strong>سحابي تجاري — من 249$/شهر</strong> — حتى 3 فروع، 10 موظفين، وحدة FX. فاتورة.',
            buy_3: '<strong>سحابي متعدد الفروع — من 499$/شهر</strong> — فروع أكثر، SLA مكتوب عند الطلب. فاتورة.',
            buy_4: '<strong>ترخيص ذاتي — من 4000$ مرة واحدة</strong> — خوادمك. فاتورة.',
            buy_5: '<strong>استضافة مُدارة — من 800$/شهر</strong> — نُشغّل نسخة مخصصة. فاتورة.',
            buy_note: 'الأسعار الأساسية منشورة؛ الرقم التجاري قابل للتفاوض. المستويات الجديدة للتسجيلات الجديدة فقط.',
            inv_h: 'الفاتورة وأمر الشراء',
            inv_p: 'أرسل اسم الشركة وبريد المالية والرقم الضريبي (إن وجد) والخطة وعدد المقاعد/الفروع عبر <a href="/contact">نموذج الاتصال</a> أو واتساب. عرض مكتوب خلال 24 ساعة في أيام العمل.',
            sec_h: 'الوصول والتدقيق',
            sec_1: '<strong>حسابات موظفين فقط.</strong> لا تسجيل عام. أدوار من المالك إلى الوكيل.',
            sec_2: '<strong>2FA:</strong> TOTP (Google Authenticator).',
            sec_3: '<strong>الجلسة:</strong> JWT في cookie httpOnly عبر HTTPS.',
            sec_4: '<strong>التدقيق:</strong> سجلات نشاط الموظفين.',
            sec_5: '<strong>دفتر العملاء:</strong> المحادثة والوسوم والملاحظات تبقى على لوحة الشركة — ليس على هاتف شخصي.',
            wa_h: 'قناة واتساب — بصراحة',
            wa_p: 'مساران. لا ندّعي أن كل تثبيت Meta BSP.',
            wa_1: '<strong>QR / بوابة WhatsApp Web</strong> — جلسة غير رسمية. الإرسال الجماعي يزيد خطر الحظر.',
            wa_2: '<strong>Meta Cloud API الرسمي</strong> — API تجاري موثّق. مطلوب للبث الجاد.',
            data_h: 'مكان البيانات والمعالجون الفرعيون',
            data_p: 'بيانات app.fxguard.io تُعالج على خادم الإنتاج. عملاء الترخيص يحتفظون بالبيانات على خوادمهم. لا بيع للبيانات الشخصية.',
            data_1: 'استضافة / DNS / TLS لـ fxguard.io و app.fxguard.io',
            data_2: 'إرسال البريد',
            data_3: 'ميتا، فقط عند ربط WhatsApp Cloud API',
            data_4: 'Firebase Cloud Messaging، فقط لتطبيق الموظفين الاختياري',
            data_no: 'لا SDK إعلانات في تطبيق الموظفين. لا ادعاء SOC 2 أو ISO 27001. مشترون أوروبيون: DPA عند الطلب — <a href="/eu/">fxguard.io/eu</a>.',
            trial_h: 'تجربة',
            trial_p: 'الموقع لا ينشر كلمة مرور تجريب عامة. جلسة موجّهة ~10 دقائق أو تجربة 7 أيام برقمك.',
            contact_h: 'الخطوة التالية',
            contact_p: '<a href="/contact">طلب فاتورة</a> · <a href="/pricing">الباقات</a> · <a href="/whatsapp-crm">القناة</a> · <a href="https://wa.me/905010676486">واتساب المبيعات</a>'
        },
        ru: {
            h1: 'Кратко: безопасность и закупки',
            intro: 'Одностраничник для финансов и ИТ, которым нужен счёт или PO. Это не сертификат SOC 2 / ISO. Описывает хостинг на <a href="https://app.fxguard.io">app.fxguard.io</a>. Сайт: <a href="https://fxguard.io">fxguard.io</a>.',
            print: 'Печать / PDF',
            who_h: 'Продавец',
            who_p: 'Продавец: <strong>ERST IT Solutions Bilişim Teknolojileri Sanayi ve Ticaret Ltd. Şti.</strong> (продукт FXGuard). Продажи: <a href="mailto:sales@fxguard.io">sales@fxguard.io</a> · Поддержка: <a href="mailto:support@fxguard.io">support@fxguard.io</a> · WhatsApp: <a href="https://wa.me/905010676486">+90 501 067 6486</a>.',
            buy_h: 'Как купить',
            buy_1: '<strong>Cloud Start — $49/мес</strong> — 1 филиал, до 3 сотрудников. WhatsApp. Inbox, тикеты, задачи. Без FX-модуля.',
            buy_2: '<strong>Cloud Business — от $249/мес</strong> — до 3 филиалов, 10 сотрудников, FX. Счёт.',
            buy_3: '<strong>Cloud multi-branch — от $499/мес</strong> — больше филиалов, SLA по запросу. Счёт.',
            buy_4: '<strong>Self-hosted лицензия — от $4000 разово</strong> — ваши серверы. Счёт.',
            buy_5: '<strong>Managed — от $800/мес</strong> — выделенный инстанс под нашим управлением. Счёт.',
            buy_note: 'Базовые цены опубликованы; коммерческая сумма обсуждается. Новые уровни — только для новых клиентов.',
            inv_h: 'Счёт и заказ на закупку',
            inv_p: 'Отправьте название компании, email бухгалтерии, налоговый ID (если есть), план и число мест/филиалов через <a href="/contact">контакт</a> или WhatsApp. Письменное предложение за 24 ч в рабочие дни.',
            sec_h: 'Доступ и аудит',
            sec_1: '<strong>Только учётки сотрудников.</strong> Нет публичной регистрации. Роли от владельца до агента.',
            sec_2: '<strong>2FA:</strong> TOTP (Google Authenticator).',
            sec_3: '<strong>Сессия:</strong> JWT в httpOnly cookie по HTTPS.',
            sec_4: '<strong>Аудит:</strong> журналы действий персонала.',
            sec_5: '<strong>Книга клиентов:</strong> чат, теги и заметки на панели компании — не на личном телефоне.',
            wa_h: 'Канал WhatsApp — честно',
            wa_p: 'Два пути. Не все установки — Meta BSP.',
            wa_1: '<strong>QR / шлюз WhatsApp Web</strong> — неофициальная сессия. Массовая рассылка повышает риск бана.',
            wa_2: '<strong>Официальный Meta Cloud API</strong> — верифицированный Business API. Нужен для серьёзного broadcast.',
            data_h: 'Данные и субпроцессоры',
            data_p: 'Данные app.fxguard.io обрабатываются на production-хосте. Лицензионные клиенты держат данные у себя. Персональные данные не продаются.',
            data_1: 'Хостинг / DNS / TLS для fxguard.io и app.fxguard.io',
            data_2: 'Доставка email',
            data_3: 'Meta, только при подключении WhatsApp Cloud API',
            data_4: 'Firebase Cloud Messaging, только для опционального staff-приложения',
            data_no: 'Нет рекламных SDK в staff-приложении. Нет заявлений SOC 2 / ISO 27001. EU: DPA по запросу — <a href="/eu/">fxguard.io/eu</a>.',
            trial_h: 'Пробный период',
            trial_p: 'Сайт не публикует общий демо-пароль. ~10-мин сессия с гидом или 7-дневный trial на свой номер.',
            contact_h: 'Дальше',
            contact_p: '<a href="/contact">Запросить счёт</a> · <a href="/pricing">Тарифы</a> · <a href="/whatsapp-crm">Канал</a> · <a href="https://wa.me/905010676486">WhatsApp продажи</a>'
        },
        fa: {
            h1: 'خلاصه امنیت و تدارکات',
            intro: 'این یک‌برگ برای مالی و آی‌تی است که فاکتور یا سفارش خرید می‌خواهند. گواهی SOC 2 / ISO نیست. وضعیت فعلی محصول میزبانی‌شده در <a href="https://app.fxguard.io">app.fxguard.io</a> را توصیف می‌کند. ویترین: <a href="https://fxguard.io">fxguard.io</a>.',
            print: 'چاپ / ذخیره PDF',
            who_h: 'فروشنده',
            who_p: 'فروشنده: <strong>ERST IT Solutions Bilişim Teknolojileri Sanayi ve Ticaret Ltd. Şti.</strong> (محصول: FXGuard). تماس: Ersan Jahed Tabrizi. نشانی: Gökevler Mah. 2312. Sk. Burç İstanbul 18 Blok No: 18 J İç Kapı No: 199, Esenyurt / İstanbul. حوزه مالیاتی: اسنیورت. فروش: <a href="mailto:sales@fxguard.io">sales@fxguard.io</a> · پشتیبانی: <a href="mailto:support@fxguard.io">support@fxguard.io</a> · واتساپ: <a href="https://wa.me/905010676486">+90 501 067 6486</a>. فعالیت: مشاوره رایانه و مدیریت سیستم‌ها (NACE 622000)، از جمله مشاوره امنیت سایبری.',
            buy_h: 'چطور بخرید',
            buy_1: '<strong>Cloud Start — ۴۹ دلار در ماه</strong> — ۱ شعبه، تا ۳ کارمند. تسویه واتساپ. صندوق پیام، درخواست و پیگیری. ماژول نرخ شامل نیست.',
            buy_2: '<strong>ابر تجاری — از ۲۴۹ دلار / ماه</strong> — تا ۳ شعبه، ۱۰ کارمند، ماژول نرخ. فاکتور.',
            buy_3: '<strong>ابر چندشعبه — از ۴۹۹ دلار / ماه</strong> — شعبه بیشتر، SLA نوشته‌شده درخواستی. فاکتور.',
            buy_4: '<strong>مجوز نصب روی سرور شما — از ۴۰۰۰ دلار یک‌بار</strong> — سرور شما. فاکتور.',
            buy_5: '<strong>نسخه اختصاصی با اداره توسط ما — از ۸۰۰ دلار در ماه</strong> — ما یک نسخه اختصاصی را اداره می‌کنیم. فاکتور.',
            buy_note: 'کف قیمت منتشر شده تا تدارکات حدس نزند. رقم نهایی تجاری قابل مذاکره است. سطوح جدید فقط برای ثبت‌نام جدید.',
            inv_h: 'فاکتور و سفارش خرید',
            inv_p: 'نام شرکت، ایمیل مالی، شناسه مالیاتی (اگر دارید)، پلن و تعداد کاربر و شعبه را از <a href="/contact">فرم تماس</a> یا واتساپ بفرستید. در روزهای کاری ظرف ۲۴ ساعت پیش‌فاکتور می‌دهیم.',
            sec_h: 'دسترسی و حسابرسی',
            sec_1: '<strong>فقط حساب کارکنان.</strong> ثبت‌نام عمومی نیست. نقش از مالک تا کارشناس. جداسازی شعبه.',
            sec_2: '<strong>احراز دو مرحله‌ای:</strong> TOTP (Google Authenticator).',
            sec_3: '<strong>نشست:</strong> JWT در کوکی httpOnly روی HTTPS.',
            sec_4: '<strong>حسابرسی:</strong> لاگ فعالیت. نرخ اعلام‌شده در پلن تجاری قابل ثبت زمانی است.',
            sec_5: '<strong>دفتر مشتری:</strong> چت، برچسب و یادداشت روی پنل شرکت می‌ماند — نه روی گوشی شخصی.',
            wa_h: 'کانال واتساپ — صادقانه',
            wa_p: 'دو مسیر هست. ادعا نمی‌کنیم هر نصب Meta BSP است.',
            wa_1: '<strong>QR / درگاه WhatsApp Web</strong> — نشست غیررسمی. پیام انبوه ریسک مسدود شدن دارد.',
            wa_2: '<strong>Cloud API رسمی متا</strong> — API تجاری تأییدشده. برای broadcast جدی لازم است.',
            data_h: 'محل داده و پردازنده‌های فرعی',
            data_p: 'داده میزبانی‌شده برای app.fxguard.io روی میزبان production همان دامنه پردازش می‌شود. مشتری لایسنس داده را روی سرور خودش نگه می‌دارد. داده شخصی فروخته نمی‌شود.',
            data_1: 'میزبانی / DNS / TLS برای fxguard.io و app.fxguard.io',
            data_2: 'ارسال ایمیل',
            data_3: 'متا، فقط اگر WhatsApp Cloud API وصل شود',
            data_4: 'Firebase Cloud Messaging، فقط برای اپ اختیاری کارکنان',
            data_no: 'SDK تبلیغات روی اپ کارکنان نیست. ادعای SOC 2 یا ISO 27001 نیست. خریدار اروپا: DPA درخواستی — <a href="/eu/">fxguard.io/eu</a>.',
            trial_h: 'آزمایش',
            trial_p: 'ویترین رمز مشترک عمومی منتشر نمی‌کند. خط زنده جلسه هدایت‌شده (حدود ۱۰ دقیقه) یا آزمایش ۷روزه با شماره خودتان است.',
            contact_h: 'قدم بعد',
            contact_p: '<a href="/contact">درخواست فاکتور</a> · <a href="/pricing">پلن‌ها</a> · <a href="/whatsapp-crm">کانال</a> · <a href="https://wa.me/905010676486">واتساپ فروش</a>'
        },
        tr: {
            h1: 'Güvenlik ve satın alma özeti',
            intro: 'Bu tek sayfa fatura veya satınalma siparişi isteyen finans ve BT içindir. SOC 2 / ISO belgesi değildir. <a href="https://app.fxguard.io">app.fxguard.io</a> üzerindeki barındırılan ürünün bugünkü halini anlatır. Vitrin: <a href="https://fxguard.io">fxguard.io</a>.',
            print: 'Yazdır / PDF kaydet',
            who_h: 'Satıcı',
            who_p: 'Satıcı: <strong>ERST IT Solutions Bilişim Teknolojileri Sanayi ve Ticaret Ltd. Şti.</strong> (ürün: FXGuard). İletişim: Ersan Jahed Tabrizi. Adres: Gökevler Mah. 2312. Sk. Burç İstanbul 18 Blok No: 18 J İç Kapı No: 199, Esenyurt / İstanbul. Vergi dairesi: Esenyurt. Satış: <a href="mailto:sales@fxguard.io">sales@fxguard.io</a> · Destek: <a href="mailto:support@fxguard.io">support@fxguard.io</a> · WhatsApp: <a href="https://wa.me/905010676486">+90 501 067 6486</a>. Faaliyet: bilgisayar danışmanlığı ve sistem yönetimi (NACE 622000), siber güvenlik danışmanlığı dahil.',
            buy_h: 'Nasıl satın alınır',
            buy_1: '<strong>Bulut Başlangıç — 49 USD / ay</strong> — 1 şube, en fazla 3 personel. WhatsApp. Gelen kutusu, talepler, görevler. FX kurları dahil değil.',
            buy_2: '<strong>Bulut Ticari — 249 USD / ay’dan</strong> — 3 şubeye, 10 personele kadar, FX modülü. Fatura.',
            buy_3: '<strong>Bulut çok şube — 499 USD / ay’dan</strong> — daha fazla şube, isteğe yazılı SLA. Fatura.',
            buy_4: '<strong>Kendi sunucu lisansı — 4.000 USD’den tek sefer</strong> — sizin sunucularınız. Fatura.',
            buy_5: '<strong>Yönetilen kurulum — 800 USD / ay’dan</strong> — ayrılmış örneği biz işletiriz. Fatura.',
            buy_note: 'Taban fiyatlar yayınlanır; satınalma tahmin etmez. Ticari rakam pazarlık edilebilir. Yeni kademeler yeni kayıtlara uygulanır.',
            inv_h: 'Fatura ve satınalma siparişi',
            inv_p: 'Şirket adı, fatura e-postası, vergi no (varsa), plan ve koltuk/şube sayısını <a href="/contact">iletişim formu</a> veya WhatsApp ile gönderin. İş günlerinde 24 saat içinde yazılı teklif.',
            sec_h: 'Erişim ve denetim',
            sec_1: '<strong>Yalnızca personel hesapları.</strong> Açık kayıt yok. Rol sahibinden temsilciye.',
            sec_2: '<strong>2FA:</strong> TOTP (Google Authenticator).',
            sec_3: '<strong>Oturum:</strong> HTTPS üzerinde httpOnly JWT çerezi.',
            sec_4: '<strong>Denetim:</strong> personel eylem günlükleri. Alıntılanan FX kurları Business planda zaman damgalanabilir.',
            sec_5: '<strong>Müşteri defteri:</strong> sohbet, etiket ve notlar şirket panelinde kalır — kişisel telefonda değil.',
            wa_h: 'WhatsApp kanalı — dürüst',
            wa_p: 'İki yol vardır. Her kurulumu Meta BSP gibi göstermeyiz.',
            wa_1: '<strong>QR / WhatsApp Web ağ geçidi</strong> — resmi olmayan oturum. Toplu gönderim ban riskini artırır.',
            wa_2: '<strong>Resmi Meta Cloud API</strong> — doğrulanmış WhatsApp Business API. Ciddi toplu gönderim için gerekir.',
            data_h: 'Veri yeri ve alt işlemciler',
            data_p: 'app.fxguard.io barındırma verisi o alanın üretim sunucusunda işlenir. Lisans müşterileri veriyi kendi sunucusunda tutar. Kişisel veri satılmaz.',
            data_1: 'fxguard.io ve app.fxguard.io için barındırma / DNS / TLS',
            data_2: 'E-posta iletimi',
            data_3: 'Meta, yalnızca WhatsApp Cloud API bağlanırsa',
            data_4: 'Firebase Cloud Messaging, yalnızca isteğe bağlı personel uygulamaları için',
            data_no: 'Personel uygulamalarında reklam SDK’sı yok. SOC 2 veya ISO 27001 iddiası yok. AB alıcıları: DPA istek üzerine — <a href="/eu/">fxguard.io/eu</a>.',
            trial_h: 'Deneme',
            trial_p: 'Vitrin ortak genel şifre yayımlamaz. Canlı hat ~10 dakikalık rehberli oturum veya sahibin başlattığı 7 günlük kendi-numara denemesidir.',
            contact_h: 'Sonraki adım',
            contact_p: '<a href="/contact">Fatura iste</a> · <a href="/pricing">Planlar</a> · <a href="/whatsapp-crm">Kanal</a> · <a href="https://wa.me/905010676486">WhatsApp satış</a>'
        }
    };

    var SUPPORTED = ['en', 'fa', 'tr', 'ar', 'ru'];
    var FOOT = {
        en: { skip: 'Skip to content', foot_privacy: 'Privacy', foot_terms: 'Terms', foot_delete: 'Account deletion', foot_contact: 'Contact', home: 'Home' },
        fa: { skip: 'رفتن به محتوا', foot_privacy: 'حریم خصوصی', foot_terms: 'شرایط استفاده', foot_delete: 'حذف حساب', foot_contact: 'تماس', home: 'خانه' },
        tr: { skip: 'İçeriğe geç', foot_privacy: 'Gizlilik', foot_terms: 'Koşullar', foot_delete: 'Hesap silme', foot_contact: 'İletişim', home: 'Ana sayfa' },
        ar: { skip: 'تخطّ إلى المحتوى', foot_privacy: 'الخصوصية', foot_terms: 'الشروط', foot_delete: 'حذف الحساب', foot_contact: 'اتصل', home: 'الرئيسية' },
        ru: { skip: 'К содержимому', foot_privacy: 'Конфиденциальность', foot_terms: 'Условия', foot_delete: 'Удаление аккаунта', foot_contact: 'Контакты', home: 'Главная' }
    };

    function apply(lang) {
        if (SUPPORTED.indexOf(lang) === -1) lang = 'en';
        var dict = Object.assign({}, FOOT[lang] || FOOT.en, T[lang] || {});
        document.documentElement.lang = lang;
        document.documentElement.dir = (lang === 'fa' || lang === 'ar') ? 'rtl' : 'ltr';
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (dict[key]) el.innerHTML = dict[key];
        });
        document.querySelectorAll('.langs button').forEach(function (btn) {
            btn.setAttribute('aria-current', btn.getAttribute('data-lang') === lang ? 'true' : 'false');
        });
        try { localStorage.setItem('fxg_legal_lang', lang); } catch (e) { /* ignore */ }
        var titles = {
            en: 'Security & procurement summary | FXGuard',
            fa: 'خلاصه امنیت و تدارکات | FXGuard',
            tr: 'Güvenlik ve satın alma özeti | FXGuard',
            ar: 'ملخص الأمن والمشتريات | FXGuard',
            ru: 'Кратко: безопасность и закупки | FXGuard'
        };
        if (titles[lang]) document.title = titles[lang];
        var canon = document.querySelector('link[rel="canonical"]');
        if (canon) {
            var base = 'https://fxguard.io/procurement';
            canon.setAttribute('href', lang === 'en' ? base : base + '?lang=' + lang);
        }
    }

    var start = 'en';
    try { start = localStorage.getItem('fxg_legal_lang') || start; } catch (e) { /* ignore */ }
    var q = new URLSearchParams(location.search).get('lang');
    if (q && SUPPORTED.indexOf(q) !== -1) start = q;
    apply(start);
    document.querySelectorAll('.langs button').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var lang = btn.getAttribute('data-lang');
            apply(lang);
            var url = new URL(location.href);
            if (lang === 'en') url.searchParams.delete('lang');
            else url.searchParams.set('lang', lang);
            if (window.history.replaceState) window.history.replaceState({}, '', url.toString());
        });
    });
    var printBtn = document.querySelector('.print-btn');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
})();
