/**
 * Kaya CRM — legal page i18n (privacy / terms / account-deletion)
 * @file    backend/public/js/legal.js
 * @layer   frontend/dashboard
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
(function () {
    var FOOT = {
        en: { skip: 'Skip to content', foot_privacy: 'Privacy', foot_terms: 'Terms', foot_delete: 'Account deletion', foot_contact: 'Contact', home: 'Home' },
        fa: { skip: 'رفتن به محتوا', foot_privacy: 'حریم خصوصی', foot_terms: 'شرایط استفاده', foot_delete: 'حذف حساب', foot_contact: 'تماس', home: 'خانه' },
        tr: { skip: 'İçeriğe geç', foot_privacy: 'Gizlilik', foot_terms: 'Koşullar', foot_delete: 'Hesap silme', foot_contact: 'İletişim', home: 'Ana sayfa' }
    };
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
        },
        procurement: {
            en: {},
            fa: {
                h1: 'خلاصه امنیت و تدارکات',
                intro: 'این یک‌برگ برای مالی و آی‌تی است که فاکتور یا سفارش خرید می‌خواهند. گواهی SOC 2 / ISO نیست. وضعیت فعلی محصول میزبانی‌شده در <a href="https://kaya.fxguard.io">kaya.fxguard.io</a> را توصیف می‌کند.',
                print: 'چاپ / ذخیره PDF',
                who_h: 'فروشنده',
                who_p: 'گرداننده: <strong>Ersan Jahed Tabrizi</strong> (Kaya CRM). فروش: <a href="mailto:sales@kaya.fxguard.io">sales@kaya.fxguard.io</a> · پشتیبانی: <a href="mailto:support@kaya.fxguard.io">support@kaya.fxguard.io</a> · واتساپ: <a href="https://wa.me/905010676486">+90 501 067 6486</a>. تمرکز محصول: عملیات واتساپ برای میز صرافی و حواله در ترکیه.',
                buy_h: 'نحوه خرید',
                buy_1: '<strong>ابر شروع — ۴۹ دلار در ماه</strong> — ۱ شعبه، تا ۳ نفر. پرداخت کارت اگر Stripe روشن باشد؛ وگرنه واتساپ. اینباکس، تیکت و تسک. ماژول نرخ ارز شامل نیست.',
                buy_2: '<strong>ابر تجاری — از ۲۴۹ دلار در ماه</strong> — تا ۳ شعبه، ۱۰ نفر، ماژول ارز. فاکتور.',
                buy_3: '<strong>ابر چندشعبه — از ۴۹۹ دلار در ماه</strong> — شعب بیشتر، SLA کتبی درخواستی. فاکتور.',
                buy_4: '<strong>لایسنس اختصاصی — از ۴۰۰۰ دلار یک‌بار</strong> — سرور شما. فاکتور.',
                buy_5: '<strong>میزبانی مدیریت‌شده — از ۸۰۰ دلار در ماه</strong> — ما یک نمونه اختصاصی را اداره می‌کنیم. فاکتور.',
                buy_note: 'کف قیمت منتشر شده تا تدارکات حدس نزند. رقم نهایی تجاری قابل مذاکره است. سطوح جدید فقط برای ثبت‌نام جدید؛ میزهای فعلی بی‌سر و صدا سقف نمی‌خورند.',
                inv_h: 'فاکتور و سفارش خرید',
                inv_p: 'نام شرکت، ایمیل مالی، شناسه مالیاتی (اگر دارید)، پلن و تعداد صندلی/شعبه را از <a href="/contact">فرم تماس</a> (هدف: استعلام تجاری / فاکتور) یا واتساپ بفرستید. در روزهای کاری ظرف ۲۴ ساعت پیش‌فاکتور می‌دهیم. تجاری و بالاتر با فاکتور. کارت فقط برای ابر شروع خودخدمت است. پرداخت Start به‌تنهایی tenant نمی‌سازد؛ معمولاً ظرف یک روز کاری راه‌اندازی می‌کنیم.',
                sec_h: 'دسترسی و حسابرسی',
                sec_1: '<strong>فقط حساب کارکنان.</strong> ثبت‌نام عمومی نیست. نقش از مالک تا کارشناس. جداسازی شعبه.',
                sec_2: '<strong>احراز دو مرحله‌ای:</strong> TOTP (Google Authenticator).',
                sec_3: '<strong>نشست:</strong> JWT در کوکی httpOnly روی HTTPS. بیلد production اجازه HTTP بدون رمز نمی‌دهد.',
                sec_4: '<strong>حسابرسی:</strong> لاگ فعالیت کارکنان. نرخ اعلام‌شده در پلن تجاری قابل ثبت زمانی است.',
                sec_5: '<strong>دفتر مشتری:</strong> چت، برچسب و یادداشت روی پنل شرکت می‌ماند — نه روی گوشی شخصی.',
                wa_h: 'کانال واتساپ — صادقانه',
                wa_p: 'دو مسیر هست. ادعا نمی‌کنیم هر نصب Meta BSP است.',
                wa_1: '<strong>QR / درگاه WhatsApp Web</strong> — نشست غیررسمی، سریع‌تر، بدون تأیید Business متا. پیام انبوه ریسک مسدود شدن دارد.',
                wa_2: '<strong>Cloud API رسمی متا</strong> — API تجاری تأییدشده، قالب خارج از پنجره ۲۴ساعته. برای broadcast جدی و خریدار نیازمند کانال منطبق لازم است.',
                data_h: 'محل داده و پردازنده‌های فرعی',
                data_p: 'داده میزبانی‌شده برای kaya.fxguard.io روی میزبان production همان دامنه پردازش می‌شود. مشتری لایسنس داده را روی سرور خودش نگه می‌دارد. داده شخصی فروخته نمی‌شود. پردازنده‌های معمول (فقط برای اجرای سرویس):',
                data_1: 'میزبانی / DNS / TLS برای kaya.fxguard.io',
                data_2: 'ارسال ایمیل (تراکنشی و صندوق فروش)',
                data_3: 'Stripe، فقط اگر ابر شروع را با کارت بپردازید — داده کارت نزد Stripe می‌ماند، نه روی سرور ما',
                data_4: 'متا، فقط اگر WhatsApp Cloud API وصل شود',
                data_5: 'Firebase Cloud Messaging، فقط برای اپ اختیاری کارکنان',
                data_no: 'SDK تبلیغات روی اپ کارکنان نیست. در این صفحه ادعای SOC 2 یا ISO 27001 نمی‌کنیم. پرسشنامه بلندتر را از فروش بخواهید.',
                trial_h: 'آزمایش',
                trial_p: 'پنل عمومی برای دیدن صفحه‌هاست. خط زنده واتساپ یک جلسه هدایت‌شده (حدود ۱۰ دقیقه) یا آزمایش ۷روزه با شماره خودتان است که مالک از صفحه واتساپ شروع می‌کند. فقط اسکن QR آزمایش را شروع نمی‌کند. بعد از ۷ روز نشست غیررسمی logout می‌شود مگر مالک خط را نگه دارد.',
                contact_h: 'قدم بعد',
                contact_p: '<a href="/contact">درخواست فاکتور</a> · <a href="/pricing">پلن‌ها</a> · <a href="/privacy">حریم خصوصی</a> · <a href="/terms">شرایط</a> · <a href="https://wa.me/905010676486">واتساپ فروش</a>'
            },
            tr: {
                h1: 'Güvenlik ve satın alma özeti',
                intro: 'Bu tek sayfa fatura veya satınalma siparişi isteyen finans ve BT içindir. SOC 2 / ISO belgesi değildir. <a href="https://kaya.fxguard.io">kaya.fxguard.io</a> üzerindeki barındırılan ürünün bugünkü halini anlatır.',
                print: 'Yazdır / PDF kaydet',
                who_h: 'Satıcı',
                who_p: 'İşletmeci: <strong>Ersan Jahed Tabrizi</strong> (Kaya CRM). Satış: <a href="mailto:sales@kaya.fxguard.io">sales@kaya.fxguard.io</a> · Destek: <a href="mailto:support@kaya.fxguard.io">support@kaya.fxguard.io</a> · WhatsApp: <a href="https://wa.me/905010676486">+90 501 067 6486</a>. Ürün odağı: Türkiye’de döviz ve havale masaları için WhatsApp operasyonu.',
                buy_h: 'Nasıl satın alınır',
                buy_1: '<strong>Bulut Başlangıç — 49 USD / ay</strong> — 1 şube, en fazla 3 personel. Stripe açıksa kart; değilse WhatsApp. Gelen kutusu, talepler, görevler. FX kurları dahil değil.',
                buy_2: '<strong>Bulut Ticari — 249 USD / ay’dan</strong> — 3 şubeye, 10 personele kadar, FX modülü. Fatura.',
                buy_3: '<strong>Bulut çok şube — 499 USD / ay’dan</strong> — daha fazla şube, isteğe yazılı SLA. Fatura.',
                buy_4: '<strong>Kendi sunucu lisansı — 4.000 USD’den tek sefer</strong> — sizin sunucularınız. Fatura.',
                buy_5: '<strong>Yönetilen kurulum — 800 USD / ay’dan</strong> — ayrılmış örneği biz işletiriz. Fatura.',
                buy_note: 'Taban fiyatlar yayınlanır; satınalma tahmin etmez. Ticari rakam pazarlık edilebilir. Yeni kademeler yeni kayıtlara uygulanır; mevcut masalar sessizce kısıtlanmaz.',
                inv_h: 'Fatura ve satınalma siparişi',
                inv_p: 'Şirket adı, fatura e-postası, vergi no (varsa), plan ve koltuk/şube sayısını <a href="/contact">iletişim formu</a> (amaç: ticari teklif / fatura) veya WhatsApp ile gönderin. İş günlerinde 24 saat içinde yazılı teklif. Business ve üzeri faturalıdır. Kart yalnızca Cloud Start self-servis içindir. Ödenen Start tek başına tenant açmaz; genelde bir iş gününde kurarız.',
                sec_h: 'Erişim ve denetim',
                sec_1: '<strong>Yalnızca personel hesapları.</strong> Açık kayıt yok. Rol sahibinden temsilciye. Şube ayrımı.',
                sec_2: '<strong>2FA:</strong> TOTP (Google Authenticator).',
                sec_3: '<strong>Oturum:</strong> HTTPS üzerinde httpOnly JWT çerezi. Üretim sürümleri düz HTTP’ye izin vermez.',
                sec_4: '<strong>Denetim:</strong> personel eylem günlükleri. Alıntılanan FX kurları Business planda zaman damgalanabilir.',
                sec_5: '<strong>Müşteri defteri:</strong> sohbet, etiket ve notlar şirket panelinde kalır — kişisel telefonda değil.',
                wa_h: 'WhatsApp kanalı — dürüst',
                wa_p: 'İki yol vardır. Her kurulumu Meta BSP gibi göstermeyiz.',
                wa_1: '<strong>QR / WhatsApp Web ağ geçidi</strong> — resmi olmayan oturum, daha hızlı, Meta Business doğrulaması yok. Toplu gönderim ban riskini artırır.',
                wa_2: '<strong>Resmi Meta Cloud API</strong> — doğrulanmış WhatsApp Business API, 24 saat penceresi dışında şablon. Ciddi toplu gönderim ve uyumlu kanal isteyen alıcılar için gerekir.',
                data_h: 'Veri yeri ve alt işlemciler',
                data_p: 'kaya.fxguard.io barındırma verisi o alanın üretim sunucusunda işlenir. Lisans müşterileri veriyi kendi sunucusunda tutar. Kişisel veri satılmaz. Tipik alt işlemciler (yalnızca hizmeti çalıştırmak için):',
                data_1: 'kaya.fxguard.io için barındırma / DNS / TLS',
                data_2: 'E-posta iletimi (işlemsel ve satış)',
                data_3: 'Stripe, yalnızca Cloud Start’ı kartla öderseniz — kart verisi Stripe’da kalır, sunucularımızda değil',
                data_4: 'Meta, yalnızca WhatsApp Cloud API bağlanırsa',
                data_5: 'Firebase Cloud Messaging, yalnızca isteğe bağlı personel uygulamaları için',
                data_no: 'Personel uygulamalarında reklam SDK’sı yok. Bu sayfada SOC 2 veya ISO 27001 iddiası yok. Daha uzun anket için satışa sorun.',
                trial_h: 'Deneme',
                trial_p: 'Herkese açık panel ekran gezmek içindir. Canlı WhatsApp hattı ~10 dakikalık rehberli oturum veya sahibin WhatsApp sayfasından başlattığı 7 günlük kendi-numara denemesidir. QR taramak denemeyi başlatmaz. 7 gün sonra resmi olmayan oturum, sahip hattı tutmadıkça çıkış yapılır.',
                contact_h: 'Sonraki adım',
                contact_p: '<a href="/contact">Fatura iste</a> · <a href="/pricing">Planlar</a> · <a href="/privacy">Gizlilik</a> · <a href="/terms">Koşullar</a> · <a href="https://wa.me/905010676486">WhatsApp satış</a>'
            }
        },
        billingSuccess: {
            en: {},
            fa: {
                h1: 'پرداخت ثبت شد',
                p1: 'متشکریم. ابر شروع (۴۹ دلار در ماه، ۱ شعبه، تا ۳ نفر) ثبت شد. جزئیات کارت نزد Stripe ماند — ما ذخیره نمی‌کنیم.',
                p2: 'این پرداخت به‌تنهایی پنل را باز نمی‌کند. معمولاً ظرف یک روز کاری tenant شروع را می‌سازیم و به ایمیل صورتحساب می‌فرستیم. اگر امروز خط می‌خواهید واتساپ <a href="https://wa.me/905010676486">+90 501 067 6486</a>.',
                p3: 'نرخ ارز، صندلی بیشتر، یا فاکتور برای میز بزرگ‌تر؟ <a href="/contact">استعلام تجاری</a> یا <a href="/procurement">خلاصه تدارکات</a>.',
                home: 'خانه',
                plans: 'پلن‌ها'
            },
            tr: {
                h1: 'Ödeme alındı',
                p1: 'Teşekkürler. Cloud Start (49 USD/ay, 1 şube, en fazla 3 personel) kaydedildi. Kart bilgisi Stripe’da kaldı — biz saklamıyoruz.',
                p2: 'Bu ödeme paneli kendiliğinden açmaz. Genelde bir iş gününde Start tenant kurup fatura e-postasına yazarız. Hattı bugün istiyorsanız WhatsApp <a href="https://wa.me/905010676486">+90 501 067 6486</a>.',
                p3: 'FX kurları, daha fazla koltuk veya büyük masa faturası mı? <a href="/contact">Ticari teklif</a> veya <a href="/procurement">satın alma özeti</a>.',
                home: 'Ana sayfa',
                plans: 'Planlar'
            }
        }
    };

    function pageKey() {
        var p = location.pathname.replace(/\/$/, '') || '/';
        if (p.indexOf('privacy') !== -1) return 'privacy';
        if (p.indexOf('terms') !== -1) return 'terms';
        if (p.indexOf('procurement') !== -1) return 'procurement';
        if (p.indexOf('billing') !== -1) return 'billingSuccess';
        return 'deletion';
    }

    function apply(lang) {
        var pack = T[pageKey()] || {};
        var dict = Object.assign({}, FOOT[lang] || FOOT.en, pack[lang] || {});
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
    var printBtn = document.querySelector('.print-btn');
    if (printBtn) {
        printBtn.addEventListener('click', function () { window.print(); });
    }
})();
