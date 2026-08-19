/**
 * FXGuard storefront — procurement page i18n
 * @file    fxguard-io-landing/js/procurement.js
 */
(function () {
    var T = {
        fa: {
            h1: 'خلاصه امنیت و تدارکات',
            intro: 'این یک‌برگ برای مالی و آی‌تی است که فاکتور یا سفارش خرید می‌خواهند. گواهی SOC 2 / ISO نیست. وضعیت فعلی محصول میزبانی‌شده در <a href="https://app.fxguard.io">app.fxguard.io</a> را توصیف می‌کند. ویترین: <a href="https://fxguard.io">fxguard.io</a>.',
            print: 'چاپ / ذخیره PDF',
            who_h: 'فروشنده',
            who_p: 'فروشنده: <strong>ERST IT Solutions Bilişim Teknolojileri Sanayi ve Ticaret Ltd. Şti.</strong> (محصول: FXGuard). تماس: Ersan Jahed Tabrizi. نشانی: Gökevler Mah. 2312. Sk. Burç İstanbul 18 Blok No: 18 J İç Kapı No: 199, Esenyurt / İstanbul. حوزه مالیاتی: اسینیورت. فروش: <a href="mailto:sales@fxguard.io">sales@fxguard.io</a> · پشتیبانی: <a href="mailto:support@fxguard.io">support@fxguard.io</a> · واتساپ: <a href="https://wa.me/905010676486">+90 501 067 6486</a>. فعالیت: مشاوره رایانه و مدیریت سیستم‌ها (NACE 622000)، از جمله مشاوره امنیت سایبری.',
            buy_h: 'چطور بخرید',
            buy_1: '<strong>ابر شروع — ۴۹ دلار / ماه</strong> — ۱ شعبه، تا ۳ کارمند. چک‌اوت واتساپ. اینباکس، تیکت و تسک. ماژول نرخ شامل نیست.',
            buy_2: '<strong>ابر تجاری — از ۲۴۹ دلار / ماه</strong> — تا ۳ شعبه، ۱۰ کارمند، ماژول نرخ. فاکتور.',
            buy_3: '<strong>ابر چندشعبه — از ۴۹۹ دلار / ماه</strong> — شعبه بیشتر، SLA نوشته‌شده درخواستی. فاکتور.',
            buy_4: '<strong>لایسنس اختصاصی — از ۴۰۰۰ دلار یک‌باره</strong> — سرور شما. فاکتور.',
            buy_5: '<strong>میزبانی مدیریت‌شده — از ۸۰۰ دلار در ماه</strong> — ما یک نمونه اختصاصی را اداره می‌کنیم. فاکتور.',
            buy_note: 'کف قیمت منتشر شده تا تدارکات حدس نزند. رقم نهایی تجاری قابل مذاکره است. سطوح جدید فقط برای ثبت‌نام جدید.',
            inv_h: 'فاکتور و سفارش خرید',
            inv_p: 'نام شرکت، ایمیل مالی، شناسه مالیاتی (اگر دارید)، پلن و تعداد صندلی/شعبه را از <a href="/contact">فرم تماس</a> یا واتساپ بفرستید. در روزهای کاری ظرف ۲۴ ساعت پیش‌فاکتور می‌دهیم.',
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

    function apply(lang) {
        var dict = T[lang] || {};
        document.documentElement.lang = lang === 'fa' ? 'fa' : lang === 'tr' ? 'tr' : 'en';
        document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (dict[key]) el.innerHTML = dict[key];
        });
        document.querySelectorAll('.langs button').forEach(function (btn) {
            btn.setAttribute('aria-current', btn.getAttribute('data-lang') === lang ? 'true' : 'false');
        });
        try { localStorage.setItem('fxg_legal_lang', lang); } catch (e) { /* ignore */ }
    }

    var start = 'en';
    try { start = localStorage.getItem('fxg_legal_lang') || start; } catch (e) { /* ignore */ }
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'fa' || q === 'tr' || q === 'en') start = q;
    apply(start);
    document.querySelectorAll('.langs button').forEach(function (btn) {
        btn.addEventListener('click', function () { apply(btn.getAttribute('data-lang')); });
    });
    var printBtn = document.querySelector('.print-btn');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
})();
