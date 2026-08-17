/**
 * Kaya CRM — legal page i18n (privacy / terms / account-deletion)
 * @file    backend/public/js/legal.js
 * @layer   frontend/dashboard
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
(function () {
    var T = {
        privacy: {
            en: {},
            fa: {
                h1: 'سیاست حریم خصوصی',
                intro: 'این صفحه توضیح می‌دهد اپ‌های <strong>Kaya Staff</strong> در iOS و اندروید و پورتال کارکنان در <a href="https://kaya.fxguard.io">kaya.fxguard.io</a> با اطلاعات چه می‌کنند. این اپ <strong>پورتال کارکنان</strong> است، نه شبکه اجتماعی مصرف‌کننده.',
                who_h: 'مسئول کیست',
                who_p: 'برای محصول میزبانی‌شده در kaya.fxguard.io، گرداننده <strong>Ersan Jahed Tabrizi</strong> (Kaya CRM) است. تماس: <a href="mailto:support@kaya.fxguard.io">support@kaya.fxguard.io</a>. اگر سازمان شما سرور خودش را دارد، همان سازمان کنترل‌کننده داده روی آن سرور است؛ اپ فقط به آدرسی که وارد می‌کنید وصل می‌شود.',
                collect_h: 'اپ موبایل چه چیزی جمع می‌کند',
                c1: '<strong>اطلاعات ورود</strong> که تایپ می‌کنید (ایمیل یا نام کاربری، رمز، در صورت نیاز TOTP) — برای ورود به سرور سازمان ارسال می‌شود. رمز روی دستگاه ذخیره نمی‌شود.',
                c2: '<strong>توکن نشست (JWT)</strong> در EncryptedSharedPreferences (اندروید) یا Keychain (iOS).',
                c3: '<strong>ترجیحات</strong> روی دستگاه: زبان، آدرس سرور، و پروفایل کارکنان کش‌شده.',
                c4: '<strong>محتوای کاری</strong> پس از ورود (مکالمات واتساپ، مشتریان، تیکت، تسک) از API سازمان. این داده متعلق به کارفرماست.',
                collect_no: 'اپ‌ها SDK تبلیغات، ترکر تحلیلی، یا دسترسی به مخاطبین، دوربین، میکروفون و موقعیت دقیق ندارند. دکمه‌های پیوست و ویس که غیرفعال‌اند عکس یا میکروفون را نمی‌خوانند.',
                use_h: 'نحوه استفاده',
                use_p: 'فقط برای کار پورتال: ورود، نشست، نمایش کار تخصیص‌داده‌شده، و ارسال پیام در حد نقش شما. داده فروخته نمی‌شود و برای تبلیغات استفاده نمی‌شود.',
                share_h: 'اشتراک‌گذاری',
                share_p: 'داده روی دستگاه و سروری که تنظیم کرده‌اید می‌ماند (پیش‌فرض <code>https://kaya.fxguard.io</code>). با تبلیغ‌دهنده ثالث به اشتراک گذاشته نمی‌شود.',
                retain_h: 'نگهداری و امنیت',
                retain_p: 'JWT تا خروج یا حذف اپ می‌ماند. نگهداری سمت سرور با مدیر سازمان است. انتقال با HTTPS است. بیلد فروشگاهی HTTP بدون رمز را اجازه نمی‌دهد.',
                rights_h: 'حقوق شما',
                rights_p: 'حساب کارکنان را مدیر می‌سازد، نه خود اپ. برای دسترسی، اصلاح یا حذف با مدیر یا <a href="mailto:support@kaya.fxguard.io">support@kaya.fxguard.io</a> تماس بگیرید. همچنین <a href="/account-deletion">حذف حساب</a>.',
                kids_h: 'کودکان',
                kids_p: 'Kaya Staff ابزار محیط کار است و برای افراد زیر ۱۸ سال در نظر گرفته نشده است.',
                intl_h: 'انتقال بین‌المللی',
                intl_p: 'اگر سرور پیش‌فرض را استفاده کنید، داده در محل میزبان پردازش می‌شود. اگر آدرس دیگری بگذارید، سیاست همان گرداننده اعمال می‌شود.',
                change_h: 'تغییرات',
                change_p: 'ممکن است این صفحه به‌روز شود. تاریخ «آخرین به‌روزرسانی» تغییر می‌کند.',
                contact_h: 'تماس',
                contact_p: 'حریم خصوصی و پشتیبانی: <a href="mailto:support@kaya.fxguard.io">support@kaya.fxguard.io</a> · مالک: <a href="mailto:ersanjahedtabrizi@gmail.com">ersanjahedtabrizi@gmail.com</a> · واتساپ: <a href="https://wa.me/905010676486">+90 501 067 6486</a>.',
                terms_link: 'شرایط استفاده',
                home: 'خانه'
            },
            tr: {
                h1: 'Gizlilik Politikası',
                intro: 'Bu metin <strong>Kaya Staff</strong> iOS/Android uygulamalarının ve <a href="https://kaya.fxguard.io">kaya.fxguard.io</a> personel portalının bilgileri nasıl işlediğini açıklar. Uygulama bir <strong>personel portalıdır</strong>, tüketici sosyal ağı değildir.',
                who_h: 'Sorumlu kim',
                who_p: 'kaya.fxguard.io üzerindeki ürün için işletmeci <strong>Ersan Jahed Tabrizi</strong> (Kaya CRM) dir. İletişim: <a href="mailto:support@kaya.fxguard.io">support@kaya.fxguard.io</a>. Kuruluşunuz kendi sunucusunu çalıştırıyorsa veri kontrolörü o kuruluştur; uygulama girdiğiniz URL ye bağlanır.',
                collect_h: 'Mobil uygulamaların topladığı veriler',
                c1: 'Yazdığınız <strong>giriş bilgileri</strong> (e-posta veya kullanıcı adı, parola, isteğe bağlı TOTP) kuruluş sunucusuna gönderilir. Parola cihazda saklanmaz.',
                c2: '<strong>Oturum jetonu (JWT)</strong> EncryptedSharedPreferences (Android) veya Keychain (iOS) içinde.',
                c3: 'Cihazdaki <strong>tercihler</strong>: dil, sunucu URL si, önbellek personel profili.',
                c4: 'Giriş sonrası yüklenen <strong>iş içeriği</strong> (WhatsApp sohbetleri, müşteriler, talepler, görevler). Bu veri işverene aittir.',
                collect_no: 'Uygulamalar reklam SDK sı, analitik izleyici, rehber / kamera / mikrofon / kesin konum erişimi içermez. Devre dışı ek ve ses düğmeleri fotoğraf veya mikrofon okumaz.',
                use_h: 'Kullanım',
                use_p: 'Yalnızca personel portalını çalıştırmak için: kimlik doğrulama, oturum, atanan iş, rolünüzün izin verdiği mesajlar. Veri satılmaz, reklam için kullanılmaz.',
                share_h: 'Paylaşım',
                share_p: 'Veri cihazda ve ayarladığınız sunucuda kalır (varsayılan <code>https://kaya.fxguard.io</code>). Üçüncü taraf reklamcılarla paylaşılmaz.',
                retain_h: 'Saklama ve güvenlik',
                retain_p: 'JWT çıkış veya kaldırmaya kadar kalır. Sunucu saklama süresi yöneticinin ayarına bağlıdır. İletim HTTPS dir. Mağaza sürümleri düz HTTP ye izin vermez.',
                rights_h: 'Haklarınız',
                rights_p: 'Hesapları yönetici oluşturur. Erişim, düzeltme veya silme için yöneticinize veya <a href="mailto:support@kaya.fxguard.io">support@kaya.fxguard.io</a> adresine yazın. Ayrıca <a href="/account-deletion">hesap silme</a>.',
                kids_h: 'Çocuklar',
                kids_p: 'Kaya Staff iş aracıdır; 18 yaş altı için tasarlanmamıştır.',
                intl_h: 'Uluslararası aktarım',
                intl_p: 'Varsayılan sunucuyu kullanırsanız veri o barındırıcının konumunda işlenir. Başka URL girerseniz o işletmecinin politikası geçerlidir.',
                change_h: 'Değişiklikler',
                change_p: 'Bu sayfa güncellenebilir. «Son güncelleme» tarihi değişir.',
                contact_h: 'İletişim',
                contact_p: 'Gizlilik ve destek: <a href="mailto:support@kaya.fxguard.io">support@kaya.fxguard.io</a> · Sahip: <a href="mailto:ersanjahedtabrizi@gmail.com">ersanjahedtabrizi@gmail.com</a> · WhatsApp: <a href="https://wa.me/905010676486">+90 501 067 6486</a>.',
                terms_link: 'Kullanım Koşulları',
                home: 'Ana sayfa'
            }
        },
        terms: {
            en: {},
            fa: {
                h1: 'شرایط استفاده',
                intro: 'این شرایط برای اپ‌های <strong>Kaya Staff</strong> و پورتال وب کارکنان است. با ورود، آن‌ها را می‌پذیرید.',
                t1_h: '۱. فقط کارکنان مجاز',
                t1_p: 'این اپ ابزار محیط کار است. فقط اگر مدیر سازمان برایتان حساب ساخته باشد می‌توانید استفاده کنید. رمز و دستگاه TOTP را به اشتراک نگذارید و سیاست کارفرما را در مکالمات مشتری رعایت کنید.',
                t2_h: '۲. سرویس مصرف‌کننده عمومی نیست',
                t2_p: 'دانلود از اپ استور یا گوگل پلی حساب مشتری نمی‌سازد و به داده هیچ سازمانی دسترسی نمی‌دهد. بدون اعتبار کارکنان فقط صفحه ورود دیده می‌شود.',
                t3_h: '۳. استفاده مجاز',
                t3_p: 'سرویس را پروب، اسکرپ یا حمله نکنید؛ همکاران را جعل نکنید؛ داده مشتری را جز در حد نقش و قانون صادر نکنید. حساب متخلف ممکن است معلق شود.',
                t4_h: '۴. خدمت و مسئولیت',
                t4_p: 'نرم‌افزار ابزار کسب‌وکار است. دسترسی به شبکه و سرور تنظیم‌شده بستگی دارد. تا جایی که قانون اجازه دهد گرداننده مسئول سود ازدست‌رفته یا خسارت غیرمستقیم نیست. حمایت‌های اجباری مصرف‌کننده در کشور شما پابرجاست.',
                t5_h: '۵. فروشگاه‌ها',
                t5_p: 'اپل و گوگل طرف قرارداد استخدام یا CRM سازمان شما نیستند. خرید درون‌برنامه‌ای وجود ندارد. اشتراک محصول CRM در صورت وجود جداگانه (وب / فروش) است.',
                t6_h: '۶. حریم خصوصی',
                t6_p: 'حریم خصوصی در <a href="/privacy">سیاست حریم خصوصی</a> است. حذف حساب در <a href="/account-deletion">حذف حساب</a>. سؤال: <a href="mailto:support@kaya.fxguard.io">support@kaya.fxguard.io</a>.',
                home: 'خانه'
            },
            tr: {
                h1: 'Kullanım Koşulları',
                intro: 'Bu koşullar <strong>Kaya Staff</strong> uygulamaları ve personel web portalı içindir. Giriş yaparak kabul edersiniz.',
                t1_h: '1. Yalnızca yetkili personel',
                t1_p: 'Uygulama iş aracıdır. Yalnızca yöneticinin oluşturduğu hesapla kullanılabilir. Parola ve TOTP cihazını paylaşmayın; müşteri sohbetlerinde işveren politikasına uyun.',
                t2_h: '2. Kamuya açık tüketici hizmeti değil',
                t2_p: 'Mağazadan indirmek müşteri hesabı açmaz ve kuruluş verisine erişim vermez. Geçerli personel kimliği olmadan yalnızca giriş ekranı görünür.',
                t3_h: '3. Kabul edilebilir kullanım',
                t3_p: 'Hizmeti tarama, kazıma veya saldırı için kullanmayın; meslektaşları taklit etmeyin; müşteri verisini rolünüz ve hukuk izin vermedikçe dışa aktarmayın. Kötüye kullanım hesap askıya alınmasına yol açabilir.',
                t4_h: '4. Hizmet ve sorumluluk',
                t4_p: 'Yazılım iş aracı olarak sunulur. Erişim ağa ve ayarlanan sunucuya bağlıdır. Yasaların izin verdiği ölçüde işletmeci kâr kaybı veya dolaylı zarardan sorumlu değildir. Zorunlu tüketici korumaları geçerliliğini korur.',
                t5_h: '5. Mağazalar',
                t5_p: 'Apple ve Google istihdamınızın veya CRM sözleşmenizin tarafı değildir. Uygulama içi satın alma yoktur. CRM aboneliği varsa ayrı satılır (web / satış).',
                t6_h: '6. Gizlilik',
                t6_p: 'Gizlilik <a href="/privacy">Gizlilik Politikası</a> ndadır. Hesap kaldırma <a href="/account-deletion">hesap silme</a>. Sorular: <a href="mailto:support@kaya.fxguard.io">support@kaya.fxguard.io</a>.',
                home: 'Ana sayfa'
            }
        },
        deletion: {
            en: {},
            fa: {
                h1: 'حذف حساب کارکنان',
                intro: 'Kaya Staff <strong>داخل اپ حساب نمی‌سازد</strong>. هر کاربر را مدیر سازمان ایجاد می‌کند. اپل و گوگل با این حال یک روش عمومی برای درخواست حذف می‌خواهند.',
                s1_h: 'روی همین دستگاه',
                s1_p: 'از پروفایل <strong>خروج از حساب</strong> را بزنید. حذف اپ، JWT و ترجیحات محلی را از گوشی برمی‌دارد.',
                s2_h: 'روی سرور',
                s2_1: 'از مدیر سازمان بخواهید کاربر را در پنل وب (کاربران) غیرفعال یا حذف کند.',
                s2_2: 'اگر به مدیر دسترسی ندارید، از همان ایمیل حساب به <a href="mailto:support@kaya.fxguard.io?subject=Staff%20account%20deletion">support@kaya.fxguard.io</a> بنویسید. نام کاربری و آدرس سرور را ذکر کنید.',
                s2_p: 'قبل از حذف، هویت صاحب حساب یا مدیر را بررسی می‌کنیم. تاریخچه واتساپ مشتری متعلق به سازمان است و فقط با حذف یک کارمند پاک نمی‌شود مگر اینکه مدیر جداگانه درخواست کند و قانون الزام کند.',
                privacy: 'سیاست حریم خصوصی',
                contact: 'تماس'
            },
            tr: {
                h1: 'Personel hesabını sil',
                intro: 'Kaya Staff <strong>uygulama içinde hesap açmaz</strong>. Her kullanıcıyı yönetici oluşturur. Apple ve Google yine de herkese açık bir silme yolu ister.',
                s1_h: 'Bu cihazda',
                s1_p: 'Profilde <strong>Çıkış</strong> kullanın. Uygulamayı kaldırmak yerel JWT ve tercihleri siler.',
                s2_h: 'Sunucuda',
                s2_1: 'Kuruluş yöneticinizden web panelinde (Kullanıcılar) hesabınızı kapatmasını veya silmesini isteyin.',
                s2_2: 'Yöneticiye ulaşamıyorsanız hesap e-postanızdan <a href="mailto:support@kaya.fxguard.io?subject=Staff%20account%20deletion">support@kaya.fxguard.io</a> yazın. Kullanıcı adı ve sunucu URL sini ekleyin.',
                s2_p: 'Silmeden önce hesap sahibini veya yöneticiyi doğrularız. Müşteri WhatsApp geçmişi kuruluşa aittir; bir personelin silinmesi tek başına o geçmişi silmez — yönetici ayrıca istemedikçe ve hukuk gerektirmediği sürece.',
                privacy: 'Gizlilik Politikası',
                contact: 'İletişim'
            }
        }
    };

    function pageKey() {
        var p = location.pathname.replace(/\/$/, '') || '/';
        if (p.indexOf('privacy') !== -1) return 'privacy';
        if (p.indexOf('terms') !== -1) return 'terms';
        return 'deletion';
    }

    function apply(lang) {
        var pack = T[pageKey()] || {};
        var dict = pack[lang] || {};
        document.documentElement.lang = lang === 'fa' ? 'fa' : lang === 'tr' ? 'tr' : 'en';
        document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (dict[key]) el.innerHTML = dict[key];
        });
        document.querySelectorAll('.langs button').forEach(function (btn) {
            btn.setAttribute('aria-current', btn.getAttribute('data-lang') === lang ? 'true' : 'false');
        });
        try { localStorage.setItem('kaya_legal_lang', lang); } catch (e) { /* ignore */ }
    }

    var start = 'en';
    try { start = localStorage.getItem('kaya_legal_lang') || start; } catch (e) { /* ignore */ }
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'fa' || q === 'tr' || q === 'en') start = q;
    apply(start);
    document.querySelectorAll('.langs button').forEach(function (btn) {
        btn.addEventListener('click', function () { apply(btn.getAttribute('data-lang')); });
    });
})();
