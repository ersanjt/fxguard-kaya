/**
 * FXGuard storefront — legal pages i18n (privacy / terms / account-deletion)
 */
(function () {
    var SUPPORTED = ['en', 'fa', 'tr', 'ar', 'ru'];

    var T = {
        privacy: {
            en: {
                h1: 'Privacy Policy',
                intro: 'This policy explains how the <strong>FXGuard Staff</strong> iOS and Android apps and the staff panel at <a href="https://app.fxguard.io">app.fxguard.io</a> handle information. The apps are a <strong>staff portal</strong> for authorized employees — not a consumer social app.',
                who_h: 'Who is responsible',
                who_p: 'For the hosted product at app.fxguard.io, the seller is <strong>ERST IT Solutions Bilişim Teknolojileri Sanayi ve Ticaret Ltd. Şti.</strong> (product: FXGuard). Contact: <a href="mailto:support@fxguard.io">support@fxguard.io</a>. If your organization runs its own FXGuard server, that organization is the controller of staff and customer data on that server.',
                collect_h: 'What the mobile apps collect',
                c1: '<strong>Account credentials</strong> you type (email or username, password, optional TOTP) — sent to your organization’s server to sign in. Passwords are not stored on the device.',
                c2: '<strong>Session token (JWT)</strong> stored in EncryptedSharedPreferences (Android) or Keychain (iOS) so you stay signed in.',
                c3: '<strong>Preferences</strong> on the device: language, server URL, and a cached staff profile.',
                c4: '<strong>Work content</strong> the app loads after login (WhatsApp conversations, customers, tickets, tasks) from your organization’s API.',
                collect_no: 'The apps do <strong>not</strong> include advertising SDKs, analytics trackers that sell data, or access to contacts, camera, microphone, or precise location.',
                use_h: 'How information is used',
                use_p: 'Only to operate the staff portal: authenticate you, keep your session, show assigned work, and send messages your role allows. We do not sell personal data or use it for advertising.',
                share_h: 'Sharing',
                share_p: 'Data stays on the device and on the server URL you configure (default <code>https://app.fxguard.io</code>). It is not shared with third-party advertisers.',
                retain_h: 'Retention and security',
                retain_p: 'The JWT remains until you sign out or uninstall. Server-side retention is set by the organization administrator. Transport uses HTTPS. Tokens are stored in the platform secure store.',
                rights_h: 'Your rights',
                rights_p: 'Staff accounts are created by an administrator. To access, correct, or delete your staff account, ask your admin or email <a href="mailto:support@fxguard.io">support@fxguard.io</a>. See also <a href="/account-deletion">account deletion</a>.',
                kids_h: 'Children',
                kids_p: 'FXGuard Staff is a workplace tool. It is not directed at children under 16 and is not intended for anyone under 18.',
                intl_h: 'International transfers',
                intl_p: 'If you use the default production server, data is processed where that host is located. Self-hosted license customers keep data on their own infrastructure.',
                change_h: 'Changes',
                change_p: 'We may update this page. The “Last updated” date will change.',
                contact_h: 'Contact',
                contact_p: 'Privacy and support: <a href="mailto:support@fxguard.io">support@fxguard.io</a> · Sales: <a href="mailto:sales@fxguard.io">sales@fxguard.io</a> · WhatsApp: <a href="https://wa.me/905010676486">+90 501 067 6486</a>.',
                terms_link: 'Terms of Use',
                home: 'Home'
            },
            fa: {
                h1: 'سیاست حریم خصوصی',
                intro: 'این صفحه توضیح می‌دهد اپ‌های <strong>FXGuard Staff</strong> و پورتال کارکنان در <a href="https://app.fxguard.io">app.fxguard.io</a> با اطلاعات چه می‌کنند. این <strong>پورتال کارکنان</strong> است، نه شبکه اجتماعی مصرف‌کننده.',
                who_h: 'مسئول کیست',
                who_p: 'فروشنده محصول میزبانی‌شده: <strong>ERST IT Solutions Bilişim Teknolojileri Sanayi ve Ticaret Ltd. Şti.</strong> (محصول: FXGuard). تماس: <a href="mailto:support@fxguard.io">support@fxguard.io</a>. اگر سازمان سرور خودش را دارد، همان سازمان کنترل‌کننده داده است.',
                collect_h: 'اپ موبایل چه چیزی جمع می‌کند',
                c1: '<strong>اطلاعات ورود</strong> (ایمیل یا نام کاربری، رمز، TOTP اختیاری) — برای ورود به سرور سازمان. رمز روی دستگاه ذخیره نمی‌شود.',
                c2: '<strong>توکن نشست (JWT)</strong> در ذخیره امن اندروید یا Keychain در iOS.',
                c3: '<strong>ترجیحات</strong> روی دستگاه: زبان، آدرس سرور، پروفایل کش‌شده.',
                c4: '<strong>محتوای کاری</strong> پس از ورود (مکالمات واتساپ، مشتریان، تیکت، تسک) از API سازمان.',
                collect_no: 'بدون SDK تبلیغات، ترکر تحلیلی فروش داده، یا دسترسی به مخاطبین، دوربین، میکروفون و موقعیت دقیق.',
                use_h: 'نحوه استفاده',
                use_p: 'فقط برای کار پورتال: ورود، نشست، نمایش کار تخصیص‌داده‌شده، ارسال پیام در حد نقش. داده فروخته نمی‌شود.',
                share_h: 'اشتراک‌گذاری',
                share_p: 'داده روی دستگاه و سرور تنظیم‌شده می‌ماند (پیش‌فرض <code>https://app.fxguard.io</code>). با تبلیغ‌دهنده ثالث به اشتراک گذاشته نمی‌شود.',
                retain_h: 'نگهداری و امنیت',
                retain_p: 'JWT تا خروج یا حذف اپ می‌ماند. نگهداری سمت سرور با مدیر سازمان است. انتقال با HTTPS.',
                rights_h: 'حقوق شما',
                rights_p: 'حساب کارکنان را مدیر می‌سازد. برای دسترسی، اصلاح یا حذف با مدیر یا <a href="mailto:support@fxguard.io">support@fxguard.io</a> تماس بگیرید. <a href="/account-deletion">حذف حساب</a>.',
                kids_h: 'کودکان',
                kids_p: 'ابزار محیط کار است؛ برای زیر ۱۸ سال نیست.',
                intl_h: 'انتقال بین‌المللی',
                intl_p: 'سرور پیش‌فرض: داده در محل میزبان پردازش می‌شود. لایسنس خودمیزبان: داده روی سرور شما.',
                change_h: 'تغییرات',
                change_p: 'ممکن است این صفحه به‌روز شود.',
                contact_h: 'تماس',
                contact_p: 'حریم خصوصی: <a href="mailto:support@fxguard.io">support@fxguard.io</a> · فروش: <a href="mailto:sales@fxguard.io">sales@fxguard.io</a> · واتساپ: <a href="https://wa.me/905010676486">+90 501 067 6486</a>.',
                terms_link: 'شرایط استفاده',
                home: 'خانه'
            },
            tr: {
                h1: 'Gizlilik Politikası',
                intro: '<strong>FXGuard Staff</strong> iOS/Android uygulamaları ve <a href="https://app.fxguard.io">app.fxguard.io</a> personel panelinin bilgileri nasıl işlediğini açıklar. Bu bir <strong>personel portalıdır</strong>.',
                who_h: 'Sorumlu',
                who_p: 'Satıcı: <strong>ERST IT Solutions Bilişim Teknolojileri Sanayi ve Ticaret Ltd. Şti.</strong> (ürün: FXGuard). <a href="mailto:support@fxguard.io">support@fxguard.io</a>. Kendi sunucunuz varsa veri kontrolörü kuruluşunuzdur.',
                collect_h: 'Toplanan veriler',
                c1: 'Yazdığınız <strong>giriş bilgileri</strong> kuruluş sunucusuna gider. Parola cihazda saklanmaz.',
                c2: '<strong>JWT</strong> güvenli depoda.',
                c3: 'Dil, sunucu URL si, önbellek profil.',
                c4: 'Giriş sonrası <strong>iş içeriği</strong> (WhatsApp, müşteriler, talepler).',
                collect_no: 'Reklam SDK sı, satış amaçlı analitik veya rehber/kamera/mikrofon erişimi yok.',
                use_h: 'Kullanım',
                use_p: 'Yalnızca personel portalı için. Veri satılmaz.',
                share_h: 'Paylaşım',
                share_p: 'Veri cihazda ve <code>https://app.fxguard.io</code> veya sizin sunucunuzda kalır.',
                retain_h: 'Saklama',
                retain_p: 'JWT çıkışa kadar. HTTPS. Güvenli depo.',
                rights_h: 'Haklar',
                rights_p: 'Yöneticinize veya <a href="mailto:support@fxguard.io">support@fxguard.io</a> yazın. <a href="/account-deletion">Hesap silme</a>.',
                kids_h: 'Çocuklar',
                kids_p: 'İş aracıdır; 18 altı için değildir.',
                intl_h: 'Uluslararası',
                intl_p: 'Barındırılan veri sunucu konumunda işlenir. Self-hosted: sizin altyapınız.',
                change_h: 'Değişiklikler',
                change_p: 'Sayfa güncellenebilir.',
                contact_h: 'İletişim',
                contact_p: '<a href="mailto:support@fxguard.io">support@fxguard.io</a> · <a href="mailto:sales@fxguard.io">sales@fxguard.io</a> · WhatsApp: <a href="https://wa.me/905010676486">+90 501 067 6486</a>.',
                terms_link: 'Kullanım Koşulları',
                home: 'Ana sayfa'
            },
            ar: {
                h1: 'سياسة الخصوصية',
                intro: 'تشرح هذه الصفحة كيف تتعامل تطبيقات <strong>FXGuard Staff</strong> ولوحة <a href="https://app.fxguard.io">app.fxguard.io</a> مع المعلومات. هذا <strong>بوابة موظفين</strong> وليس تطبيقًا اجتماعيًا للمستهلك.',
                who_h: 'المسؤول',
                who_p: 'البائع: <strong>ERST IT Solutions Bilişim Teknolojileri Sanayi ve Ticaret Ltd. Şti.</strong> (المنتج: FXGuard). <a href="mailto:support@fxguard.io">support@fxguard.io</a>. إذا شغّلت مؤسستك خادمها الخاص، فهي المتحكم بالبيانات.',
                collect_h: 'ما تجمعه التطبيقات',
                c1: '<strong>بيانات الدخول</strong> تُرسل إلى خادم مؤسستك. لا تُخزَّن كلمة المرور على الجهاز.',
                c2: '<strong>رمز الجلسة (JWT)</strong> في التخزين الآمن.',
                c3: 'تفضيلات: اللغة، عنوان الخادم، ملف موظف مؤقت.',
                c4: '<strong>محتوى العمل</strong> بعد الدخول (محادثات واتساب، عملاء، تذاكر).',
                collect_no: 'لا SDK إعلانات ولا تتبع لبيع البيانات ولا وصول للكاميرا أو الميكروفون أو جهات الاتصال.',
                use_h: 'الاستخدام',
                use_p: 'لتشغيل بوابة الموظفين فقط. لا نبيع البيانات الشخصية.',
                share_h: 'المشاركة',
                share_p: 'البيانات تبقى على الجهاز وعلى <code>https://app.fxguard.io</code> أو خادمك.',
                retain_h: 'الاحتفاظ والأمان',
                retain_p: 'JWT حتى تسجيل الخروج. HTTPS. مخزن آمن.',
                rights_h: 'حقوقك',
                rights_p: 'يُنشئ المدير الحسابات. تواصل مع المدير أو <a href="mailto:support@fxguard.io">support@fxguard.io</a>. <a href="/account-deletion">حذف الحساب</a>.',
                kids_h: 'الأطفال',
                kids_p: 'أداة عمل؛ ليست للقاصرين.',
                intl_h: 'النقل الدولي',
                intl_p: 'الاستضافة الافتراضية: معالجة حيث يقع الخادم. الترخيص الذاتي: بنيتك.',
                change_h: 'التغييرات',
                change_p: 'قد نحدّث هذه الصفحة.',
                contact_h: 'اتصل',
                contact_p: '<a href="mailto:support@fxguard.io">support@fxguard.io</a> · <a href="mailto:sales@fxguard.io">sales@fxguard.io</a> · واتساب: <a href="https://wa.me/905010676486">+90 501 067 6486</a>.',
                terms_link: 'شروط الاستخدام',
                home: 'الرئيسية'
            },
            ru: {
                h1: 'Политика конфиденциальности',
                intro: 'Эта страница объясняет, как приложения <strong>FXGuard Staff</strong> и панель <a href="https://app.fxguard.io">app.fxguard.io</a> обрабатывают данные. Это <strong>портал сотрудников</strong>, а не потребительская соцсеть.',
                who_h: 'Кто отвечает',
                who_p: 'Продавец: <strong>ERST IT Solutions Bilişim Teknolojileri Sanayi ve Ticaret Ltd. Şti.</strong> (продукт FXGuard). <a href="mailto:support@fxguard.io">support@fxguard.io</a>. На своём сервере контролёр — ваша организация.',
                collect_h: 'Что собирают приложения',
                c1: '<strong>Учётные данные</strong> отправляются на сервер организации. Пароль на устройстве не хранится.',
                c2: '<strong>JWT</strong> в защищённом хранилище.',
                c3: 'Язык, URL сервера, кэш профиля.',
                c4: '<strong>Рабочий контент</strong> после входа (WhatsApp, клиенты, тикеты).',
                collect_no: 'Нет рекламных SDK, продажи аналитики, доступа к контактам, камере, микрофону.',
                use_h: 'Использование',
                use_p: 'Только для работы портала. Данные не продаются.',
                share_h: 'Передача',
                share_p: 'Данные остаются на устройстве и на <code>https://app.fxguard.io</code> или вашем сервере.',
                retain_h: 'Хранение',
                retain_p: 'JWT до выхода. HTTPS. Безопасное хранилище.',
                rights_h: 'Ваши права',
                rights_p: 'Аккаунты создаёт администратор. Пишите админу или на <a href="mailto:support@fxguard.io">support@fxguard.io</a>. <a href="/account-deletion">Удаление аккаунта</a>.',
                kids_h: 'Дети',
                kids_p: 'Рабочий инструмент; не для лиц младше 18.',
                intl_h: 'Международная передача',
                intl_p: 'Облако: обработка на хосте. Self-hosted: ваша инфраструктура.',
                change_h: 'Изменения',
                change_p: 'Страница может обновляться.',
                contact_h: 'Контакты',
                contact_p: '<a href="mailto:support@fxguard.io">support@fxguard.io</a> · <a href="mailto:sales@fxguard.io">sales@fxguard.io</a> · WhatsApp: <a href="https://wa.me/905010676486">+90 501 067 6486</a>.',
                terms_link: 'Условия использования',
                home: 'Главная'
            }
        },
        terms: {
            en: {
                h1: 'Terms of Use',
                intro: 'These terms apply to the <strong>FXGuard Staff</strong> mobile apps and staff web panel at <a href="https://app.fxguard.io">app.fxguard.io</a>. By signing in you accept them.',
                t1_h: '1. Authorized staff only',
                t1_p: 'Workplace tool only. Use your own credentials. Do not share passwords or TOTP devices. Follow your employer’s policies on customer data.',
                t2_h: '2. Not a public consumer signup',
                t2_p: 'Downloading the app does not create an account or grant access to any organization’s data.',
                t3_h: '3. Acceptable use',
                t3_p: 'Do not probe, scrape, or attack the service; do not impersonate colleagues; do not export customer data beyond your role and law.',
                t4_h: '4. Service and liability',
                t4_p: 'Software is provided as a business tool. Availability depends on your network and configured server. Mandatory consumer protections in your country remain.',
                t5_h: '5. App stores',
                t5_p: 'Apple and Google are not parties to your employment or CRM contract. No in-app purchases in the staff app.',
                t6_h: '6. Privacy',
                t6_p: 'See <a href="/privacy">Privacy Policy</a> and <a href="/account-deletion">Account deletion</a>. Questions: <a href="mailto:support@fxguard.io">support@fxguard.io</a>.',
                home: 'Home'
            },
            fa: {
                h1: 'شرایط استفاده',
                intro: 'برای اپ‌های <strong>FXGuard Staff</strong> و پورتال <a href="https://app.fxguard.io">app.fxguard.io</a>. با ورود می‌پذیرید.',
                t1_h: '۱. فقط کارکنان مجاز',
                t1_p: 'ابزار محیط کار. رمز و TOTP را به اشتراک نگذارید.',
                t2_h: '۲. ثبت‌نام عمومی نیست',
                t2_p: 'نصب اپ حساب یا دسترسی به داده سازمان نمی‌سازد.',
                t3_h: '۳. استفاده مجاز',
                t3_p: 'حمله، جعل هویت، خروج غیرمجاز داده ممنوع.',
                t4_h: '۴. خدمت و مسئولیت',
                t4_p: 'ابزار کسب‌وکار. دسترسی به شبکه و سرور بستگی دارد.',
                t5_h: '۵. استورها',
                t5_p: 'اپل و گوگل طرف قرارداد استخدام شما نیستند.',
                t6_h: '۶. حریم خصوصی',
                t6_p: '<a href="/privacy">سیاست حریم خصوصی</a> · <a href="/account-deletion">حذف حساب</a> · <a href="mailto:support@fxguard.io">support@fxguard.io</a>',
                home: 'خانه'
            },
            tr: {
                h1: 'Kullanım Koşulları',
                intro: '<strong>FXGuard Staff</strong> ve <a href="https://app.fxguard.io">app.fxguard.io</a> için. Giriş = kabul.',
                t1_h: '1. Yetkili personel',
                t1_p: 'İş aracı. Kimlik bilgilerini paylaşmayın.',
                t2_h: '2. Herkese açık kayıt yok',
                t2_p: 'İndirmek hesap açmaz.',
                t3_h: '3. Kabul edilebilir kullanım',
                t3_p: 'Saldırı, taklit, yetkisiz dışa aktarma yasak.',
                t4_h: '4. Hizmet',
                t4_p: 'İş aracı olarak sunulur.',
                t5_h: '5. Mağazalar',
                t5_p: 'Apple/Google işvereniniz değil.',
                t6_h: '6. Gizlilik',
                t6_p: '<a href="/privacy">Gizlilik</a> · <a href="/account-deletion">Hesap silme</a>',
                home: 'Ana sayfa'
            },
            ar: {
                h1: 'شروط الاستخدام',
                intro: 'لتطبيقات <strong>FXGuard Staff</strong> و<a href="https://app.fxguard.io">app.fxguard.io</a>. الدخول يعني القبول.',
                t1_h: '١. موظفون مخوّلون فقط',
                t1_p: 'أداة عمل. لا تشارك كلمة المرور أو TOTP.',
                t2_h: '٢. ليس تسجيلًا عامًا',
                t2_p: 'التنزيل لا يفتح حسابًا.',
                t3_h: '٣. استخدام مقبول',
                t3_p: 'ممنوع الهجوم أو انتحال الهوية أو تصدير بيانات غير مصرح.',
                t4_h: '٤. الخدمة',
                t4_p: 'أداة أعمال.',
                t5_h: '٥. المتاجر',
                t5_p: 'Apple وGoogle ليستا طرفًا في عقدك.',
                t6_h: '٦. الخصوصية',
                t6_p: '<a href="/privacy">الخصوصية</a> · <a href="/account-deletion">حذف الحساب</a>',
                home: 'الرئيسية'
            },
            ru: {
                h1: 'Условия использования',
                intro: 'Для <strong>FXGuard Staff</strong> и <a href="https://app.fxguard.io">app.fxguard.io</a>. Вход = согласие.',
                t1_h: '1. Только сотрудники',
                t1_p: 'Рабочий инструмент. Не делитесь паролем и TOTP.',
                t2_h: '2. Нет публичной регистрации',
                t2_p: 'Установка не создаёт аккаунт.',
                t3_h: '3. Допустимое использование',
                t3_p: 'Запрещены атаки, подмена, несанкционированный экспорт.',
                t4_h: '4. Сервис',
                t4_p: 'Предоставляется как бизнес-инструмент.',
                t5_h: '5. Магазины приложений',
                t5_p: 'Apple и Google не стороны вашего договора.',
                t6_h: '6. Конфиденциальность',
                t6_p: '<a href="/privacy">Политика</a> · <a href="/account-deletion">Удаление</a>',
                home: 'Главная'
            }
        },
        deletion: {
            en: {
                h1: 'Staff account deletion',
                intro: 'FXGuard Staff does <strong>not</strong> create accounts inside the app. Your administrator creates each user. Apple and Google still require a public deletion path.',
                s1_h: 'On this device',
                s1_p: 'Use <strong>Sign out</strong> in profile. Uninstalling removes the local JWT and preferences.',
                s2_h: 'On the server',
                s2_1: 'Ask your organization administrator to deactivate or delete your user in the web panel (Users).',
                s2_2: 'If you cannot reach an admin, email <a href="mailto:support@fxguard.io?subject=Staff%20account%20deletion">support@fxguard.io</a> from your staff account email with username and server URL.',
                s2_p: 'We verify identity before deletion. Customer WhatsApp history belongs to the organization and is not erased when one staff user is removed unless the admin requests it and law requires.',
                privacy: 'Privacy Policy',
                contact: 'Contact'
            },
            fa: {
                h1: 'حذف حساب کارکنان',
                intro: 'FXGuard Staff <strong>داخل اپ حساب نمی‌سازد</strong>. مدیر سازمان کاربر را ایجاد می‌کند.',
                s1_h: 'روی این دستگاه',
                s1_p: '<strong>خروج از حساب</strong> در پروفایل. حذف اپ JWT محلی را برمی‌دارد.',
                s2_h: 'روی سرور',
                s2_1: 'از مدیر بخواهید کاربر را در پنل (کاربران) غیرفعال یا حذف کند.',
                s2_2: 'اگر به مدیر دسترسی ندارید از ایمیل حساب به <a href="mailto:support@fxguard.io?subject=Staff%20account%20deletion">support@fxguard.io</a> بنویسید.',
                s2_p: 'قبل از حذف هویت را بررسی می‌کنیم. تاریخچه واتساپ مشتری مال سازمان است.',
                privacy: 'سیاست حریم خصوصی',
                contact: 'تماس'
            },
            tr: {
                h1: 'Personel hesabını sil',
                intro: 'FXGuard Staff <strong>uygulama içinde hesap açmaz</strong>. Yönetici oluşturur.',
                s1_h: 'Bu cihazda',
                s1_p: 'Profilde <strong>Çıkış</strong>. Kaldırma yerel JWT yi siler.',
                s2_h: 'Sunucuda',
                s2_1: 'Yöneticiden web panelinde (Kullanıcılar) hesabınızı kapatmasını isteyin.',
                s2_2: 'Ulaşamıyorsanız <a href="mailto:support@fxguard.io?subject=Staff%20account%20deletion">support@fxguard.io</a> yazın.',
                s2_p: 'Silmeden önce doğrulama yapılır. Müşteri geçmişi kuruluşa aittir.',
                privacy: 'Gizlilik Politikası',
                contact: 'İletişim'
            },
            ar: {
                h1: 'حذف حساب الموظف',
                intro: 'FXGuard Staff <strong>لا ينشئ حسابات داخل التطبيق</strong>. المدير ينشئ المستخدم.',
                s1_h: 'على هذا الجهاز',
                s1_p: '<strong>تسجيل الخروج</strong> من الملف. إزالة التطبيق تحذف JWT المحلي.',
                s2_h: 'على الخادم',
                s2_1: 'اطلب من المدير تعطيل أو حذف حسابك من لوحة المستخدمين.',
                s2_2: 'إذا لم تصل للمدير راسل <a href="mailto:support@fxguard.io?subject=Staff%20account%20deletion">support@fxguard.io</a>.',
                s2_p: 'نتحقق من الهوية قبل الحذف. سجل واتساب العملاء للمؤسسة.',
                privacy: 'سياسة الخصوصية',
                contact: 'اتصل'
            },
            ru: {
                h1: 'Удаление аккаунта сотрудника',
                intro: 'FXGuard Staff <strong>не создаёт аккаунты в приложении</strong>. Пользователя создаёт администратор.',
                s1_h: 'На устройстве',
                s1_p: '<strong>Выход</strong> в профиле. Удаление приложения стирает локальный JWT.',
                s2_h: 'На сервере',
                s2_1: 'Попросите администратора отключить или удалить пользователя в панели.',
                s2_2: 'Если админ недоступен: <a href="mailto:support@fxguard.io?subject=Staff%20account%20deletion">support@fxguard.io</a>.',
                s2_p: 'Перед удалением проверяем личность. История клиентов принадлежит организации.',
                privacy: 'Политика конфиденциальности',
                contact: 'Контакты'
            }
        }
    };

    var page = 'privacy';
    if (document.body && document.body.getAttribute('data-legal-page')) {
        page = document.body.getAttribute('data-legal-page');
    } else if (/\/terms/.test(location.pathname)) {
        page = 'terms';
    } else if (/\/account-deletion/.test(location.pathname)) {
        page = 'deletion';
    }

    function apply(lang) {
        if (SUPPORTED.indexOf(lang) === -1) lang = 'en';
        var dict = (T[page] && T[page][lang]) || (T[page] && T[page].en) || {};
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
            privacy: { en: 'Privacy Policy | FXGuard', fa: 'سیاست حریم خصوصی | FXGuard', tr: 'Gizlilik Politikası | FXGuard', ar: 'سياسة الخصوصية | FXGuard', ru: 'Политика конфиденциальности | FXGuard' },
            terms: { en: 'Terms of Use | FXGuard', fa: 'شرایط استفاده | FXGuard', tr: 'Kullanım Koşulları | FXGuard', ar: 'شروط الاستخدام | FXGuard', ru: 'Условия | FXGuard' },
            deletion: { en: 'Account deletion | FXGuard', fa: 'حذف حساب | FXGuard', tr: 'Hesap silme | FXGuard', ar: 'حذف الحساب | FXGuard', ru: 'Удаление аккаунта | FXGuard' }
        };
        if (titles[page] && titles[page][lang]) document.title = titles[page][lang];
        var canon = document.querySelector('link[rel="canonical"]');
        if (canon) {
            var base = 'https://fxguard.io/' + (page === 'deletion' ? 'account-deletion' : page);
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
})();
