(function() {
    'use strict';
    var LANG = 'en';
    var SUPPORTED_LANGS = ['en', 'fa', 'tr'];
    var TRANSLATIONS = {
        en: {
            logo: 'Kaya CRM',
            nav_why: 'Why this panel?', nav_features: 'Capabilities', nav_panel: 'Panel', nav_pricing: 'Pricing', nav_faq: 'FAQ', nav_contact: 'Contact', nav_panel_btn: 'Open panel',
            nav_channel: 'WhatsApp channel',
            hero_badge: 'For exchange & remittance teams',
            hero_title: 'The customer book stays with the company. <span>Even if staff leave.</span>',
            hero_desc: 'Quoted rates are timestamped, roles and branches are enforced, and WhatsApp history is not trapped on a personal phone. Built for multi-branch FX desks — not a generic inbox.',
            hero_cta1: 'See plans', hero_cta_wa: 'Commercial quote on WhatsApp', hero_cta2: 'Request an invoice',
            problems_title: 'What FX desks actually lose money on', problems_sub: 'Inbox features are table stakes. These are the incidents a $49 chat tool does not prevent.',
            p1_title: 'Staff leave with the customer book', p1_desc: 'Chats live on a personal phone. When a dealer resigns, the relationships walk out with them.',
            p2_title: 'Rate disputes with no record', p2_desc: 'A quoted USD/TRY or gold price in chat cannot be proven. One disagreement can cost more than years of software.',
            p3_title: 'Shared logins across branches', p3_desc: 'One WhatsApp, many people, no roles. Nobody can say who quoted, who paid, or who saw the number.',
            p4_title: 'Broadcasts that burn the line', p4_desc: 'Unofficial WhatsApp links + bulk sends get numbers banned. We say this up front and offer Meta Cloud API when you need it.',
            solution_title: 'Ownership, quoted rates, and audit — then the inbox',
            solution_desc: 'Kaya CRM is the operations panel for exchange and remittance teams on WhatsApp: customer history belongs to the company, rates are logged, and every action has a role. Shared inbox, tickets and tasks are included — they are not the product.',
            solution_cta: 'See how it is priced',
            features_title: 'What you buy this for', features_sub: 'Start with the FX controls. The rest of a WhatsApp CRM is included.',
            f1_title: 'Customer book stays in the company', f1_desc: 'History, tags and notes follow the customer — not the employee’s phone. Owners keep the book after staff exit.',
            f2_title: 'Quoted rates, timestamped', f2_desc: 'Internal FX rates, charts and exchange services so the price you told the customer is the price on record.',
            f3_title: 'Roles, branches, 2FA, audit logs', f3_desc: 'Owner through agent. Each branch sees its desk. Google Authenticator and activity logs on every account.',
            f4_title: 'Shared WhatsApp inbox', f4_desc: 'One business number, assignment, unread and unanswered queues. Included — not the reason to choose us.',
            f5_title: 'Tickets and tasks', f5_desc: 'Turn a chat into a tracked job with an owner. Included with every plan.',
            f6_title: 'Two WhatsApp paths, stated honestly', f6_desc: 'QR / WhatsApp Web for markets without Meta BSP. Official Cloud API when you need templates and lower ban risk.',
            ch_title: 'How WhatsApp is connected — two honest paths',
            ch_sub: 'We will not pretend every deployment is a Meta Business Solution Provider. Choose the path that matches your market.',
            ch_a_title: 'QR gateway (WhatsApp Web)',
            ch_a_desc: 'Scan once, staff reply from the panel. Fast, no Meta Business verification. This is an unofficial session: bulk/broadcast raises ban risk. Use it when official API is not available.',
            ch_b_title: 'Official Meta Cloud API',
            ch_b_desc: 'Verified WhatsApp Business API. No QR. Template messages outside the 24-hour window. Required for serious bulk and for buyers who need a compliant channel.',
            panel_title: 'The real panel', panel_sub: 'Desktop and mobile staff UI — rates, inbox, roles. Ask for a guided session if you need your own number connected.',
            panel_desktop: 'Desktop', panel_mobile: 'Mobile',
            stat1: 'User roles', stat2: 'FX tools', stat3: '2FA', stat4: 'Multi-branch',
            pricing_title: 'Price follows branches and seats — not a fake Enterprise sticker',
            pricing_sub: 'Self-serve cloud for a small desk. Commercial quotes, invoices and SLA for multi-branch FX teams. New tiers apply to new signups.',
            pricing_cloud_note: 'Hosted cloud',
            pricing_commercial_note: 'Commercial — invoice and security summary',
            plan_start: 'Cloud Start', plan_business: 'Cloud Business', plan_multi: 'Cloud Multi-branch',
            plan_license: 'Self-hosted license', plan_managed: 'Managed dedicated',
            plan_start_who: '1 branch · up to 3 staff',
            plan_business_who: 'Up to 3 branches · 10 staff · FX module',
            plan_multi_who: 'More branches · written support SLA',
            plan_license_who: 'Your servers · data stays with you',
            plan_managed_who: 'We install and operate a dedicated instance',
            plan_mo: '/month', plan_from: 'from', plan_once: 'one-time from',
            plan_popular: 'For growing desks',
            plan_s1: 'Inbox, customers, tickets, tasks', plan_s2: '1 WhatsApp number', plan_s3: 'Email support',
            plan_b1: 'FX rates, charts, exchange services', plan_b2: 'Roles and branch separation', plan_b3: '2FA and audit logs',
            plan_m1: 'Priority support / SLA on request', plan_m2: 'Onboarding for multiple locations', plan_m3: 'Invoice and procurement pack',
            plan_l1: 'Full system handover', plan_l2: 'Install guide', plan_l3: 'Optional yearly updates',
            plan_g1: 'Dedicated instance', plan_g2: 'Monitoring and backups', plan_g3: 'Account manager',
            plan_btn: 'Buy Start on WhatsApp', plan_btn_card: 'Pay $49 / month', plan_btn_biz: 'Quote Business on WhatsApp', plan_btn_multi: 'Request invoice',
            plan_contact: 'Get a written quote',
            faq_title: 'Questions buyers actually ask', faq_sub: 'Channel, price, and how to purchase with an invoice.',
            faq1_q: 'Is this a generic WhatsApp CRM?', faq1_a: 'The inbox is included. The product is ownership of the FX customer book: quoted rates, roles, branches and audit. Compare us there — not feature-for-feature with Wati or Chatwoot.',
            faq2_q: 'Is WhatsApp official Meta API?', faq2_a: 'Two paths: unofficial WhatsApp Web (QR) without Business verification — faster, ban risk on bulk — and official Meta Cloud API. We will not hide which one you are on. Cloud API is required for serious broadcast.',
            faq3_q: 'Why not $49 unlimited for everyone?', faq3_a: 'Cloud Start is $49/month for one branch and up to three staff. Business is from $249, Multi-branch from $499. License from $4,000 one-time. Managed from $800/month. Final commercial numbers can be negotiated; the floor is published so procurement is not guessing.',
            faq4_q: 'Can we get an invoice / PO instead of WhatsApp checkout?', faq4_a: 'Yes. Use Request invoice or Get a written quote. Read the <a href="/procurement">security and procurement summary</a> (print to PDF). Cloud Start can be paid by card when Stripe is enabled; otherwise WhatsApp. Commercial and license deals go through invoice.',
            faq5_q: 'How do we try it with our own number?', faq5_a: 'The public panel is for browsing screens. For a live line, ask for a guided session (about 10 minutes) or a time-limited trial where you connect your number and can disconnect it afterwards.',
            contact_demo: 'Guided demo', contact_buy: 'Cloud Start', contact_quote: 'Invoice / quote', contact_support: 'Support',
            channel_wa: 'WhatsApp', channel_sales: 'Sales', channel_support: 'Support',
            form_response: 'We reply within 24 hours on business days. Commercial quotes include a price range even when the final number is negotiated.',
            form_purpose: 'I want to *', form_purpose_placeholder: 'Select...', form_purpose_purchase: 'Cloud Start (self-serve)', form_purpose_quote: 'Commercial quote / invoice', form_purpose_license: 'Self-hosted license', form_purpose_managed: 'Managed dedicated', form_purpose_demo: 'Guided demo', form_purpose_trial: '7-day own-number trial', form_purpose_support: 'Technical support', form_purpose_other: 'Other',
            form_title: 'Talk to sales', form_sub: 'Start on WhatsApp, or request an invoice for Business, Multi-branch, license or managed.',
            form_name: 'Name *', form_email: 'Email *', form_phone: 'Phone / WhatsApp', form_message: 'Message *', form_submit: 'Send', form_success: 'Thank you. We will contact you soon.', form_wa: 'Or WhatsApp +90 501 067 6486',
            cta_title: 'Ready to run the desk on one panel?', cta_desc: 'Cloud Start on WhatsApp, or a written quote if you need invoices, SLA or your own servers.',
            cta_plans: 'See plans', cta_wa: 'WhatsApp', cta_form: 'Invoice / quote',
            trust_fast_start: 'Guided demo on request', trust_24h: '24h sales reply', trust_secure: '2FA and audit logs',
            cases_title: 'What desks tell us — anonymized',
            cases_sub: 'No fake logos. These are the incidents that close a deal, written so a buyer can recognize themselves.',
            c1_meta: 'Istanbul · remittance · 2 branches',
            c1_title: 'The book stayed when two dealers left',
            c1_desc: 'Chats and tags were on the company panel. The owner did not buy the customer list back from departing staff.',
            c2_meta: 'Anatolia · FX / gold shop',
            c2_title: 'A quoted USD/TRY rate was on record',
            c2_desc: 'A dispute over the price said in WhatsApp ended with a timestamped quote — not a screenshot argument.',
            c3_meta: 'Multi-city desk · 8 staff',
            c3_title: 'Roles stopped a shared WhatsApp login',
            c3_desc: 'Each branch saw its own queue. The owner could see who quoted and who marked a ticket done.',
            demo_title: 'Guided demo, or a time-limited trial on your number',
            demo_sub: 'The public panel is for browsing screens. A live line is a 10-minute session or a trial you can disconnect.',
            demo_step1: '10-minute walkthrough of rates, inbox, roles and branches',
            demo_step2: 'Optional trial: connect your WhatsApp, then disconnect it',
            demo_step3: 'Cloud Start self-serve, or a written quote for Business / license',
            demo_cta: 'Book a guided demo on WhatsApp',
            demo_trial: 'Ask for a 7-day own-number trial',
            page_pricing_title: 'Plans and price floors',
            page_channel_title: 'WhatsApp channel — two honest paths',
            footer_contact: 'Contact', footer_faq: 'FAQ', footer_pricing: 'Pricing', footer_support: 'Support', footer_privacy: 'Privacy', footer_terms: 'Terms', footer_channel: 'WhatsApp channel', footer_procurement: 'Security / invoice pack',
            a2hs_title: 'Install app on your phone',
            a2hs_desc: 'Add this page to Home Screen for faster access.',
            a2hs_btn_install: 'Add to Home Screen',
            a2hs_btn_later: 'Later'
        },
        fa: {
            logo: 'Kaya CRM',
            nav_why: 'چرا این پنل؟', nav_features: 'قابلیت‌ها', nav_panel: 'پنل', nav_pricing: 'قیمت', nav_faq: 'سوالات', nav_contact: 'تماس', nav_panel_btn: 'ورود به پنل',
            nav_channel: 'کانال واتساپ',
            hero_badge: 'برای تیم‌های صرافی و حواله',
            hero_title: 'دفتر مشتری مال شرکت می‌ماند. <span>حتی اگر کارمند برود.</span>',
            hero_desc: 'نرخ اعلام‌شده ثبت می‌شود، نقش و شعبه اعمال می‌شود، و تاریخچه واتساپ روی گوشی شخصی گیر نمی‌کند. ساخته‌شده برای میزهای چندشعبه ارز — نه یک صندوق ورودی عمومی.',
            hero_cta1: 'مشاهده پلن‌ها', hero_cta_wa: 'استعلام تجاری در واتساپ', hero_cta2: 'درخواست فاکتور',
            problems_title: 'صرافی واقعاً از کجا ضرر می‌کند', problems_sub: 'اینباکس ویژگی پایه است. این‌ها حوادثی است که یک ابزار چت ۴۹ دلاری جلوگیری نمی‌کند.',
            p1_title: 'خروج کارمند با دفتر مشتری', p1_desc: 'چت‌ها روی گوشی شخصی است. وقتی صراف می‌رود، روابط هم با او می‌رود.',
            p2_title: 'اختلاف نرخ بدون سند', p2_desc: 'قیمت دلار یا طلا در چت قابل اثبات نیست. یک اختلاف می‌تواند بیشتر از سال‌ها اشتراک نرم‌افزار هزینه داشته باشد.',
            p3_title: 'ورود مشترک بین شعب', p3_desc: 'یک واتساپ، چند نفر، بدون نقش. معلوم نیست چه کسی نرخ داد، چه کسی پرداخت دید، چه کسی شماره را دید.',
            p4_title: 'پیام انبوه که خط را می‌سوزاند', p4_desc: 'اتصال غیررسمی واتساپ به‌علاوه broadcast شماره را در معرض مسدود شدن می‌گذارد. این را از اول می‌گوییم و Cloud API رسمی را وقتی لازم است پیشنهاد می‌کنیم.',
            solution_title: 'مالکیت، نرخ ثبت‌شده، حسابرسی — بعد صندوق ورودی',
            solution_desc: 'Kaya CRM پنل عملیات صرافی و حواله روی واتساپ است: تاریخچه مشتری مال شرکت است، نرخ‌ها ثبت می‌شوند و هر اقدام نقش دارد. اینباکس، تیکت و تسک شامل هستند — خود محصول نیستند.',
            solution_cta: 'ببینید چطور قیمت‌گذاری شده',
            features_title: 'برای چه می‌خرید', features_sub: 'از کنترل‌های ارز شروع کنید. بقیه CRM واتساپ شامل است.',
            f1_title: 'دفتر مشتری در شرکت می‌ماند', f1_desc: 'تاریخچه، تگ و یادداشت با مشتری می‌ماند — نه با گوشی کارمند. بعد از خروج نیرو، مالک دفتر را نگه می‌دارد.',
            f2_title: 'نرخ اعلام‌شده، زمان‌دار', f2_desc: 'نرخ داخلی، نمودار و خدمات صرافی تا قیمتی که به مشتری گفتید همان قیمت روی سند باشد.',
            f3_title: 'نقش، شعبه، ۲FA، لاگ', f3_desc: 'از مالک تا کارشناس. هر شعبه میز خودش را می‌بیند. Google Authenticator و لاگ فعالیت روی هر حساب.',
            f4_title: 'صندوق ورودی واتساپ', f4_desc: 'یک شماره کسب‌وکار، تخصیص، صف خوانده‌نشده و بدون پاسخ. شامل است — دلیل انتخاب ما نیست.',
            f5_title: 'تیکت و تسک', f5_desc: 'چت را به کار قابل پیگیری با مسئول تبدیل کنید. در همه پلن‌ها هست.',
            f6_title: 'دو مسیر واتساپ، صادقانه', f6_desc: 'QR / واتساپ وب برای بازارهایی بدون BSP متا. Cloud API رسمی وقتی قالب و ریسک بن کمتر لازم است.',
            ch_title: 'اتصال واتساپ — دو مسیر صادقانه',
            ch_sub: 'وانمود نمی‌کنیم هر نصب یک ارائه‌دهنده رسمی Meta است. مسیری را انتخاب کنید که با بازار شما می‌خواند.',
            ch_a_title: 'Gateway با QR (واتساپ وب)',
            ch_a_desc: 'یک‌بار اسکن، پاسخ از پنل. سریع، بدون تأیید بیزنس متا. نشست غیررسمی است: پیام انبوه ریسک مسدود شدن دارد. وقتی API رسمی در دسترس نیست.',
            ch_b_title: 'Cloud API رسمی Meta',
            ch_b_desc: 'واتساپ بیزنس تأییدشده. بدون QR. قالب خارج از پنجره ۲۴ ساعته. برای broadcast جدی و خریدارانی که کانال تطبیقی می‌خواهند لازم است.',
            panel_title: 'خود پنل', panel_sub: 'رابط دسکتاپ و موبایل — نرخ، اینباکس، نقش. برای اتصال شماره خودتان جلسه هدایت‌شده بخواهید.',
            panel_desktop: 'دسکتاپ', panel_mobile: 'موبایل',
            stat1: 'نقش کاربری', stat2: 'ابزار ارز', stat3: '۲FA', stat4: 'چندشعبه',
            pricing_title: 'قیمت با شعبه و صندلی حرکت می‌کند — نه برچسب دروغین سازمانی',
            pricing_sub: 'ابر خودخدمت برای میز کوچک. استعلام، فاکتور و SLA برای تیم چندشعبه. سطوح جدید فقط برای ثبت‌نام جدید.',
            pricing_cloud_note: 'ابر میزبانی‌شده',
            pricing_commercial_note: 'تجاری — فاکتور و خلاصه امنیت',
            plan_start: 'ابر شروع', plan_business: 'ابر تجاری', plan_multi: 'ابر چندشعبه',
            plan_license: 'لایسنس اختصاصی', plan_managed: 'میزبانی مدیریت‌شده',
            plan_start_who: '۱ شعبه · تا ۳ کارمند',
            plan_business_who: 'تا ۳ شعبه · ۱۰ کارمند · ماژول نرخ',
            plan_multi_who: 'شعبه بیشتر · SLA پشتیبانی نوشته‌شده',
            plan_license_who: 'سرور خودتان · داده پیش شما',
            plan_managed_who: 'نصب و نگهداری توسط ما',
            plan_mo: '/ماه', plan_from: 'از', plan_once: 'یک‌باره از',
            plan_popular: 'برای میز در حال رشد',
            plan_s1: 'اینباکس، مشتری، تیکت، تسک', plan_s2: 'یک شماره واتساپ', plan_s3: 'پشتیبانی ایمیل',
            plan_b1: 'نرخ، نمودار، خدمات صرافی', plan_b2: 'نقش و تفکیک شعبه', plan_b3: '۲FA و لاگ حسابرسی',
            plan_m1: 'پشتیبانی اولویت / SLA درخواستی', plan_m2: 'راه‌اندازی چند محل', plan_m3: 'فاکتور و بسته تدارکات',
            plan_l1: 'تحویل کامل سیستم', plan_l2: 'راهنمای نصب', plan_l3: 'به‌روزرسانی سالانه اختیاری',
            plan_g1: 'نمونه اختصاصی', plan_g2: 'مانیتورینگ و پشتیبان', plan_g3: 'مدیر حساب',
            plan_btn: 'خرید شروع از واتساپ', plan_btn_card: 'پرداخت ۴۹ دلار در ماه', plan_btn_biz: 'استعلام تجاری واتساپ', plan_btn_multi: 'درخواست فاکتور',
            plan_contact: 'پیش‌فاکتور کتبی',
            faq_title: 'سؤالاتی که خریدار واقعاً می‌پرسد', faq_sub: 'کانال، قیمت، و خرید با فاکتور.',
            faq1_q: 'این یک CRM عمومی واتساپ است؟', faq1_a: 'صندوق ورودی شامل است. محصول مالکیت دفتر مشتری صرافی است: نرخ اعلام‌شده، نقش، شعبه و حسابرسی. آنجا مقایسه کنید — نه ویژگی‌به‌ویژگی با Wati یا Chatwoot.',
            faq2_q: 'واتساپ رسمی Meta است؟', faq2_a: 'دو مسیر: واتساپ وب غیررسمی (QR) بدون تأیید بیزنس — سریع‌تر، ریسک بن روی انبوه — و Cloud API رسمی. پنهان نمی‌کنیم روی کدام هستید. برای broadcast جدی Cloud API لازم است.',
            faq3_q: 'چرا برای همه ۴۹ دلار نامحدود نیست؟', faq3_a: 'شروع ابری ۴۹ دلار در ماه برای یک شعبه و تا سه کارمند است. تجاری از ۲۴۹، چندشعبه از ۴۹۹. لایسنس از ۴۰۰۰ دلار یک‌باره. مدیریت‌شده از ۸۰۰ دلار در ماه. عدد نهایی تجاری قابل مذاکره است؛ کف منتشر شده تا تدارکات حدس نزند.',
            faq4_q: 'فاکتور یا سفارش خرید به‌جای چک‌اوت واتساپ؟', faq4_a: 'بله. درخواست فاکتور یا پیش‌فاکتور کتبی. <a href="/procurement">خلاصه امنیت و تدارکات</a> را بخوانید (چاپ PDF). ابر شروع وقتی Stripe روشن باشد با کارت؛ وگرنه واتساپ. معامله تجاری و لایسنس با فاکتور است.',
            faq5_q: 'چطور با شماره خودمان امتحان کنیم؟', faq5_a: 'پنل عمومی برای دیدن صفحه‌هاست. برای خط زنده، جلسه هدایت‌شده (حدود ۱۰ دقیقه) بخواهید یا آزمایش زمان‌محدود که شماره را وصل کنید و بعد قطع کنید.',
            contact_demo: 'دمو هدایت‌شده', contact_buy: 'ابر شروع', contact_quote: 'فاکتور / استعلام', contact_support: 'پشتیبانی',
            channel_wa: 'واتساپ', channel_sales: 'فروش', channel_support: 'پشتیبانی',
            form_response: 'در روزهای کاری ظرف ۲۴ ساعت پاسخ می‌دهیم. استعلام تجاری حتی اگر عدد نهایی مذاکره‌ای باشد محدوده قیمت دارد.',
            form_purpose: 'هدف من *', form_purpose_placeholder: 'انتخاب...', form_purpose_purchase: 'ابر شروع (خودخدمت)', form_purpose_quote: 'استعلام تجاری / فاکتور', form_purpose_license: 'لایسنس اختصاصی', form_purpose_managed: 'میزبانی مدیریت‌شده', form_purpose_demo: 'دمو هدایت‌شده', form_purpose_trial: 'آزمایش ۷روزه با شماره خودتان', form_purpose_support: 'پشتیبانی فنی', form_purpose_other: 'سایر',
            form_title: 'گفتگو با فروش', form_sub: 'شروع از واتساپ، یا درخواست فاکتور برای تجاری، چندشعبه، لایسنس یا مدیریت‌شده.',
            form_name: 'نام *', form_email: 'ایمیل *', form_phone: 'تلفن / واتساپ', form_message: 'پیام *', form_submit: 'ارسال', form_success: 'متشکریم. به‌زودی تماس می‌گیریم.', form_wa: 'یا واتساپ: ۰۰۹۰۵۰۱۰۶۷۶۴۸۶',
            cta_title: 'آماده اداره میز از یک پنل هستید؟', cta_desc: 'ابر شروع از واتساپ، یا پیش‌فاکتور اگر فاکتور، SLA یا سرور خودتان می‌خواهید.',
            cta_plans: 'پلن‌ها', cta_wa: 'واتساپ', cta_form: 'فاکتور / استعلام',
            trust_fast_start: 'دمو هدایت‌شده درخواستی', trust_24h: 'پاسخ فروش ۲۴ ساعته', trust_secure: '۲FA و لاگ حسابرسی',
            cases_title: 'آنچه میزها می‌گویند — بدون نام',
            cases_sub: 'لوگوی جعلی نیست. این‌ها حوادثی است که معامله را می‌بندد؛ طوری نوشته شده که خریدار خودش را بشناسد.',
            c1_meta: 'استانبول · حواله · ۲ شعبه',
            c1_title: 'دفتر ماند وقتی دو صراف رفتند',
            c1_desc: 'چت و تگ روی پنل شرکت بود. مالک فهرست مشتری را از نیروی خارج‌شده نخرید.',
            c2_meta: 'آناتولی · صرافی / طلا',
            c2_title: 'نرخ اعلام‌شده دلار/لیر روی سند بود',
            c2_desc: 'اختلاف قیمت در واتساپ با نرخ زمان‌دار تمام شد — نه بحث اسکرین‌شات.',
            c3_meta: 'میز چندشهر · ۸ نفر',
            c3_title: 'نقش، ورود مشترک واتساپ را بست',
            c3_desc: 'هر شعبه صف خودش را دید. مالک دید چه کسی نرخ داد و چه کسی تیکت را بست.',
            demo_title: 'دمو هدایت‌شده، یا آزمایش زمان‌محدود روی شماره شما',
            demo_sub: 'پنل عمومی برای دیدن صفحه‌هاست. خط زنده جلسه ۱۰ دقیقه‌ای است یا آزمایشی که قطع می‌کنید.',
            demo_step1: 'مرور ۱۰ دقیقه‌ای نرخ، اینباکس، نقش و شعبه',
            demo_step2: 'آزمایش اختیاری: واتساپ را وصل کنید، بعد قطع کنید',
            demo_step3: 'ابر شروع خودخدمت، یا پیش‌فاکتور برای تجاری / لایسنس',
            demo_cta: 'رزرو دمو هدایت‌شده در واتساپ',
            demo_trial: 'درخواست آزمایش ۷روزه با شماره خودتان',
            page_pricing_title: 'پلن‌ها و کف قیمت',
            page_channel_title: 'کانال واتساپ — دو مسیر صادقانه',
            footer_contact: 'تماس', footer_faq: 'سوالات', footer_pricing: 'قیمت', footer_support: 'پشتیبانی', footer_privacy: 'حریم خصوصی', footer_terms: 'شرایط', footer_channel: 'کانال واتساپ', footer_procurement: 'بسته امنیت / فاکتور',
            a2hs_title: 'نصب روی گوشی',
            a2hs_desc: 'برای دسترسی سریع‌تر، این صفحه را به هوم اسکرین اضافه کنید.',
            a2hs_btn_install: 'افزودن به هوم اسکرین',
            a2hs_btn_later: 'بعدا'
        },
        tr: {
            logo: 'Kaya CRM',
            nav_why: 'Neden bu panel?', nav_features: 'Yetenekler', nav_panel: 'Panel', nav_pricing: 'Fiyat', nav_faq: 'SSS', nav_contact: 'İletişim', nav_panel_btn: 'Panele gir',
            nav_channel: 'WhatsApp kanalı',
            hero_badge: 'Döviz ve havale ekipleri için',
            hero_title: 'Müşteri defteri şirkette kalır. <span>Personel gitse bile.</span>',
            hero_desc: 'Verilen kur kayda geçer, roller ve şubeler uygulanır, WhatsApp geçmişi kişisel telefonda sıkışmaz. Çok şubeli döviz masaları için — genel bir gelen kutusu değil.',
            hero_cta1: 'Planları gör', hero_cta_wa: 'WhatsApp ile ticari teklif', hero_cta2: 'Fatura iste',
            problems_title: 'Döviz masası parayı gerçekten nerede kaybeder', problems_sub: 'Gelen kutusu temel özelliktir. 49$’lık bir sohbet aracı bunları önlemez.',
            p1_title: 'Personel müşteri defteriyle gider', p1_desc: 'Sohbetler kişisel telefonda. Sarraf ayrılınca ilişkiler de gider.',
            p2_title: 'Kayıtsız kur anlaşmazlığı', p2_desc: 'Sohbette verilen USD/TRY veya altın fiyatı kanıtlanamaz. Tek bir uyuşmazlık yıllarca yazılım bedelinden pahalıdır.',
            p3_title: 'Şubeler arası ortak giriş', p3_desc: 'Bir WhatsApp, çok kişi, rol yok. Kimin kur verdiği, kimin gördüğü belli değil.',
            p4_title: 'Hattı yakan toplu mesaj', p4_desc: 'Resmi olmayan WhatsApp bağlantısı + yayın numarayı yasaklatır. Bunu baştan söylüyoruz; gerektiğinde resmi Cloud API öneririz.',
            solution_title: 'Sahiplik, kayıtlı kur, denetim — sonra gelen kutu',
            solution_desc: 'Kaya CRM, WhatsApp üzerindeki döviz ve havale operasyon panelidir: müşteri geçmişi şirkete aittir, kurlar kaydedilir, her işlem rol taşır. Gelen kutu, bilet ve görev dahildir — ürünün kendisi bunlar değildir.',
            solution_cta: 'Fiyatlandırmayı görün',
            features_title: 'Bunun için alırsınız', features_sub: 'Döviz kontrollerinden başlayın. WhatsApp CRM’nin gerisi dahildir.',
            f1_title: 'Müşteri defteri şirkette kalır', f1_desc: 'Geçmiş, etiket ve not müşteriyle kalır — personelin telefonuyla değil.',
            f2_title: 'Zaman damgalı verilen kur', f2_desc: 'İç kur, grafikler ve döviz hizmetleri; müşteriye söylediğiniz fiyat kayıttaki fiyattır.',
            f3_title: 'Rol, şube, 2FA, denetim', f3_desc: 'Sahipten temsilciye. Her şube kendi masasıni görür. Google Authenticator ve işlem günlükleri.',
            f4_title: 'Paylaşılan WhatsApp gelen kutusu', f4_desc: 'Tek iş numarası, atama, okunmamış ve yanıtsız kuyruklar. Dahil — bizi seçme nedeni değil.',
            f5_title: 'Bilet ve görev', f5_desc: 'Sohbeti sahibi olan takip edilebilir işe çevirin. Her planda var.',
            f6_title: 'İki WhatsApp yolu, açıkça', f6_desc: 'Meta BSP olmayan pazarlar için QR / WhatsApp Web. Şablon ve daha düşük yasak riski için resmi Cloud API.',
            ch_title: 'WhatsApp nasıl bağlanır — iki dürüst yol',
            ch_sub: 'Her kurulumu resmi Meta BSP gibi göstermeyiz. Pazarınıza uyan yolu seçin.',
            ch_a_title: 'QR ağ geçidi (WhatsApp Web)',
            ch_a_desc: 'Bir kez tarayın, panelden yanıtlayın. Hızlı, Meta Business onayı yok. Resmi olmayan oturum: toplu gönderim yasak riski taşır.',
            ch_b_title: 'Resmi Meta Cloud API',
            ch_b_desc: 'Doğrulanmış WhatsApp Business API. QR yok. 24 saat penceresi dışında şablon. Ciddi yayın ve uyum isteyen alıcılar için gerekli.',
            panel_title: 'Gerçek panel', panel_sub: 'Masaüstü ve mobil — kur, gelen kutu, roller. Kendi numaranızı bağlamak için yönlendirilmiş oturum isteyin.',
            panel_desktop: 'Masaüstü', panel_mobile: 'Mobil',
            stat1: 'Kullanıcı rolleri', stat2: 'Döviz araçları', stat3: '2FA', stat4: 'Çok şube',
            pricing_title: 'Fiyat şube ve koltukla ölçeklenir — sahte Enterprise etiketi değil',
            pricing_sub: 'Küçük masa için self-servis bulut. Çok şubeli ekipler için teklif, fatura ve SLA. Yeni kademeler yeni kayıtlara uygulanır.',
            pricing_cloud_note: 'Barındırılan bulut',
            pricing_commercial_note: 'Ticari — fatura ve güvenlik özeti',
            plan_start: 'Bulut Başlangıç', plan_business: 'Bulut Ticari', plan_multi: 'Bulut Çok şube',
            plan_license: 'Kendi sunucu lisansı', plan_managed: 'Yönetilen kurulum',
            plan_start_who: '1 şube · en fazla 3 personel',
            plan_business_who: '3 şubeye kadar · 10 personel · kur modülü',
            plan_multi_who: 'Daha fazla şube · yazılı destek SLA',
            plan_license_who: 'Sizin sunucularınız · veri sizde',
            plan_managed_who: 'Kurulumu ve işletmeyi biz yaparız',
            plan_mo: '/ay', plan_from: 'itibaren', plan_once: 'tek seferlik itibaren',
            plan_popular: 'Büyüyen masalar için',
            plan_s1: 'Gelen kutu, müşteri, bilet, görev', plan_s2: '1 WhatsApp numarası', plan_s3: 'E-posta destek',
            plan_b1: 'Kur, grafik, döviz hizmetleri', plan_b2: 'Rol ve şube ayrımı', plan_b3: '2FA ve denetim günlüğü',
            plan_m1: 'Öncelikli destek / SLA', plan_m2: 'Çok lokasyon kurulum', plan_m3: 'Fatura ve satın alma paketi',
            plan_l1: 'Tam sistem teslimi', plan_l2: 'Kurulum rehberi', plan_l3: 'İsteğe bağlı yıllık güncelleme',
            plan_g1: 'Ayrılmış örnek', plan_g2: 'İzleme ve yedek', plan_g3: 'Hesap yöneticisi',
            plan_btn: 'WhatsApp ile Başlangıç al', plan_btn_card: 'Aylık 49 USD öde', plan_btn_biz: 'Ticari teklif WhatsApp', plan_btn_multi: 'Fatura iste',
            plan_contact: 'Yazılı teklif',
            faq_title: 'Alıcının gerçekten sorduğu sorular', faq_sub: 'Kanal, fiyat ve faturalı satın alma.',
            faq1_q: 'Bu genel bir WhatsApp CRM mi?', faq1_a: 'Gelen kutu dahildir. Ürün döviz müşteri defterinin sahipliğidir: verilen kur, rol, şube ve denetim. Bizi orada karşılaştırın — Wati veya Chatwoot ile özellik özelliğe değil.',
            faq2_q: 'WhatsApp resmi Meta API mi?', faq2_a: 'İki yol: doğrulamasız resmi olmayan WhatsApp Web (QR) — daha hızlı, topluda yasak riski — ve resmi Cloud API. Hangisinde olduğunuzu gizlemeyiz. Ciddi yayın için Cloud API gerekir.',
            faq3_q: 'Neden herkes için sınırsız 49$?', faq3_a: 'Bulut Başlangıç 49$/ay, 1 şube ve 3 personele kadar. Ticari 249$’dan, çok şube 499$’dan. Lisans 4000$’dan tek seferlik. Yönetilen 800$/ay’dan. Nihai ticari rakam müzakere edilebilir; taban yayımlanır ki satınalma tahmin etmesin.',
            faq4_q: 'WhatsApp ödemesi yerine fatura / sipariş?', faq4_a: 'Evet. Fatura isteyin veya yazılı teklif alın. <a href="/procurement">Güvenlik ve satın alma özetini</a> okuyun (PDF yazdırın). Cloud Start, Stripe açıksa kartla; değilse WhatsApp. Ticari ve lisans faturalıdır.',
            faq5_q: 'Kendi numaramızla nasıl deneriz?', faq5_a: 'Herkese açık panel ekranları görmek içindir. Canlı hat için yönlendirilmiş oturum (yaklaşık 10 dakika) veya numarayı bağlayıp sonra kesebileceğiniz süreli deneme isteyin.',
            contact_demo: 'Yönlendirilmiş demo', contact_buy: 'Bulut Başlangıç', contact_quote: 'Fatura / teklif', contact_support: 'Destek',
            channel_wa: 'WhatsApp', channel_sales: 'Satış', channel_support: 'Destek',
            form_response: 'İş günlerinde 24 saat içinde yanıtlarız. Ticari teklif, nihai rakam müzakere olsa bile fiyat aralığı içerir.',
            form_purpose: 'İstediğim *', form_purpose_placeholder: 'Seçin...', form_purpose_purchase: 'Bulut Başlangıç (self-servis)', form_purpose_quote: 'Ticari teklif / fatura', form_purpose_license: 'Kendi sunucu lisansı', form_purpose_managed: 'Yönetilen kurulum', form_purpose_demo: 'Rehberli demo', form_purpose_trial: '7 günlük kendi-numara denemesi', form_purpose_support: 'Teknik destek', form_purpose_other: 'Diğer',
            form_title: 'Satışla konuşun', form_sub: 'WhatsApp ile başlayın veya ticari, çok şube, lisans ya da yönetilen için fatura isteyin.',
            form_name: 'Ad *', form_email: 'E-posta *', form_phone: 'Telefon / WhatsApp', form_message: 'Mesaj *', form_submit: 'Gönder', form_success: 'Teşekkürler. Yakında sizinle iletişime geçeceğiz.', form_wa: 'Veya WhatsApp: +90 501 067 6486',
            cta_title: 'Masayı tek panelden yönetmeye hazır mısınız?', cta_desc: 'WhatsApp ile Bulut Başlangıç, veya fatura, SLA ya da kendi sunucunuz için yazılı teklif.',
            cta_plans: 'Planlar', cta_wa: 'WhatsApp', cta_form: 'Fatura / teklif',
            trust_fast_start: 'İsteğe bağlı yönlendirilmiş demo', trust_24h: '24 saat satış yanıtı', trust_secure: '2FA ve denetim günlüğü',
            cases_title: 'Masaların anlattığı — isimsiz',
            cases_sub: 'Sahte logo yok. Bunlar anlaşmayı kapatan olaylar; alıcı kendini tanısın diye yazıldı.',
            c1_meta: 'İstanbul · havale · 2 şube',
            c1_title: 'İki dealer gidince defter şirkette kaldı',
            c1_desc: 'Sohbet ve etiketler şirket panelindeydi. Sahip, ayrılan personelden müşteri listesini geri satın almadı.',
            c2_meta: 'Anadolu · döviz / altın',
            c2_title: 'Söylenen USD/TRY kuru kayıtlıydı',
            c2_desc: 'WhatsApp’taki fiyat tartışması zaman damgalı kotasyonla bitti — ekran görüntüsü kavgası değil.',
            c3_meta: 'Çok şehirli masa · 8 personel',
            c3_title: 'Roller ortak WhatsApp girişini durdurdu',
            c3_desc: 'Her şube kendi kuyruğunu gördü. Sahip kimin kotasyon verdiğini ve kimin bileti kapattığını gördü.',
            demo_title: 'Rehberli demo veya kendi numaranızda süreli deneme',
            demo_sub: 'Herkese açık panel ekran gezmek içindir. Canlı hat 10 dakikalık oturum veya kesebileceğiniz bir denemedir.',
            demo_step1: 'Kur, gelen kutusu, roller ve şubelerin 10 dakikalık turu',
            demo_step2: 'İsteğe bağlı deneme: WhatsApp’ı bağlayın, sonra kesin',
            demo_step3: 'Cloud Start self-servis veya Business / lisans için yazılı teklif',
            demo_cta: 'WhatsApp’tan rehberli demo ayırtın',
            demo_trial: '7 günlük kendi-numara denemesi isteyin',
            page_pricing_title: 'Planlar ve taban fiyatlar',
            page_channel_title: 'WhatsApp kanalı — iki dürüst yol',
            footer_contact: 'İletişim', footer_faq: 'SSS', footer_pricing: 'Fiyat', footer_support: 'Destek', footer_privacy: 'Gizlilik', footer_terms: 'Koşullar', footer_channel: 'WhatsApp kanalı', footer_procurement: 'Güvenlik / fatura paketi',
            a2hs_title: 'Uygulamayi telefonuna ekle',
            a2hs_desc: 'Daha hizli erisim icin bu sayfayi ana ekrana ekleyin.',
            a2hs_btn_install: 'Ana Ekrana Ekle',
            a2hs_btn_later: 'Sonra'
        }
    };

    var CONTACT_TRANSLATIONS = {
        en: { contact_title: 'Contact Us', contact_sub: 'For purchase, support, or consultation — reach us via email or WhatsApp. We respond within 24 hours on business days.', contact_buy_btn: 'Buy Now via WhatsApp', contact_wa_title: 'WhatsApp — Consultation & Purchase', contact_wa_desc: 'Fast response for pricing and purchase', contact_sales_title: 'Sales', contact_sales_desc: 'Purchase, pricing, plans', contact_support_title: 'Support', contact_support_desc: 'Technical issues, installation', contact_hours_title: 'Response Hours', contact_hours_desc: 'Support and sales respond on business days within 24 hours. For urgent matters, use WhatsApp — we reply as soon as possible.', contact_wa_us: 'WhatsApp Us', contact_pricing_cta: 'Not sure which plan?', contact_view_pricing: 'View pricing', contact_or: ' or ', contact_ask_wa: 'ask us on WhatsApp', contact_back: '← Back to Home', contact_footer_contact: 'Contact', contact_footer_support: 'Support', contact_footer_wa: 'WhatsApp', nav_pricing: 'Pricing', nav_panel_btn: 'Get Started', logo: 'WhatsApp CRM' },
        fa: { contact_title: 'تماس با ما', contact_sub: 'برای خرید، پشتیبانی یا مشاوره — از ایمیل یا واتساپ با ما در تماس باشید. در روزهای کاری ظرف ۲۴ ساعت پاسخ می‌دهیم.', contact_buy_btn: 'خرید از طریق واتساپ', contact_wa_title: 'واتساپ — مشاوره و خرید', contact_wa_desc: 'پاسخ سریع برای قیمت و خرید', contact_sales_title: 'فروش', contact_sales_desc: 'خرید، قیمت، پلن‌ها', contact_support_title: 'پشتیبانی', contact_support_desc: 'مشکلات فنی، نصب', contact_hours_title: 'ساعات پاسخگویی', contact_hours_desc: 'پشتیبانی و فروش در روزهای کاری ظرف ۲۴ ساعت پاسخ می‌دهند. برای فوری، واتساپ بزنید.', contact_wa_us: 'واتساپ بزنید', contact_pricing_cta: 'پلن مناسب را نمی‌دانید؟', contact_view_pricing: 'قیمت‌ها را ببینید', contact_or: ' یا ', contact_ask_wa: 'از واتساپ بپرسید', contact_back: '→ بازگشت به صفحه اصلی', contact_footer_contact: 'تماس', contact_footer_support: 'پشتیبانی', contact_footer_wa: 'واتساپ', nav_pricing: 'قیمت', nav_panel_btn: 'شروع کنید', logo: 'WhatsApp CRM' },
        tr: { contact_title: 'Bize Ulaşın', contact_sub: 'Satın alma, destek veya danışmanlık için e-posta veya WhatsApp ile bize ulaşın. İş günlerinde 24 saat içinde yanıt veriyoruz.', contact_buy_btn: 'WhatsApp ile Satın Al', contact_wa_title: 'WhatsApp — Danışmanlık ve Satın Alma', contact_wa_desc: 'Fiyat ve satın alma için hızlı yanıt', contact_sales_title: 'Satış', contact_sales_desc: 'Satın alma, fiyatlandırma, planlar', contact_support_title: 'Destek', contact_support_desc: 'Teknik sorunlar, kurulum', contact_hours_title: 'Yanıt Saatleri', contact_hours_desc: 'Destek ve satış iş günlerinde 24 saat içinde yanıt verir. Acil durumlar için WhatsApp kullanın.', contact_wa_us: 'WhatsApp Yaz', contact_pricing_cta: 'Hangi planı seçeceğinizden emin değil misiniz?', contact_view_pricing: 'Fiyatları görün', contact_or: ' veya ', contact_ask_wa: 'WhatsApp\'ta sorun', contact_back: '← Ana Sayfaya Dön', contact_footer_contact: 'İletişim', contact_footer_support: 'Destek', contact_footer_wa: 'WhatsApp', nav_pricing: 'Fiyat', nav_panel_btn: 'Başlayın', logo: 'WhatsApp CRM' }
    };

    function applyLang(lang) {
        if (!SUPPORTED_LANGS.includes(lang)) lang = 'en';
        LANG = lang;
        document.documentElement.lang = lang === 'fa' ? 'fa' : (lang === 'tr' ? 'tr' : 'en');
        document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
        var t = TRANSLATIONS[lang] || TRANSLATIONS.en;
        var ct = CONTACT_TRANSLATIONS[lang] || CONTACT_TRANSLATIONS.en;
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
            var key = el.getAttribute('data-i18n');
            var val = t[key] || ct[key];
            if (val != null) {
                if (typeof val === 'string' && val.indexOf('<') !== -1) el.innerHTML = val;
                else el.textContent = val;
            }
        });
        document.querySelectorAll('.lang-switch button').forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        });
        try { localStorage.setItem('landing_lang', lang); } catch (e) {}
    }

    function detectAndSetLang() {
        var params = new URLSearchParams(window.location.search);
        var urlLang = params.get('lang');
        if (urlLang && (TRANSLATIONS[urlLang] || CONTACT_TRANSLATIONS[urlLang])) { applyLang(urlLang); return; }
        var saved = localStorage.getItem('landing_lang');
        if (saved && (TRANSLATIONS[saved] || CONTACT_TRANSLATIONS[saved])) { applyLang(saved); return; }
        var browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase().split('-')[0];
        if (browserLang === 'fa') applyLang('fa');
        else if (browserLang === 'tr') applyLang('tr');
        else applyLang('en');
    }

    document.querySelectorAll('.lang-switch button').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var lang = this.getAttribute('data-lang');
            applyLang(lang);
            var url = new URL(window.location.href);
            url.searchParams.set('lang', lang);
            if (window.history.replaceState) window.history.replaceState({}, '', url.toString());
        });
    });

    detectAndSetLang();

    /* Scroll reveal */
    var revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length && 'IntersectionObserver' in window) {
        var revealObs = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });
        revealEls.forEach(function(el) { revealObs.observe(el); });
    } else {
        revealEls.forEach(function(el) { el.classList.add('visible'); });
    }

    var url = (typeof PANEL_URL !== 'undefined') ? PANEL_URL : 'https://kaya.fxguard.io';
    document.querySelectorAll('#btnPanel, #btnPanelMob').forEach(function(btn){ if(btn) btn.href = url; });

    window.addEventListener('scroll', function() {
        var h = document.getElementById('header');
        if (h) h.classList.toggle('scrolled', window.scrollY > 50);
    });

    var navToggle = document.getElementById('navToggle');
    var navMobile = document.getElementById('navMobile');
    var navClose = document.getElementById('navClose');
    if (navToggle && navMobile) navToggle.addEventListener('click', function() { navMobile.classList.add('open'); });
    if (navClose && navMobile) navClose.addEventListener('click', function() { navMobile.classList.remove('open'); });
    navMobile && navMobile.querySelectorAll('a').forEach(function(a) {
        a.addEventListener('click', function() { navMobile.classList.remove('open'); });
    });

    var form = document.getElementById('contactForm');
    var formSuccess = document.getElementById('formSuccess');
    var formError = document.getElementById('formError');
    if (form) {
        var nextInput = form.querySelector('input[name="_next"]');
        if (nextInput) nextInput.value = window.location.origin + window.location.pathname + '#contact-form';
    }
    if (form && formSuccess) {
        var submitBtn = form.querySelector('button[type="submit"]');
        var originalBtnText = submitBtn ? submitBtn.textContent : '';
        var errEl = form.querySelector('.form-error');
        if (!errEl) {
            errEl = document.createElement('div');
            errEl.className = 'form-error';
            errEl.style.cssText = 'color:#ef4444;margin-top:12px;font-size:0.9rem;display:none;';
            form.insertBefore(errEl, submitBtn);
        }
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var purpose = form.querySelector('#purpose');
            var nameEl = form.querySelector('#name');
            var emailEl = form.querySelector('#email');
            var messageEl = form.querySelector('#message');
            var phoneEl = form.querySelector('#phone');
            var action = form.getAttribute('action') || '';
            var useApi = action.indexOf('YOUR_FORM_ID') >= 0 && (typeof CONTACT_API_URL !== 'undefined' && CONTACT_API_URL);
            if (useApi) {
                errEl.style.display = 'none';
                errEl.textContent = '';
                var name = nameEl ? nameEl.value.trim() : '';
                var email = emailEl ? emailEl.value.trim() : '';
                var message = messageEl ? messageEl.value.trim() : '';
                if (!name || !email || !message) {
                    errEl.textContent = (LANG === 'fa' ? 'نام، ایمیل و پیام الزامی است.' : LANG === 'tr' ? 'Ad, e-posta ve mesaj zorunludur.' : 'Name, email and message are required.');
                    errEl.style.display = 'block';
                    return;
                }
                var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRe.test(email)) {
                    errEl.textContent = (LANG === 'fa' ? 'ایمیل معتبر نیست.' : LANG === 'tr' ? 'Geçerli e-posta girin.' : 'Please enter a valid email.');
                    errEl.style.display = 'block';
                    return;
                }
                var purposeVal = purpose && purpose.value ? purpose.value : 'other';
                if (!['purchase', 'quote', 'license', 'managed', 'support', 'demo', 'trial', 'other'].includes(purposeVal)) purposeVal = 'other';
                var payload = { purpose: purposeVal, name: name, email: email, message: message };
                if (phoneEl && phoneEl.value.trim()) payload.phone = phoneEl.value.trim();
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = (LANG === 'fa' ? 'در حال ارسال...' : LANG === 'tr' ? 'Gönderiliyor...' : 'Sending...');
                }
                var apiBase = (typeof CONTACT_API_URL !== 'undefined' ? CONTACT_API_URL : '').replace(/\/$/, '');
                fetch((apiBase || '') + '/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(function(r) {
                    return r.json().then(function(data) { return { ok: r.ok, data: data }; });
                }).then(function(result) {
                    if (result.ok && result.data.ok) {
                        formSuccess.classList.add('show');
                        form.style.display = 'none';
                        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                        errEl.textContent = result.data.error || (LANG === 'fa' ? 'خطا در ارسال. دوباره تلاش کنید.' : LANG === 'tr' ? 'Gönderim hatası. Tekrar deneyin.' : 'Send failed. Please try again.');
                        errEl.style.display = 'block';
                    }
                }).catch(function(err) {
                    errEl.textContent = (LANG === 'fa' ? 'خطای شبکه. واتساپ را امتحان کنید.' : LANG === 'tr' ? 'Ağ hatası. WhatsApp deneyin.' : 'Network error. Try WhatsApp.');
                    errEl.style.display = 'block';
                }).finally(function() {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalBtnText;
                    }
                });
                return false;
            }
            var subj = form.querySelector('input[name="_subject"]');
            if (purpose && subj && purpose.value) {
                var labels = { purchase: 'Cloud Start', quote: 'Commercial invoice', license: 'Self-hosted license', managed: 'Managed dedicated', demo: 'Guided demo', trial: '7-day trial', support: 'Support', other: 'Other' };
                subj.value = 'Kaya CRM - ' + (labels[purpose.value] || purpose.value);
            }
        });
    }

    var a2hsBanner = document.getElementById('a2hsBanner');
    var a2hsInstallBtn = document.getElementById('a2hsInstallBtn');
    var a2hsLaterBtn = document.getElementById('a2hsLaterBtn');
    var deferredPrompt = null;
    var A2HS_DISMISSED_KEY = 'a2hs_banner_dismissed';
    function isMobile() { return window.matchMedia('(max-width: 900px)').matches; }
    function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent || ''); }
    function isInStandaloneMode() {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }
    function showA2hsBanner() {
        if (!a2hsBanner) return;
        if (!isMobile()) return;
        if (isInStandaloneMode()) return;
        if (localStorage.getItem(A2HS_DISMISSED_KEY) === '1') return;
        a2hsBanner.hidden = false;
    }
    function hideA2hsBanner(remember) {
        if (!a2hsBanner) return;
        a2hsBanner.hidden = true;
        if (remember) localStorage.setItem(A2HS_DISMISSED_KEY, '1');
    }
    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPrompt = e;
        showA2hsBanner();
    });
    if (a2hsInstallBtn) {
        a2hsInstallBtn.addEventListener('click', function() {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(function(result) {
                    if (result && result.outcome !== 'accepted') showA2hsBanner();
                    else hideA2hsBanner(true);
                    deferredPrompt = null;
                });
                return;
            }
            if (isIos()) {
                alert(LANG === 'fa'
                    ? 'در Safari روی Share بزنید و Add to Home Screen را انتخاب کنید.'
                    : (LANG === 'tr' ? 'Safari\'de Paylas\'a dokunun ve Ana Ekrana Ekle\'yi secin.' : 'In Safari, tap Share and choose Add to Home Screen.'));
                return;
            }
            hideA2hsBanner(true);
        });
    }
    if (a2hsLaterBtn) a2hsLaterBtn.addEventListener('click', function() { hideA2hsBanner(true); });
    window.addEventListener('appinstalled', function() { hideA2hsBanner(true); });
    if (isIos() && !isInStandaloneMode()) showA2hsBanner();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
            regs.forEach(function (r) { r.unregister(); });
        }).catch(function () {});
    }

    function billingApiBase() {
        if (typeof CONTACT_API_URL !== 'undefined' && CONTACT_API_URL) {
            return String(CONTACT_API_URL).replace(/\/$/, '');
        }
        if (typeof PANEL_URL !== 'undefined' && /^https?:\/\//i.test(PANEL_URL)) {
            return String(PANEL_URL).replace(/\/$/, '');
        }
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            return 'http://localhost:3002';
        }
        return location.origin;
    }

    function wireCloudStartCheckout() {
        var origin = billingApiBase();
        fetch(origin + '/api/billing/config', { credentials: 'omit' }).then(function (r) {
            return r.json();
        }).then(function (cfg) {
            if (!cfg || !cfg.enabled) return;
            var buttons = document.querySelectorAll('.js-buy-start');
            if (!buttons.length) return;
            var dict = TRANSLATIONS[LANG] || TRANSLATIONS.en;
            var waFallback = 'https://wa.me/905010676486?text=' + encodeURIComponent('I want Cloud Start $49/mo');
            buttons.forEach(function (btn) {
                btn.removeAttribute('target');
                btn.removeAttribute('rel');
                if (dict.plan_btn_card && (btn.getAttribute('data-i18n') === 'plan_btn' || btn.getAttribute('data-i18n') === 'contact_buy_btn')) {
                    btn.textContent = dict.plan_btn_card;
                }
                if (cfg.mode === 'link' && cfg.checkoutUrl) {
                    btn.setAttribute('href', cfg.checkoutUrl);
                    return;
                }
                btn.setAttribute('href', origin + '/pricing');
                btn.addEventListener('click', function (ev) {
                    ev.preventDefault();
                    if (btn.getAttribute('data-busy') === '1') return;
                    btn.setAttribute('data-busy', '1');
                    fetch(origin + '/api/billing/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ plan: 'start' })
                    }).then(function (r) {
                        return r.json().then(function (data) { return { ok: r.ok, data: data }; });
                    }).then(function (result) {
                        if (result.ok && result.data && result.data.url) {
                            window.location.href = result.data.url;
                            return;
                        }
                        window.location.href = waFallback;
                    }).catch(function () {
                        window.location.href = waFallback;
                    }).finally(function () {
                        btn.removeAttribute('data-busy');
                    });
                });
            });
        }).catch(function () {});
    }
    wireCloudStartCheckout();
})();
