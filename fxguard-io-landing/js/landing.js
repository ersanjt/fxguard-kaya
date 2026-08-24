(function() {
    'use strict';
    var LANG = 'en';
    var SUPPORTED_LANGS = ['en', 'fa', 'tr', 'ar', 'ru'];
    var TRANSLATIONS = {
        en: {
            logo: 'FXGuard',
            nav_solutions: 'Solutions', nav_demo: 'Demo', nav_features: 'Features', nav_packages: 'Packages', nav_services: 'Services', nav_updates: 'Updates', nav_blog: 'Blog', nav_faq: 'FAQ', nav_contact: 'Contact',
            nav_get_started: 'Buy Now', nav_try_demo: 'Free Demo',
            nav_pricing: 'Packages', nav_panel_btn: 'Buy / Demo',
            aria_menu: 'Menu', aria_close: 'Close', aria_lang: 'Language', aria_nav: 'Primary', aria_nav_mobile: 'Mobile menu', aria_wa_buy: 'Buy FXGuard on WhatsApp',
            hero_badge: 'WhatsApp CRM',
            hero_title: 'WhatsApp CRM for <span>exchange, remittance and finance</span> desks',
            hero_desc: 'One company WhatsApp number. The whole team replies from one panel. Customer history stays with the company — not on an employee’s phone. We customize the panel for your trade.',
            hero_cta_demo: 'See demo', hero_cta_packages: 'Prices', hero_cta_wa: 'Talk on WhatsApp',
            hero_who_label: 'Who it is for',
            hero_a1: 'Exchange offices', hero_a2: 'Remittance desks', hero_a3: 'Finance firms',
            hero_a4: 'Multi-branch money desks', hero_a5: 'Other teams — core without FX', hero_a6: 'We tailor the panel',
            trust_demo: 'Free public demo', trust_secure: '2FA secured', trust_multibranch: 'Multi-branch sales ops', trust_uptime: 'Ready to buy today',
            hero_offer: 'Free live demo · From <strong>$49/month</strong> · Quote on WhatsApp in minutes', outcomes_title: 'Why Teams Buy FXGuard', outcomes_sub: 'Built to close more deals and protect every customer chat — not just another messenger.', out1_title: 'Stop losing money in chat', out1_desc: 'Unread messages = lost customers. One shared inbox means nothing slips away.', out2_title: 'Sell with full history', out2_desc: 'Tags, notes and past chats stay on the customer — your team closes with context.', out3_title: 'Control who sees what', out3_desc: 'Roles, branches and 2FA so owners stay in charge across every location.', out4_title: 'Buy once. Deploy your way', out4_desc: 'Cloud from $49/mo, one-time license on your servers, or fully managed by us.', buy_title: 'How to Buy — 3 Simple Steps', buy_sub: 'No long sales cycle. Demo free, choose a package, purchase on WhatsApp or the form.', buy1_title: '1. Try the free demo', buy1_desc: 'Open app.fxguard.io — a booked guided session. See the real product in minutes.', buy2_title: '2. Pick your package', buy2_desc: 'Hosted Cloud for speed, Self-hosted License for ownership, or Managed Dedicated hands-off.', buy3_title: '3. Purchase today', buy3_desc: 'Message WhatsApp or send the form. Sales replies on business days within 24 hours — often faster.', buy_cta_wa: 'Start Purchase on WhatsApp', buy_cta_form: 'Or send a buy request', pkg1_wa: 'WhatsApp to Subscribe', pkg2_wa: 'WhatsApp for License', pkg3_wa: 'WhatsApp for Managed', packages_guarantee: 'Talk to sales before you pay. Demo is free. No card needed for the demo.', cta_wa: 'Buy via WhatsApp', sticky_text: 'From $49/mo · Free demo', sticky_demo: 'Demo', sticky_buy: 'Buy', wa_msg_buy: 'Hi, I want to BUY FXGuard WhatsApp CRM. Please send packages and next steps.', wa_msg_cloud: 'Hi, I want to SUBSCRIBE to FXGuard Hosted Cloud.', wa_msg_license: 'Hi, I want a QUOTE for FXGuard Self-hosted License.', wa_msg_managed: 'Hi, I want a QUOTE for FXGuard Managed Dedicated.', wa_msg_general: 'Hi, I want to buy / get a quote for FXGuard WhatsApp CRM.',
            problems_title: 'Is WhatsApp Costing You Sales?', problems_sub: 'If your team still works from personal phones, you are leaking customers every day.',
            p1_title: 'Multiple phones, one number', p1_desc: 'Staff share logins or use personal phones. Messages get lost and no one has the full picture.',
            p2_title: 'No customer history', p2_desc: 'Every chat starts from zero — no tags, notes, or shared context between agents.',
            p3_title: 'No accountability', p3_desc: 'No tickets, no tasks, no record of who handled what — or how fast it was resolved.',
            p4_title: 'Unclear security ownership', p4_desc: 'Shared devices, no 2FA, no role separation between branches or staff levels.',
            solution_title: 'Buy FXGuard — Fix It This Week', solution_desc: 'One panel for WhatsApp, customers, tickets, tasks, users, branches and FX tools — with roles and 2FA. Try the live demo free, then purchase the plan that fits you.', solution_cta: 'Open Free Demo',
            solutions_title: 'Which one should you pick?', solutions_sub: 'The WhatsApp CRM is the same. Difference: who keeps the server, and how you pay.',
            model1_badge: 'Start here', model1_title: 'Cloud', model1_desc: 'We keep it online. You log in. From $49/month.',
            model1_f1: 'Live in minutes, no server setup', model1_f2: 'Automatic updates & security patches', model1_f3: 'Daily backups included', model1_f4: 'Monthly or yearly billing', model1_cta: 'Buy Cloud Pricing',
            model2_title: 'Self-hosted License', model2_desc: 'One-time purchase of the full system — own it, run it on your servers, keep full control.',
            model2_f1: 'One-time purchase, yours to keep', model2_f2: 'Full installation package & docs', model2_f3: 'Your data stays on your infrastructure', model2_f4: 'Optional update & support contracts', model2_cta: 'Get License Quote',
            model3_title: 'Managed Dedicated', model3_desc: 'We install and operate a dedicated instance for you — ideal when you want results without ops.',
            model3_f1: 'Dedicated instance, installed by our team', model3_f2: 'Ongoing maintenance & monitoring', model3_f3: 'Backups & custom SLA', model3_f4: 'Dedicated account manager', model3_cta: 'Get Managed Quote',
            demo_title: 'Try Before You Buy — Live Product Demo', demo_sub: 'Real FXGuard panel, not a video. Explore inbox, customers and tickets, then message sales to purchase.',
            demo_label_url: 'Demo URL', demo_label_user: 'Username', demo_label_pass: 'Password', demo_copy: 'Copy',
            demo_note: 'Public demo — explore freely. Nothing is saved. Ready to buy? WhatsApp sales after the demo.', demo_cta: 'Open Free Demo',
            gallery_title: 'Real Screens, Desktop & Mobile',
            shot1_caption: 'Dashboard — live overview & quick actions',
            shot2_caption: 'Users & Roles — Owner, Admin, Manager, Supervisor, Agent',
            shot3_caption: 'Security & Profile — 2FA and account settings',
            shot4_caption: 'Mobile Dashboard — manage from anywhere',
            shot5_caption: 'Mobile Conversations — WhatsApp inbox on the go',
            features_title: 'Everything Your Team Needs in One Panel', features_sub: 'Real modules used by exchange, finance, sales and support teams today.',
            f1_title: 'Unified WhatsApp Inbox', f1_desc: 'One number, shared inbox. Filter by unread, open or assigned, and route conversations to the right agent.',
            f2_title: 'Customers & CRM', f2_desc: 'Full customer database with profiles, tags and conversation history — no more starting from zero.',
            f3_title: 'Support Tickets', f3_desc: 'Track internal and customer requests from open to resolved, with clear ownership and status.',
            f4_title: 'Tasks & Workflows', f4_desc: 'Assign tasks, follow business processes, and keep teams accountable end-to-end.',
            f5_title: 'Users, Roles & Skills', f5_desc: 'Owner, Admin, Manager, Supervisor and Agent roles, plus skill-based conversation routing.',
            f6_title: 'Multi-Branch & Departments', f6_desc: 'Organize staff by branch and department, with owner oversight of activity and online status.',
            f7_title: 'FX Rates & Exchange Services', f7_desc: 'Built-in rate settings, currency charts and exchange service tools for FX and financial teams.',
            f8_title: 'Security, 2FA & Audit Logs', f8_desc: 'Google Authenticator 2FA, role-based permissions and full activity logs on every account.',
            stat1: 'Modules', stat2: 'User Roles', stat3: 'Languages', stat4: 'Uptime Target',
            packages_title: 'Packages — Clear Path to Purchase', packages_sub: 'Every plan includes the full CRM. Choose who hosts it, then buy via WhatsApp or the form.',
            pkg1_badge: 'Most Purchased', pkg1_title: 'Hosted Cloud', pkg1_price_month: '$49', pkg1_period_month: '/month', pkg1_or: 'or', pkg1_price_year: '$490', pkg1_period_year: '/year', pkg1_save: 'Save 2 months on yearly — best value to buy now',
            pkg1_li1: 'Full panel: inbox, customers, tickets, tasks', pkg1_li2: 'Daily backups & 24/7 infrastructure monitoring', pkg1_li3: 'Automatic updates, no maintenance needed', pkg1_li4: 'Role-based access & 2FA included', pkg1_li5: 'Email support, priority on yearly plan', pkg1_cta: 'Buy Cloud Now',
            pkg2_title: 'Self-hosted License', pkg2_price: 'One-time · Get quote',
            pkg2_li1: 'Full system handed over, one-time purchase', pkg2_li2: 'Install on your own servers or data center', pkg2_li3: 'Your data never leaves your infrastructure', pkg2_li4: 'Installation guide & onboarding support', pkg2_li5: 'Optional annual update & support contract', pkg2_cta: 'Buy License Quote',
            pkg3_title: 'Managed Dedicated', pkg3_price: 'Custom · Get quote',
            pkg3_li1: 'Dedicated instance, installed & operated by us', pkg3_li2: 'Maintenance, monitoring & backups included', pkg3_li3: 'Custom SLA and response times', pkg3_li4: 'Dedicated account manager', pkg3_li5: 'Onboarding & staff training included', pkg3_cta: 'Buy Managed Quote',
            packages_note: 'All packages include inbox · customers · tickets · tasks · roles · branches · FX tools · 2FA. Sales responds within 24h on business days.',
            services_title: 'Support That Doesn\'t Stop at Setup', services_sub: 'Backups, maintenance, security and multilingual support — on every plan we operate.',
            svc1_title: '24/7 Monitoring & Maintenance', svc1_desc: 'Cloud and Managed plans are monitored around the clock, with proactive maintenance and patching.',
            svc2_title: 'Daily Backups & Recovery', svc2_desc: 'Automatic daily backups on hosted plans, with a documented recovery process.',
            svc3_title: 'Security & 2FA', svc3_desc: 'Google Authenticator 2FA, role-based permissions and full activity logs on every deployment.',
            svc4_title: 'Multilingual Support', svc4_desc: 'Support and onboarding available in English, Turkish, Persian, Arabic and Russian.',
            svc5_title: 'Multi-Branch Rollouts', svc5_desc: 'We help you structure branches, departments and roles as you grow.',
            svc6_title: '7-day money-back on Cloud Start', svc6_desc: 'First Cloud Start month: write on WhatsApp within 7 days of payment, disconnect the number, we refund that month. SLA is written on request — not a 99.9% sticker.',
            svc7_title: 'Customer book stays on your panel', svc7_desc: '2FA, roles and activity logs on every plan. Buying from Europe? We send a DPA with the invoice so procurement can sign — <a href="/eu/">Europe</a>.',
            svc8_title: 'Onboarding & Migration', svc8_desc: 'Guided setup, data import assistance and staff training when you go live.',
            updates_badge: 'System Updates',
            updates_title: 'What\'s New in FXGuard',
            updates_sub: 'We ship product improvements continuously — Hosted Cloud and Managed plans get them automatically; Self-hosted customers receive them with the update contract.',
            upd1_date: 'Jul 2026', upd1_tag: 'Latest',
            upd1_title: 'Public live demo & clearer deployment options',
            upd1_desc: 'A public demo environment at app.fxguard.io, plus clearer packaging for Hosted Cloud, Self-hosted License and Managed Dedicated — so enterprise buyers can evaluate before deciding how to deploy.',
            upd1_p1: 'Guided demo — no public shared password', upd1_p2: 'License and managed-hosting sales paths', upd1_p3: 'Real desktop & mobile product screenshots',
            upd2_date: 'May 2026', upd2_tag: 'Security',
            upd2_title: 'Stronger account security & panel branding',
            upd2_desc: 'Google Authenticator 2FA, profile hardening, and panel appearance settings so each organization can brand the staff experience without forking the product.',
            upd2_p1: '2FA setup in profile / security', upd2_p2: 'Role-based access across Owner → Agent', upd2_p3: 'Configurable organization title & login visuals',
            upd3_date: 'Mar 2026', upd3_tag: 'Product',
            upd3_title: 'Multi-branch ops & FX team tools',
            upd3_desc: 'Branches, departments and owner-level oversight for multi-location teams, plus FX rate and exchange service tools built for financial operations.',
            upd3_p1: 'Branch & department structure', upd3_p2: 'Staff activity and online status visibility', upd3_p3: 'FX rates, charts and exchange services',
            upd4_date: 'Jan 2026', upd4_tag: 'Core',
            upd4_title: 'Unified inbox, tickets, tasks & mobile',
            upd4_desc: 'The core CRM loop: one WhatsApp number for the whole team, customer history, tickets and tasks — usable from desktop and mobile so agents stay productive anywhere.',
            upd4_p1: 'Shared WhatsApp team inbox', upd4_p2: 'Customers, tickets and task workflows', upd4_p3: 'Mobile dashboard & conversations',
            updates_note: 'Want these updates on your self-hosted instance? Ask about the annual update & support contract when you buy a license.',
            blog_teaser_badge: 'Blog', blog_teaser_title: 'Guides for Teams Evaluating FXGuard', blog_teaser_sub: 'Practical articles on WhatsApp operations, licensing and security — with links to demos and packages.', blog_teaser_cta: 'View all articles', blog_readmore: 'Read article →',
            footer_blog: 'Blog &amp; Articles',
            faq_title: 'Frequently Asked Questions', faq_sub: 'Quick answers about deployment models, demo access, security and pricing.',
            faq1_q: 'What\'s the difference between Hosted Cloud, Self-hosted License, and Managed Dedicated?', faq1_a: 'Hosted Cloud: we run FXGuard for you, billed monthly or yearly. Self-hosted License: you buy the full system and run it on your own servers. Managed Dedicated: we install and operate a dedicated instance for you, with a custom SLA. All three include the same core modules.',
            faq2_q: 'Can I try FXGuard before buying?', faq2_a: 'Yes — and it is free. Open app.fxguard.io (a booked guided demo), explore the real product, then contact sales to purchase. Nothing you change in the demo is saved.',
            faq3_q: 'Is my data backed up?', faq3_a: 'On Hosted Cloud and Managed Dedicated plans, we run daily backups as part of the service. On a Self-hosted License, backups run on your own infrastructure — we provide guidance and can include this in a support contract.',
            faq4_q: 'What do I actually get with a Self-hosted License?', faq4_a: 'A one-time purchase of the full FXGuard system with installation documentation, so your team can deploy and run it on your own servers, fully under your control.',
            faq5_q: 'How secure is FXGuard?', faq5_a: 'Every account can enable 2FA via Google Authenticator. Access is role-based (Owner, Admin, Manager, Supervisor, Agent), and all activity is logged for accountability.',
            faq6_q: 'Can FXGuard handle multiple branches or departments?', faq6_a: 'Yes. Branches and departments are built in, with owner-level oversight of staff activity, online status and login history across locations.',
            faq7_q: 'What languages do you support?', faq7_a: 'This website supports English, Persian, Turkish, Arabic and Russian — and our support team assists in these languages.',
            faq8_q: 'How do I get started?', faq8_a: 'Try the free live demo, pick Hosted Cloud, Self-hosted License or Managed Dedicated, then buy via WhatsApp or the contact form. We guide onboarding after purchase.',
            form_title: 'Buy or Talk to Sales', form_sub: 'Cloud subscription, license quote, managed hosting or demo walkthrough — tell us what you want to purchase.',
            contact_demo: 'Request Demo', contact_cloud: 'Subscribe to Cloud', contact_license: 'Buy a License', contact_managed: 'Managed Hosting', contact_support: 'Get Support',
            channel_wa: 'WhatsApp', channel_sales: 'Sales', channel_support: 'Support',
            form_response: 'We respond within 24 hours on business days. For urgent matters, use WhatsApp.',
            form_purpose: 'I\'m interested in *', form_purpose_placeholder: 'Select...', form_purpose_demo: 'Request a demo', form_purpose_cloud: 'Subscribe — Hosted Cloud', form_purpose_license: 'Buy — Self-hosted License', form_purpose_managed: 'Managed Dedicated hosting', form_purpose_support: 'Technical support', form_purpose_other: 'Other',
            form_name: 'Name *', form_email: 'Email *', form_phone: 'Phone / WhatsApp', form_message: 'Message *', form_submit: 'Send & Get a Quote', form_success: 'Thank you! Sales will contact you soon. For faster purchase, message WhatsApp.', form_wa: 'Faster: buy / quote on WhatsApp +90 501 067 6486',
            cta_title: 'Ready to Buy FXGuard Today?', cta_desc: 'Free live demo first. Then purchase Hosted Cloud from $49/mo, a Self-hosted License, or Managed Dedicated — WhatsApp sales is online.', cta_demo: 'Try Live Demo', cta_plans: 'See Prices', cta_form: 'Contact Sales',
            footer_solutions: 'Solutions', footer_demo: 'Demo', footer_features: 'Features', footer_packages: 'Packages', footer_services: 'Services', footer_updates: 'System Updates', footer_faq: 'FAQ', footer_contact: 'Contact', footer_support: 'Support'
        },
        fa: {
            logo: 'FXGuard',
            nav_solutions: 'راهکارها', nav_demo: 'دمو', nav_features: 'امکانات', nav_packages: 'پکیج‌ها', nav_services: 'خدمات', nav_updates: 'آپدیت‌ها', nav_blog: 'وبلاگ', nav_faq: 'سوالات', nav_contact: 'تماس',
            nav_get_started: 'خرید کنید', nav_try_demo: 'دمو رایگان',
            nav_pricing: 'پکیج‌ها', nav_panel_btn: 'خرید / دمو',
            aria_menu: 'منو', aria_close: 'بستن', aria_lang: 'زبان', aria_nav: 'منوی اصلی', aria_nav_mobile: 'منوی موبایل', aria_wa_buy: 'خرید FXGuard از واتساپ',
            hero_badge: 'واتساپ CRM',
            hero_title: 'واتساپ CRM برای میزهای <span>صرافی، حواله و فاینانس</span>',
            hero_desc: 'یک شماره واتساپ سازمانی. کل تیم از یک پنل جواب می‌دهد. تاریخچه مشتری مال شرکت می‌ماند — نه روی گوشی کارمند. پنل را برای صنف شما اختصاصی می‌کنیم.',
            hero_cta_demo: 'مشاهده دمو', hero_cta_packages: 'قیمت‌ها', hero_cta_wa: 'گفتگو در واتساپ',
            hero_who_label: 'مناسب برای',
            hero_a1: 'صرافی', hero_a2: 'میز حواله', hero_a3: 'شرکت مالی',
            hero_a4: 'میز چندشعبه', hero_a5: 'تیم‌های دیگر — هسته بدون نرخ', hero_a6: 'پنل را اختصاصی می‌کنیم',
            trust_demo: 'دموی رایگان و عمومی', trust_secure: 'امن با ۲FA', trust_multibranch: 'عملیات فروش چندشعبه', trust_uptime: 'آماده خرید امروز',
            hero_offer: 'دموی زنده رایگان · از <strong>۴۹$/ماه</strong> · استعلام در واتساپ ظرف چند دقیقه', outcomes_title: 'چرا تیم‌ها FXGuard می‌خرند', outcomes_sub: 'برای بستن بیشتر معامله و حفظ هر چت مشتری ساخته شده — نه فقط یک پیام‌رسان دیگر.', out1_title: 'دیگر در چت پول از دست ندهید', out1_desc: 'پیام خوانده‌نشده = مشتری ازدست‌رفته. یک اینباکس مشترک یعنی چیزی گم نمی‌شود.', out2_title: 'با تاریخچه کامل بفروشید', out2_desc: 'تگ، یادداشت و چت‌های قبلی روی مشتری می‌ماند — تیم با زمینه می‌بندد.', out3_title: 'کنترل کنید چه کسی چه می‌بیند', out3_desc: 'نقش، شعبه و ۲FA تا مالک در همه شعب کنترل داشته باشد.', out4_title: 'یک‌بار بخرید. هرطور می‌خواهید استقرار دهید', out4_desc: 'کلود از ۴۹$/ماه، لایسنس یک‌باره روی سرور خودتان، یا کاملاً مدیریت‌شده توسط ما.', buy_title: 'چطور بخرید — ۳ قدم ساده', buy_sub: 'بدون فروش طولانی. دمو رایگان، پکیج را انتخاب کنید، از واتساپ یا فرم بخرید.', buy1_title: '۱. دموی رایگان', buy1_desc: 'app.fxguard.io را باز کنید — کاربر demo، دموی هدایت‌شده رزروی. محصول واقعی را در چند دقیقه ببینید.', buy2_title: '۲. پکیج را انتخاب کنید', buy2_desc: 'کلود برای سرعت، لایسنس برای مالکیت، یا مدیریت‌شده بدون دردسر ops.', buy3_title: '۳. همین امروز بخرید', buy3_desc: 'واتساپ بزنید یا فرم بفرستید. فروش در روز کاری تا ۲۴ ساعت پاسخ می‌دهد — اغلب سریع‌تر.', buy_cta_wa: 'شروع خرید از واتساپ', buy_cta_form: 'یا درخواست خرید بفرستید', pkg1_wa: 'واتساپ برای اشتراک', pkg2_wa: 'واتساپ برای لایسنس', pkg3_wa: 'واتساپ برای مدیریت‌شده', packages_guarantee: 'قبل از پرداخت با فروش صحبت کنید. دمو رایگان است. برای دمو کارت لازم نیست.', cta_wa: 'خرید از واتساپ', sticky_text: 'از ۴۹$/ماه · دمو رایگان', sticky_demo: 'دمو', sticky_buy: 'خرید', wa_msg_buy: 'سلام، می‌خواهم FXGuard WhatsApp CRM را بخرم. لطفاً پکیج‌ها و مراحل بعدی را بفرستید.', wa_msg_cloud: 'سلام، می‌خواهم اشتراک Hosted Cloud اف‌ایکس‌گارد را بگیرم.', wa_msg_license: 'سلام، استعلام قیمت لایسنس Self-hosted اف‌ایکس‌گارد می‌خواهم.', wa_msg_managed: 'سلام، استعلام Managed Dedicated اف‌ایکس‌گارد می‌خواهم.', wa_msg_general: 'سلام، می‌خواهم FXGuard WhatsApp CRM بخرم / استعلام بگیرم.',
            problems_title: 'واتساپ دارد فروش‌تان را می‌سوزاند؟', problems_sub: 'اگر تیم هنوز با گوشی شخصی کار می‌کند، هر روز مشتری از دست می‌دهید.',
            p1_title: 'چند گوشی، یک شماره', p1_desc: 'کارمندان لاگین را به اشتراک می‌گذارند یا از گوشی شخصی استفاده می‌کنند. پیام‌ها گم می‌شوند و کسی تصویر کامل را ندارد.',
            p2_title: 'بدون تاریخچه مشتری', p2_desc: 'هر مکالمه از صفر شروع می‌شود — بدون تگ، یادداشت یا زمینه مشترک بین کارمندان.',
            p3_title: 'بدون پاسخگویی', p3_desc: 'بدون تیکت، بدون وظیفه، بدون سابقه از اینکه چه کسی چه کاری انجام داده — یا با چه سرعتی.',
            p4_title: 'مالکیت امنیت نامشخص', p4_desc: 'دستگاه‌های مشترک، بدون ۲FA، بدون تفکیک نقش بین شعب یا سطوح کارمندان.',
            solution_title: 'FXGuard بخرید — همین هفته درستش کنید', solution_desc: 'یک پنل برای واتساپ، مشتری، تیکت، تسک، کاربر، شعبه و ابزار صرافی — با نقش و ۲FA. دمو رایگان را ببینید، بعد پلن مناسب را بخرید.', solution_cta: 'باز کردن دمو رایگان',
            solutions_title: 'کدام را انتخاب کنید؟', solutions_sub: 'واتساپ CRM یکی است. فرق: سرور مال کیست و پول را چطور می‌دهید.',
            model1_badge: 'از اینجا شروع کنید', model1_title: 'ابر', model1_desc: 'ما آنلاین نگه می‌داریم. شما وارد پنل می‌شوید. از ۴۹ دلار در ماه.',
            model1_f1: 'راه‌اندازی در چند دقیقه، بدون نیاز به سرور', model1_f2: 'به‌روزرسانی و وصله امنیتی خودکار', model1_f3: 'پشتیبان‌گیری روزانه شامل می‌شود', model1_f4: 'صورتحساب ماهانه یا سالانه', model1_cta: 'قیمت و خرید کلود',
            model2_title: 'لایسنس نصب اختصاصی', model2_desc: 'خرید یک‌باره کل سیستم — مال شماست، روی سرور خودتان اجرا کنید.',
            model2_f1: 'خرید یکباره، برای همیشه مال شماست', model2_f2: 'بسته کامل نصب و مستندات', model2_f3: 'داده‌های شما روی زیرساخت خودتان باقی می‌ماند', model2_f4: 'قرارداد اختیاری به‌روزرسانی و پشتیبانی', model2_cta: 'استعلام لایسنس',
            model3_title: 'میزبانی اختصاصی مدیریت‌شده', model3_desc: 'نصب و بهره‌برداری اختصاصی توسط ما — برای وقتی که نتیجه می‌خواهید بدون دردسر ops.',
            model3_f1: 'نمونه اختصاصی، نصب‌شده توسط تیم ما', model3_f2: 'نگهداری و پایش مستمر', model3_f3: 'پشتیبان‌گیری و SLA سفارشی', model3_f4: 'مدیر حساب اختصاصی', model3_cta: 'استعلام مدیریت‌شده',
            demo_title: 'قبل از خرید امتحان کنید — دموی زنده', demo_sub: 'پنل واقعی FXGuard، نه ویدیو. اینباکس و مشتری را ببینید، بعد برای خرید به فروش پیام دهید.',
            demo_label_url: 'آدرس دمو', demo_label_user: 'نام کاربری', demo_label_pass: 'رمز عبور', demo_copy: 'کپی',
            demo_note: 'دموی عمومی — آزادانه بگردید. چیزی ذخیره نمی‌شود. آماده خرید؟ بعد از دمو واتساپ بزنید.', demo_cta: 'باز کردن دمو رایگان',
            gallery_title: 'تصاویر واقعی، دسکتاپ و موبایل',
            shot1_caption: 'داشبورد — نمای کلی زنده و اقدامات سریع',
            shot2_caption: 'کاربران و نقش‌ها — مالک، ادمین، مدیر، سرپرست، کارمند',
            shot3_caption: 'امنیت و پروفایل — ۲FA و تنظیمات حساب',
            shot4_caption: 'داشبورد موبایل — مدیریت از هر کجا',
            shot5_caption: 'مکالمات موبایل — صندوق ورودی واتساپ همراه',
            features_title: 'همه چیزی که تیم شما نیاز دارد در یک پنل', features_sub: 'ماژول‌های واقعی که امروز توسط تیم‌های صرافی، مالی، فروش و پشتیبانی استفاده می‌شود.',
            f1_title: 'صندوق ورودی یکپارچه واتساپ', f1_desc: 'یک شماره، صندوق ورودی مشترک. فیلتر بر اساس خوانده‌نشده، باز یا اختصاص‌یافته، و مسیریابی مکالمات به کارمند مناسب.',
            f2_title: 'مشتریان و CRM', f2_desc: 'پایگاه داده کامل مشتریان با پروفایل، تگ و تاریخچه مکالمات — دیگر از صفر شروع نمی‌کنید.',
            f3_title: 'تیکت پشتیبانی', f3_desc: 'درخواست‌های داخلی و مشتریان را از باز تا حل‌شده با مالکیت و وضعیت مشخص پیگیری کنید.',
            f4_title: 'وظایف و گردش کار', f4_desc: 'وظایف را اختصاص دهید، فرآیندهای کسب‌وکار را دنبال کنید و تیم‌ها را از ابتدا تا انتها پاسخگو نگه دارید.',
            f5_title: 'کاربران، نقش‌ها و مهارت‌ها', f5_desc: 'نقش‌های مالک، ادمین، مدیر، سرپرست و کارمند، به‌علاوه مسیریابی مکالمه بر اساس مهارت.',
            f6_title: 'چند شعبه و بخش', f6_desc: 'کارمندان را بر اساس شعبه و بخش سازمان‌دهی کنید، با نظارت مالک بر فعالیت و وضعیت آنلاین.',
            f7_title: 'نرخ ارز و خدمات صرافی', f7_desc: 'تنظیمات نرخ داخلی، نمودار ارز و ابزارهای خدمات صرافی برای تیم‌های مالی و ارزی.',
            f8_title: 'امنیت، ۲FA و لاگ‌های حسابرسی', f8_desc: 'احراز دومرحله‌ای گوگل، دسترسی نقش‌محور و لاگ کامل فعالیت روی هر حساب.',
            stat1: 'ماژول', stat2: 'نقش کاربری', stat3: 'زبان', stat4: 'هدف آپ‌تایم',
            packages_title: 'پلن‌ها — مسیر شفاف خرید', packages_sub: 'همه پلن‌ها CRM کامل دارند. میزبان را انتخاب کنید، بعد از واتساپ یا فرم بخرید.',
            pkg1_badge: 'پرفروش‌ترین', pkg1_title: 'میزبانی ابری', pkg1_price_month: '$۴۹', pkg1_period_month: '/ماه', pkg1_or: 'یا', pkg1_price_year: '$۴۹۰', pkg1_period_year: '/سال', pkg1_save: 'با پرداخت سالانه ۲ ماه صرفه‌جویی — بهترین ارزش برای خرید الان',
            pkg1_li1: 'پنل کامل: صندوق ورودی، مشتریان، تیکت، وظایف', pkg1_li2: 'پشتیبان‌گیری روزانه و پایش ۲۴/۷ زیرساخت', pkg1_li3: 'به‌روزرسانی خودکار، بدون نیاز به نگهداری', pkg1_li4: 'دسترسی نقش‌محور و ۲FA شامل می‌شود', pkg1_li5: 'پشتیبانی ایمیل، اولویت در پلن سالانه', pkg1_cta: 'الان کلود بخرید',
            pkg2_title: 'لایسنس نصب اختصاصی', pkg2_price: 'یک‌باره · استعلام قیمت',
            pkg2_li1: 'تحویل کامل سیستم، خرید یکباره', pkg2_li2: 'نصب روی سرور یا دیتاسنتر خودتان', pkg2_li3: 'داده‌های شما هرگز زیرساخت شما را ترک نمی‌کند', pkg2_li4: 'راهنمای نصب و پشتیبانی استقرار', pkg2_li5: 'قرارداد اختیاری به‌روزرسانی سالانه', pkg2_cta: 'استعلام خرید لایسنس',
            pkg3_title: 'میزبانی اختصاصی مدیریت‌شده', pkg3_price: 'سفارشی · استعلام',
            pkg3_li1: 'نمونه اختصاصی، نصب و اداره توسط ما', pkg3_li2: 'نگهداری، پایش و پشتیبان‌گیری شامل می‌شود', pkg3_li3: 'SLA و زمان پاسخگویی سفارشی', pkg3_li4: 'مدیر حساب اختصاصی', pkg3_li5: 'آموزش کارمندان و راه‌اندازی شامل می‌شود', pkg3_cta: 'استعلام خرید مدیریت‌شده',
            packages_note: 'همه پکیج‌ها شامل اینباکس · مشتری · تیکت · تسک · نقش · شعبه · ابزار FX · ۲FA. فروش در روز کاری تا ۲۴ ساعت پاسخ می‌دهد.',
            services_title: 'پشتیبانی که با راه‌اندازی تمام نمی‌شود', services_sub: 'پشتیبان‌گیری، نگهداری، امنیت و پشتیبانی چندزبانه — روی هر پلنی که ما اداره می‌کنیم.',
            svc1_title: 'پایش و نگهداری ۲۴/۷', svc1_desc: 'پلن‌های ابری و مدیریت‌شده به‌صورت شبانه‌روزی پایش می‌شوند، با نگهداری و وصله پیشگیرانه.',
            svc2_title: 'پشتیبان‌گیری روزانه و بازیابی', svc2_desc: 'پشتیبان‌گیری خودکار روزانه در پلن‌های میزبانی‌شده، همراه با فرآیند بازیابی مستند.',
            svc3_title: 'امنیت و ۲FA', svc3_desc: 'احراز دومرحله‌ای گوگل، دسترسی نقش‌محور و لاگ کامل فعالیت روی هر استقرار.',
            svc4_title: 'پشتیبانی چندزبانه', svc4_desc: 'پشتیبانی و راه‌اندازی به زبان‌های انگلیسی، ترکی، فارسی، عربی و روسی در دسترس است.',
            svc5_title: 'استقرار چند شعبه', svc5_desc: 'ما به شما کمک می‌کنیم شعب، بخش‌ها و نقش‌ها را همزمان با رشد سازمان‌دهی کنید.',
            svc6_title: 'بازگشت وجه ۷روزه ابر شروع', svc6_desc: 'ماه اول ابر شروع: تا ۷ روز بعد از پرداخت در واتساپ بنویسید، شماره را قطع کنید، همان ماه را برمی‌گردانیم. SLA درخواستی است — برچسب ۹۹.۹٪ نیست.',
            svc7_title: 'دفتر مشتری روی پنل شرکت می‌ماند', svc7_desc: 'نقش، ۲FA و لاگ فعالیت. فاکتور برای پلن تجاری. پشتیبانی فارسی از واتساپ.',
            svc8_title: 'راه‌اندازی و انتقال', svc8_desc: 'راه‌اندازی هدایت‌شده، کمک به انتقال داده و آموزش کارمندان هنگام رفتن به مرحله بهره‌برداری.',
            updates_badge: 'آپدیت‌های سیستم',
            updates_title: 'تازه‌های FXGuard',
            updates_sub: 'بهبودهای محصول را به‌صورت مداوم منتشر می‌کنیم — روی کلود و Managed خودکار اعمال می‌شود؛ مشتریان Self-hosted با قرارداد آپدیت دریافت می‌کنند.',
            upd1_date: 'ژوئیه ۲۰۲۶', upd1_tag: 'جدید',
            upd1_title: 'دموی زنده عمومی و مسیرهای استقرار شفاف‌تر',
            upd1_desc: 'محیط دموی عمومی در app.fxguard.io و بسته‌بندی شفاف‌تر برای کلود، لایسنس خودمیزبان و هاست مدیریت‌شده — تا شرکت‌ها قبل از تصمیم، محصول را ارزیابی کنند.',
            upd1_p1: 'دموی هدایت‌شده — بدون رمز مشترک عمومی', upd1_p2: 'مسیر فروش لایسنس و هاست مدیریت‌شده', upd1_p3: 'اسکرین‌شات واقعی دسکتاپ و موبایل',
            upd2_date: 'مه ۲۰۲۶', upd2_tag: 'امنیت',
            upd2_title: 'امنیت حساب قوی‌تر و برندینگ پنل',
            upd2_desc: 'احراز هویت دو مرحله‌ای با Google Authenticator، تقویت پروفایل و تنظیم ظاهر پنل تا هر سازمان تجربه کارکنان را بدون فورک کردن محصول برند کند.',
            upd2_p1: 'راه‌اندازی ۲FA در پروفایل / امنیت', upd2_p2: 'دسترسی نقش‌محور از Owner تا Agent', upd2_p3: 'عنوان سازمان و ظاهر صفحه ورود قابل تنظیم',
            upd3_date: 'مارس ۲۰۲۶', upd3_tag: 'محصول',
            upd3_title: 'عملیات چندشعبه و ابزارهای تیم FX',
            upd3_desc: 'شعب، دپارتمان‌ها و نظارت سطح مالک برای تیم‌های چندمکان، به‌همراه نرخ ارز و ابزارهای خدمات صرافی برای عملیات مالی.',
            upd3_p1: 'ساختار شعبه و دپارتمان', upd3_p2: 'نمایش فعالیت و وضعیت آنلاین کارکنان', upd3_p3: 'نرخ ارز، نمودار و خدمات صرافی',
            upd4_date: 'ژانویه ۲۰۲۶', upd4_tag: 'هسته',
            upd4_title: 'اینباکس یکپارچه، تیکت، تسک و موبایل',
            upd4_desc: 'حلقه اصلی CRM: یک شماره واتساپ برای کل تیم، تاریخچه مشتری، تیکت و تسک — قابل استفاده از دسکتاپ و موبایل.',
            upd4_p1: 'اینباکس تیمی واتساپ', upd4_p2: 'مشتریان، تیکت‌ها و گردش‌کار تسک', upd4_p3: 'داشبورد و مکالمات موبایل',
            updates_note: 'می‌خواهید این آپدیت‌ها روی نسخه خودمیزبان شما بیاید؟ هنگام خرید لایسنس درباره قرارداد سالانه آپدیت و پشتیبانی بپرسید.',
            blog_teaser_badge: 'مقالات', blog_teaser_title: 'راهنما برای تیم‌هایی که FXGuard را بررسی می‌کنند', blog_teaser_sub: 'مقالات کاربردی درباره عملیات واتساپ، لایسنس و امنیت — با لینک به دمو و پکیج‌ها.', blog_teaser_cta: 'مشاهده همه مقالات', blog_readmore: 'خواندن مقاله ←',
            footer_blog: 'وبلاگ و مقالات',
            faq_title: 'سوالات متداول', faq_sub: 'پاسخ سریع درباره مدل‌های استقرار، دسترسی به دمو، امنیت و قیمت‌گذاری.',
            faq1_q: 'تفاوت میزبانی ابری، لایسنس نصب اختصاصی و میزبانی مدیریت‌شده چیست؟', faq1_a: 'میزبانی ابری: ما FXGuard را برای شما اجرا می‌کنیم، صورتحساب ماهانه یا سالانه. لایسنس نصب اختصاصی: کل سیستم را می‌خرید و روی سرورهای خودتان اجرا می‌کنید. میزبانی مدیریت‌شده: ما یک نمونه اختصاصی برای شما نصب و اداره می‌کنیم، با SLA سفارشی. هر سه شامل ماژول‌های اصلی یکسان هستند.',
            faq2_q: 'آیا می‌توانم قبل از خرید FXGuard را امتحان کنم؟', faq2_a: 'بله — و رایگان است. app.fxguard.io را باز کنید (a booked guided demo)، محصول واقعی را ببینید، بعد برای خرید با فروش تماس بگیرید. تغییرات دمو ذخیره نمی‌شود.',
            faq3_q: 'آیا از داده‌های من پشتیبان‌گیری می‌شود؟', faq3_a: 'در پلن‌های میزبانی ابری و مدیریت‌شده، پشتیبان‌گیری روزانه بخشی از سرویس است. در لایسنس نصب اختصاصی، پشتیبان‌گیری روی زیرساخت خودتان انجام می‌شود — ما راهنمایی ارائه می‌دهیم و می‌توانیم آن را در قرارداد پشتیبانی بگنجانیم.',
            faq4_q: 'با لایسنس نصب اختصاصی دقیقاً چه چیزی دریافت می‌کنم؟', faq4_a: 'خرید یکباره کل سیستم FXGuard همراه با مستندات نصب، تا تیم شما بتواند آن را روی سرورهای خودتان، کاملاً تحت کنترل خودتان، مستقر کند.',
            faq5_q: 'FXGuard چقدر امن است؟', faq5_a: 'هر حساب می‌تواند ۲FA را از طریق Google Authenticator فعال کند. دسترسی نقش‌محور است (مالک، ادمین، مدیر، سرپرست، کارمند) و تمام فعالیت‌ها برای پاسخگویی ثبت می‌شود.',
            faq6_q: 'آیا FXGuard چند شعبه یا بخش را پشتیبانی می‌کند؟', faq6_a: 'بله. شعب و بخش‌ها داخلی هستند، با نظارت سطح مالک بر فعالیت کارمندان، وضعیت آنلاین و تاریخچه ورود در تمام مکان‌ها.',
            faq7_q: 'از چه زبان‌هایی پشتیبانی می‌کنید؟', faq7_a: 'این وب‌سایت از انگلیسی، فارسی، ترکی، عربی و روسی پشتیبانی می‌کند و تیم پشتیبانی به این زبان‌ها کمک می‌کند.',
            faq8_q: 'چطور شروع کنم؟', faq8_a: 'دموی رایگان را امتحان کنید، کلود، لایسنس یا مدیریت‌شده را انتخاب کنید، بعد از واتساپ یا فرم بخرید. بعد از خرید راه‌اندازی را راهنمایی می‌کنیم.',
            form_title: 'خرید یا گفتگو با فروش', form_sub: 'اشتراک کلود، استعلام لایسنس، هاست مدیریت‌شده یا راهنمایی دمو — بگویید چه می‌خواهید بخرید.',
            contact_demo: 'درخواست دمو', contact_cloud: 'اشتراک ابری', contact_license: 'خرید لایسنس', contact_managed: 'میزبانی مدیریت‌شده', contact_support: 'دریافت پشتیبانی',
            channel_wa: 'واتساپ', channel_sales: 'فروش', channel_support: 'پشتیبانی',
            form_response: 'در روزهای کاری ظرف ۲۴ ساعت پاسخ می‌دهیم. برای موارد فوری از واتساپ استفاده کنید.',
            form_purpose: 'علاقه‌مند به *', form_purpose_placeholder: 'انتخاب...', form_purpose_demo: 'درخواست دمو', form_purpose_cloud: 'اشتراک — میزبانی ابری', form_purpose_license: 'خرید — لایسنس نصب اختصاصی', form_purpose_managed: 'میزبانی اختصاصی مدیریت‌شده', form_purpose_support: 'پشتیبانی فنی', form_purpose_other: 'سایر',
            form_name: 'نام *', form_email: 'ایمیل *', form_phone: 'تلفن / واتساپ', form_message: 'پیام *', form_submit: 'ارسال و دریافت پیشنهاد', form_success: 'ممنون! فروش به‌زودی تماس می‌گیرد. برای خرید سریع‌تر واتساپ بزنید.', form_wa: 'سریع‌تر: خرید / استعلام از واتساپ +90 501 067 6486',
            cta_title: 'آماده خرید FXGuard امروز؟', cta_desc: 'اول دموی رایگان. بعد کلود از ۴۹$/ماه، لایسنس خودمیزبان یا هاست مدیریت‌شده بخرید — فروش واتساپ آنلاین است.', cta_demo: 'دمو زنده را امتحان کنید', cta_plans: 'مشاهده قیمت', cta_form: 'تماس با فروش',
            footer_solutions: 'راهکارها', footer_demo: 'دمو', footer_features: 'امکانات', footer_packages: 'پلن‌ها', footer_services: 'خدمات', footer_updates: 'آپدیت‌های سیستم', footer_faq: 'سوالات', footer_contact: 'تماس', footer_support: 'پشتیبانی'
        },
        tr: {
            logo: 'FXGuard',
            nav_solutions: 'Çözümler', nav_demo: 'Demo', nav_features: 'Özellikler', nav_packages: 'Paketler', nav_services: 'Hizmetler', nav_updates: 'Güncellemeler', nav_blog: 'Blog', nav_faq: 'SSS', nav_contact: 'İletişim',
            nav_get_started: 'Satın Al', nav_try_demo: 'Ücretsiz Demo',
            nav_pricing: 'Paketler', nav_panel_btn: 'Al / Demo',
            aria_menu: 'Menü', aria_close: 'Kapat', aria_lang: 'Dil', aria_nav: 'Ana menü', aria_nav_mobile: 'Mobil menü', aria_wa_buy: 'WhatsApp’tan FXGuard satın alın',
            hero_badge: 'Döviz · havale · finans',
            hero_title: 'Kuru WhatsApp’tan verin. <span>Defter şirkette kalsın.</span>',
            hero_desc: 'Kişisel sohbetlerde satış kaybetmeyi bırakın. FXGuard ekibinize ortak WhatsApp gelen kutusu, müşteriler, ticket, görev, çok şube ve 2FA verir — sonra nasıl alacağınızı seçin: aylık $49\'dan Cloud, tek seferlik Lisans veya Managed Dedicated.',
            hero_cta_demo: 'Ücretsiz Demo', hero_cta_packages: 'Fiyat & Satın Al', hero_cta_wa: 'WhatsApp\'tan Al',
            trust_demo: 'Ücretsiz açık demo', trust_secure: '2FA korumalı', trust_multibranch: 'Çok şubeli satış', trust_uptime: 'Bugün satın almaya hazır',
            hero_offer: 'Ücretsiz canlı demo · <strong>$49/ay</strong>\'dan · Dakikalar içinde WhatsApp teklifi', outcomes_title: 'Ekipler Neden FXGuard Satın Alır', outcomes_sub: 'Daha fazla satış kapatmak ve her müşteri sohbetini korumak için — sıradan bir mesaj uygulaması değil.', out1_title: 'Sohbette para kaybetmeyi bırakın', out1_desc: 'Okunmamış mesaj = kayıp müşteri. Ortak gelen kutusu hiçbir şeyin kaçmaması demektir.', out2_title: 'Tam geçmişle satın', out2_desc: 'Etiket, not ve eski sohbetler müşteride kalır — ekip bağlamla kapatır.', out3_title: 'Kim ne görür kontrol edin', out3_desc: 'Roller, şubeler ve 2FA ile sahipler her lokasyonda hakimiyet kurar.', out4_title: 'Bir kez alın. İstediğiniz gibi kurun', out4_desc: 'Aylık $49\'dan Cloud, kendi sunucunuzda tek seferlik lisans veya tamamen yönetilen.', buy_title: 'Nasıl Satın Alınır — 3 Adım', buy_sub: 'Uzun satış süreci yok. Ücretsiz demo, paket seçin, WhatsApp veya formdan satın alın.', buy1_title: '1. Ücretsiz demoyu deneyin', buy1_desc: 'app.fxguard.io açın — kullanıcı demo, rezerveli rehberli demo. Gerçek ürünü dakikalar içinde görün.', buy2_title: '2. Paketinizi seçin', buy2_desc: 'Hız için Cloud, sahiplik için Lisans, ops\'suz için Managed Dedicated.', buy3_title: '3. Bugün satın alın', buy3_desc: 'WhatsApp yazın veya formu gönderin. Satış iş gününde 24 saat içinde yanıtlar — çoğu zaman daha hızlı.', buy_cta_wa: 'WhatsApp\'tan Satın Almaya Başla', buy_cta_form: 'Veya satın alma isteği gönderin', pkg1_wa: 'Abonelik için WhatsApp', pkg2_wa: 'Lisans için WhatsApp', pkg3_wa: 'Managed için WhatsApp', packages_guarantee: 'Ödemeden önce satışla konuşun. Demo ücretsiz. Demo için kart gerekmez.', cta_wa: 'WhatsApp\'tan Satın Al', sticky_text: '$49/ay\'dan · Ücretsiz demo', sticky_demo: 'Demo', sticky_buy: 'Al', wa_msg_buy: 'Merhaba, FXGuard WhatsApp CRM satın almak istiyorum. Lütfen paketleri ve sonraki adımları gönderin.', wa_msg_cloud: 'Merhaba, FXGuard Hosted Cloud aboneliği istiyorum.', wa_msg_license: 'Merhaba, FXGuard Self-hosted Lisans teklifi istiyorum.', wa_msg_managed: 'Merhaba, FXGuard Managed Dedicated teklifi istiyorum.', wa_msg_general: 'Merhaba, FXGuard WhatsApp CRM satın almak / teklif almak istiyorum.',
            problems_title: 'WhatsApp Satışınızı mı Yakıyor?', problems_sub: 'Ekip hâlâ kişisel telefonlarla çalışıyorsa her gün müşteri kaybediyorsunuz.',
            p1_title: 'Birden fazla telefon, tek numara', p1_desc: 'Personel giriş bilgilerini paylaşıyor veya kişisel telefon kullanıyor. Mesajlar kayboluyor, kimse tam resmi göremiyor.',
            p2_title: 'Müşteri geçmişi yok', p2_desc: 'Her sohbet sıfırdan başlıyor — etiket, not veya personel arasında ortak bağlam yok.',
            p3_title: 'Hesap verebilirlik yok', p3_desc: 'Talep yok, görev yok, kimin neyi ne kadar hızlı çözdüğüne dair kayıt yok.',
            p4_title: 'Güvenlik sorumluluğu belirsiz', p4_desc: 'Paylaşılan cihazlar, 2FA yok, şubeler veya personel seviyeleri arasında rol ayrımı yok.',
            solution_title: 'FXGuard Alın — Bu Hafta Düzeltin', solution_desc: 'WhatsApp, müşteri, ticket, görev, kullanıcı, şube ve FX araçları tek panelde — roller ve 2FA ile. Ücretsiz canlı demoyu deneyin, sonra size uyan planı satın alın.', solution_cta: 'Ücretsiz Demoyu Aç',
            solutions_title: 'FXGuard Satın Almanın 3 Yolu', solutions_sub: 'Aynı ürün. Net sahiplik. Cloud, Lisans veya Managed — satış WhatsApp\'tan yardımcı olur.',
            model1_badge: 'En İyi Başlangıç', model1_title: 'Bulut Barındırma (SaaS)', model1_desc: 'FXGuard\'ı sizin için barındırıyoruz. Demodan ödemeye en hızlı yol.',
            model1_f1: 'Sunucu kurulumu olmadan dakikalar içinde canlı', model1_f2: 'Otomatik güncelleme ve güvenlik yamaları', model1_f3: 'Günlük yedekleme dahil', model1_f4: 'Aylık veya yıllık faturalandırma', model1_cta: 'Cloud Fiyat & Satın Al',
            model2_title: 'Kendi Sunucunuzda Lisans', model2_desc: 'Tam sistemin tek seferlik satın alımı — sizin, kendi sunucularınızda.',
            model2_f1: 'Tek seferlik satın alma, sizin kalır', model2_f2: 'Tam kurulum paketi ve belgeler', model2_f3: 'Verileriniz kendi altyapınızda kalır', model2_f4: 'İsteğe bağlı güncelleme ve destek sözleşmeleri', model2_cta: 'Lisans Teklifi Al',
            model3_title: 'Yönetilen Özel Sunucu', model3_desc: 'Özel örneği kurup işletiyoruz — ops derdi olmadan sonuç isteyenler için.',
            model3_f1: 'Ekibimiz tarafından kurulan özel örnek', model3_f2: 'Sürekli bakım ve izleme', model3_f3: 'Yedekleme ve özel SLA', model3_f4: 'Özel hesap yöneticisi', model3_cta: 'Managed Teklif Al',
            demo_title: 'Almadan Önce Deneyin — Canlı Ürün Demosu', demo_sub: 'Gerçek FXGuard paneli, video değil. Gelen kutusu ve müşterileri görün, sonra satın almak için satışa yazın.',
            demo_label_url: 'Demo Adresi', demo_label_user: 'Kullanıcı Adı', demo_label_pass: 'Şifre', demo_copy: 'Kopyala',
            demo_note: 'Açık demo — rahatça gezin. Hiçbir şey kaydedilmez. Almaya hazır mısınız? Demodan sonra WhatsApp.', demo_cta: 'Ücretsiz Demoyu Aç',
            gallery_title: 'Gerçek Ekranlar, Masaüstü ve Mobil',
            shot1_caption: 'Pano — canlı genel bakış ve hızlı işlemler',
            shot2_caption: 'Kullanıcılar ve Roller — Sahip, Admin, Yönetici, Süpervizör, Temsilci',
            shot3_caption: 'Güvenlik ve Profil — 2FA ve hesap ayarları',
            shot4_caption: 'Mobil Pano — her yerden yönetin',
            shot5_caption: 'Mobil Konuşmalar — WhatsApp gelen kutusu cepte',
            features_title: 'Ekibinizin İhtiyacı Olan Her Şey Tek Panelde', features_sub: 'Bugün döviz, finans, satış ve destek ekipleri tarafından kullanılan gerçek modüller.',
            f1_title: 'Birleşik WhatsApp Gelen Kutusu', f1_desc: 'Tek numara, ortak gelen kutusu. Okunmamış, açık veya atanmışa göre filtreleyin, konuşmaları doğru temsilciye yönlendirin.',
            f2_title: 'Müşteriler ve CRM', f2_desc: 'Profil, etiket ve sohbet geçmişiyle tam müşteri veritabanı — artık sıfırdan başlamak yok.',
            f3_title: 'Destek Talepleri', f3_desc: 'İç ve müşteri taleplerini açıktan çözüme kadar net sahiplik ve durumla takip edin.',
            f4_title: 'Görevler ve İş Akışları', f4_desc: 'Görev atayın, iş süreçlerini takip edin ve ekipleri baştan sona hesap verebilir tutun.',
            f5_title: 'Kullanıcılar, Roller ve Yetenekler', f5_desc: 'Sahip, Admin, Yönetici, Süpervizör ve Temsilci rolleri, artı yetenek bazlı konuşma yönlendirmesi.',
            f6_title: 'Çok Şube ve Departman', f6_desc: 'Personeli şube ve departmana göre organize edin; sahip düzeyinde etkinlik ve çevrimiçi durum denetimi.',
            f7_title: 'Döviz Kurları ve Kambiyo Hizmetleri', f7_desc: 'Döviz ve finans ekipleri için yerleşik kur ayarları, döviz grafikleri ve kambiyo hizmet araçları.',
            f8_title: 'Güvenlik, 2FA ve Denetim Kayıtları', f8_desc: 'Her hesapta Google Authenticator 2FA, rol tabanlı izinler ve eksiksiz aktivite kayıtları.',
            stat1: 'Modül', stat2: 'Kullanıcı Rolü', stat3: 'Dil', stat4: 'Çalışma Süresi Hedefi',
            packages_title: 'Paketler — Net Satın Alma Yolu', packages_sub: 'Her planda tam CRM. Kim barındıracak seçin, sonra WhatsApp veya formdan satın alın.',
            pkg1_badge: 'En Çok Alınan', pkg1_title: 'Bulut Barındırma', pkg1_price_month: '$49', pkg1_period_month: '/ay', pkg1_or: 'veya', pkg1_price_year: '$490', pkg1_period_year: '/yıl', pkg1_save: 'Yıllıkta 2 ay tasarruf — şimdi almak için en iyi değer',
            pkg1_li1: 'Tam panel: gelen kutusu, müşteriler, talepler, görevler', pkg1_li2: 'Günlük yedekleme ve 7/24 altyapı izleme', pkg1_li3: 'Otomatik güncelleme, bakım gerekmez', pkg1_li4: 'Rol tabanlı erişim ve 2FA dahil', pkg1_li5: 'E-posta desteği, yıllık planda öncelikli', pkg1_cta: 'Şimdi Cloud Al',
            pkg2_title: 'Kendi Sunucunuzda Lisans', pkg2_price: 'Tek sefer · Teklif alın',
            pkg2_li1: 'Tam sistem teslimi, tek seferlik satın alma', pkg2_li2: 'Kendi sunucunuza veya veri merkezinize kurulum', pkg2_li3: 'Verileriniz asla altyapınızdan çıkmaz', pkg2_li4: 'Kurulum kılavuzu ve kurulum desteği', pkg2_li5: 'İsteğe bağlı yıllık güncelleme ve destek sözleşmesi', pkg2_cta: 'Lisans Teklifi İste',
            pkg3_title: 'Yönetilen Özel Sunucu', pkg3_price: 'Özel · Teklif alın',
            pkg3_li1: 'Bizim tarafımızdan kurulan ve işletilen özel örnek', pkg3_li2: 'Bakım, izleme ve yedekleme dahil', pkg3_li3: 'Özel SLA ve yanıt süreleri', pkg3_li4: 'Özel hesap yöneticisi', pkg3_li5: 'Kurulum ve personel eğitimi dahil', pkg3_cta: 'Managed Teklif İste',
            packages_note: 'Tüm paketler: gelen kutusu · müşteri · ticket · görev · roller · şubeler · FX · 2FA. Satış iş gününde 24 saat içinde yanıtlar.',
            services_title: 'Destek Kurulumla Bitmez', services_sub: 'Yedekleme, bakım, güvenlik ve çok dilli destek — işlettiğimiz her planda.',
            svc1_title: '7/24 İzleme ve Bakım', svc1_desc: 'Bulut ve Yönetilen planlar, proaktif bakım ve yamalarla kesintisiz izlenir.',
            svc2_title: 'Günlük Yedekleme ve Kurtarma', svc2_desc: 'Barındırılan planlarda otomatik günlük yedekleme, belgelenmiş bir kurtarma süreciyle birlikte.',
            svc3_title: 'Güvenlik ve 2FA', svc3_desc: 'Her kurulumda Google Authenticator 2FA, rol tabanlı izinler ve eksiksiz aktivite kayıtları.',
            svc4_title: 'Çok Dilli Destek', svc4_desc: 'İngilizce, Türkçe, Farsça, Arapça ve Rusça destek ve kurulum desteği mevcuttur.',
            svc5_title: 'Çok Şubeli Kurulumlar', svc5_desc: 'Büyüdükçe şubeleri, departmanları ve rolleri yapılandırmanıza yardımcı oluyoruz.',
            svc6_title: 'Cloud Start 7 gün iade', svc6_desc: 'İlk Cloud Start ayı: ödemeden sonra 7 gün içinde WhatsApp’tan yazın, numarayı kesin, o ay iade edilir. SLA talep üzerine yazılır — %99.9 etiketi değil.',
            svc7_title: 'Müşteri defteri şirkette kalır', svc7_desc: '2FA, roller, aktivite logları. Avrupa’dan alıyorsanız DPA faturayla gider — <a href="/eu/">Avrupa</a>.',
            svc8_title: 'Kurulum ve Geçiş', svc8_desc: 'Canlıya geçerken rehberli kurulum, veri aktarım desteği ve personel eğitimi.',
            updates_badge: 'Sistem Güncellemeleri',
            updates_title: 'FXGuard\'da Yenilikler',
            updates_sub: 'Ürün iyileştirmelerini sürekli yayınlıyoruz — Hosted Cloud ve Managed planlarda otomatik uygulanır; Self-hosted müşteriler güncelleme sözleşmesiyle alır.',
            upd1_date: 'Tem 2026', upd1_tag: 'En Yeni',
            upd1_title: 'Herkese açık canlı demo ve daha net dağıtım seçenekleri',
            upd1_desc: 'app.fxguard.io üzerinde herkese açık demo ortamı ve Hosted Cloud, Self-hosted Lisans ile Managed Dedicated için daha net paketleme — kurumsal alıcılar karar vermeden önce ürünü değerlendirebilsin.',
            upd1_p1: 'Rehberli demo — ortak herkese açık şifre yok', upd1_p2: 'Lisans ve yönetilen hosting satış yolları', upd1_p3: 'Gerçek masaüstü ve mobil ürün ekran görüntüleri',
            upd2_date: 'May 2026', upd2_tag: 'Güvenlik',
            upd2_title: 'Daha güçlü hesap güvenliği ve panel markalaması',
            upd2_desc: 'Google Authenticator 2FA, profil güçlendirme ve panel görünüm ayarları — her organizasyon ürünü fork etmeden personel deneyimini markalayabilir.',
            upd2_p1: 'Profil / güvenlikte 2FA kurulumu', upd2_p2: 'Owner → Agent rol tabanlı erişim', upd2_p3: 'Yapılandırılabilir organizasyon başlığı ve giriş görselleri',
            upd3_date: 'Mar 2026', upd3_tag: 'Ürün',
            upd3_title: 'Çok şubeli operasyon ve FX ekip araçları',
            upd3_desc: 'Çok lokasyonlu ekipler için şube, departman ve sahip düzeyinde denetim; finansal operasyonlar için FX kur ve döviz hizmet araçları.',
            upd3_p1: 'Şube ve departman yapısı', upd3_p2: 'Personel aktivitesi ve çevrimiçi durum görünürlüğü', upd3_p3: 'FX kurları, grafikler ve döviz hizmetleri',
            upd4_date: 'Oca 2026', upd4_tag: 'Çekirdek',
            upd4_title: 'Birleşik gelen kutusu, ticket, görev ve mobil',
            upd4_desc: 'Temel CRM döngüsü: tüm ekip için tek WhatsApp numarası, müşteri geçmişi, ticket ve görevler — masaüstü ve mobilde kullanılabilir.',
            upd4_p1: 'Paylaşımlı WhatsApp ekip gelen kutusu', upd4_p2: 'Müşteriler, ticketlar ve görev iş akışları', upd4_p3: 'Mobil panel ve konuşmalar',
            updates_note: 'Bu güncellemeleri self-hosted kurulumunuzda ister misiniz? Lisans alırken yıllık güncelleme ve destek sözleşmesini sorun.',
            blog_teaser_badge: 'Blog', blog_teaser_title: 'FXGuard Değerlendiren Ekipler için Rehberler', blog_teaser_sub: 'WhatsApp operasyonları, lisanslama ve güvenlik üzerine pratik yazılar — demo ve paket bağlantılarıyla.', blog_teaser_cta: 'Tüm yazıları gör', blog_readmore: 'Yazıyı oku →',
            footer_blog: 'Blog &amp; Yazılar',
            faq_title: 'Sıkça Sorulan Sorular', faq_sub: 'Dağıtım modelleri, demo erişimi, güvenlik ve fiyatlandırma hakkında hızlı cevaplar.',
            faq1_q: 'Bulut Barındırma, Kendi Sunucunuzda Lisans ve Yönetilen Özel Sunucu arasındaki fark nedir?', faq1_a: 'Bulut Barındırma: FXGuard\'ı sizin için çalıştırırız, aylık veya yıllık faturalandırılır. Kendi Sunucunuzda Lisans: tam sistemi satın alır, kendi sunucularınızda çalıştırırsınız. Yönetilen Özel Sunucu: sizin için özel bir örnek kurar ve özel SLA ile işletiriz. Üçü de aynı temel modülleri içerir.',
            faq2_q: 'Satın almadan önce FXGuard\'ı deneyebilir miyim?', faq2_a: 'Evet — ve ücretsiz. app.fxguard.io (a booked guided demo) açın, gerçek ürünü görün, sonra satın almak için satışa yazın. Demodaki değişiklikler kaydedilmez.',
            faq3_q: 'Verilerim yedekleniyor mu?', faq3_a: 'Bulut Barındırma ve Yönetilen Özel Sunucu planlarında günlük yedekleme hizmetin bir parçasıdır. Kendi Sunucunuzda Lisans\'ta yedekleme kendi altyapınızda çalışır — rehberlik sağlıyoruz ve bunu bir destek sözleşmesine dahil edebiliriz.',
            faq4_q: 'Kendi Sunucunuzda Lisans ile tam olarak ne alıyorum?', faq4_a: 'Kurulum belgeleriyle birlikte eksiksiz FXGuard sisteminin tek seferlik satın alınması; ekibiniz kendi sunucularınızda, tamamen kendi kontrolünüzde dağıtabilir.',
            faq5_q: 'FXGuard ne kadar güvenli?', faq5_a: 'Her hesap Google Authenticator ile 2FA etkinleştirebilir. Erişim rol tabanlıdır (Sahip, Admin, Yönetici, Süpervizör, Temsilci) ve hesap verebilirlik için tüm etkinlikler kaydedilir.',
            faq6_q: 'FXGuard birden fazla şube veya departmanı yönetebilir mi?', faq6_a: 'Evet. Şubeler ve departmanlar yerleşiktir; sahip düzeyinde personel etkinliği, çevrimiçi durum ve konumlar arası giriş geçmişi denetimi mevcuttur.',
            faq7_q: 'Hangi dilleri destekliyorsunuz?', faq7_a: 'Bu web sitesi İngilizce, Farsça, Türkçe, Arapça ve Rusça destekler; destek ekibimiz bu dillerde yardımcı olur.',
            faq8_q: 'Nasıl başlarım?', faq8_a: 'Ücretsiz canlı demoyu deneyin, Cloud, Lisans veya Managed seçin, sonra WhatsApp veya formdan satın alın. Satın alma sonrası kurulumda rehberlik ederiz.',
            form_title: 'Satın Al veya Satışla Konuş', form_sub: 'Cloud abonelik, lisans teklifi, managed hosting veya demo — ne almak istediğinizi yazın.',
            contact_demo: 'Demo İste', contact_cloud: 'Buluta Abone Ol', contact_license: 'Lisans Satın Al', contact_managed: 'Yönetilen Barındırma', contact_support: 'Destek Al',
            channel_wa: 'WhatsApp', channel_sales: 'Satış', channel_support: 'Destek',
            form_response: 'İş günlerinde 24 saat içinde yanıt veriyoruz. Acil durumlar için WhatsApp kullanın.',
            form_purpose: 'İlgilendiğim konu *', form_purpose_placeholder: 'Seçin...', form_purpose_demo: 'Demo talep et', form_purpose_cloud: 'Abone ol — Bulut Barındırma', form_purpose_license: 'Satın al — Kendi Sunucunuzda Lisans', form_purpose_managed: 'Yönetilen Özel Sunucu barındırma', form_purpose_support: 'Teknik destek', form_purpose_other: 'Diğer',
            form_name: 'Ad *', form_email: 'E-posta *', form_phone: 'Telefon / WhatsApp', form_message: 'Mesaj *', form_submit: 'Gönder & Teklif Al', form_success: 'Teşekkürler! Satış yakında dönecek. Daha hızlı satın alma için WhatsApp yazın.', form_wa: 'Daha hızlı: WhatsApp\'tan al / teklif +90 501 067 6486',
            cta_title: 'Bugün FXGuard Almaya Hazır mısınız?', cta_desc: 'Önce ücretsiz demo. Sonra aylık $49\'dan Cloud, Self-hosted Lisans veya Managed Dedicated satın alın — WhatsApp satış hazır.', cta_demo: 'Canlı Demoyu Deneyin', cta_plans: 'Fiyatları Gör', cta_form: 'Satışa Yaz',
            footer_solutions: 'Çözümler', footer_demo: 'Demo', footer_features: 'Özellikler', footer_packages: 'Paketler', footer_services: 'Hizmetler', footer_updates: 'Sistem Güncellemeleri', footer_faq: 'SSS', footer_contact: 'İletişim', footer_support: 'Destek'
        },
        ar: {
            logo: 'FXGuard',
            nav_solutions: 'الحلول',
            nav_demo: 'تجربة',
            nav_features: 'الميزات',
            nav_packages: 'الباقات',
            nav_services: 'الخدمات',
            nav_updates: 'التحديثات',
            nav_blog: 'المدونة',
            nav_faq: 'الأسئلة',
            nav_contact: 'تواصل',
            nav_get_started: 'اشترِ الآن',
            nav_try_demo: 'عرض مجاني',
            nav_pricing: 'الباقات',
            nav_panel_btn: 'شراء / عرض',
            aria_menu: 'القائمة',
            aria_close: 'إغلاق',
            aria_lang: 'اللغة',
            aria_nav: 'القائمة الرئيسية',
            aria_nav_mobile: 'قائمة الجوال',
            aria_wa_buy: 'اشترِ FXGuard عبر واتساب',
            hero_badge: 'صرافة · حوالة · مال',
            hero_title: 'أعلن السعر على واتساب. <span>دفتر العملاء يبقى للشركة.</span>',
            hero_desc: 'توقّف عن خسارة الصفقات في الدردشات الشخصية. FXGuard يمنح فريقك صندوق وارد واتساب مشتركًا وعملاء وتذاكر ومهام وتعدد فروع وتحقق بخطوتين — ثم اختر طريقة الشراء: سحابة من 49$/شهر أو ترخيص لمرة واحدة أو استضافة مُدارة.',
            hero_cta_demo: 'عرض مجاني',
            hero_cta_packages: 'الأسعار والشراء',
            hero_cta_wa: 'اشترِ عبر واتساب',
            trust_demo: 'عرض عام مجاني',
            trust_secure: 'مؤمَّن بـ 2FA',
            trust_multibranch: 'مبيعات متعددة الفروع',
            trust_uptime: 'جاهز للشراء اليوم',
            hero_offer: 'عرض حي مجاني · من <strong>49$/شهر</strong> · عرض سعر عبر واتساب خلال دقائق', outcomes_title: 'لماذا تشتري الفرق FXGuard', outcomes_sub: 'لإغلاق المزيد من الصفقات وحماية كل محادثة عميل — وليس مجرد تطبيق دردشة آخر.', out1_title: 'توقّف عن خسارة المال في الدردشة', out1_desc: 'رسالة غير مقروءة = عميل ضائع. صندوق وارد مشترك يعني لا شيء يفلت.', out2_title: 'بِع بتاريخ كامل', out2_desc: 'الوسوم والملاحظات والمحادثات السابقة تبقى مع العميل — فريقك يغلق بسياق.', out3_title: 'تحكّم بمن يرى ماذا', out3_desc: 'أدوار وفروع و2FA ليبقى المالك مسيطرًا في كل موقع.', out4_title: 'اشترِ مرة. انشر بطريقتك', out4_desc: 'سحابة من 49$/شهر أو ترخيص لمرة واحدة على خوادمك أو مُدار بالكامل منّا.', buy_title: 'كيف تشتري — 3 خطوات', buy_sub: 'لا دورة مبيعات طويلة. عرض مجاني، اختر الباقة، اشترِ عبر واتساب أو النموذج.', buy1_title: '1. جرّب العرض المجاني', buy1_desc: 'افتح app.fxguard.io — المستخدم demo وكلمة المرور [guided demo]. شاهد المنتج الحقيقي خلال دقائق.', buy2_title: '2. اختر باقتك', buy2_desc: 'سحابة للسرعة أو ترخيص للملكية أو مُدار بلا عبء تشغيل.', buy3_title: '3. اشترِ اليوم', buy3_desc: 'راسل واتساب أو أرسل النموذج. المبيعات ترد خلال 24 ساعة في أيام العمل — غالبًا أسرع.', buy_cta_wa: 'ابدأ الشراء عبر واتساب', buy_cta_form: 'أو أرسل طلب شراء', pkg1_wa: 'واتساب للاشتراك', pkg2_wa: 'واتساب للترخيص', pkg3_wa: 'واتساب للمُدار', packages_guarantee: 'تحدّث مع المبيعات قبل الدفع. العرض مجاني. لا بطاقة مطلوبة للعرض.', cta_wa: 'اشترِ عبر واتساب', sticky_text: 'من 49$/شهر · عرض مجاني', sticky_demo: 'عرض', sticky_buy: 'اشترِ', wa_msg_buy: 'مرحبًا، أريد شراء FXGuard WhatsApp CRM. أرجو إرسال الباقات والخطوات التالية.', wa_msg_cloud: 'مرحبًا، أريد الاشتراك في FXGuard Hosted Cloud.', wa_msg_license: 'مرحبًا، أريد عرض سعر لترخيص FXGuard Self-hosted.', wa_msg_managed: 'مرحبًا، أريد عرض سعر لـ FXGuard Managed Dedicated.', wa_msg_general: 'مرحبًا، أريد شراء / عرض سعر لـ FXGuard WhatsApp CRM.',
            problems_title: 'هل واتساب يُكلّفك مبيعات؟',
            problems_sub: 'إذا كان الفريق ما زال يعمل من هواتف شخصية فأنت تخسر عملاء كل يوم.',
            p1_title: 'هواتف متعددة، رقم واحد',
            p1_desc: 'الموظفون يشاركون تسجيل الدخول أو يستخدمون هواتف شخصية. الرسائل تضيع ولا أحد يرى الصورة كاملة.',
            p2_title: 'لا سجل للعميل',
            p2_desc: 'كل محادثة تبدأ من الصفر — بلا وسوم أو ملاحظات أو سياق مشترك بين الوكلاء.',
            p3_title: 'لا مساءلة',
            p3_desc: 'بلا تذاكر ولا مهام ولا سجل لمن تعامل مع ماذا — أو بأي سرعة.',
            p4_title: 'ملكية أمنية غير واضحة',
            p4_desc: 'أجهزة مشتركة، بلا تحقق بخطوتين، وبلا فصل أدوار بين الفروع أو مستويات الموظفين.',
            solution_title: 'اشترِ FXGuard — أصلِحه هذا الأسبوع',
            solution_desc: 'لوحة واحدة لواتساب والعملاء والتذاكر والمهام والمستخدمين والفروع وأدوات FX — مع أدوار و2FA. جرّب العرض الحي مجانًا ثم اشترِ الخطة المناسبة.',
            solution_cta: 'افتح العرض المجاني',
            solutions_title: 'ثلاث طرق لشراء FXGuard',
            solutions_sub: 'نفس المنتج. ملكية واضحة. سحابة أو ترخيص أو مُدار — المبيعات تساعد عبر واتساب.',
            model1_badge: 'أفضل بداية',
            model1_title: 'سحابة مستضافة (SaaS)',
            model1_desc: 'نستضيف FXGuard لكم. أسرع طريق من العرض إلى الشراء.',
            model1_f1: 'جاهز خلال دقائق بلا إعداد خوادم',
            model1_f2: 'تحديثات تلقائية وترقيعات أمنية',
            model1_f3: 'نسخ احتياطي يومي مشمول',
            model1_f4: 'فوترة شهرية أو سنوية',
            model1_cta: 'أسعار السحابة والشراء',
            model2_title: 'ترخيص ذاتي الاستضافة',
            model2_desc: 'شراء لمرة واحدة للنظام الكامل — ملككم على خوادمكم.',
            model2_f1: 'شراء لمرة واحدة ويبقى ملكك',
            model2_f2: 'حزمة تثبيت كاملة ووثائق',
            model2_f3: 'بياناتك تبقى على بنيتك',
            model2_f4: 'عقود تحديث ودعم اختيارية',
            model2_cta: 'اطلب عرض الترخيص',
            model3_title: 'استضافة مُدارة مخصصة',
            model3_desc: 'نثبّت ونشغّل نسخة مخصصة لكم — عندما تريدون نتائج بلا عبء تشغيل.',
            model3_f1: 'نسخة مخصصة يثبتها فريقنا',
            model3_f2: 'صيانة ومراقبة مستمرة',
            model3_f3: 'نسخ احتياطي وSLA مخصص',
            model3_f4: 'مدير حساب مخصص',
            model3_cta: 'اطلب عرض المُدار',
            demo_title: 'جرّب قبل الشراء — عرض حي للمنتج',
            demo_sub: 'لوحة FXGuard الحقيقية وليس فيديو. استكشف الصندوق والعملاء ثم راسل المبيعات للشراء.',
            demo_label_url: 'رابط العرض',
            demo_label_user: 'اسم المستخدم',
            demo_label_pass: 'كلمة المرور',
            demo_copy: 'نسخ',
            demo_note: 'بيئة عامة — استكشف بحرية. لا يُحفظ شيء. جاهز للشراء؟ واتساب بعد العرض.',
            demo_cta: 'افتح العرض المجاني',
            gallery_title: 'شاشات حقيقية — سطح المكتب والجوال',
            shot1_caption: 'لوحة التحكم — نظرة عامة وإجراءات سريعة',
            shot2_caption: 'المستخدمون والأدوار — Owner وAdmin وManager وSupervisor وAgent',
            shot3_caption: 'الأمان والملف — تحقق بخطوتين وإعدادات الحساب',
            shot4_caption: 'لوحة الجوال — أدِر من أي مكان',
            shot5_caption: 'محادثات الجوال — صندوق واتساب أثناء التنقل',
            features_title: 'كل ما يحتاجه فريقك في لوحة واحدة',
            features_sub: 'وحدات حقيقية تستخدمها فرق الصرافة والمالية والمبيعات والدعم اليوم.',
            f1_title: 'صندوق وارد واتساب موحّد',
            f1_desc: 'رقم واحد وصندوق مشترك. صفِّ غير المقروء أو المفتوح أو المعيَّن، ووجّه المحادثات للوكيل المناسب.',
            f2_title: 'العملاء وCRM',
            f2_desc: 'قاعدة عملاء كاملة مع ملفات ووسوم وسجل محادثات — بلا بداية من الصفر.',
            f3_title: 'تذاكر الدعم',
            f3_desc: 'تتبّع الطلبات الداخلية وطلبات العملاء من الفتح حتى الإغلاق بملكية وحالة واضحة.',
            f4_title: 'المهام وسير العمل',
            f4_desc: 'أسند المهام واتبع العمليات وحافظ على مساءلة الفرق من البداية للنهاية.',
            f5_title: 'المستخدمون والأدوار والمهارات',
            f5_desc: 'أدوار Owner وAdmin وManager وSupervisor وAgent مع توجيه حسب المهارات.',
            f6_title: 'تعدد الفروع والأقسام',
            f6_desc: 'نظّم الموظفين حسب الفرع والقسم مع إشراف المالك على النشاط والحالة.',
            f7_title: 'أسعار FX وخدمات الصرافة',
            f7_desc: 'إعدادات أسعار ورسوم بيانية وأدوات خدمات صرافة لفرق FX والمالية.',
            f8_title: 'الأمان والتحقق بخطوتين وسجلات التدقيق',
            f8_desc: 'تحقق Google Authenticator وصلاحيات حسب الدور وسجلات نشاط كاملة.',
            stat1: 'وحدات',
            stat2: 'أدوار مستخدمين',
            stat3: 'لغات',
            stat4: 'هدف التوفر',
            packages_title: 'الباقات — مسار شراء واضح',
            packages_sub: 'كل خطة تشمل CRM كامل. اختر من يستضيف ثم اشترِ عبر واتساب أو النموذج.',
            pkg1_badge: 'الأكثر شراءً',
            pkg1_title: 'سحابة مستضافة',
            pkg1_price_month: '$49',
            pkg1_period_month: '/شهر',
            pkg1_or: 'أو',
            pkg1_price_year: '$490',
            pkg1_period_year: '/سنة',
            pkg1_save: 'وفّر شهرين سنويًا — أفضل قيمة للشراء الآن',
            pkg1_li1: 'اللوحة كاملة: وارد وعملاء وتذاكر ومهام',
            pkg1_li2: 'نسخ احتياطي يومي ومراقبة بنية على مدار الساعة',
            pkg1_li3: 'تحديثات تلقائية بلا صيانة منك',
            pkg1_li4: 'صلاحيات أدوار وتحقق بخطوتين',
            pkg1_li5: 'دعم عبر البريد — أولوية مع الخطة السنوية',
            pkg1_cta: 'اشترِ السحابة الآن',
            pkg2_title: 'ترخيص ذاتي الاستضافة',
            pkg2_price: 'مرة واحدة · اطلب عرضًا',
            pkg2_li1: 'تسليم النظام كاملًا — شراء لمرة واحدة',
            pkg2_li2: 'التثبيت على خوادمك أو مركز بياناتك',
            pkg2_li3: 'بياناتك لا تغادر بنيتك',
            pkg2_li4: 'دليل تثبيت ودعم بدء التشغيل',
            pkg2_li5: 'عقد تحديث ودعم سنوي اختياري',
            pkg2_cta: 'اطلب عرض الترخيص',
            pkg3_title: 'استضافة مُدارة مخصصة',
            pkg3_price: 'مخصص · اطلب عرضًا',
            pkg3_li1: 'نسخة مخصصة نثبتها ونديرها',
            pkg3_li2: 'صيانة ومراقبة ونسخ احتياطي',
            pkg3_li3: 'SLA وأوقات استجابة مخصصة',
            pkg3_li4: 'مدير حساب مخصص',
            pkg3_li5: 'تأهيل وتدريب للموظفين',
            pkg3_cta: 'اطلب عرض المُدار',
            packages_note: 'كل الباقات تشمل الصندوق · العملاء · التذاكر · المهام · الأدوار · الفروع · FX · 2FA. المبيعات ترد خلال 24 ساعة في أيام العمل.',
            services_title: 'دعم لا يتوقف عند الإعداد',
            services_sub: 'نسخ احتياطي وصيانة وأمان ودعم متعدد اللغات — في كل خطة نديرها.',
            svc1_title: 'مراقبة وصيانة على مدار الساعة',
            svc1_desc: 'خطط السحابة والإدارة تُراقب باستمرار مع صيانة وترقيع استباقي.',
            svc2_title: 'نسخ احتياطي يومي واستعادة',
            svc2_desc: 'نسخ يومي تلقائي على الخطط المستضافة مع عملية استعادة موثقة.',
            svc3_title: 'الأمان والتحقق بخطوتين',
            svc3_desc: 'تحقق Google Authenticator وصلاحيات أدوار وسجلات نشاط في كل نشر.',
            svc4_title: 'دعم متعدد اللغات',
            svc4_desc: 'دعم وتأهيل بالإنجليزية والتركية والفارسية والعربية والروسية.',
            svc5_title: 'نشر متعدد الفروع',
            svc5_desc: 'نساعدك على هيكلة الفروع والأقسام والأدوار مع نموك.',
            svc6_title: 'استرداد 7 أيام لأول بدء سحابي',
            svc6_desc: 'لأول شهر بدء سحابي: راسلوا واتساب خلال 7 أيام من الدفع وافصلوا الرقم ونعيد ذلك الشهر. SLA عند الطلب — ليست ملصقة 99.9٪.',
            svc7_title: 'دفتر العملاء يبقى على لوحة الشركة',
            svc7_desc: 'تحقق بخطوتين، أدوار، وسجلات. فاتورة للخطة التجارية. دعم بالعربية عبر واتساب.',
            svc8_title: 'التأهيل والترحيل',
            svc8_desc: 'إعداد موجَّه ومساعدة استيراد بيانات وتدريب عند الإطلاق.',
            updates_badge: 'تحديثات النظام',
            updates_title: 'ما الجديد في FXGuard',
            updates_sub: 'نُصدر تحسينات المنتج باستمرار — تُطبَّق تلقائيًا على السحابة والإدارة؛ وعملاء الاستضافة الذاتية يحصلون عليها بعقد التحديث.',
            upd1_date: 'يوليو 2026',
            upd1_tag: 'الأحدث',
            upd1_title: 'عرض حي عام وخيارات نشر أوضح',
            upd1_desc: 'بيئة عرض عامة على app.fxguard.io وتعبئة أوضح للسحابة والترخيص والاستضافة المُدارة — ليقيّم المشترون المؤسسيون قبل القرار.',
            upd1_p1: 'عرض موجّه — بدون كلمة مرور مشتركة عامة',
            upd1_p2: 'مسارات بيع الترخيص والاستضافة المُدارة',
            upd1_p3: 'لقطات حقيقية لسطح المكتب والجوال',
            upd2_date: 'مايو 2026',
            upd2_tag: 'أمان',
            upd2_title: 'أمان حساب أقوى وعلامة تجارية للوحة',
            upd2_desc: 'تحقق Google Authenticator وتقوية الملف وإعدادات مظهر اللوحة لتمييز تجربة الموظفين دون تفريع المنتج.',
            upd2_p1: 'إعداد التحقق بخطوتين في الملف / الأمان',
            upd2_p2: 'صلاحيات أدوار من Owner إلى Agent',
            upd2_p3: 'عنوان المنظمة ومظهر تسجيل الدخول قابلان للتخصيص',
            upd3_date: 'مارس 2026',
            upd3_tag: 'منتج',
            upd3_title: 'عمليات متعددة الفروع وأدوات فرق FX',
            upd3_desc: 'فروع وأقسام وإشراف على مستوى المالك، مع أسعار FX وأدوات خدمات الصرافة للعمليات المالية.',
            upd3_p1: 'هيكل الفروع والأقسام',
            upd3_p2: 'رؤية نشاط الموظفين والحالة',
            upd3_p3: 'أسعار FX ورسوم بيانية وخدمات صرافة',
            upd4_date: 'يناير 2026',
            upd4_tag: 'أساسي',
            upd4_title: 'وارد موحّد وتذاكر ومهام وجوال',
            upd4_desc: 'حلقة CRM الأساسية: رقم واتساب واحد لكل الفريق وسجل عملاء وتذاكر ومهام — من سطح المكتب والجوال.',
            upd4_p1: 'صندوق وارد واتساب جماعي',
            upd4_p2: 'عملاء وتذاكر وسير مهام',
            upd4_p3: 'لوحة ومحادثات الجوال',
            updates_note: 'هل تريد هذه التحديثات على نسختك ذاتية الاستضافة؟ اسأل عن عقد التحديث والدعم السنوي عند شراء الترخيص.',
            blog_teaser_badge: 'المدونة',
            blog_teaser_title: 'أدلة لفرق تقيّم FXGuard',
            blog_teaser_sub: 'مقالات عملية عن عمليات واتساب والترخيص والأمان — مع روابط للعرض والباقات.',
            blog_teaser_cta: 'عرض كل المقالات',
            blog_readmore: 'اقرأ المقال ←',
            footer_blog: 'المدونة والمقالات',
            faq_title: 'الأسئلة الشائعة',
            faq_sub: 'إجابات سريعة عن نماذج النشر والعرض والأمان والأسعار.',
            faq1_q: 'ما الفرق بين السحابة المستضافة والترخيص ذاتي الاستضافة والاستضافة المُدارة؟',
            faq1_a: 'السحابة: نشغّل FXGuard لك بفوترة شهرية أو سنوية. الترخيص: تشتري النظام الكامل وتشغّله على خوادمك. المُدارة: نثبت وندير نسخة مخصصة لك بـ SLA. الوحدات الأساسية نفسها في الثلاثة.',
            faq2_q: 'هل يمكنني تجربة FXGuard قبل الشراء؟',
            faq2_a: 'نعم — وهو مجاني. افتح app.fxguard.io (a booked guided demo)، استكشف المنتج الحقيقي، ثم تواصل مع المبيعات للشراء. تغييرات العرض لا تُحفظ.',
            faq3_q: 'هل تُنسخ بياناتي احتياطيًا؟',
            faq3_a: 'في السحابة والاستضافة المُدارة ننفّذ نسخًا يوميًا ضمن الخدمة. في الترخيص ذاتي الاستضافة تعمل النسخ على بنيتك — نوجّهك ويمكن تضمين ذلك في عقد الدعم.',
            faq4_q: 'ماذا أحصل عليه فعليًا مع الترخيص ذاتي الاستضافة؟',
            faq4_a: 'شراء لمرة واحدة لنظام FXGuard الكامل مع وثائق التثبيت لينشره فريقك على خوادمه تحت سيطرتكم الكاملة.',
            faq5_q: 'ما مدى أمان FXGuard؟',
            faq5_a: 'يمكن تفعيل التحقق بخطوتين عبر Google Authenticator. الوصول حسب الأدوار (Owner وAdmin وManager وSupervisor وAgent) ويُسجَّل النشاط للمساءلة.',
            faq6_q: 'هل يدعم FXGuard عدة فروع أو أقسام؟',
            faq6_a: 'نعم. الفروع والأقسام مدمجة، مع إشراف المالك على نشاط الموظفين والحالة وسجل الدخول عبر المواقع.',
            faq7_q: 'ما اللغات التي تدعمونها؟',
            faq7_a: 'الموقع يدعم الإنجليزية والفارسية والتركية والعربية والروسية، وفريق الدعم يساعد بهذه اللغات.',
            faq8_q: 'كيف أبدأ؟',
            faq8_a: 'جرّب العرض الحي المجاني، اختر السحابة أو الترخيص أو المُدار، ثم اشترِ عبر واتساب أو النموذج. بعد الشراء نرشدك للإعداد.',
            form_title: 'اشترِ أو تحدّث مع المبيعات',
            form_sub: 'اشتراك سحابة أو عرض ترخيص أو استضافة مُدارة أو جولة عرض — أخبرنا ماذا تريد شراءه.',
            contact_demo: 'طلب عرض',
            contact_cloud: 'الاشتراك في السحابة',
            contact_license: 'شراء ترخيص',
            contact_managed: 'استضافة مُدارة',
            contact_support: 'الحصول على دعم',
            channel_wa: 'واتساب',
            channel_sales: 'المبيعات',
            channel_support: 'الدعم',
            form_response: 'نرد خلال 24 ساعة في أيام العمل. للطوارئ استخدم واتساب.',
            form_purpose: 'أنا مهتم بـ *',
            form_purpose_placeholder: 'اختر...',
            form_purpose_demo: 'طلب عرض',
            form_purpose_cloud: 'اشتراك — سحابة مستضافة',
            form_purpose_license: 'شراء — ترخيص ذاتي الاستضافة',
            form_purpose_managed: 'استضافة مُدارة مخصصة',
            form_purpose_support: 'دعم تقني',
            form_purpose_other: 'أخرى',
            form_name: 'الاسم *',
            form_email: 'البريد *',
            form_phone: 'الهاتف / واتساب',
            form_message: 'الرسالة *',
            form_submit: 'أرسل واحصل على عرض',
            form_success: 'شكرًا! ستتواصل المبيعات قريبًا. للشراء الأسرع راسل واتساب.',
            form_wa: 'أسرع: اشترِ / اطلب عرضًا عبر واتساب +90 501 067 6486',
            cta_title: 'جاهز لشراء FXGuard اليوم؟',
            cta_desc: 'أولًا عرض مجاني. ثم اشترِ السحابة من 49$/شهر أو ترخيصًا ذاتيًا أو استضافة مُدارة — مبيعات واتساب جاهزة.',
            cta_demo: 'جرّب العرض الحي',
            cta_plans: 'عرض الأسعار',
            cta_form: 'تواصل مع المبيعات',
            footer_solutions: 'الحلول',
            footer_demo: 'العرض',
            footer_features: 'الميزات',
            footer_packages: 'الباقات',
            footer_services: 'الخدمات',
            footer_updates: 'تحديثات النظام',
            footer_faq: 'الأسئلة',
            footer_contact: 'تواصل',
            footer_support: 'الدعم'
        },
        ru: {
            logo: 'FXGuard',
            nav_solutions: 'Решения',
            nav_demo: 'Демо',
            nav_features: 'Возможности',
            nav_packages: 'Пакеты',
            nav_services: 'Сервисы',
            nav_updates: 'Обновления',
            nav_blog: 'Блог',
            nav_faq: 'FAQ',
            nav_contact: 'Контакты',
            nav_get_started: 'Купить',
            nav_try_demo: 'Бесплатное демо',
            nav_pricing: 'Пакеты',
            nav_panel_btn: 'Купить / Демо',
            aria_menu: 'Меню',
            aria_close: 'Закрыть',
            aria_lang: 'Язык',
            aria_nav: 'Основное меню',
            aria_nav_mobile: 'Мобильное меню',
            aria_wa_buy: 'Купить FXGuard в WhatsApp',
            hero_badge: 'Отделы продаж не цель — обмен, переводы, финансы',
            hero_title: 'Назовите курс в WhatsApp. <span>Книга клиентов остаётся в компании.</span>',
            hero_desc: 'Хватит терять сделки в личных чатах. FXGuard даёт команде общий WhatsApp inbox, клиентов, тикеты, задачи, филиалы и 2FA — затем выберите покупку: Cloud от $49/мес, разовая License или Managed Dedicated.',
            hero_cta_demo: 'Бесплатное демо',
            hero_cta_packages: 'Цены и покупка',
            hero_cta_wa: 'Купить в WhatsApp',
            trust_demo: 'Бесплатное публичное демо',
            trust_secure: 'Защита 2FA',
            trust_multibranch: 'Продажи по филиалам',
            trust_uptime: 'Готово купить сегодня',
            hero_offer: 'Бесплатное live-демо · от <strong>$49/мес</strong> · КП в WhatsApp за минуты', outcomes_title: 'Почему команды покупают FXGuard', outcomes_sub: 'Чтобы закрывать больше сделок и сохранять каждый чат с клиентом — не просто ещё один мессенджер.', out1_title: 'Хватит терять деньги в чатах', out1_desc: 'Непрочитанное = потерянный клиент. Общий inbox — ничего не пропадает.', out2_title: 'Продавайте с полной историей', out2_desc: 'Теги, заметки и прошлые чаты остаются на клиенте — команда закрывает со контекстом.', out3_title: 'Контролируйте, кто что видит', out3_desc: 'Роли, филиалы и 2FA — владелец контролирует каждую локацию.', out4_title: 'Купите один раз. Разверните как удобно', out4_desc: 'Cloud от $49/мес, разовая лицензия на ваших серверах или полностью Managed нами.', buy_title: 'Как купить — 3 шага', buy_sub: 'Без долгого цикла продаж. Бесплатное демо, выбор пакета, покупка в WhatsApp или форме.', buy1_title: '1. Бесплатное демо', buy1_desc: 'Откройте app.fxguard.io — user demo, пароль [guided demo]. Реальный продукт за минуты.', buy2_title: '2. Выберите пакет', buy2_desc: 'Cloud для скорости, License для владения или Managed без ops-нагрузки.', buy3_title: '3. Купите сегодня', buy3_desc: 'Напишите в WhatsApp или отправьте форму. Sales отвечает в рабочие дни в течение 24 часов — часто быстрее.', buy_cta_wa: 'Начать покупку в WhatsApp', buy_cta_form: 'Или отправить заявку на покупку', pkg1_wa: 'WhatsApp для подписки', pkg2_wa: 'WhatsApp для License', pkg3_wa: 'WhatsApp для Managed', packages_guarantee: 'Поговорите с sales до оплаты. Демо бесплатно. Для демо карта не нужна.', cta_wa: 'Купить через WhatsApp', sticky_text: 'От $49/мес · Бесплатное демо', sticky_demo: 'Демо', sticky_buy: 'Купить', wa_msg_buy: 'Здравствуйте, хочу КУПИТЬ FXGuard WhatsApp CRM. Пришлите пакеты и следующие шаги.', wa_msg_cloud: 'Здравствуйте, хочу ПОДПИСАТЬСЯ на FXGuard Hosted Cloud.', wa_msg_license: 'Здравствуйте, нужен РАСЧЁТ по FXGuard Self-hosted License.', wa_msg_managed: 'Здравствуйте, нужен РАСЧЁТ по FXGuard Managed Dedicated.', wa_msg_general: 'Здравствуйте, хочу купить / получить расчёт по FXGuard WhatsApp CRM.',
            problems_title: 'WhatsApp съедает ваши продажи?',
            problems_sub: 'Если команда всё ещё на личных телефонах — вы теряете клиентов каждый день.',
            p1_title: 'Несколько телефонов, один номер',
            p1_desc: 'Сотрудники делят логины или пишут с личных телефонов. Сообщения теряются, полной картины ни у кого нет.',
            p2_title: 'Нет истории клиента',
            p2_desc: 'Каждый чат начинается с нуля — без тегов, заметок и общего контекста между агентами.',
            p3_title: 'Нет ответственности',
            p3_desc: 'Нет тикетов, задач и записи, кто что обработал — и как быстро.',
            p4_title: 'Неясная безопасность',
            p4_desc: 'Общие устройства, без 2FA, без разделения ролей между филиалами и уровнями сотрудников.',
            solution_title: 'Купите FXGuard — исправьте на этой неделе',
            solution_desc: 'Одна панель для WhatsApp, клиентов, тикетов, задач, пользователей, филиалов и FX — с ролями и 2FA. Бесплатное live-демо, затем покупка подходящего плана.',
            solution_cta: 'Открыть бесплатное демо',
            solutions_title: 'Три способа купить FXGuard',
            solutions_sub: 'Тот же продукт. Ясное владение. Cloud, License или Managed — sales поможет в WhatsApp.',
            model1_badge: 'Лучший старт',
            model1_title: 'Hosted Cloud (SaaS)',
            model1_desc: 'Мы хостим FXGuard за вас. Састрый путь от демо к оплате.',
            model1_f1: 'Готово за минуты, без серверов',
            model1_f2: 'Автообновления и патчи безопасности',
            model1_f3: 'Ежедневные бэкапы включены',
            model1_f4: 'Оплата помесячно или ежегодно',
            model1_cta: 'Цены Cloud и покупка',
            model2_title: 'Self-hosted лицензия',
            model2_desc: 'Разовая покупка полной системы — ваша, на ваших серверах.',
            model2_f1: 'Разовая покупка, система ваша',
            model2_f2: 'Полный пакет установки и документация',
            model2_f3: 'Данные остаются на вашей инфраструктуре',
            model2_f4: 'Опциональные контракты обновлений и поддержки',
            model2_cta: 'Запросить цену License',
            model3_title: 'Managed Dedicated',
            model3_desc: 'Ставим и ведём выделенный инстанс — когда нужны результаты без ops-нагрузки.',
            model3_f1: 'Выделенный инстанс, установка нашей командой',
            model3_f2: 'Постоянный мониторинг и обслуживание',
            model3_f3: 'Бэкапы и кастомный SLA',
            model3_f4: 'Персональный account manager',
            model3_cta: 'Запросить Managed',
            demo_title: 'Попробуйте до покупки — live-демо продукта',
            demo_sub: 'Реальная панель FXGuard, не видео. Смотрите inbox и клиентов, затем напишите sales для покупки.',
            demo_label_url: 'URL демо',
            demo_label_user: 'Логин',
            demo_label_pass: 'Пароль',
            demo_copy: 'Копировать',
            demo_note: 'Публичное демо — изучайте свободно. Ничего не сохраняется. Готовы купить? WhatsApp после демо.',
            demo_cta: 'Открыть бесплатное демо',
            gallery_title: 'Реальные экраны — desktop и mobile',
            shot1_caption: 'Дашборд — обзор и быстрые действия',
            shot2_caption: 'Пользователи и роли — Owner, Admin, Manager, Supervisor, Agent',
            shot3_caption: 'Безопасность и профиль — 2FA и настройки аккаунта',
            shot4_caption: 'Мобильный дашборд — управление откуда угодно',
            shot5_caption: 'Мобильные чаты — WhatsApp inbox в пути',
            features_title: 'Всё, что нужно команде, в одной панели',
            features_sub: 'Реальные модули для обменных, финансовых, sales и support команд.',
            f1_title: 'Единый WhatsApp inbox',
            f1_desc: 'Один номер, общий inbox. Фильтры непрочитанных/открытых/назначенных и маршрутизация к нужному агенту.',
            f2_title: 'Клиенты и CRM',
            f2_desc: 'База клиентов с профилями, тегами и историей переписки — без старта с нуля.',
            f3_title: 'Тикеты поддержки',
            f3_desc: 'Отслеживайте внутренние и клиентские запросы от открытия до закрытия с ясной ответственностью.',
            f4_title: 'Задачи и процессы',
            f4_desc: 'Назначайте задачи, ведите процессы и держите команды подотчётными end-to-end.',
            f5_title: 'Пользователи, роли и навыки',
            f5_desc: 'Роли Owner, Admin, Manager, Supervisor, Agent и маршрутизация по навыкам.',
            f6_title: 'Филиалы и отделы',
            f6_desc: 'Организуйте сотрудников по филиалам и отделам с контролем активности владельцем.',
            f7_title: 'FX-курсы и обменные сервисы',
            f7_desc: 'Настройки курсов, графики и инструменты обменных услуг для FX/финкоманд.',
            f8_title: 'Безопасность, 2FA и audit logs',
            f8_desc: 'Google Authenticator 2FA, ролевые права и полные журналы активности.',
            stat1: 'Модули',
            stat2: 'Роли',
            stat3: 'Языки',
            stat4: 'Цель uptime',
            packages_title: 'Пакеты — понятный путь покупки',
            packages_sub: 'В каждом плане полный CRM. Выберите, кто хостит, затем купите через WhatsApp или форму.',
            pkg1_badge: 'Чаще всего покупают',
            pkg1_title: 'Hosted Cloud',
            pkg1_price_month: '$49',
            pkg1_period_month: '/мес',
            pkg1_or: 'или',
            pkg1_price_year: '$490',
            pkg1_period_year: '/год',
            pkg1_save: 'Экономия 2 месяцев при годовой оплате — лучшая ценность сейчас',
            pkg1_li1: 'Полная панель: inbox, клиенты, тикеты, задачи',
            pkg1_li2: 'Ежедневные бэкапы и 24/7 мониторинг',
            pkg1_li3: 'Автообновления без вашей эксплуатации',
            pkg1_li4: 'Ролевой доступ и 2FA',
            pkg1_li5: 'Email-поддержка, приоритет на годовом плане',
            pkg1_cta: 'Купить Cloud сейчас',
            pkg2_title: 'Self-hosted лицензия',
            pkg2_price: 'Разово · Запросить цену',
            pkg2_li1: 'Полная передача системы, разовая покупка',
            pkg2_li2: 'Установка на ваши серверы / ЦОД',
            pkg2_li3: 'Данные не покидают вашу инфраструктуру',
            pkg2_li4: 'Гайд по установке и онбординг',
            pkg2_li5: 'Опциональный годовой контракт обновлений',
            pkg2_cta: 'Запросить License',
            pkg3_title: 'Managed Dedicated',
            pkg3_price: 'Индивидуально · Запросить',
            pkg3_li1: 'Выделенный инстанс, установка и эксплуатация нами',
            pkg3_li2: 'Обслуживание, мониторинг и бэкапы',
            pkg3_li3: 'Кастомный SLA и время реакции',
            pkg3_li4: 'Персональный account manager',
            pkg3_li5: 'Онбординг и обучение сотрудников',
            pkg3_cta: 'Запросить Managed',
            packages_note: 'Все пакеты: inbox · клиенты · тикеты · задачи · роли · филиалы · FX · 2FA. Sales отвечает в рабочие дни в течение 24 часов.',
            services_title: 'Поддержка, которая не заканчивается на запуске',
            services_sub: 'Бэкапы, обслуживание, безопасность и мультиязычная поддержка — на всех планах, которые мы эксплуатируем.',
            svc1_title: 'Мониторинг и обслуживание 24/7',
            svc1_desc: 'Cloud и Managed контролируются круглосуточно с проактивными патчами.',
            svc2_title: 'Ежедневные бэкапы и восстановление',
            svc2_desc: 'Автобэкапы на hosted-планах с документированным recovery.',
            svc3_title: 'Безопасность и 2FA',
            svc3_desc: 'Google Authenticator 2FA, роли и журналы активности на каждом развёртывании.',
            svc4_title: 'Мультиязычная поддержка',
            svc4_desc: 'Поддержка и онбординг на английском, турецком, персидском, арабском и русском.',
            svc5_title: 'Мультифилиальный rollout',
            svc5_desc: 'Помогаем выстроить филиалы, отделы и роли по мере роста.',
            svc6_title: '7 дней возврата Cloud Start',
            svc6_desc: 'Первый месяц Cloud Start: напишите в WhatsApp в течение 7 дней, отключите номер — вернём этот месяц. SLA по запросу, не наклейка 99.9%.',
            svc7_title: 'Книга клиентов остаётся на панели компании',
            svc7_desc: '2FA, роли, журналы. Покупаете из ЕС — DPA вместе со счётом: <a href="/eu/">Европа</a>.',
            svc8_title: 'Онбординг и миграция',
            svc8_desc: 'Сопровождаемый запуск, помощь с импортом данных и обучение при go-live.',
            updates_badge: 'Обновления системы',
            updates_title: 'Что нового в FXGuard',
            updates_sub: 'Мы постоянно выпускаем улучшения — Cloud и Managed получают их автоматически; Self-hosted — по контракту обновлений.',
            upd1_date: 'Июл 2026',
            upd1_tag: 'Новое',
            upd1_title: 'Публичное live-демо и понятнее модели поставки',
            upd1_desc: 'Публичное демо на app.fxguard.io и более ясная упаковка Cloud / License / Managed — чтобы enterprise мог оценить продукт до решения.',
            upd1_p1: 'Гид-демо — без общего публичного пароля',
            upd1_p2: 'Пути продажи лицензии и managed-хостинга',
            upd1_p3: 'Реальные скриншоты desktop и mobile',
            upd2_date: 'Май 2026',
            upd2_tag: 'Безопасность',
            upd2_title: 'Усиленная безопасность аккаунта и брендинг панели',
            upd2_desc: 'Google Authenticator 2FA, усиление профиля и настройки внешнего вида панели для бренда организации без форка продукта.',
            upd2_p1: 'Настройка 2FA в профиле / security',
            upd2_p2: 'Ролевой доступ Owner → Agent',
            upd2_p3: 'Настраиваемые название организации и login-визуал',
            upd3_date: 'Мар 2026',
            upd3_tag: 'Продукт',
            upd3_title: 'Мультифилиальные операции и FX-инструменты',
            upd3_desc: 'Филиалы, отделы и контроль владельца, плюс курсы FX и обменные сервисы для финансовых операций.',
            upd3_p1: 'Структура филиалов и отделов',
            upd3_p2: 'Видимость активности и online-статуса',
            upd3_p3: 'FX-курсы, графики и обменные сервисы',
            upd4_date: 'Янв 2026',
            upd4_tag: 'Ядро',
            upd4_title: 'Единый inbox, тикеты, задачи и mobile',
            upd4_desc: 'Базовый CRM-цикл: один WhatsApp-номер на всю команду, история клиентов, тикеты и задачи — с desktop и mobile.',
            upd4_p1: 'Общий WhatsApp team inbox',
            upd4_p2: 'Клиенты, тикеты и task-процессы',
            upd4_p3: 'Мобильный дашборд и чаты',
            updates_note: 'Нужны эти обновления на self-hosted? Спросите про годовой контракт обновлений и поддержки при покупке лицензии.',
            blog_teaser_badge: 'Блог',
            blog_teaser_title: 'Гайды для команд, оценивающих FXGuard',
            blog_teaser_sub: 'Практические статьи о WhatsApp-операциях, лицензиях и безопасности — со ссылками на демо и пакеты.',
            blog_teaser_cta: 'Все статьи',
            blog_readmore: 'Читать →',
            footer_blog: 'Блог и статьи',
            faq_title: 'Частые вопросы',
            faq_sub: 'Короткие ответы о моделях поставки, демо, безопасности и ценах.',
            faq1_q: 'Чем отличаются Hosted Cloud, Self-hosted License и Managed Dedicated?',
            faq1_a: 'Cloud: мы запускаем FXGuard для вас (месяц/год). License: вы покупаете систему и крутите на своих серверах. Managed: мы ставим и обслуживаем выделенный инстанс с SLA. Core-модули одинаковые.',
            faq2_q: 'Можно ли попробовать FXGuard до покупки?',
            faq2_a: 'Да — и это бесплатно. Откройте app.fxguard.io (a booked guided demo), изучите реальный продукт, затем свяжитесь с sales для покупки. Изменения в демо не сохраняются.',
            faq3_q: 'Делаются ли бэкапы?',
            faq3_a: 'На Cloud и Managed — ежедневные бэкапы в составе сервиса. На Self-hosted бэкапы на вашей стороне; мы консультируем и можем включить это в support-контракт.',
            faq4_q: 'Что именно даёт Self-hosted License?',
            faq4_a: 'Разовая покупка полного FXGuard с документацией по установке, чтобы ваша команда развернула систему у себя под полным контролем.',
            faq5_q: 'Насколько безопасен FXGuard?',
            faq5_a: 'Можно включить 2FA через Google Authenticator. Доступ ролевой (Owner, Admin, Manager, Supervisor, Agent), активность логируется.',
            faq6_q: 'Поддерживает ли FXGuard несколько филиалов/отделов?',
            faq6_a: 'Да. Филиалы и отделы встроены, владелец видит активность, online-статус и историю входов по локациям.',
            faq7_q: 'Какие языки вы поддерживаете?',
            faq7_a: 'Сайт поддерживает английский, персидский, турецкий, арабский и русский; поддержка помогает на этих языках.',
            faq8_q: 'Как начать?',
            faq8_a: 'Попробуйте бесплатное live-демо, выберите Cloud, License или Managed, затем купите через WhatsApp или форму. После покупки помогаем с онбордингом.',
            form_title: 'Купить или связаться с sales',
            form_sub: 'Подписка Cloud, цена License, Managed или разбор демо — напишите, что хотите купить.',
            contact_demo: 'Запросить демо',
            contact_cloud: 'Подписаться на Cloud',
            contact_license: 'Купить лицензию',
            contact_managed: 'Managed-хостинг',
            contact_support: 'Получить поддержку',
            channel_wa: 'WhatsApp',
            channel_sales: 'Продажи',
            channel_support: 'Поддержка',
            form_response: 'Отвечаем в течение 24 часов в рабочие дни. Срочно — пишите в WhatsApp.',
            form_purpose: 'Меня интересует *',
            form_purpose_placeholder: 'Выберите...',
            form_purpose_demo: 'Запросить демо',
            form_purpose_cloud: 'Подписка — Hosted Cloud',
            form_purpose_license: 'Покупка — Self-hosted License',
            form_purpose_managed: 'Managed Dedicated hosting',
            form_purpose_support: 'Техподдержка',
            form_purpose_other: 'Другое',
            form_name: 'Имя *',
            form_email: 'Email *',
            form_phone: 'Телефон / WhatsApp',
            form_message: 'Сообщение *',
            form_submit: 'Отправить и получить предложение',
            form_success: 'Спасибо! Sales скоро свяжется. Для быстрой покупки напишите в WhatsApp.',
            form_wa: 'Быстрее: купить / запрос в WhatsApp +90 501 067 6486',
            cta_title: 'Готовы купить FXGuard сегодня?',
            cta_desc: 'Сначала бесплатное демо. Затем купите Cloud от $49/мес, Self-hosted License или Managed Dedicated — WhatsApp sales на связи.',
            cta_demo: 'Live-демо',
            cta_plans: 'Смотреть цены',
            cta_form: 'Связаться с sales',
            footer_solutions: 'Решения',
            footer_demo: 'Демо',
            footer_features: 'Возможности',
            footer_packages: 'Пакеты',
            footer_services: 'Сервисы',
            footer_updates: 'Обновления системы',
            footer_faq: 'FAQ',
            footer_contact: 'Контакты',
            footer_support: 'Поддержка'
        }
    };

        var CONTACT_TRANSLATIONS = {
        en: { contact_title: 'Contact Us', contact_sub: 'For purchase, support, demo, or consultation — reach us via email or WhatsApp. We respond within 24 hours on business days.', contact_buy_btn: 'Buy Now via WhatsApp', contact_demo_btn: 'Request Demo', contact_wa_title: 'WhatsApp — Consultation & Purchase', contact_wa_desc: 'Fast response for pricing, demo, and purchase', contact_sales_title: 'Sales', contact_sales_desc: 'Purchase, pricing, plans', contact_support_title: 'Support', contact_support_desc: 'Technical issues, installation', contact_hours_title: 'Response Hours', contact_hours_desc: 'Support and sales respond on business days within 24 hours. For urgent matters, use WhatsApp — we reply as soon as possible.', contact_wa_us: 'WhatsApp Us', contact_pricing_cta: 'Not sure which plan?', contact_view_pricing: 'View pricing', contact_or: ' or ', contact_ask_wa: 'ask us on WhatsApp', contact_back: '← Back to Home', contact_footer_contact: 'Contact', contact_footer_support: 'Support', contact_footer_wa: 'WhatsApp', nav_pricing: 'Pricing', nav_panel_btn: 'Get Started', logo: 'WhatsApp CRM' },
        fa: { contact_title: 'تماس با ما', contact_sub: 'برای خرید، پشتیبانی، دمو یا مشاوره — از ایمیل یا واتساپ با ما در تماس باشید. در روزهای کاری ظرف ۲۴ ساعت پاسخ می‌دهیم.', contact_buy_btn: 'خرید از طریق واتساپ', contact_demo_btn: 'درخواست دمو', contact_wa_title: 'واتساپ — مشاوره و خرید', contact_wa_desc: 'پاسخ سریع برای قیمت، دمو و خرید', contact_sales_title: 'فروش', contact_sales_desc: 'خرید، قیمت، پلن‌ها', contact_support_title: 'پشتیبانی', contact_support_desc: 'مشکلات فنی، نصب', contact_hours_title: 'ساعات پاسخگویی', contact_hours_desc: 'پشتیبانی و فروش در روزهای کاری ظرف ۲۴ ساعت پاسخ می‌دهند. برای فوری، واتساپ بزنید.', contact_wa_us: 'واتساپ بزنید', contact_pricing_cta: 'پلن مناسب را نمی‌دانید؟', contact_view_pricing: 'قیمت‌ها را ببینید', contact_or: ' یا ', contact_ask_wa: 'از واتساپ بپرسید', contact_back: '→ بازگشت به صفحه اصلی', contact_footer_contact: 'تماس', contact_footer_support: 'پشتیبانی', contact_footer_wa: 'واتساپ', nav_pricing: 'قیمت', nav_panel_btn: 'شروع کنید', logo: 'WhatsApp CRM' },
        tr: { contact_title: 'Bize Ulaşın', contact_sub: 'Satın alma, destek, demo veya danışmanlık için e-posta veya WhatsApp ile bize ulaşın. İş günlerinde 24 saat içinde yanıt veriyoruz.', contact_buy_btn: 'WhatsApp ile Satın Al', contact_demo_btn: 'Demo İste', contact_wa_title: 'WhatsApp — Danışmanlık ve Satın Alma', contact_wa_desc: 'Fiyat, demo ve satın alma için hızlı yanıt', contact_sales_title: 'Satış', contact_sales_desc: 'Satın alma, fiyatlandırma, planlar', contact_support_title: 'Destek', contact_support_desc: 'Teknik sorunlar, kurulum', contact_hours_title: 'Yanıt Saatleri', contact_hours_desc: 'Destek ve satış iş günlerinde 24 saat içinde yanıt verir. Acil durumlar için WhatsApp kullanın.', contact_wa_us: 'WhatsApp Yaz', contact_pricing_cta: 'Hangi planı seçeceğinizden emin değil misiniz?', contact_view_pricing: 'Fiyatları görün', contact_or: ' veya ', contact_ask_wa: 'WhatsApp\'ta sorun', contact_back: '← Ana Sayfaya Dön', contact_footer_contact: 'İletişim', contact_footer_support: 'Destek', contact_footer_wa: 'WhatsApp', nav_pricing: 'Fiyat', nav_panel_btn: 'Başlayın', logo: 'WhatsApp CRM' },
        ar: {
            contact_title: 'تواصل معنا',
            contact_sub: 'للشراء أو الدعم أو العرض أو الاستشارة — راسلنا عبر البريد أو واتساب. نرد خلال 24 ساعة في أيام العمل.',
            contact_buy_btn: 'اشترِ عبر واتساب',
            contact_demo_btn: 'طلب عرض',
            contact_wa_title: 'واتساب — استشارة وشراء',
            contact_wa_desc: 'رد سريع للأسعار والعرض والشراء',
            contact_sales_title: 'المبيعات',
            contact_sales_desc: 'شراء وأسعار وخطط',
            contact_support_title: 'الدعم',
            contact_support_desc: 'مشاكل تقنية وتثبيت',
            contact_hours_title: 'ساعات الرد',
            contact_hours_desc: 'المبيعات والدعم يردون في أيام العمل خلال 24 ساعة. للطوارئ استخدم واتساب.',
            contact_wa_us: 'راسلنا على واتساب',
            contact_pricing_cta: 'غير متأكد من الخطة؟',
            contact_view_pricing: 'عرض الأسعار',
            contact_or: ' أو ',
            contact_ask_wa: 'اسأل عبر واتساب',
            contact_back: '→ العودة للرئيسية',
            contact_footer_contact: 'تواصل',
            contact_footer_support: 'دعم',
            contact_footer_wa: 'واتساب',
            nav_pricing: 'الأسعار',
            nav_panel_btn: 'ابدأ الآن',
            logo: 'WhatsApp CRM'
        },
        ru: {
            contact_title: 'Свяжитесь с нами',
            contact_sub: 'Покупка, поддержка, демо или консультация — email или WhatsApp. Отвечаем в течение 24 часов в рабочие дни.',
            contact_buy_btn: 'Купить через WhatsApp',
            contact_demo_btn: 'Запросить демо',
            contact_wa_title: 'WhatsApp — консультация и покупка',
            contact_wa_desc: 'Быстрый ответ по цене, демо и покупке',
            contact_sales_title: 'Продажи',
            contact_sales_desc: 'Покупка, цены, планы',
            contact_support_title: 'Поддержка',
            contact_support_desc: 'Техвопросы, установка',
            contact_hours_title: 'Время ответа',
            contact_hours_desc: 'Продажи и поддержка отвечают в рабочие дни в течение 24 часов. Срочно — WhatsApp.',
            contact_wa_us: 'Написать в WhatsApp',
            contact_pricing_cta: 'Не уверены в плане?',
            contact_view_pricing: 'Смотреть цены',
            contact_or: ' или ',
            contact_ask_wa: 'спросите в WhatsApp',
            contact_back: '← На главную',
            contact_footer_contact: 'Контакты',
            contact_footer_support: 'Поддержка',
            contact_footer_wa: 'WhatsApp',
            nav_pricing: 'Цены',
            nav_panel_btn: 'Начать',
            logo: 'WhatsApp CRM'
        }
    };


    var SEO_META = {
        en: {
            title: 'FXGuard | WhatsApp CRM for exchange, remittance and finance desks',
            description: 'Quote FX rates on the same panel as WhatsApp. Company-owned customer book, roles, branches, 2FA. Cloud Start $49/mo inbox. Business from $249 with the FX pack. License from $4,000.',
            keywords: 'WhatsApp CRM for exchange offices, remittance WhatsApp inbox, FX rates WhatsApp CRM, multi-branch WhatsApp CRM, WhatsApp CRM Istanbul, döviz WhatsApp CRM',
            imageAlt: 'FXGuard staff panel: WhatsApp inbox and FX rates on one desktop screen'
        },
        fa: {
            title: 'واتساپ CRM صرافی و حواله | نرخ روی همان پنل | FXGuard',
            description: 'نرخ را در واتساپ بگویید؛ دفتر مشتری مال شرکت بماند. ابر شروع ۴۹$/ماه (۱ شعبه، ۳ نفر، بدون نرخ). تجاری از ۲۴۹$ با ماژول نرخ. بازگشت وجه ۷روزه ماه اول.',
            keywords: 'واتساپ CRM صرافی, پنل واتساپ صرافی, نرم‌افزار صرافی واتساپ, CRM حواله, نرخ ارز واتساپ, صندوق ورودی واتساپ سازمانی',
            imageAlt: 'پنل کارکنان FXGuard: اینباکس واتساپ و نرخ ارز روی یک صفحه دسکتاپ'
        },
        tr: {
            title: 'Döviz ve havale için WhatsApp CRM | FXGuard',
            description: 'Kur, WhatsApp ile aynı panelde. Müşteri defteri şirkette kalır. Cloud Start $49/ay. Business $249’dan FX paketiyle. Lisans $4.000’dan. İlk ay 7 gün iade.',
            keywords: 'döviz WhatsApp CRM, havale WhatsApp, döviz bürosu CRM, şubeli WhatsApp paneli, FXGuard İstanbul',
            imageAlt: 'FXGuard personel paneli: WhatsApp gelen kutusu ve döviz kurları tek ekranda'
        },
        ar: {
            title: 'واتساب CRM للصرافة والحوالات | FXGuard',
            description: 'سعر الصرف على نفس لوحة واتساب. دفتر العملاء ملك الشركة. بدء سحابي 49$/شهر. أعمال من 249$ مع حزمة الأسعار. ترخيص من 4000$.',
            keywords: 'واتساب صرافة, CRM حوالات, لوحة واتساب شركات الصرافة, WhatsApp CRM دبي, صرافة متعددة الفروع',
            imageAlt: 'لوحة موظفي FXGuard: صندوق وارد واتساب وأسعار الصرف على شاشة واحدة'
        },
        ru: {
            title: 'WhatsApp CRM для обменников и переводов | FXGuard',
            description: 'Курс на той же панели, что и WhatsApp. Книга клиентов остаётся в компании. Cloud Start $49/мес. Business от $249 с FX. Лицензия от $4000.',
            keywords: 'WhatsApp CRM обменник, CRM для обменных пунктов, WhatsApp для денежных переводов, FXGuard Стамбул',
            imageAlt: 'Панель FXGuard: WhatsApp-inbox и курсы валют на одном экране'
        }
    };

    function applyMetaTags(meta) {
        if (!meta) return;
        if (meta.title) document.title = meta.title;
        var desc = document.querySelector('meta[name="description"]');
        if (desc && meta.description) desc.setAttribute('content', meta.description);
        var kw = document.querySelector('meta[name="keywords"]');
        if (kw && meta.keywords) kw.setAttribute('content', meta.keywords);
        var ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle && meta.title) ogTitle.setAttribute('content', meta.title);
        var ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc && meta.description) ogDesc.setAttribute('content', meta.description);
        var ogImageAlt = document.querySelector('meta[property="og:image:alt"]');
        if (ogImageAlt && (meta.imageAlt || meta.title)) ogImageAlt.setAttribute('content', meta.imageAlt || meta.title);
        var twTitle = document.querySelector('meta[name="twitter:title"]');
        if (twTitle && meta.title) twTitle.setAttribute('content', meta.title);
        var twDesc = document.querySelector('meta[name="twitter:description"]');
        if (twDesc && meta.description) twDesc.setAttribute('content', meta.description);
        var twAlt = document.querySelector('meta[name="twitter:image:alt"]');
        if (twAlt && (meta.imageAlt || meta.title)) twAlt.setAttribute('content', meta.imageAlt || meta.title);
    }

    function isGeoPath() {
        return /^\/(ir|tr|ae|eu)(\/|$)/i.test(location.pathname || '');
    }

    function canonicalForLang(lang) {
        var origin = 'https://fxguard.io';
        var path = location.pathname || '/';
        if (path === '/index.html') path = '/';
        if (isGeoPath()) return origin + path;
        if (!lang || lang === 'en') return origin + path;
        return origin + path + '?lang=' + encodeURIComponent(lang);
    }

    function syncDiscoveryTags(lang) {
        if (isGeoPath()) return;
        var url = canonicalForLang(lang);
        var canon = document.querySelector('link[rel="canonical"]');
        if (canon) canon.setAttribute('href', url);
        var ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.setAttribute('content', url);
        var twUrl = document.querySelector('meta[name="twitter:url"]');
        if (twUrl) twUrl.setAttribute('content', url);
        var ogLocale = document.querySelector('meta[property="og:locale"]');
        var locales = { en: 'en_US', fa: 'fa_IR', tr: 'tr_TR', ar: 'ar_AE', ru: 'ru_RU' };
        if (ogLocale && locales[lang]) ogLocale.setAttribute('content', locales[lang]);
    }

    function applyImageAlts(t) {
        if (!t) return;
        document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
            var key = el.getAttribute('data-i18n-alt');
            var val = t[key];
            if (val) el.setAttribute('alt', val);
        });
    }

    function updateSeoMeta(lang) {
        var meta = SEO_META[lang] || SEO_META.en;
        applyMetaTags(meta);
        syncDiscoveryTags(lang);
        var html = document.documentElement;
        if (html && lang) {
            html.lang = lang;
            html.dir = (lang === 'fa' || lang === 'ar') ? 'rtl' : 'ltr';
        }
    }


        var FOOTER_I18N = {"en": {"footer_about": "FXGuard is a WhatsApp CRM: one company number, a shared team panel, customer history stays with the business. We customize it for your trade.", "footer_who": "For exchange offices, remittance desks and finance firms — Cloud Start works without the FX pack.", "footer_trust": "AI-assisted engineering · optional smart replies · 7-day money-back on first Cloud Start month", "footer_markets": "Turkey · UAE · Europe · Iran", "footer_col_product": "Products", "footer_col_solutions": "Solutions", "footer_col_company": "Company", "footer_whatsapp_crm": "WhatsApp CRM", "footer_pricing": "Pricing &amp; Packages", "footer_self_hosted": "Self-hosted License", "footer_managed": "Managed Hosting", "footer_open_panel": "Open Panel", "footer_updates": "System Updates", "footer_blog": "Blog &amp; Articles", "footer_tagline": "WhatsApp CRM — tailored to your business", "footer_demo": "Demo"}, "fa": {"footer_about": "FXGuard یک واتساپ CRM است: یک شماره سازمانی، پنل مشترک تیم، تاریخچه مشتری مال شرکت می‌ماند. برای صنف شما اختصاصی می‌شود.", "footer_who": "مناسب تیم فروش، فروشگاه، مطب، شرکت، صرافی و حواله — و هر کسب‌وکاری که برایتان اختصاصی شود.", "footer_trust": "مهندسی با کمک هوش مصنوعی · پاسخ هوشمند اختیاری · بازگشت وجه ۷روزه ماه اول ابر شروع", "footer_markets": "ترکیه · امارات · اروپا · ایران", "footer_col_product": "محصولات", "footer_col_solutions": "راه‌حل‌ها", "footer_col_company": "شرکت", "footer_whatsapp_crm": "واتساپ سی‌آرام", "footer_pricing": "قیمت و پکیج‌ها", "footer_self_hosted": "لایسنس خودمیزبان", "footer_managed": "هاست مدیریت‌شده", "footer_open_panel": "ورود به پنل", "footer_updates": "آپدیت‌های سیستم", "footer_blog": "وبلاگ و مقالات", "footer_tagline": "واتساپ CRM — اختصاصی برای کسب‌وکار شما", "footer_demo": "دمو"}, "tr": {"footer_about": "FXGuard bir WhatsApp CRM’dir: şirket numarası, ortak panel, müşteri geçmişi işletmede kalır. İşinize göre uyarlanır.", "footer_who": "Satış ekipleri, dükkanlar, klinikler, şirketler, döviz büroları — ve uyarladığımız her işletme.", "footer_trust": "Yapay zekâ destekli mühendislik · isteğe bağlı akıllı yanıt · ilk Cloud Start ayında 7 gün iade", "footer_markets": "Türkiye · BAE · Avrupa · İran", "footer_col_product": "Ürünler", "footer_col_solutions": "Çözümler", "footer_col_company": "Şirket", "footer_whatsapp_crm": "WhatsApp CRM", "footer_pricing": "Fiyat &amp; Paketler", "footer_self_hosted": "Self-hosted Lisans", "footer_managed": "Yönetilen Hosting", "footer_open_panel": "Panele Git", "footer_updates": "Sistem Güncellemeleri", "footer_blog": "Blog &amp; Yazılar", "footer_tagline": "WhatsApp CRM — işinize göre uyarlanır", "footer_demo": "Demo"}, "ar": {"footer_about": "FXGuard هو واتساب CRM: رقم شركة واحد، لوحة مشتركة، سجل العملاء يبقى للعمل. نخصّصه لمهنتكم.", "footer_who": "لفرق المبيعات والمتاجر والعيادات والشركات ومكاتب الصرافة — وأي عمل نخصّصه.", "footer_trust": "هندسة بمساعدة الذكاء الاصطناعي · ردود ذكية اختيارية · استرداد 7 أيام لأول شهر بدء سحابي", "footer_markets": "تركيا · الإمارات · أوروبا · إيران", "footer_col_product": "المنتجات", "footer_col_solutions": "الحلول", "footer_col_company": "الشركة", "footer_whatsapp_crm": "واتساب CRM", "footer_pricing": "الأسعار والباقات", "footer_self_hosted": "ترخيص ذاتي الاستضافة", "footer_managed": "استضافة مُدارة", "footer_open_panel": "فتح اللوحة", "footer_updates": "تحديثات النظام", "footer_blog": "المدونة والمقالات", "footer_tagline": "واتساب CRM — مخصّص لعملك", "footer_demo": "عرض"}, "ru": {"footer_about": "FXGuard — WhatsApp CRM: один корпоративный номер, общая панель, история клиентов остаётся в компании. Настраиваем под отрасль.", "footer_who": "Для продаж, магазинов, клиник, компаний, обменных столов — и любого бизнеса, который настроим.", "footer_trust": "AI-assisted инженерия · опциональные умные ответы · 7 дней возврата за первый месяц Cloud Start", "footer_markets": "Турция · ОАЭ · Европа · Иран", "footer_col_product": "Продукты", "footer_col_solutions": "Решения", "footer_col_company": "Компания", "footer_whatsapp_crm": "WhatsApp CRM", "footer_pricing": "Цены и пакеты", "footer_self_hosted": "Self-hosted лицензия", "footer_managed": "Managed-хостинг", "footer_open_panel": "Открыть панель", "footer_updates": "Обновления системы", "footer_blog": "Блог и статьи", "footer_tagline": "WhatsApp CRM — под ваш бизнес", "footer_demo": "Демо"}};
    function mergeFooterI18n(t, lang) {
        var extra = FOOTER_I18N[lang] || FOOTER_I18N.en;
        for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) t[k] = extra[k];
        return t;
    }

    function mergePageI18n(t, lang) {
        var pageBag = (typeof window !== 'undefined' && window.FXG_PAGE_I18N) ? window.FXG_PAGE_I18N : null;
        if (!pageBag) return t;
        var extra = pageBag[lang] || pageBag.en;
        for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) t[k] = extra[k];
        return t;
    }

    function updatePageSeoMeta(lang) {
        var pageMeta = (typeof window !== 'undefined' && window.FXG_PAGE_META) ? window.FXG_PAGE_META : null;
        if (!pageMeta || !document.body) return;
        var pageId = document.body.getAttribute('data-page');
        if (!pageId) return;
        var pack = pageMeta[lang] || pageMeta.en;
        var meta = pack && pack[pageId];
        if (!meta) return;
        applyMetaTags(meta);
        syncDiscoveryTags(lang);
        var ogLocale = document.querySelector('meta[property="og:locale"]');
        var locales = { en: 'en_US', fa: 'fa_IR', tr: 'tr_TR', ar: 'ar_AE', ru: 'ru_RU' };
        if (ogLocale && locales[lang]) ogLocale.setAttribute('content', locales[lang]);
    }

    function preserveLangOnLinks(lang) {
        document.querySelectorAll('a[href]').forEach(function(a) {
            var href = a.getAttribute('href');
            if (!href || href.charAt(0) === '#' || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
            if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp.com') !== -1) return;
            if (href.indexOf('http') === 0 && href.indexOf('fxguard.io') === -1 && href.indexOf(location.host) === -1) return;
            if (a.hasAttribute('data-no-lang')) return;
            try {
                var url = new URL(href, location.origin);
                if (url.origin !== location.origin) return;
                if (lang === 'en') url.searchParams.delete('lang');
                else url.searchParams.set('lang', lang);
                var next = url.pathname + url.search + url.hash;
                if (href.charAt(0) === '/' || href.indexOf(location.origin) === 0) a.setAttribute('href', next);
                else if (href.indexOf('?') !== -1 || href.indexOf('/') !== -1) a.setAttribute('href', next);
            } catch (e) {}
        });
    }

    function guessLangFromLocale(tag) {
        if (!tag) return null;
        var low = String(tag).toLowerCase().replace('_', '-');
        var primary = low.split('-')[0];
        var region = (low.split('-')[1] || '').toUpperCase();
        if (primary === 'fa' || primary === 'ps' || primary === 'tg') return 'fa';
        if (primary === 'tr' || primary === 'az') return 'tr';
        if (primary === 'ar') return 'ar';
        if (primary === 'ru' || primary === 'uk' || primary === 'be') return 'ru';
        /* English speakers / regions stay English */
        if (primary === 'en') return 'en';
        /* Country hints when browser reports only a region-heavy tag */
        if (region === 'IR' || region === 'AF' || region === 'TJ') return 'fa';
        if (region === 'TR') return 'tr';
        if (['AE','SA','QA','KW','BH','OM','EG','JO','LB','IQ','SY','MA','DZ','TN','LY','YE','SD','PS'].indexOf(region) !== -1) return 'ar';
        if (region === 'RU') return 'ru';
        return null;
    }

    function guessLangFromTimezone() {
        var tz = '';
        try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return null; }
        var map = {
            'Asia/Tehran': 'fa', 'Asia/Kabul': 'fa', 'Asia/Dushanbe': 'fa',
            'Europe/Istanbul': 'tr',
            'Asia/Dubai': 'ar', 'Asia/Muscat': 'ar', 'Asia/Qatar': 'ar', 'Asia/Bahrain': 'ar',
            'Asia/Kuwait': 'ar', 'Asia/Riyadh': 'ar', 'Asia/Baghdad': 'ar', 'Asia/Amman': 'ar',
            'Asia/Beirut': 'ar', 'Asia/Damascus': 'ar', 'Africa/Cairo': 'ar', 'Africa/Casablanca': 'ar',
            'Africa/Algiers': 'ar', 'Africa/Tunis': 'ar', 'Asia/Aden': 'ar',
            'Europe/Moscow': 'ru', 'Asia/Yekaterinburg': 'ru', 'Asia/Novosibirsk': 'ru'
        };
        return map[tz] || null;
    }

    function detectPreferredLang() {
        var params = new URLSearchParams(window.location.search);
        var urlLang = params.get('lang');
        if (urlLang && SUPPORTED_LANGS.indexOf(urlLang) !== -1) return urlLang;
        try {
            var saved = localStorage.getItem('landing_lang');
            if (saved && SUPPORTED_LANGS.indexOf(saved) !== -1) return saved;
        } catch (e) {}
        var langs = [];
        if (navigator.languages && navigator.languages.length) {
            for (var i = 0; i < navigator.languages.length; i++) langs.push(navigator.languages[i]);
        }
        langs.push(navigator.language || navigator.userLanguage || 'en');
        for (var j = 0; j < langs.length; j++) {
            var hit = guessLangFromLocale(langs[j]);
            if (hit) return hit;
        }
        var byTz = guessLangFromTimezone();
        if (byTz) return byTz;
        return 'en';
    }

    function applyArticleI18n(lang, t) {
        var root = document.querySelector('[data-article-slug]');
        if (!root || !window.FXG_ARTICLE_I18N) return;
        var slug = root.getAttribute('data-article-slug');
        var pack = window.FXG_ARTICLE_I18N[slug];
        if (!pack) return;
        var a = pack[lang] || pack.en;
        if (!a) return;

        var titleEl = root.querySelector('[data-article-title]');
        if (titleEl && a.title) titleEl.textContent = a.title;

        var leadEl = root.querySelector('[data-article-lead]');
        if (leadEl && a.lead) leadEl.textContent = a.lead;

        var tocEl = root.querySelector('[data-article-toc]');
        if (tocEl && a.toc && a.toc.length) {
            tocEl.innerHTML = a.toc.map(function (item) {
                var href = item[0];
                var label = item[1];
                return '<li><a href="' + href + '">' + label + '</a></li>';
            }).join('');
        }

        var bodyEl = root.querySelector('[data-article-body]');
        if (bodyEl && a.body) bodyEl.innerHTML = a.body;

        var heroCap = root.querySelector('[data-article-hero-caption]');
        if (heroCap && a.hero_caption) heroCap.textContent = a.hero_caption;

        // Document title: translated article title + brand
        if (a.title) {
            try { document.title = a.title + ' | FXGuard Blog'; } catch (e) {}
        }

        // Re-bind WA / lang on newly injected links
        if (t) updateWhatsAppLinks(t);
        preserveLangOnLinks(lang);
    }

    function localizeDates(lang) {
        var localeMap = { en: 'en-GB', fa: 'fa-IR', tr: 'tr-TR', ar: 'ar-AE', ru: 'ru-RU' };
        var locale = localeMap[lang] || 'en-GB';
        document.querySelectorAll('time[data-i18n-date][datetime]').forEach(function(el) {
            var raw = el.getAttribute('datetime');
            if (!raw) return;
            var d = new Date(raw + (raw.length <= 10 ? 'T12:00:00' : ''));
            if (isNaN(d.getTime())) return;
            try {
                el.textContent = new Intl.DateTimeFormat(locale, {
                    year: 'numeric', month: 'short', day: 'numeric'
                }).format(d);
            } catch (e) {}
        });
    }

    function applyLang(lang) {
        if (!SUPPORTED_LANGS.includes(lang)) lang = 'en';
        LANG = lang;
        var langMap = { en: 'en', fa: 'fa', tr: 'tr', ar: 'ar', ru: 'ru' };
        document.documentElement.lang = langMap[lang] || 'en';
        document.documentElement.dir = (lang === 'fa' || lang === 'ar') ? 'rtl' : 'ltr';
        document.documentElement.setAttribute('data-lang', lang);
        var t = mergePageI18n(mergeFooterI18n(Object.assign({}, TRANSLATIONS[lang] || TRANSLATIONS.en), lang), lang);
        var ct = CONTACT_TRANSLATIONS[lang] || CONTACT_TRANSLATIONS.en;
        /* Article body first so injected [data-i18n] nodes get translated below */
        applyArticleI18n(lang, null);
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
            var key = el.getAttribute('data-i18n');
            var val = t[key] || ct[key];
            if (val != null) el.innerHTML = val;
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
            var key = el.getAttribute('data-i18n-placeholder');
            var val = t[key] || ct[key];
            if (val != null) el.setAttribute('placeholder', val);
        });
        document.querySelectorAll('[data-i18n-aria]').forEach(function(el) {
            var key = el.getAttribute('data-i18n-aria');
            var val = t[key] || ct[key];
            if (val != null) el.setAttribute('aria-label', val);
        });
        applyImageAlts(t);
        document.querySelectorAll('.lang-switch button').forEach(function(btn) {
            var on = btn.getAttribute('data-lang') === lang;
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        try { localStorage.setItem('landing_lang', lang); } catch (e) {}
        if (document.body && !document.body.classList.contains('seo-page')) updateSeoMeta(lang);
        else updatePageSeoMeta(lang);
        updateWhatsAppLinks(t);
        preserveLangOnLinks(lang);
        localizeDates(lang);
        if (typeof window !== 'undefined') {
            window.FXG_LANG = lang;
            window.FXG_reapplyI18n = function () { applyLang(LANG); };
        }
    }

    function updateWhatsAppLinks(t) {
        var phone = '905010676486';
        var map = {
            buy: t.wa_msg_buy,
            cloud: t.wa_msg_cloud,
            license: t.wa_msg_license,
            managed: t.wa_msg_managed,
            accounting: t.wa_msg_accounting,
            exchange: t.wa_msg_exchange,
            demo: t.wa_msg_demo,
            trial: t.wa_msg_trial,
            pay: t.wa_msg_pay,
            pay_bnb: t.wa_msg_pay_bnb,
            pay_btc: t.wa_msg_pay_btc,
            pay_erc20: t.wa_msg_pay_erc20,
            pay_bep20: t.wa_msg_pay_bep20,
            general: t.wa_msg_general
        };
        document.querySelectorAll('.js-wa-link').forEach(function(el) {
            var kind = el.getAttribute('data-wa') || 'general';
            var msg = map[kind] || map.general || t.wa_msg_general || 'Hi, I want to buy FXGuard WhatsApp CRM.';
            el.setAttribute('href', 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg));
        });
    }

    function detectAndSetLang() {
        applyLang(detectPreferredLang());
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

    /* Mobile sticky buy bar after leaving hero */
    (function() {
        var bar = document.getElementById('stickyBuy');
        if (!bar) return;
        var toggle = function() {
            bar.classList.toggle('is-visible', window.scrollY > 280);
        };
        window.addEventListener('scroll', toggle, { passive: true });
        window.addEventListener('resize', toggle);
        toggle();
    })();

    /* Scroll reveal */
    var revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length && 'IntersectionObserver' in window) {
        var revealObs = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObs.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -40px 0px', threshold: 0.08 });
        revealEls.forEach(function(el) { revealObs.observe(el); });
    } else {
        revealEls.forEach(function(el) { el.classList.add('visible'); });
    }

    /* Blog pages: show all reveals immediately (opacity:0 + content-visibility hid cards) */
    requestAnimationFrame(function() {
        var blogRoot = document.querySelector('.blog-index-page, .blog-article');
        if (blogRoot) {
            blogRoot.querySelectorAll('.reveal').forEach(function(el) { el.classList.add('visible'); });
            return;
        }
        document.querySelectorAll('.blog-index-head.reveal, .blog-featured.reveal, .breadcrumbs.reveal').forEach(function(el) {
            el.classList.add('visible');
        });
    });

    /* Point every "try the panel / try demo" link at the live demo panel */
    var panelUrl = (typeof PANEL_URL !== 'undefined') ? PANEL_URL : 'https://app.fxguard.io';
    document.querySelectorAll('#btnPanel, #btnPanelMob, .js-panel-link').forEach(function(btn) { if (btn) btn.href = panelUrl; });

    window.addEventListener('scroll', function() {
        var h = document.getElementById('header');
        if (h) h.classList.toggle('scrolled', window.scrollY > 50);
    });

    var navToggle = document.getElementById('navToggle');
    var navMobile = document.getElementById('navMobile');
    var navClose = document.getElementById('navClose');
    function setNavOpen(open) {
        if (!navMobile) return;
        navMobile.classList.toggle('open', open);
        document.body.classList.toggle('nav-open', open);
        if (navToggle) navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open && navClose) {
            try { navClose.focus(); } catch (e) {}
        } else if (!open && navToggle) {
            try { navToggle.focus(); } catch (e2) {}
        }
    }
    if (navToggle && navMobile) {
        navToggle.addEventListener('click', function() {
            setNavOpen(!navMobile.classList.contains('open'));
        });
    }
    if (navClose && navMobile) navClose.addEventListener('click', function() { setNavOpen(false); });
    navMobile && navMobile.querySelectorAll('a').forEach(function(a) {
        a.addEventListener('click', function() { setNavOpen(false); });
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && navMobile && navMobile.classList.contains('open')) setNavOpen(false);
    });

    /* Copy-to-clipboard for demo credentials */
    document.querySelectorAll('.btn-copy[data-copy]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var value = btn.getAttribute('data-copy') || '';
            var originalLabel = btn.textContent;
            var done = function() {
                btn.classList.add('copied');
                btn.textContent = (LANG === 'fa' ? 'کپی شد!' : LANG === 'tr' ? 'Kopyalandı!' : LANG === 'ar' ? 'تم النسخ!' : LANG === 'ru' ? 'Скопировано!' : 'Copied!');
                setTimeout(function() {
                    btn.classList.remove('copied');
                    btn.textContent = originalLabel;
                }, 1800);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(value).then(done).catch(function() { fallbackCopy(value); done(); });
            } else {
                fallbackCopy(value);
                done();
            }
        });
    });

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
    }

    /* Pre-select the contact form purpose from Solutions / Packages / quick-action CTAs */
    document.querySelectorAll('.js-set-purpose[data-purpose]').forEach(function(el) {
        el.addEventListener('click', function() {
            var sel = document.getElementById('purpose');
            if (sel) sel.value = el.getAttribute('data-purpose');
        });
    });

    var form = document.getElementById('contactForm');
    var formSuccess = document.getElementById('formSuccess');
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
        var ALLOWED_PURPOSES = ['demo', 'trial', 'purchase', 'quote', 'license', 'managed', 'support', 'other', 'cloud_subscribe', 'buy_license', 'managed_hosting'];
        var PURPOSE_LABELS = { demo: 'Guided demo', trial: '7-day trial', purchase: 'Cloud Start', quote: 'Commercial invoice', license: 'Self-hosted license', managed: 'Managed dedicated', cloud_subscribe: 'Cloud Start', buy_license: 'License', managed_hosting: 'Managed', support: 'Support', other: 'Other' };
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
                    errEl.textContent = (LANG === 'fa' ? 'نام، ایمیل و پیام الزامی است.' : LANG === 'tr' ? 'Ad, e-posta ve mesaj zorunludur.' : LANG === 'ar' ? 'الاسم والبريد والرسالة مطلوبة.' : LANG === 'ru' ? 'Имя, email и сообщение обязательны.' : 'Name, email and message are required.');
                    errEl.style.display = 'block';
                    return;
                }
                var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRe.test(email)) {
                    errEl.textContent = (LANG === 'fa' ? 'ایمیل معتبر نیست.' : LANG === 'tr' ? 'Geçerli e-posta girin.' : LANG === 'ar' ? 'البريد غير صالح.' : LANG === 'ru' ? 'Введите корректный email.' : 'Please enter a valid email.');
                    errEl.style.display = 'block';
                    return;
                }
                var purposeVal = purpose && purpose.value ? purpose.value : 'other';
                if (ALLOWED_PURPOSES.indexOf(purposeVal) === -1) purposeVal = 'other';
                var payload = { purpose: purposeVal, name: name, email: email, message: message };
                if (phoneEl && phoneEl.value.trim()) payload.phone = phoneEl.value.trim();
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = (LANG === 'fa' ? 'در حال ارسال...' : LANG === 'tr' ? 'Gönderiliyor...' : LANG === 'ar' ? 'جارٍ الإرسال...' : LANG === 'ru' ? 'Отправка...' : 'Sending...');
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
                        if (window.FXG_YIELD && typeof window.FXG_YIELD.track === 'function') {
                            window.FXG_YIELD.track('lead_submit', { purpose: purposeVal, via: 'api' });
                        }
                    } else {
                        var tFail = TRANSLATIONS[LANG] || TRANSLATIONS.en;
                        var msgFail = (tFail && tFail.wa_msg_buy) ? tFail.wa_msg_buy : 'Hi, I want to buy FXGuard WhatsApp CRM.';
                        window.open('https://wa.me/905010676486?text=' + encodeURIComponent(msgFail), '_blank', 'noopener');
                        errEl.textContent = result.data.error || (LANG === 'fa' ? 'ارسال نشد — واتساپ باز شد.' : LANG === 'tr' ? 'Gönderilemedi — WhatsApp açıldı.' : LANG === 'ar' ? 'فشل الإرسال — تم فتح واتساب.' : LANG === 'ru' ? 'Не отправлено — открыт WhatsApp.' : 'Send failed — WhatsApp opened.');
                        errEl.style.display = 'block';
                    }
                }).catch(function() {
                    var t = TRANSLATIONS[LANG] || TRANSLATIONS.en;
                    var msg = (t && t.wa_msg_buy) ? t.wa_msg_buy : 'Hi, I want to buy FXGuard WhatsApp CRM.';
                    if (nameEl && nameEl.value) msg += '\nName: ' + nameEl.value.trim();
                    if (messageEl && messageEl.value) msg += '\n' + messageEl.value.trim();
                    window.open('https://wa.me/905010676486?text=' + encodeURIComponent(msg), '_blank', 'noopener');
                    errEl.textContent = (LANG === 'fa' ? 'فرم در دسترس نبود — واتساپ باز شد.' : LANG === 'tr' ? 'Form çalışmadı — WhatsApp açıldı.' : LANG === 'ar' ? 'النموذج غير متاح — تم فتح واتساب.' : LANG === 'ru' ? 'Форма недоступна — открыт WhatsApp.' : 'Form unavailable — WhatsApp opened.');
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
                subj.value = 'FXGuard - ' + (PURPOSE_LABELS[purpose.value] || purpose.value);
            }
        });
    }
})();
