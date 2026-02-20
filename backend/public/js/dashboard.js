(function() {
            var LANG = localStorage.getItem('crm_lang') || 'fa';
            var I18N = {
                fa: {
                    page_title: 'پ��رتا� کارک� ا�  کا�Rا | صراف�R کا�Rا',
                    login_title: 'پ��رتا� کارک� ا�  کا�Rا',
                    login_sub: '��ر��د ب�! پ��رتا� از سراسر د� �Rا',
                    login_email: 'ا�R�&�R�',
                    login_password: 'ر�&ز عب��ر',
                    login_btn: '��ر��د',
                    login_loading: 'در حا� ��ر��د...',
                    login_totp_title: 'احراز �!���Rت د�� �&رح��!�Rا�R',
                    login_totp_sub: 'کد شش�Rر��&�R اپ��Rک�Rش�  Google Authenticator را ��ارد ک� �Rد.',
                    login_totp_code_ph: 'کد ۶ ر��&�R',
                    login_totp_verify: 'تأ�R�Rد �� ��ر��د',
                    login_back: 'بازگشت',
                    login_err_connect: 'اتصا� ب�! سر��ر بر�رار � شد. �&ط�&ئ�  ش���Rد backend (node server.js) در حا� اجراست �� پ� � را از �!�&ا�  آدرس باز کرد�!�Rا�Rد (�&ث�ا�9 http://localhost:3002).',
                    login_err_server_html: 'سر��ر ب�! جا�R JSON پاسخ داد. از پ��ش�! backend دست��ر node server.js را اجرا ک� �Rد.',
                    login_err_invalid: 'پاسخ سر��ر � ا�&عتبر است.',
                    login_err_429: 'تعداد درخ��است�R�!ا ز�Rاد شد�!. �Rک تا د�� د��R��! صبر ک� �Rد �� د��بار�! ��ر��د را بز� �Rد.',
                    login_err_fail: '��ر��د � ا�&��ف�',
                    login_totp_for: 'کد شش�Rر��&�R Google Authenticator را برا�R',
                    login_totp_enter: '��ارد ک� �Rد.',
                    login_totp_code_required: 'کد شش�Rر��&�R را ��ارد ک� �Rد',
                    login_totp_retry: '�طفا�9 د��بار�! از �&رح��!� ا��� ��ارد ش���Rد',
                    login_totp_bad: 'کد اشتبا�! �Rا �&� �ض�R است',
                    login_cant_signin: 'نمی‌توانید وارد شوید؟',
                    login_contact_support: 'با پشتیبانی تماس بگیرید',
                    lang_fa: 'فارس�R',
                    lang_en: 'English',
                    lang_label: 'زبان',
                    nav_communications: 'ارتباطات',
                    nav_conversations: '�&کا��&ات',
                    nav_customers: '�&شتر�Rا� ',
                    nav_tickets: 'ت�Rکت�R�!ا�R داخ��R',
                    nav_organization: 'ساز�&ا� ',
                    nav_tasks: '��ظا�Rف �� تسک�R�!ا',
                    nav_processes: 'فرا�R� د�!ا�R کسب�R��کار',
                    nav_departments: 'دپارت�&ا� �R�!ا',
                    nav_users: 'کاربرا� ',
                    nav_branches: 'شعب',
                    nav_supervision: '� ظارت (�&ا�ک)',
                    nav_staff_activity: '��ر��د�!ا �� ��ضع�Rت آ� �ا�R� ',
                    nav_settings: 'ت� ظ�R�&ات',
                    nav_profile: 'پر��فا�R� �&� ',
                    nav_internal_chat: '� ت داخ��R',
                    nav_announcements: 'اع�ا� �R�!ا',
                    nav_whatsapp: 'اتصا� ��اتساپ',
                    nav_rates: '� رخ ارز�!ا',
                    skip_to_content: 'پرش به محتوا',
                    loading_panel: 'در حال بارگذاری پنل...',
                    nav_panel_settings: 'ظاهر پنل',
                    page_panel_settings: 'ظاهر پنل',
                    panel_settings_intro: 'نام سایت، لوگو، فاویکون و متن فوتر را تنظیم کنید. فقط برای مدیران قابل مشاهده است.',
                    panel_site_name: 'نام سایت',
                    panel_logo_url: 'آدرس لوگو (URL)',
                    panel_favicon_url: 'آدرس فاویکون (URL)',
                    panel_login_title: 'عنوان صفحه ورود',
                    panel_page_title: 'عنوان تب مرورگر',
                    panel_footer_text: 'متن فوتر',
                    panel_live_preview: 'پیش‌نمایش زنده',
                    panel_section_branding: 'برندینگ',
                    panel_section_titles: 'عنوان‌ها',
                    panel_section_footer: 'فوتر',
                    panel_footer_style: 'طراحی فوتر',
                    panel_footer_style_accent: 'نوار اکسن (پیش‌فرض)',
                    panel_footer_style_minimal: 'مینیمال',
                    panel_footer_style_compact: 'فشرده',
                    panel_footer_style_line: 'خط ساده',
                    panel_footer_style_hint: 'ظاهر نوار پایین صفحه را انتخاب کنید.',
                    panel_hide_footer: 'عدم نمایش فوتر (مخفی کردن متن پایین صفحه)',
                    panel_section_email: 'تنظیمات ایمیل (SMTP)',
                    panel_email_desc: 'ارسال ایمیل خوش‌آمدگویی، بازیابی رمز و اعلان ورود. در صورت خالی بودن از متغیرهای محیط سرور استفاده می‌شود.',
                    panel_smtp_host: 'آدرس سرور (Host)',
                    panel_smtp_port: 'پورت',
                    panel_smtp_user: 'نام کاربری',
                    panel_smtp_pass: 'رمز عبور',
                    panel_smtp_from: 'آدرس فرستنده (From)',
                    panel_smtp_from_name: 'نام فرستنده',
                    panel_smtp_secure: 'استفاده از SSL/TLS (پورت ۴۶۵)',
                    panel_email_login_notification: 'ارسال اعلان ورود به ایمیل کاربر',
                    panel_test_email_label: 'ارسال ایمیل تست',
                    panel_test_email_btn: 'ارسال تست',
                    panel_section_company_emails: 'ایمیل‌های شرکتی',
                    panel_company_emails_desc: 'ثبت و مدیریت ایمیل‌های شرکتی (مثل support@، info@). می‌توانید به هر ایمیل یک کاربر اختصاص دهید و اطلاعات ورود را برایش ارسال کنید.',
                    panel_company_email_add: 'افزودن ایمیل شرکتی',
                    panel_company_email_address: 'آدرس ایمیل',
                    panel_company_email_label: 'عنوان / کاربرد',
                    panel_company_email_assigned: 'اختصاص به کاربر',
                    panel_company_email_password: 'رمز عبور',
                    panel_company_email_password_hint: 'خالی = بدون تغییر (در ویرایش)',
                    panel_company_email_notes: 'یادداشت',
                    panel_company_email_active: 'فعال',
                    panel_company_email_has_pass: 'رمز',
                    panel_company_email_actions: 'عملیات',
                    panel_company_emails_empty: 'هنوز ایمیل شرکتی ثبت نشده است.',
                    panel_company_email_send_creds: 'ارسال اطلاعات ورود',
                    btn_cancel: 'انصراف',
                    panel_section_languages: 'زبان‌های سایت',
                    panel_section_languages_desc: 'زبان‌های در دسترس برای صفحه ورود و منوی پنل. در حالت تک‌زبانه سوئیچ زبان مخفی است؛ در حالت چندزبانگی کاربران می‌توانند زبان را عوض کنند.',
                    panel_language_mode: 'حالت زبان',
                    panel_language_mode_single: 'تک‌زبانه (فقط فارسی)',
                    panel_language_mode_single_en: 'تک‌زبانه (فقط انگلیسی)',
                    panel_language_mode_single_tr: 'تک‌زبانه (فقط ترکی)',
                    panel_language_mode_bilingual: 'دو زبانه (فارسی + انگلیسی)',
                    panel_language_mode_bilingual_fa_tr: 'دو زبانه (فارسی + ترکی)',
                    panel_language_mode_bilingual_en_tr: 'دو زبانه (انگلیسی + ترکی)',
                    panel_language_mode_trilingual: 'سه زبانه (فارسی + انگلیسی + ترکی)',
                    panel_default_language: 'زبان پیش‌فرض',
                    panel_default_language_desc: 'زبان اولیه برای کاربران جدید یا وقتی زبان انتخاب نشده است.',
                    lang_fa: 'فارسی',
                    lang_en: 'English',
                    lang_tr: 'Türkçe',
                    panel_language_hint_single: 'فقط فارسی در منو و صفحه ورود نمایش داده می‌شود.',
                    panel_language_hint_single_en: 'فقط انگلیسی در منو و صفحه ورود نمایش داده می‌شود.',
                    panel_language_hint_single_tr: 'فقط ترکی در منو و صفحه ورود نمایش داده می‌شود.',
                    panel_language_hint_bilingual: 'فارسی و انگلیسی؛ کاربران می‌توانند زبان را عوض کنند.',
                    panel_language_hint_bilingual_fa_tr: 'فارسی و ترکی؛ کاربران می‌توانند زبان را عوض کنند.',
                    panel_language_hint_bilingual_en_tr: 'انگلیسی و ترکی؛ کاربران می‌توانند زبان را عوض کنند.',
                    panel_language_hint_trilingual: 'فارسی، انگلیسی و ترکی؛ کاربران می‌توانند زبان را عوض کنند.',
                    panel_section_visibility: 'نمایش بخش‌ها در سایت',
                    panel_visibility_desc: 'بخش‌هایی که مخفی می‌کنید در منو و در کل وب‌سایت نمایش داده نمی‌شوند. تیک خورده = نمایش داده شود.',
                    user_perms_select_all: 'همه دسترسی‌ها',
                    user_perms_select_none: 'هیچ‌کدام',
                    user_perms_group_communications: 'ارتباطات',
                    user_perms_group_organization: 'سازمان',
                    user_perms_group_settings: 'تنظیمات',
                    user_perms_group_special: 'دسترسی‌های ویژه',
                    user_perms_all: 'همه',
                    user_perms_none: 'هیچ‌کدام',
                    section_manage_tickets: 'مدیریت تیکت‌ها (حذف/آرشیو)',
                    header_search: 'جستج�� در �&کا��&ات�R �&شتر�Rا� ...',
                    header_search_aria: 'جستج�� در �&کا��&ات �� �&شتر�Rا� ',
                    header_logout: 'خر��ج',
                    logo_kaya: 'صراف�R کا�Rا',
                    page_conversations: '�&کا��&ات',
                    page_customers: '�&شتر�Rا� ',
                    page_departments: 'دپارت�&ا� �R�!ا',
                    page_users: 'کاربرا� ',
                    page_tickets: 'ت�Rکت�R�!ا�R داخ��R',
                    page_tasks: '��ظا�Rف �� تسک�R�!ا',
                    page_processes: '�&د�Rر فرا�R� د�!ا�R کسب�R��کار',
                    page_profile: 'پر��فا�R� �&� ',
                    page_announcements: 'اع�ا� �R�!ا',
                    page_internal_chat: '� ت داخ��R',
                    page_branches: 'شعب',
                    page_staff_activity: '��ر��د�!ا �� ��ضع�Rت آ� �ا�R�  کارک� ا� ',
                    page_supervision: '� ظارت �� �&��� �Rت��ر�R� گ (�&ا�ک)',
                    page_whatsapp: 'اتصا� ��اتساپ',
                    page_rates: 'ت� ظ�R�& � رخ ارز�!ا',
                    page_panel_settings: 'ظاهر پنل',
                    panel_settings_intro: 'نام سایت، لوگو، فاویکون و متن فوتر را تنظیم کنید. فقط برای مدیران قابل مشاهده است.',
                    panel_site_name: 'نام سایت',
                    panel_logo_url: 'آدرس لوگو (URL)',
                    panel_favicon_url: 'آدرس فاویکون (URL)',
                    panel_login_title: 'عنوان صفحه ورود',
                    panel_page_title: 'عنوان تب مرورگر',
                    panel_footer_text: 'متن فوتر',
                    panel_preview: 'پیش‌نمایش',
                    page_customer_detail: 'تار�Rخ� �! �&شتر�R',
                    btn_send: 'ارسا�',
                    btn_save: 'ذخ�Rر�!',
                    btn_back: 'بازگشت',
                    btn_apply: 'اعمال',
                    btn_edit: 'ویرایش',
                    btn_delete: 'حذف',
                    msg_placeholder: 'پ�Rا�& خ��د را ب� ���Rس�Rد...',
                    back_to_customers: '� � بازگشت ب�! �&شتر�Rا� ',
                    back_to_list: '� � بازگشت ب�! ��Rست',
                    loading: 'در حا� بارگذار�R...',
                    empty_conv: '�!� ��ز �&کا��&�!�Rا�R � �Rست.',
                    empty_customers: '�&شتر�R�R �Rافت � شد.',
                    empty_dept: 'دپارت�&ا� �R �Rافت � شد.',
                    empty_users: 'کاربر�R �Rافت � شد.',
                    empty_tickets: 'ت�Rکت�R �Rافت � شد.',
                    empty_tasks: 'تسک�R �Rافت � شد.',
                    empty_branches: 'شعب�!�Rا�R ثبت � شد�!.',
                    totp_banner: 'برا�R ا�&� �Rت ب�Rشتر احراز �!���Rت د�� �&رح��!�Rا�R (Google Authenticator) را فعا� ک� �Rد.',
                    totp_enable: 'فعا��Rساز�R',
                    totp_later: 'بعدا�9',
                    profile_intro: '� ا�&�R ت�ف�  �� ر�&ز عب��ر �اب� ���Rرا�Rش است. ا�R�&�R� �� دپارت�&ا�  ت��سط �&د�Rر ت� ظ�R�& �&�R�Rش��د.',
                    profile_avatar: 'عکس پر��فا�R� (آدرس URL)',
                    profile_name: '� ا�&',
                    profile_email_readonly: 'ا�R�&�R� (غ�Rر�اب� تغ�R�Rر)',
                    profile_dept_readonly: 'دپارت�&ا�  (غ�Rر�اب� تغ�R�Rر)',
                    profile_phone: 'ت�ف� ',
                    profile_password_new: 'ر�&ز عب��ر جد�Rد (در ص��رت ت�&ا�R� ب�! تغ�R�Rر)',
                    profile_password_ph: 'خا��R بگذار�Rد اگر � �&�R�Rخ��ا�!�Rد تغ�R�Rر ک� د',
                    profile_save: 'ذخ�Rر�! تغ�R�Rرات',
                    profile_totp_title: 'احراز �!���Rت د�� �&رح��!�Rا�R (Google Authenticator)',
                    profile_totp_desc: '��ر��د ا�&� �Rتر با اپ��Rک�Rش�  Google Authenticator. �&�R�Rت��ا� �Rد از داخ� پ� � آ�  را فعا� �Rا غ�Rرفعا� ک� �Rد.',
                    totp_active: 'فعا�',
                    totp_inactive: 'غ�Rرفعا�',
                    totp_disable_btn: 'غ�Rرفعا� کرد� ',
                    totp_setup_btn: 'فعا��Rساز�R با Google Authenticator',
                    modal_totp_setup: 'فعا��Rساز�R Google Authenticator',
                    modal_totp_scan: 'با اپ��Rک�Rش�  Google Authenticator QR ز�Rر را اسک�  ک� �Rد (�Rا ک��Rد را دست�R ��ارد ک� �Rد):',
                    modal_totp_secret: 'ک��Rد دست�R:',
                    modal_totp_confirm: 'تأ�R�Rد �� فعا��Rساز�R',
                    modal_totp_disable: 'غ�Rرفعا� کرد�  احراز د�� �&رح��!�Rا�R',
                    modal_totp_enter_pw: 'ر�&ز عب��ر خ��د را ��ارد ک� �Rد:',
                    modal_totp_password_ph: 'ر�&ز عب��ر',
                    modal_user_edit: '���Rرا�Rش دسترس�R �� ��ضع�Rت کاربر',
                    modal_user_active: 'حساب فعا� (غ�Rرفعا� = �&سد��د)',
                    modal_user_perms: 'دسترس�R ب�! بخش�R�!ا:',
                    modal_ann_title: 'اع�ا�  �&�!�&',
                    modal_ann_gotit: '�&ت��ج�! شد�&',
                    footer_text: 'صرافی کایا — پورتال کارکنان',
                    section_conversations: '�&کا��&ات',
                    section_customers: '�&شتر�Rا� ',
                    section_tickets: 'ت�Rکت�R�!ا',
                    section_tasks: '��ظا�Rف �� تسک�R�!ا',
                    section_departments: 'دپارت�&ا� �R�!ا',
                    section_users: 'کاربرا� ',
                    section_branches: 'شعب',
                    section_supervision: '� ظارت (�&ا�ک)',
                    section_staff_activity: '��ر��د�!ا �� آ� �ا�R� ',
                    section_announcements: 'اع�ا� �R�!ا',
                    section_internal_chat: '� ت داخ��R',
                    section_whatsapp: 'اتصا� ��اتساپ',
                    section_rates: '� رخ ارز�!ا (ت� ظ�R�& � ��ار ��R�&ت)',
                    section_processes: 'فرا�R� د�!ا�R کسب�R��کار',
                    section_manage_users: '�&د�Rر�Rت کاربرا�  (���Rرا�Rش/�&سد��د)',
                    status_online: 'آ� �ا�R� ',
                    status_away: 'د��ر',
                    status_busy: '�&شغ���',
                    status_offline: 'آف�ا�R� ',
                    err_generic: 'خطا',
                    saved: 'ذخ�Rر�! شد', save_changes: 'ذخ�Rر�! تغ�R�Rرات',
                    toast_ticket_created: 'ت�Rکت ثبت شد',
                    toast_dept_added: 'دپارت�&ا�  اضاف�! شد',
                    toast_user_added: 'کاربر اضاف�! شد',
                    toast_branch_added: 'شعب�! اضاف�! شد',
                    toast_branch_updated: 'شعب�! ب�!�Rر��ز شد',
                    toast_reply_sent: 'پاسخ ثبت شد',
                    toast_task_created: 'تسک ثبت شد',
                    toast_status_updated: '��ضع�Rت ب�!�Rر��ز شد',
                    toast_update_added: 'پ�Rگ�Rر�R ثبت شد',
                    toast_totp_enabled: 'احراز د�� �&رح��!�Rا�R فعا� شد',
                    toast_totp_disabled: 'احراز د�� �&رح��!�Rا�R غ�Rرفعا� شد',
                    toast_rates_saved: 'تعد�R�ات ذخ�Rر�! شد.',
                    no_branch: 'بد���  شعب�!',
                    no_dept: 'بد���  دپارت�&ا� ',
                    no_user: 'ا� تخاب کار�&� د',
                    no_user_filter: '�!�&�! کار�&� دا� ',
                    all_branches: '�!�&�! شعب',
                    all_statuses: '�!�&�! ��ضع�Rت�R�!ا',
                    all_depts: '�!�&�! دپارت�&ا� �R�!ا',
                    ticker_loading: 'در حا� بارگذار�R ��R�&ت�R�!ا...',
                    ticker_updated: 'آخر�R�  بر��زرسا� �R:',
                    ticker_outside_hours: 'بر��زرسا� �R � رخ ف�ط ۶ تا ۲۰ ب�! ���ت ت�!را�  � �!ر ۱۰ د��R��!',
                    ticker_last: 'آخر�R�  بر��زرسا� �R:',
                    dept_branch: 'شعبه', dept_name: 'نام دپارتمان', dept_desc: 'توضیحات', dept_keywords: 'کلمات کلیدی (با کاما)', add_dept: 'افزودن دپارتمان', dept_intro: 'دپارتمان‌ها برای تخصیص خودکار مکالمات بر اساس کلمات کلیدی استفاده می‌شوند.',
                    dept_color: 'رنگ', dept_is_default: 'پیش‌فرض (مکالمات بدون تطابق)', dept_edit_hint: 'فیلدها را ویرایش کنید و روی «ذخیره» بزنید.', toast_dept_updated: 'دپارتمان به‌روز شد', dept_list_title: 'دپارتمان‌ها',
                    dept_ph_name: '�&ثا�: پشت�Rبا� �R ف� �R', dept_ph_optional: 'اخت�Rار�R', dept_ph_keywords: '�&ثا�: �&شک��R خراب�R�R پشت�Rبا� �R',
                    users_intro: 'ف�ط �&د�Rر �&ج�&��ع�! �Rا کس�R ک�! دسترس�R «�&د�Rر�Rت کاربرا� » دارد �&�R�Rت��ا� د کاربر جد�Rد بسازد.',
                    label_name: '� ا�&', label_email: 'ا�R�&�R�', label_password: 'ر�&ز عب��ر', label_role: '� �ش', label_dept: 'دپارت�&ا� ', label_branch: 'شعب�!',
                    user_ph_name: '� ا�& کا�&�', user_ph_pass: 'حدا�� ۶ کاراکتر', add_user: 'افز��د�  کاربر', role_agent: 'کار�&� د', role_manager: '�&د�Rر', role_admin: 'اد�&�R� ',
                    ticket_title: 'ع� ��ا�  ت�Rکت', ticket_desc: 'ت��ض�Rحات', ticket_priority: 'ا������Rت', create_ticket: 'ثبت ت�Rکت', ticket_ph_subject: '�&��ض��ع',
                    reply_to_ticket: 'پاسخ ب�! ت�Rکت', reply_ph: '�&ت�  پاسخ...', file_attach: 'پ�R��ست فا�R� (اخت�Rار�R)', send_reply: 'ارسا� پاسخ',
                    priority_normal: 'عاد�R', priority_high: '�&�!�&', priority_low: 'ک�&', priority_urgent: 'ف��ر�R',
                    tasks_intro: 'پ�Rگ�Rر�R کار�!ا�R اختصاص�R�Rافت�! ب�! کار�&� د �Rا دپارت�&ا� .',
                    new_task: 'تسک جد�Rد', label_title: 'ع� ��ا� ', task_ph_title: 'ع� ��ا�  ��ظ�Rف�!', task_ph_desc: 'شرح کار', assign_to: 'اختصاص ب�!',
                    assign_user: 'کار�&� د', assign_dept: 'دپارت�&ا� ', select_dept: 'ا� تخاب دپارت�&ا� ', due_date: '�&�!�ت (اخت�Rار�R)', filter: 'ف�R�تر',
                    all_statuses: '�!�&�! ��ضع�Rت�R�!ا', status_pending: 'در ا� تظار', status_in_progress: 'در حا� ا� جا�&', status_done: 'ا� جا�& شد�!', status_cancelled: '�غ��',
                    add_task: 'ثبت تسک', add_update: 'افز��د�  پ�Rگ�Rر�R / گزارش', update_ph: '��ضع�Rت �Rا گزارش خ��د را ب� ���Rس�Rد...', save_update: 'ثبت پ�Rگ�Rر�R',
                    change_status: 'تغ�R�Rر ��ضع�Rت', creator: 'ساز� د�!', updates: 'پ�Rگ�Rر�R�R�!ا', no_updates: '�!� ��ز پ�Rگ�Rر�R ثبت � شد�!.',
                    ann_send_title: 'ارسا� اع�ا�  ب�! کارک� ا� ', ann_recipient: 'گ�Rر� د�!', ann_all: '�!�&�! کارک� ا� ', ann_one_dept: '�Rک دپارت�&ا� ', ann_one_user: '�Rک � فر',
                    ann_select: 'ا� تخاب ک� �Rد', ann_title: 'ع� ��ا� ', ann_body: '�&ت� ', ann_ph_title: 'ع� ��ا�  اع�ا� ', ann_ph_body: '�&ت�  پ�Rا�&...',
                    ann_important: 'پ�Rا�& �&�!�& (پاپ�Rآپ �� صدا برا�R گ�Rر� د�!)', send_ann: 'ارسا� اع�ا� ',
                    new_chat: 'گفتگ���R جد�Rد', select_conversation: 'ا� تخاب گفتگ��', msg_ph_short: 'پ�Rا�&...', attach_file: 'پ�R��ست فا�R�',
                    start_chat_with: 'شر��ع گفتگ�� با', start_chat: 'شر��ع � ت', internal_chat_open_full: 'باز کردن چت کامل', cancel: 'ا� صراف',
                    branch_intro: 'شعب برای تفکیک جغرافیایی و تخصیص کاربران و مکالمات استفاده می‌شوند.', branch_name: 'نام شعبه', branch_city: 'شهر', branch_country: 'کشور', branch_ph_name: 'مثال: دفتر تهران', branch_ph_city: 'مثال: تهران', branch_ph_country: 'مثال: ایران', add_branch: 'افزودن شعبه', edit: 'ویرایش',
                    staff_online: 'کارک� ا�  آ� �ا�R� ', staff_intro: 'آخر�R�  ��ر��د�!ا �� ��Rست کارک� ا�  آ� �ا�R�  � برا�R �&د�Rر �� با�اتر', last_logins: 'آخر�R�  ��ر��د�!ا',
                    sup_performance: 'خ�اص�! ع�&�کرد', sup_conversations: '�&کا��&ات', sup_activity: '�اگ فعا��Rت', sup_branch_status: 'شعب�! / دپارت�&ا�  / ��ضع�Rت', apply_filter: 'اع�&ا� ف�R�تر',
                    sup_by_branch: 'ب�! تفک�Rک شعب�!', sup_by_user: 'ع�&�کرد کاربرا�  (پ�Rا�& ارسا��R)', total_conversations: 'ک� �&کا��&ات', outgoing_messages: 'پ�Rا�& ارسا��R (خر��ج�R)',
                    th_branch: 'شعب�!', th_city_country: 'ش�!ر/کش��ر', th_conv_count: 'تعداد �&کا��&�!', th_user: 'کاربر', th_email: 'ا�R�&�R�', th_status: '��ضع�Rت', th_last_login: 'آخر�R�  ��ر��د',
                    th_customer: '�&شتر�R', th_dept: 'دپارت�&ا� ', th_assignee: 'کار�&� د', th_time: 'ز�&ا� ', th_action: 'ع�&��Rات', th_summary: 'خ�اص�!', th_login_time: 'ز�&ا�  ��ر��د',
                    all_actions: '�!�&�! ع�&��Rات', action_message_sent: 'ارسا� پ�Rا�&', action_conv_assigned: 'تخص�Rص �&کا��&�!', status_open: 'باز', status_closed: 'بست�!', status_resolved: 'ح� شد�!',
                    whatsapp_checking: 'در حا� بررس�R...', whatsapp_scan_qr: 'QR را با اپ��Rک�Rش�  ��اتساپ �&��با�R� اسک�  ک� �Rد', whatsapp_start_btn: 'شر��ع Gateway ��اتساپ',
                    whatsapp_server_err: 'سر��ر Backend پاسخ درست � �&�R�Rد�!د.', whatsapp_gateway_off: 'Gateway ر��ش�  � �Rست. ر���R دک�&�! ز�Rر ک��Rک ک� �Rد.',
                    whatsapp_status: '��ضع�Rت ��اتساپ:', whatsapp_connected: '�&تص� �S', whatsapp_disconnected: '�طع', redis: 'Redis', active: 'فعا�', inactive: 'غ�Rرفعا�', done_msg: 'ا� جا�& شد',
                    rates_intro: '��R�&ت�R�!ا از API در�Rافت �&�R�Rش��� د �� در � ��ار ز�Rر پ� � برا�R �!�&�! � �&ا�Rش داد�! �&�R�Rش��� د.', rates_adjust_type: '� ��ع تعد�R�',
                    rates_none: 'بد���  تغ�R�Rر', rates_fixed: 'ثابت', rates_delta: '± ت���&ا� ', rates_percent: '± درصد', rates_currency: 'ارز', rates_current: '��R�&ت فع��R (� �&ا�Rش در � ��ار)', rates_value: '�&�دار',
                    no_data: 'داد�!�Rا�R � �Rست.', loading_err: 'خطا در بارگذار�R.', select_user: 'ا� تخاب کاربر',
                    empty_conv_list: 'گفتگ���R�R ��ج��د � دارد. ر���R «گفتگ���R جد�Rد» ک��Rک ک� �Rد.', chat: '� ت', empty_internal_msgs: '�!� ��ز پ�Rا�&�R � �Rست.', file: 'فا�R�',
                    empty_no_logins: '�!� ��ز ��ر��د�R ثبت � شد�!.', no_staff_online: '�!�R�  کار�&� د آ� �ا�R� �R � �Rست.', login_err_load: 'خطا در بارگذار�R ��ر��د�!ا.',
                    required_name_email_pass: '� ا�&�R ا�R�&�R� �� ر�&ز عب��ر ا�زا�&�R است', select_user_first: '�Rک کاربر ا� تخاب ک� �Rد', select_conversation_first: '�Rک گفتگ�� ا� تخاب ک� �Rد',
                    enter_text_or_file: '�&ت�  �Rا �Rک فا�R� ��ارد ک� �Rد', manage_users_required: 'دسترس�R �&د�Rر�Rت کاربرا�  �از�& است',
                    branch_name_required: '� ا�& شعب�! ا�زا�&�R است', edit_branch_hint: 'ف�R�د�!ا را ���Rرا�Rش ک� �Rد �� ر���R «افز��د�  شعب�!» بز� �Rد تا ب�!�Rر��زرسا� �R ش��د.',
                    ticket_title_required: 'ع� ��ا�  ت�Rکت ا�زا�&�R است', reply_or_file_required: '�&ت�  پاسخ �Rا �Rک فا�R� ا�زا�&�R است', task_title_required: 'ع� ��ا�  تسک ا�زا�&�R است',
                    select_assignee: 'کار�&� د �Rا دپارت�&ا�  را ا� تخاب ک� �Rد', task_update_required: '�&ت�  پ�Rگ�Rر�R ا�زا�&�R است', dept_name_required: '� ا�& دپارت�&ا�  ا�زا�&�R است',
                    enter_password: 'ر�&ز عب��ر را ��ارد ک� �Rد', enter_6_digit: 'کد شش�Rر��&�R را ��ارد ک� �Rد',
                    creator_label: 'ساز� د�!:', assignee_label: 'اختصاص ب�!:', due_label: '�&�!�ت:', no_reply: 'پاسخ�R ثبت � شد�!.', conversation: '�&کا��&�!', history: 'تار�Rخ� �!:',
                    by_dept: 'ب�! تفک�Rک دپارت�&ا� ', by_user: 'ب�! تفک�Rک کار�&� د', pending_count: 'در ا� تظار', in_progress_count: 'در حا� ا� جا�&', done_count: 'ا� جا�& شد�!',
                    customer: '�&شتر�R', no_conv_history: '�!� ��ز �&کا��&�!�Rا�R ثبت � شد�!.', blocked: '�&سد��د', edit_access: '���Rرا�Rش / دسترس�R',
                    usd: 'د�ار', eur: '�R��ر��', gbp: 'پ��� د', try: '��Rر', aed: 'در�!�&', rub: 'ر��ب�', azn: '�&� ات', cny: '�R��ا� ', gold: 'ط�ا (گر�&)',
                    processes_intro: '�ا�ب�R�!ا�R فرا�R� د را تعر�Rف ک� �Rد �� � �&��� �!�R�!ا�R در حا� اجرا را پ�Rگ�Rر�R ک� �Rد.',
                    process_templates: '�ا�ب�R�!ا�R فرا�R� د',
                    process_instances: '� �&��� �!�R�!ا�R در حا� اجرا',
                    process_add_template: 'افز��د�  �ا�ب فرا�R� د',
                    process_template_name: '� ا�& �ا�ب',
                    process_template_desc: 'ت��ض�Rحات',
                    process_stages: '�&راح� (ب�! ترت�Rب)',
                    process_stage_name: '� ا�& �&رح��!',
                    process_add_stage: 'افز��د�  �&رح��!',
                    process_start_instance: 'شر��ع � �&��� �!',
                    process_instance_title: 'ع� ��ا�  � �&��� �!',
                    process_current_stage: '�&رح��! فع��R',
                    process_advance: 'تک�&�R� �� رفت�  ب�! �&رح��! بعد',
                    process_complete: 'پا�Rا�  فرا�R� د',
                    process_notes: '�Rادداشت (اخت�Rار�R)',
                    status_active: 'فعا�',
                    empty_process_templates: '�ا�ب فرا�R� د�R تعر�Rف � شد�!.',
                    empty_process_instances: '� �&��� �!�Rا�R در حا� اجرا � �Rست.',
                    all_templates: '�!�&�! �ا�ب�R�!ا',
                    process_min_one_stage: 'حدا�� �Rک �&رح��! ��ارد ک� �Rد.',
                    process_start_from_ticket: 'شر��ع فرا�R� د برا�R ا�R�  ت�Rکت'
                },
                en: {
                    page_title: 'Kaya Staff Portal | Kaya Exchange',
                    login_title: 'Kaya Staff Portal',
                    login_sub: 'Sign in to the portal from anywhere',
                    login_email: 'Email',
                    login_email_or_username: 'Email or username',
                    login_password: 'Password',
                    login_btn: 'Sign in',
                    login_loading: 'Signing in...',
                    login_totp_title: 'Two-Factor Authentication',
                    login_totp_sub: 'Enter the 6-digit code from your Google Authenticator app.',
                    login_totp_code_ph: '6-digit code',
                    login_totp_verify: 'Verify & sign in',
                    login_back: 'Back',
                    login_err_connect: 'Could not connect to server. Ensure the backend (node server.js) is running and you opened the panel from the same URL (e.g. http://localhost:3002).',
                    login_err_server_html: 'Server returned non-JSON. Run node server.js from the backend folder.',
                    login_err_invalid: 'Invalid server response.',
                    login_err_429: 'Too many requests. Please wait a minute and try again.',
                    login_err_fail: 'Sign in failed',
                    login_totp_for: 'Enter the 6-digit Google Authenticator code for',
                    login_totp_enter: '',
                    login_totp_code_required: 'Please enter the 6-digit code',
                    login_totp_retry: 'Please sign in again from step 1',
                    login_totp_bad: 'Invalid or expired code',
                    login_cant_signin: "Can't sign in?",
                    login_contact_support: 'Contact support',
                    login_forgot_password: 'Forgot password',
                    forgot_title: 'Reset password',
                    forgot_sub: 'Enter your account email; if an account exists, a reset link will be sent.',
                    forgot_send: 'Send reset link',
                    forgot_success_msg: 'If an account exists with this email, a reset link has been sent.',
                    reset_title: 'Set new password',
                    reset_sub: 'Enter your new password and confirm it.',
                    reset_new_password: 'New password',
                    reset_confirm_password: 'Confirm password',
                    reset_btn: 'Change password & sign in',
                    reset_err_match: 'Password and confirmation do not match.',
                    reset_err_length: 'Password must be at least 6 characters.',
                    lang_fa: 'فارس�R',
                    lang_en: 'English',
                    lang_tr: 'Turkish',
                    lang_label: 'Language',
                    nav_dashboard: 'Dashboard',
                    nav_communications: 'Communications',
                    nav_conversations: 'Conversations',
                    nav_customers: 'Customers',
                    nav_tickets: 'Internal tickets',
                    nav_organization: 'Organization',
                    nav_tasks: 'Tasks',
                    nav_processes: 'Business processes',
                    nav_departments: 'Departments',
                    nav_users: 'Users',
                    nav_branches: 'Branches',
                    nav_supervision: 'Supervision (Owner)',
                    nav_staff_activity: 'Logins & online status',
                    nav_settings: 'Settings',
                    nav_profile: 'My profile',
                    nav_internal_chat: 'Internal chat',
                    nav_announcements: 'Announcements',
                    nav_whatsapp: 'WhatsApp connection',
                    nav_rates: 'Exchange rates',
                    nav_services: 'Exchange services',
                    nav_panel_settings: 'Panel appearance',
                    skip_to_content: 'Skip to content',
                    loading_panel: 'Loading panel...',
                    header_search: 'Search conversations, customers...',
                    header_search_aria: 'Search conversations and customers',
                    header_logout: 'Log out',
                    logo_kaya: 'Kaya Exchange',
                    page_dashboard: 'Dashboard',
                    dashboard_welcome: 'Key information and quick access to panel sections',
                    dashboard_sections: 'Panel sections',
                    dashboard_stat_online: 'Staff online',
                    dashboard_stat_logins_today: 'Logins today',
                    dashboard_stat_conversations: 'Open conversations',
                    dashboard_stat_unread: 'Unread',
                    dashboard_stat_tickets: 'Open tickets',
                    dashboard_stat_customers: 'Customers',
                    dashboard_stat_tasks: 'Tasks pending',
                    dashboard_stat_messages_today: 'Messages today',
                    dashboard_stat_announcements: 'Unread announcements',
                    dashboard_quick_new_conv: 'New conversation',
                    dashboard_quick_new_customer: 'Add customer',
                    dashboard_quick_new_ticket: 'New ticket',
                    dashboard_refresh: 'Refresh',
                    page_conversations: 'Conversations',
                    page_customers: 'Customers',
                    page_departments: 'Departments',
                    page_users: 'Users',
                    page_tickets: 'Internal tickets',
                    page_tasks: 'Tasks',
                    page_processes: 'Business process manager',
                    page_profile: 'My profile',
                    page_announcements: 'Announcements',
                    page_internal_chat: 'Internal chat',
                    page_branches: 'Branches',
                    page_staff_activity: 'Staff logins & online status',
                    page_supervision: 'Supervision & monitoring (Owner)',
                    page_whatsapp: 'WhatsApp connection',
                    page_rates: 'Exchange rate settings',
                    page_panel_settings: 'Panel appearance',
                    panel_settings_intro: 'Set site name, logo, favicon and footer text. Only visible to admins.',
                    panel_site_name: 'Site name',
                    panel_logo_url: 'Logo URL',
                    panel_favicon_url: 'Favicon URL',
                    panel_login_title: 'Login page title',
                    panel_page_title: 'Browser tab title',
                    panel_footer_text: 'Footer text',
                    panel_live_preview: 'Live preview',
                    panel_section_branding: 'Branding',
                    panel_section_titles: 'Titles',
                    panel_section_footer: 'Footer',
                    panel_footer_style: 'Footer style',
                    panel_footer_style_accent: 'Accent bar (default)',
                    panel_footer_style_minimal: 'Minimal',
                    panel_footer_style_compact: 'Compact',
                    panel_footer_style_line: 'Simple line',
                    panel_footer_style_hint: 'Choose the appearance of the bottom bar.',
                    panel_hide_footer: 'Hide footer (hide bottom bar text)',
                    panel_section_email: 'Email (SMTP) settings',
                    panel_email_desc: 'Welcome emails, password reset and login notifications. If empty, server env vars are used.',
                    panel_smtp_host: 'Server (Host)',
                    panel_smtp_port: 'Port',
                    panel_smtp_user: 'Username',
                    panel_smtp_pass: 'Password',
                    panel_smtp_from: 'From address',
                    panel_smtp_from_name: 'From name',
                    panel_smtp_secure: 'Use SSL/TLS (port 465)',
                    panel_email_login_notification: 'Send login notification email to user',
                    panel_test_email_label: 'Send test email',
                    panel_test_email_btn: 'Send test',
                    panel_section_company_emails: 'Company emails',
                    panel_company_emails_desc: 'Register and manage company emails (e.g. support@, info@). You can assign a user and send them login credentials.',
                    panel_company_email_add: 'Add company email',
                    panel_company_email_address: 'Email address',
                    panel_company_email_label: 'Label / Purpose',
                    panel_company_email_assigned: 'Assign to user',
                    panel_company_email_password: 'Password',
                    panel_company_email_password_hint: 'Leave empty = no change (when editing)',
                    panel_company_email_notes: 'Notes',
                    panel_company_email_active: 'Active',
                    panel_company_email_has_pass: 'Pass',
                    panel_company_email_actions: 'Actions',
                    panel_company_emails_empty: 'No company emails yet.',
                    panel_company_email_send_creds: 'Send credentials',
                    btn_cancel: 'Cancel',
                    panel_section_visibility: 'Section visibility',
                    panel_visibility_desc: 'Hidden sections are not shown in the menu or anywhere on the site. Checked = visible.',
                    user_perms_select_all: 'All access',
                    user_perms_select_none: 'None',
                    user_perms_group_communications: 'Communications',
                    user_perms_group_organization: 'Organization',
                    user_perms_group_settings: 'Settings',
                    user_perms_group_special: 'Special access',
                    user_perms_all: 'All',
                    user_perms_none: 'None',
                    section_manage_tickets: 'Manage tickets (delete/archive)',
                    panel_preview: 'Preview',
                    page_customer_detail: 'Customer history',
                    btn_send: 'Send',
                    btn_save: 'Save',
                    btn_back: 'Back',
                    btn_apply: 'Apply',
                    btn_edit: 'Edit',
                    btn_delete: 'Delete', btn_archive: 'Archive',
                    msg_placeholder: 'Type your message...',
                    voice_record: 'Voice message',
                    voice_stop: 'Stop recording',
                    voice_no_support: 'Voice recording not supported in this browser',
                    voice_no_permission: 'Microphone access denied',
                    back_to_customers: '� � Back to customers',
                    back_to_list: '� � Back to list',
                    loading: 'Loading...',
                    empty_conv: 'No conversations yet.',
                    empty_customers: 'No customers found.',
                    empty_dept: 'No departments found.',
                    empty_users: 'No users found.',
                    empty_tickets: 'No tickets found.',
                    empty_tasks: 'No tasks found.',
                    empty_branches: 'No branches added yet.',
                    totp_banner: 'Enable two-factor authentication (Google Authenticator) for better security.',
                    totp_enable: 'Enable',
                    totp_later: 'Later',
                    profile_intro: 'Name, phone and password are editable. Email and department are set by admin.',
                    profile_avatar: 'Profile image (URL)',
                    profile_name: 'Name',
                    profile_email: 'Email',
                    profile_email_readonly: 'Email (read-only)',
                    profile_dept_readonly: 'Department (read-only)',
                    profile_phone: 'Phone',
                    profile_password_new: 'New password (optional)',
                    profile_password_ph: 'Leave blank to keep current',
                    profile_save: 'Save changes',
                    profile_editable_section: 'Editable information',
                    profile_readonly_section: 'Read-only information',
                    profile_phone_ph: 'Phone number',
                    profile_username: 'Username',
                    profile_first_name: 'First name',
                    profile_last_name: 'Last name',
                    profile_date_of_birth: 'Date of birth',
                    login_email_or_username: 'Email or username',
                    profile_totp_title: 'Two-Factor Authentication (Google Authenticator)',
                    profile_totp_desc: 'Sign in more securely with Google Authenticator. You can enable or disable it from this panel.',
                    totp_active: 'Enabled',
                    totp_inactive: 'Disabled',
                    totp_disable_btn: 'Disable',
                    totp_setup_btn: 'Enable with Google Authenticator',
                    modal_totp_setup: 'Enable Google Authenticator',
                    modal_totp_scan: 'Scan the QR code below with Google Authenticator (or enter the key manually):',
                    modal_totp_secret: 'Manual key:',
                    modal_totp_confirm: 'Confirm & enable',
                    modal_totp_disable: 'Disable two-factor authentication',
                    modal_totp_enter_pw: 'Enter your password:',
                    modal_totp_password_ph: 'Password',
                    modal_user_edit: 'Edit user access & status',
                    modal_user_active: 'Account active (uncheck = blocked)',
                    user_delete_transfer: 'Delete & transfer data',
                    user_delete_confirm_title: 'Delete user & transfer data',
                    user_transfer_to: 'Transfer conversations, tasks, tickets and processes to:',
                    user_delete_confirm_btn: 'Delete & transfer',
                    user_deleted_transferred: 'User deactivated and data transferred',
                    user_delete_permanent_label: 'Permanently delete from system (cannot be undone)',
                    user_permanent_deleted: 'User permanently deleted',
                    modal_user_perms: 'Section access:',
                    modal_ann_title: 'Important notice',
                    modal_ann_gotit: 'Got it',
                    footer_text: 'Kaya Exchange — Staff Portal',
                    section_conversations: 'Conversations',
                    section_customers: 'Customers',
                    section_tickets: 'Tickets',
                    section_tasks: 'Tasks',
                    section_departments: 'Departments',
                    section_users: 'Users',
                    section_branches: 'Branches',
                    section_supervision: 'Supervision (Owner)',
                    section_staff_activity: 'Logins & online',
                    section_announcements: 'Announcements',
                    section_internal_chat: 'Internal chat',
                    section_whatsapp: 'WhatsApp connection',
                    section_rates: 'Exchange rates (ticker)',
                    section_services: 'Exchange services',
                    customer_notes: 'Reports & notes',
                    customer_notes_intro: 'Save a note or report about this customer to refer back later.',
                    customer_note_add: 'Add report / note',
                    customer_note_ph: 'Note or report text...',
                    section_processes: 'Business processes',
                    page_services: 'Exchange services',
                    services_intro: 'Define services your exchange offers (buy/sell, transfer, etc.).',
                    service_add: 'Add service',
                    service_name: 'Service name',
                    service_code: 'Code (optional)',
                    service_category: 'Category (optional)',
                    service_description: 'Description (optional)',
                    service_active: 'Active',
                    section_manage_users: 'User management (edit/block)',
                    status_online: 'Online',
                    status_away: 'Away',
                    status_busy: 'Busy',
                    status_offline: 'Offline',
                    err_generic: 'Error',
                    saved: 'Saved', save_changes: 'Save changes',
                    toast_ticket_created: 'Ticket created',
                    toast_dept_added: 'Department added',
                    toast_user_added: 'User added',
                    toast_branch_added: 'Branch added',
                    toast_branch_updated: 'Branch updated',
                    toast_reply_sent: 'Reply sent',
                    toast_task_created: 'Task created',
                    toast_status_updated: 'Status updated',
                    toast_update_added: 'Update added',
                    toast_totp_enabled: 'Two-factor authentication enabled',
                    toast_totp_disabled: 'Two-factor authentication disabled',
                    toast_rates_saved: 'Rate adjustments saved.',
                    no_branch: 'No branch',
                    no_dept: 'No department',
                    no_user: 'Select user',
                    no_user_filter: 'All staff',
                    all_branches: 'All branches',
                    all_statuses: 'All statuses',
                    all_depts: 'All departments',
                    ticker_loading: 'Loading prices...',
                    ticker_updated: 'Last updated:',
                    ticker_outside_hours: 'Rates update 06:00�20:00 Tehran time � every 10 min',
                    ticker_last: 'Last updated:', ticker_current_time: 'Current time',
                    dept_branch: 'Branch', dept_name: 'Department name', dept_desc: 'Description', dept_keywords: 'Keywords (comma-separated)', add_dept: 'Add department', dept_intro: 'Departments are used for auto-assigning conversations based on keywords.',
                    dept_color: 'Color', dept_is_default: 'Default (unmatched conversations)', dept_edit_hint: 'Edit the fields and click Save to update.', toast_dept_updated: 'Department updated', dept_list_title: 'Departments',
                    dept_ph_name: 'e.g. Technical support', dept_ph_optional: 'Optional', dept_ph_keywords: 'e.g. issue, support',
                    users_intro: 'Only the owner or users with "User management" access can create users and edit permissions.',
                    label_name: 'Name', label_email: 'Email', label_password: 'Password', label_role: 'Role', label_dept: 'Department', label_branch: 'Branch',
                    user_ph_name: 'Full name', user_ph_pass: 'At least 6 characters', add_user: 'Add user', role_agent: 'Agent', role_manager: 'Manager', role_admin: 'Admin',
                    ticket_title: 'Ticket title', ticket_desc: 'Description', ticket_priority: 'Priority', create_ticket: 'Create ticket', ticket_ph_subject: 'Subject', ticket_ph_search: 'Search number or title...', tickets_intro: 'Official section for submitting and tracking requests. Each ticket has a unique number.', overdue: 'Overdue', filter_all_status: 'All statuses', filter_all_priority: 'All priorities', sort_newest: 'Newest', sort_oldest: 'Oldest', sort_priority: 'By priority', sort_by_name: 'By name', sort_by_last_contact: 'Last contact', customer_quick_chat: 'Start chat', customer_quick_edit: 'Edit customer',
                    reply_to_ticket: 'Reply to ticket', reply_ph: 'Reply text...', file_attach: 'Attach file (optional)', send_reply: 'Send reply',
                    priority_normal: 'Normal', priority_high: 'High', priority_low: 'Low', priority_urgent: 'Urgent',
                    tasks_intro: 'Track tasks assigned to staff or departments.',
                    new_task: 'New task', label_title: 'Title', task_ph_title: 'Task title', task_ph_desc: 'Description', assign_to: 'Assign to',
                    assign_user: 'User', assign_dept: 'Department', select_dept: 'Select department', due_date: 'Due date (optional)', filter: 'Filter',
                    all_statuses: 'All statuses', status_pending: 'Pending', status_in_progress: 'In progress', status_done: 'Done', status_cancelled: 'Cancelled',
                    add_task: 'Create task', add_update: 'Add update / report', update_ph: 'Write your status or report...', save_update: 'Save update',
                    change_status: 'Change status', creator: 'Creator', updates: 'Updates', no_updates: 'No updates yet.',
                    ann_send_title: 'Send announcement to staff', ann_recipient: 'Recipient', ann_all: 'All staff', ann_one_dept: 'One department', ann_one_user: 'One user',
                    ann_select: 'Select', ann_title: 'Title', ann_body: 'Message', ann_ph_title: 'Announcement title', ann_ph_body: 'Message text...',
                    ann_important: 'Important (popup and sound for recipient)', send_ann: 'Send announcement',
                    ann_intro: 'View and manage general, department and personal announcements.', ann_tab_all: 'All', ann_tab_general: 'General', ann_tab_department: 'Department', ann_tab_personal: 'Personal', ann_from: 'From', ann_to: 'To', ann_sent_at: 'Date & time:', ann_delete: 'Delete announcement', ann_delete_confirm: 'Delete this announcement?',
                    new_chat: 'New conversation', select_conversation: 'Select conversation', msg_ph_short: 'Message...', attach_file: 'Attach file',
                    file_allow_download: 'Allow download and save', file_view_only: 'View only in chat',
                    start_chat_with: 'Start conversation with', start_chat: 'Start chat', internal_chat_open_full: 'Open full chat', close: 'Close', chat_minimize: 'Minimize', chat_expand: 'Expand', quick_reply_hi: 'Hi', quick_reply_gotit: 'Got it', quick_reply_later: 'Will reply later', quick_reply_checking: 'Checking', start_chat_hint: 'Start the conversation', cancel: 'Cancel',
                    voice_call: 'Voice call', video_call: 'Video call', incoming_voice_call: 'Incoming voice call...', incoming_video_call: 'Incoming video call...',
                    calling_voice: 'Calling...', calling_video: 'Video calling...', in_call: 'In call', accept_call: 'Accept', reject_call: 'Reject', cancel_call: 'Cancel call', end_call: 'End call',
                    call_rejected: 'Call rejected', user_offline: 'User is offline',
                    call_mute: 'Mute mic', call_unmute: 'Unmute mic', call_camera_off: 'Turn off camera', call_camera_on: 'Turn on camera',
                    call_connecting: 'Connecting...', call_connected: 'Connected', call_failed: 'Connection failed',
                    add_to_call: 'Add to call', add_to_call_subtitle: 'Select one or more people to add to the voice or video call', add_to_call_search: 'Search name...', add_to_call_select_all: 'All', add_to_call_invite_selected: 'Invite selected', invite_to_call: 'Invite to call',
                    select_multiple_hint: 'For group chat, select multiple users',
                    branch_intro: 'Branches are used for geographic separation and assigning users and conversations.', branch_name: 'Branch name', branch_city: 'City', branch_country: 'Country', branch_ph_name: 'e.g. Tehran office', branch_ph_city: 'e.g. Tehran', branch_ph_country: 'e.g. Iran', add_branch: 'Add branch', edit: 'Edit',
                    staff_online: 'Staff online', staff_intro: 'Recent logins and online staff � for managers and above', last_logins: 'Recent logins', staff_logins_today: 'Logins today', staff_online_hint: 'Click for activity details', staff_logins_hint: 'Last 50 logins', refresh: 'Refresh',
                    sup_performance: 'Performance summary', sup_conversations: 'Conversations', sup_internal_chats: 'Internal chats', sup_internal_chats_filter: 'Filter internal chats', sup_internal_chat_detail: 'Internal chat detail', sup_activity: 'Activity log', sup_branch_status: 'Branch / status', apply_filter: 'Apply filter',
                    sup_by_branch: 'By branch', sup_by_user: 'User performance (outgoing messages)', total_conversations: 'Total conversations', outgoing_messages: 'Outgoing messages',
                    th_branch: 'Branch', th_city_country: 'City/Country', th_conv_count: 'Conversations', th_user: 'User', th_email: 'Email', th_status: 'Status', th_last_login: 'Last login',
                    th_customer: 'Customer', th_dept: 'Department', th_assignee: 'Assignee', th_time: 'Time', th_action: 'Action', th_summary: 'Summary', th_login_time: 'Login time',
                    all_actions: 'All actions', action_message_sent: 'Message sent', action_conv_assigned: 'Conversation assigned', status_open: 'Open', status_closed: 'Closed', status_resolved: 'Resolved', status_archived: 'Archived',
                    whatsapp_checking: 'Checking...', whatsapp_scan_qr: 'Scan QR code with WhatsApp mobile app', whatsapp_start_btn: 'Start WhatsApp Gateway', whatsapp_start_client_btn: 'Start WhatsApp',
                    whatsapp_server_err: 'Backend server is not responding correctly.', whatsapp_gateway_off: 'Gateway is not running. Click the button below to start it.',
                    whatsapp_status: 'WhatsApp status:', whatsapp_connected: 'Connected �S', whatsapp_disconnected: 'Disconnected', redis: 'Redis', active: 'Active', inactive: 'Inactive', done_msg: 'Done',
                    whatsapp_intro: 'WhatsApp messages are automatically saved in conversations. Auto-assignment to departments is based on keywords.',
                    whatsapp_open_web: 'Open WhatsApp Web', whatsapp_manage_convs: 'Manage conversations', whatsapp_disconnect_btn: 'Disconnect WhatsApp',
                    whatsapp_connection_title: 'Connection status', whatsapp_qr_expiry: 'Code valid ~60s. After scanning, wait 10–60 seconds; page will update automatically.', whatsapp_scan_waiting: 'Checking connection... Please wait.', whatsapp_syncing: 'Scanned. Syncing with WhatsApp… wait a few seconds.', whatsapp_after_scan_trouble: 'If nothing happens after scan: check server internet/WhatsApp access; check Gateway logs (error.log) on server.', whatsapp_qr_not_ready: 'QR not ready yet. Click "Start WhatsApp" and wait a few seconds.', whatsapp_phone_cannot_connect_title: 'If your phone shows "New device cannot be connected" or "Try again later":', whatsapp_phone_cannot_connect_hint: 'This is a WhatsApp limit, not the panel. After each disconnect, WhatsApp often blocks new device links for 1–5 minutes. Wait, check internet and VPN; in WhatsApp mobile see Linked devices (max 4) and remove one if needed. Then refresh the QR and scan again.', whatsapp_refresh_status: 'Refresh status', whatsapp_last_connection: 'Last connection info', whatsapp_status_label: 'Status', whatsapp_number_label: 'Number', whatsapp_connection_result: 'Connection',
                    whatsapp_welcome_title: 'Auto-reply to first message', whatsapp_welcome_hint: 'When someone messages you for the first time, this text is sent automatically. Empty = disabled', whatsapp_welcome_enabled: 'Enabled', whatsapp_welcome_ph: 'Hello! Welcome to Kaya Exchange. How can we help you?',
                    whatsapp_dept_routing: 'Auto-assign to department', whatsapp_dept_routing_hint: 'Based on keywords in the message, the conversation is routed to the relevant department.', whatsapp_unassigned: 'Unassigned conversations', whatsapp_unassigned_hint: 'These conversations need department or assignee assignment.',
                    rates_intro: 'Prices are fetched from API and shown in the bottom bar for everyone.', rates_adjust_type: 'Adjustment type',
                    rates_none: 'No change', rates_fixed: 'Fixed', rates_delta: '± Amount', rates_percent: '± Percent', rates_adjustments: 'Rate adjustments', rates_currency: 'Currency', rates_current: 'Current price (bar)', rates_value: 'Value', rates_ph_percent: 'e.g. 2 or -1', rates_ph_delta: 'e.g. 500 or -200', rates_ph_fixed: 'Fixed price', rates_no_access: 'You do not have access to this section.', rates_manage_currencies: 'Manage currencies', rates_manage_currencies_hint: 'Add, edit or remove currencies shown in rates and ticker. Only for users with rates permission.', rates_add_currency: 'Add currency', rates_edit_currency: 'Edit currency', rates_currency_key: 'Currency key (e.g. usd)', rates_currency_key_hint: 'Lowercase letters and numbers only; read-only when editing.', rates_currency_label: 'Display name', rates_currency_apikeys: 'API keys (comma-separated)', rates_currency_apikeys_ph: 'e.g. usd_sell, usd_buy', rates_currency_apikeys_hint: 'Field names from Navasan API response.', rates_currency_key_required: 'Currency key is required', rates_no_currencies: 'No currencies defined. Add one with «Add currency».', rates_delete_currency_confirm: 'Delete this currency? Its adjustments and ticker visibility will be removed too.',
                    no_data: 'No data.', loading_err: 'Error loading.', select_user: 'Select user',
                    empty_conv_list: 'No conversations. Click "New conversation".', chat: 'Chat', empty_internal_msgs: 'No messages yet.', file: 'File',
                    conv_new: 'New conversation', conv_select_customer: 'Select customer', conv_assign_me: 'Assign to me', conv_supervision_title: 'Manager oversight',
                    conv_page_desc: 'Manage customer conversations, respond and assign to departments.',
                    conv_search_ph: 'Search name or phone...', conv_list_title: 'Conversations', more_filters: 'More filters',
                    filter_all: 'All', filter_active_only: 'Active only', filter_blocked_only: 'Blocked only', filter_unread: 'Unread', filter_unanswered: 'Unanswered', filter_open: 'Open', conv_tab_mine: 'Assigned to me',
                    whatsapp_unanswered_title: 'Unanswered alert & escalation', whatsapp_unanswered_hint: 'When a customer messages and no one replies, an alert is sent after the specified time. If still unanswered, the conversation is escalated to support.',
                    whatsapp_alert_after: 'Alert after (minutes)', whatsapp_escalate_after: 'Escalate after (minutes)', whatsapp_escalation_dept: 'Target department (empty = default support)',
                    empty_no_logins: 'No logins recorded yet.', no_staff_online: 'No staff online.', login_err_load: 'Error loading logins.',
                    required_name_email_pass: 'Name, email and password are required', select_user_first: 'Please select a user', select_conversation_first: 'Please select a conversation',
                    enter_text_or_file: 'Enter text or attach a file', manage_users_required: 'User management access required',
                    branch_name_required: 'Branch name is required', edit_branch_hint: 'Edit the fields and click "Add branch" to update.',
                    ticket_title_required: 'Ticket title is required', reply_or_file_required: 'Reply text or a file is required', task_title_required: 'Task title is required',
                    select_assignee: 'Select user or department', task_update_required: 'Update text is required', dept_name_required: 'Department name is required',
                    enter_password: 'Enter password', enter_6_digit: 'Enter the 6-digit code',
                    creator_label: 'Creator:', assignee_label: 'Assigned to:', due_label: 'Due:', no_reply: 'No replies yet.', conversation: 'Conversation', history: 'History:',
                    by_dept: 'By department', by_user: 'By user', pending_count: 'Pending', in_progress_count: 'In progress', done_count: 'Done',
                    customer: 'Customer', no_conv_history: 'No conversations yet.', blocked: 'Blocked', edit_access: 'Edit / access', view_activity: 'View activity',
                    usd: 'USD', eur: 'EUR', gbp: 'GBP', try: 'TRY', aed: 'AED', rub: 'RUB', azn: 'AZN', cny: 'CNY', gold: 'Gold (g)',
                    processes_intro: 'Define process templates and track running instances.',
                    process_templates: 'Process templates',
                    process_instances: 'Running instances',
                    process_add_template: 'Add process template',
                    process_template_name: 'Template name',
                    process_template_desc: 'Description',
                    process_stages: 'Stages (in order)',
                    process_stage_name: 'Stage name',
                    process_add_stage: 'Add stage',
                    process_start_instance: 'Start instance',
                    process_instance_title: 'Instance title',
                    process_current_stage: 'Current stage',
                    process_advance: 'Complete & go to next stage',
                    process_complete: 'Complete process',
                    process_notes: 'Notes (optional)',
                    status_active: 'Active',
                    empty_process_templates: 'No process templates defined.',
                    empty_process_instances: 'No running instances.',
                    all_templates: 'All templates',
                    process_min_one_stage: 'Add at least one stage.',
                    process_start_from_ticket: 'Start process for this ticket',
                    panel_section_languages: 'Site languages',
                    panel_section_languages_desc: 'Languages available on the login page and panel menu. In single-language mode the language switcher is hidden; with multiple languages users can switch.',
                    panel_language_mode: 'Language mode',
                    panel_language_mode_single: 'Single (Persian only)',
                    panel_language_mode_single_en: 'Single (English only)',
                    panel_language_mode_single_tr: 'Single (Turkish only)',
                    panel_language_mode_bilingual: 'Two (Persian + English)',
                    panel_language_mode_bilingual_fa_tr: 'Two (Persian + Turkish)',
                    panel_language_mode_bilingual_en_tr: 'Two (English + Turkish)',
                    panel_language_mode_trilingual: 'Three (Persian + English + Turkish)',
                    panel_default_language: 'Default language',
                    panel_default_language_desc: 'Initial language for new users or when no language is selected.',
                    lang_fa: 'فارسی',
                    lang_en: 'English',
                    lang_tr: 'Türkçe',
                    panel_language_hint_single: 'Only Persian is shown on login and in the menu.',
                    panel_language_hint_single_en: 'Only English is shown on login and in the menu.',
                    panel_language_hint_single_tr: 'Only Turkish is shown on login and in the menu.',
                    panel_language_hint_bilingual: 'Persian and English; users can switch language.',
                    panel_language_hint_bilingual_fa_tr: 'Persian and Turkish; users can switch language.',
                    panel_language_hint_bilingual_en_tr: 'English and Turkish; users can switch language.',
                    panel_language_hint_trilingual: 'Persian, English and Turkish; users can switch language.',
                    panel_section_visibility: 'Section visibility',
                    panel_visibility_desc: 'Sections you hide are not shown in the menu or anywhere on the site. Checked = visible.'
                },
                tr: {}
            };
            if (window.__I18N_FA) { for (var k in window.__I18N_FA) I18N.fa[k] = window.__I18N_FA[k]; }
            if (window.__I18N_TR) { for (var k in window.__I18N_TR) I18N.tr[k] = window.__I18N_TR[k]; }
            window.LANG = LANG;
            window.t = function(k) {
                if (LANG === 'fa' && window.__I18N_FA && window.__I18N_FA[k] !== undefined) return window.__I18N_FA[k];
                return (I18N[LANG] && I18N[LANG][k]) || (I18N.fa && I18N.fa[k]) || (I18N.en && I18N.en[k]) || (I18N.tr && I18N.tr[k]) || k;
            };
            window.setLang = function(l) {
                var supported = window.SUPPORTED_LANGUAGES || ['fa', 'en', 'tr'];
                if (supported.indexOf(l) < 0) l = supported[0] || 'fa';
                LANG = l;
                localStorage.setItem('crm_lang', l);
                document.documentElement.lang = (l === 'en' ? 'en' : l === 'tr' ? 'tr' : 'fa');
                document.documentElement.dir = (l === 'fa' ? 'rtl' : 'ltr');
                document.body.classList.toggle('ltr', l !== 'fa');
                document.querySelectorAll('.lang-switch button[data-lang], .lang-switch button[onclick*="setLang"]').forEach(function(btn) {
                    var dataLang = btn.getAttribute('data-lang');
                    var onclick = btn.getAttribute('onclick') || '';
                    if (!dataLang && onclick.indexOf("setLang(") >= 0) {
                        var m = onclick.match(/setLang\s*\(\s*['"]([a-z]+)['"]/);
                        dataLang = m ? m[1] : null;
                    }
                    var active = (dataLang && dataLang === l);
                    btn.classList.toggle('active', active);
                    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
                    btn.style.display = (dataLang && supported.indexOf(dataLang) < 0) ? 'none' : '';
                });
                var lbl = document.getElementById('langDropdownLabel');
                if (lbl) lbl.textContent = (l === 'fa' ? 'FA' : l === 'tr' ? 'TR' : 'EN');
                if (typeof applyTranslations === 'function') applyTranslations();
                try { document.title = t('page_title'); } catch (_) {}
            };
            window.applyTranslations = function() {
                document.querySelectorAll('[data-i18n]').forEach(function(el) {
                    var k = el.getAttribute('data-i18n');
                    if (k && t(k)) el.textContent = t(k);
                });
                document.querySelectorAll('[data-i18n-ph]').forEach(function(el) {
                    var k = el.getAttribute('data-i18n-ph');
                    if (k && t(k)) el.placeholder = t(k);
                });
                document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
                    var k = el.getAttribute('data-i18n-title');
                    if (k && t(k)) el.title = t(k);
                });
                document.querySelectorAll('[data-i18n-aria-label]').forEach(function(el) {
                    var k = el.getAttribute('data-i18n-aria-label');
                    if (k && t(k)) el.setAttribute('aria-label', t(k));
                });
            };
            window.SUPPORTED_LANGUAGES = window.SUPPORTED_LANGUAGES || ['fa', 'en', 'tr'];
            window.applySupportedLanguages = function(supported, defaultLanguage) {
                window.SUPPORTED_LANGUAGES = Array.isArray(supported) && supported.length ? supported : ['fa', 'en', 'tr'];
                var cur = localStorage.getItem('crm_lang') || 'fa';
                if (window.SUPPORTED_LANGUAGES.indexOf(cur) < 0) {
                    cur = (defaultLanguage && window.SUPPORTED_LANGUAGES.indexOf(defaultLanguage) >= 0) ? defaultLanguage : (window.SUPPORTED_LANGUAGES[0] || 'fa');
                    localStorage.setItem('crm_lang', cur);
                }
                if (typeof setLang === 'function') setLang(cur);
                document.querySelectorAll('.lang-switch').forEach(function(wrap) {
                    if (window.SUPPORTED_LANGUAGES.length <= 1) wrap.style.display = 'none';
                    else wrap.style.display = '';
                });
            };
        })();
        const API = '';
        let token = localStorage.getItem('crm_token');
        let currentConvId = null;
        let currentUser = null;
        let ratesInterval = null;
        let tickerTimeInterval = null;
        let presenceInterval = null;
        let staffActivityInterval = null;
        let socket = null;
        let loadConversationsDebounceTimer = null;
        function debouncedLoadConversations(ms) {
            ms = ms || 400;
            if (loadConversationsDebounceTimer) clearTimeout(loadConversationsDebounceTimer);
            loadConversationsDebounceTimer = setTimeout(function() {
                loadConversationsDebounceTimer = null;
                loadConversations();
            }, ms);
        }
        window.APP_TIMEZONE = 'Europe/Istanbul';
        window.navBadgeCounts = {};
        window.hasNewInternalChat = false;
        fetch((API || '') + '/api/panel-settings/public/languages').then(function(r){ return r.json(); }).then(function(data){
            if (data && data.supportedLanguages) window.applySupportedLanguages(data.supportedLanguages, data.defaultLanguage);
        }).catch(function(){});
        fetch((API || '') + '/api/config').then(function(r){ return r.json(); }).then(function(c){
            if (c && c.timezone) window.APP_TIMEZONE = c.timezone;
            if (c && c.supportUrl) {
                window.SUPPORT_URL = c.supportUrl;
                var setSupportLink = function(wrapId, linkId) {
                    var wrap = document.getElementById(wrapId);
                    var link = document.getElementById(linkId);
                    if (wrap && link) {
                        link.href = c.supportUrl;
                        link.target = c.supportUrl.startsWith('mailto:') ? '_self' : '_blank';
                        link.rel = c.supportUrl.startsWith('mailto:') ? '' : 'noopener';
                    }
                };
                setSupportLink('loginSupportWrap', 'loginSupportLink');
                setSupportLink('loginSupportWrapTotp', 'loginSupportLinkTotp');
            }
        }).catch(function(){});
        function updateNavBadges(stats) {
            if (stats) {
                window.navBadgeCounts.conversations = (stats.unreadConversations || 0);
                window.navBadgeCounts.tickets = (stats.ticketsOpen || 0);
                window.navBadgeCounts.tasks = (stats.tasksPending || 0);
                window.navBadgeCounts.announcements = (stats.unreadAnnouncements || 0);
            }
            if (window.hasNewInternalChat) window.navBadgeCounts['internal-chat'] = 1;
            document.querySelectorAll('.nav-link[data-page]').forEach(function(link) {
                var page = link.getAttribute('data-page');
                var oldBadge = link.querySelector('.nav-badge, .nav-badge-dot');
                if (oldBadge) oldBadge.remove();
                var n = window.navBadgeCounts[page] || 0;
                if (n > 0) {
                    var badge = document.createElement('span');
                    badge.className = n > 99 ? 'nav-badge-dot' : 'nav-badge';
                    badge.textContent = n > 99 ? '' : n;
                    link.appendChild(badge);
                }
            });
        }

        function headers() { return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }; }
        function timeAgo(d) {
            if (!d) return '';
            var date = d instanceof Date ? d : new Date(d);
            if (isNaN(date.getTime())) return '';
            var now = new Date();
            var sec = Math.floor((now - date) / 1000);
            if (sec < 60) return (LANG === 'fa' ? 'همین الان' : LANG === 'tr' ? 'Az önce' : 'Just now');
            var min = Math.floor(sec / 60);
            if (min < 60) return min + ' ' + (LANG === 'fa' ? 'دقیقه پیش' : LANG === 'tr' ? 'dk önce' : 'min ago');
            var hr = Math.floor(min / 60);
            if (hr < 24) return hr + ' ' + (LANG === 'fa' ? 'ساعت پیش' : LANG === 'tr' ? 'saat önce' : 'hr ago');
            var day = Math.floor(hr / 24);
            if (day < 7) return day + ' ' + (LANG === 'fa' ? 'روز پیش' : LANG === 'tr' ? 'gün önce' : 'days ago');
            return fmtTZ(d, 'date');
        }
        // فارسی: وقت تهران ایران و تاریخ شمسی. انگلیسی: وقت امارات و تقویم میلادی. ترکی: وقت استانبول ترکیه و تقویم میلادی.
        function fmtTZ(d, opts) {
            if (!d) return '';
            var date = d instanceof Date ? d : new Date(d);
            if (isNaN(date.getTime())) return '';
            var tz = (LANG === 'fa' ? 'Asia/Tehran' : LANG === 'tr' ? 'Europe/Istanbul' : 'Asia/Dubai');
            var locale = (LANG === 'fa' ? 'fa-IR' : LANG === 'tr' ? 'tr-TR' : 'en-GB');
            var base = { timeZone: tz };
            if (typeof opts === 'string') {
                if (opts === 'time') return new Intl.DateTimeFormat(locale, Object.assign({}, base, { hour: '2-digit', minute: '2-digit' })).format(date);
                if (opts === 'date') return new Intl.DateTimeFormat(locale, Object.assign({}, base, { dateStyle: 'short' })).format(date);
                if (opts === 'datetime') return new Intl.DateTimeFormat(locale, Object.assign({}, base, { dateStyle: 'short', timeStyle: 'short' })).format(date);
            }
            return new Intl.DateTimeFormat(locale, Object.assign({}, base, opts || {})).format(date);
        }

        function formatPrice(val) {
            if (val == null || val === '' || val === '�') return '�';
            var s = String(val).replace(/\d/g, function(d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
            var n = String(val).replace(/[^\d]/g, '');
            if (n.length > 3) {
                var out = ''; for (var i = n.length - 1, c = 0; i >= 0; i--, c++) { if (c && c % 3 === 0) out = ',' + out; out = n[i] + out; }
                return out.replace(/\d/g, function(d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
            }
            return s;
        }

        function getLocalHour() {
            try {
                var tz = window.APP_TIMEZONE || 'Europe/Istanbul';
                var h = new Intl.DateTimeFormat('en', { timeZone: tz, hour: 'numeric', hour12: false }).format(new Date());
                return parseInt(h, 10);
            } catch (e) { return 12; }
        }
        function isRatesWindow() {
            var h = getLocalHour();
            return h >= 6 && h < 20;
        }
        function formatChange(ch) {
            if (ch == null || ch === '') return '';
            var num = typeof ch === 'number' ? ch : parseFloat(String(ch));
            if (isNaN(num) || num === 0) return '';
            var s = Math.abs(num) >= 1000 ? Math.abs(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : String(Math.abs(num));
            var fa = '۰۱۲۳۴۵۶۷۸۹';
            var out = s.replace(/\d/g, function(d) { return fa[d]; });
            return (num > 0 ? '+' : '−') + out;
        }
        function formatTickerDateTime(updatedAtStr, timestampSec) {
            var d = new Date();
            var opts = { hour: '2-digit', minute: '2-digit', hour12: false };
            var iran = new Intl.DateTimeFormat('en-GB', Object.assign({}, opts, { timeZone: 'Asia/Tehran' })).format(d);
            var turkey = new Intl.DateTimeFormat('en-GB', Object.assign({}, opts, { timeZone: 'Europe/Istanbul' })).format(d);
            var uae = new Intl.DateTimeFormat('en-GB', Object.assign({}, opts, { timeZone: 'Asia/Dubai' })).format(d);
            var shamsi = '';
            try {
                var pf = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', calendar: 'persian', year: 'numeric', month: '2-digit', day: '2-digit' });
                var parts = pf.formatToParts(d);
                var y = (parts.find(function(p){ return p.type === 'year'; }) || {}).value || '';
                var m = (parts.find(function(p){ return p.type === 'month'; }) || {}).value || '';
                var day = (parts.find(function(p){ return p.type === 'day'; }) || {}).value || '';
                var yearNum = parseInt(y, 10);
                if (yearNum >= 1300 && yearNum <= 1500) shamsi = y + '/' + m + '/' + day;
                else shamsi = pf.format(d);
            } catch (e) {
                shamsi = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', calendar: 'persian', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
            }
            var miladi = '';
            try {
                miladi = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
            } catch (e) {
                miladi = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
            }
            var hijri = '';
            try {
                var hf = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' });
                var hParts = hf.formatToParts(d);
                var hy = (hParts.find(function(p){ return p.type === 'year'; }) || {}).value || '';
                var hm = (hParts.find(function(p){ return p.type === 'month'; }) || {}).value || '';
                var hd = (hParts.find(function(p){ return p.type === 'day'; }) || {}).value || '';
                var hYearNum = parseInt(hy, 10);
                if (hYearNum >= 1400 && hYearNum <= 1500) hijri = hm + '/' + hd + '/' + hy + ' AH';
                else hijri = hf.format(d) + ' AH';
            } catch (e) {
                try {
                    var hf2 = new Intl.DateTimeFormat('en-u-ca-islamic', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' });
                    hijri = hf2.format(d) + ' AH';
                } catch (e2) { hijri = '—'; }
            }
            return {
                iran: iran,
                turkey: turkey,
                uae: uae,
                shamsi: shamsi,
                miladi: miladi,
                hijri: hijri,
                label: t('ticker_current_time') || 'ساعت فعلی',
                iranLabel: t('ticker_iran') || 'ایران',
                turkeyLabel: t('ticker_turkey') || 'ترکیه',
                uaeLabel: t('ticker_uae') || 'امارات'
            };
        }
        async function fetchRates() {
            if (!token) return;
            var loadingEl = document.querySelector('.ticker-loading');
            var timesEl = document.getElementById('tickerTimes');
            var datesEl = document.getElementById('tickerDates');
            var itemsEl = document.getElementById('tickerItems');
            var res = await apiFetch('/api/rates');
            if (res.needLogin || !res.ok) return;
            var data = res.data;
            var items = (data && data.items) || [];
            var fmt = formatTickerDateTime(data.updatedAt, data.updatedAtTimestamp);
            if (loadingEl) loadingEl.style.display = 'none';
            if (timesEl) {
                timesEl.innerHTML = '<span class="ticker-dt-label">' + escapeHtml(fmt.label) + '</span>' +
                    '<span class="ticker-time-block"><span class="ticker-time-row"><span class="ticker-tz">' + escapeHtml(fmt.iranLabel) + '</span><span class="ticker-time">' + escapeHtml(fmt.iran) + '</span></span><span class="ticker-date-below">' + escapeHtml(fmt.shamsi) + '</span></span>' +
                    '<span class="ticker-sep">·</span>' +
                    '<span class="ticker-time-block"><span class="ticker-time-row"><span class="ticker-tz">' + escapeHtml(fmt.turkeyLabel) + '</span><span class="ticker-time">' + escapeHtml(fmt.turkey) + '</span></span><span class="ticker-date-below">' + escapeHtml(fmt.miladi) + '</span></span>' +
                    '<span class="ticker-sep">·</span>' +
                    '<span class="ticker-time-block"><span class="ticker-time-row"><span class="ticker-tz">' + escapeHtml(fmt.uaeLabel) + '</span><span class="ticker-time">' + escapeHtml(fmt.uae) + '</span></span><span class="ticker-date-below">' + escapeHtml(fmt.hijri) + '</span></span>';
                timesEl.style.display = '';
            }
            if (datesEl) { datesEl.style.display = 'none'; }
            if (itemsEl) {
                var trackEl = document.getElementById('tickerItemTrack');
                var itemsHtml = items.map(function(it) {
                    var ch = it.change;
                    var chClass = ch > 0 ? ' up' : ch < 0 ? ' down' : ' neutral';
                    var chText = formatChange(ch);
                    return '<span class="ticker-item"><span class="ticker-label">' + escapeHtml(it.label || rateLabel(it.key)) + '</span><span class="ticker-value">' + escapeHtml(formatPrice(it.value)) + '</span>' + (chText ? '<span class="ticker-change' + chClass + '">' + escapeHtml(chText) + '</span>' : '') + '</span>';
                }).join('');
                if (trackEl && items.length > 0) {
                    var fullSet = itemsHtml + itemsHtml;
                    var copyCount = 2;
                    var isDesktop = window.innerWidth > 768;
                    var maxCopies = isDesktop ? 24 : 12;
                    trackEl.innerHTML = fullSet;
                    while (copyCount < maxCopies) {
                        var trackW = trackEl.scrollWidth;
                        var containerW = itemsEl.clientWidth || 400;
                        if (trackW >= containerW * 2.5) break;
                        fullSet = fullSet + itemsHtml;
                        trackEl.innerHTML = fullSet;
                        copyCount++;
                    }
                    itemsEl.classList.remove('ticker-auto-scroll');
                    requestAnimationFrame(function() {
                        var trackWidth = trackEl.scrollWidth;
                        var containerWidth = itemsEl.clientWidth || 1;
                        var step = (100 / copyCount);
                        if (isDesktop && items.length > 0) {
                            itemsEl.classList.add('ticker-auto-scroll');
                            trackEl.style.setProperty('--ticker-step', '-' + step + '%');
                        } else if (trackWidth > containerWidth) {
                            itemsEl.classList.add('ticker-auto-scroll');
                            trackEl.style.setProperty('--ticker-step', '-' + step + '%');
                        } else {
                            itemsEl.classList.remove('ticker-auto-scroll');
                        }
                    });
                } else if (trackEl) {
                    trackEl.innerHTML = itemsHtml;
                } else {
                    itemsEl.innerHTML = itemsHtml;
                }
            }
        }

        function updateTickerTimeOnly() {
            var timesEl = document.getElementById('tickerTimes');
            if (!timesEl || timesEl.style.display === 'none') return;
            var fmt = formatTickerDateTime();
            timesEl.innerHTML = '<span class="ticker-dt-label">' + escapeHtml(fmt.label) + '</span>' +
                '<span class="ticker-time-block"><span class="ticker-time-row"><span class="ticker-tz">' + escapeHtml(fmt.iranLabel) + '</span><span class="ticker-time">' + escapeHtml(fmt.iran) + '</span></span><span class="ticker-date-below">' + escapeHtml(fmt.shamsi) + '</span></span>' +
                '<span class="ticker-sep">·</span>' +
                '<span class="ticker-time-block"><span class="ticker-time-row"><span class="ticker-tz">' + escapeHtml(fmt.turkeyLabel) + '</span><span class="ticker-time">' + escapeHtml(fmt.turkey) + '</span></span><span class="ticker-date-below">' + escapeHtml(fmt.miladi) + '</span></span>' +
                '<span class="ticker-sep">·</span>' +
                '<span class="ticker-time-block"><span class="ticker-time-row"><span class="ticker-tz">' + escapeHtml(fmt.uaeLabel) + '</span><span class="ticker-time">' + escapeHtml(fmt.uae) + '</span></span><span class="ticker-date-below">' + escapeHtml(fmt.hijri) + '</span></span>';
        }
        function startRatesInterval() {
            if (ratesInterval) clearInterval(ratesInterval);
            if (tickerTimeInterval) clearInterval(tickerTimeInterval);
            fetchRates();
            ratesInterval = setInterval(fetchRates, 10 * 60 * 1000);
            tickerTimeInterval = setInterval(updateTickerTimeOnly, 60 * 1000);
        }
        function rateLabel(key) { return t(key) || key; }
        async function loadRatesAdjustments() {
            var el = document.getElementById('ratesAdjustmentsTable');
            if (!el) return;
            el.innerHTML = t('loading');
            var canAccess = (currentUser && currentUser.permissions && currentUser.permissions.rates);
            if (!canAccess) { el.innerHTML = '<div class="empty">' + t('rates_no_access') + '</div>'; return; }
            var ratesRes = await apiFetch('/api/rates');
            var adjRes = await apiFetch('/api/rates/adjustments');
            if (ratesRes.needLogin || adjRes.needLogin) return;
            if (!adjRes.ok) { el.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (adjRes.data && adjRes.data.error ? adjRes.data.error : '') + '</div>'; return; }
            var items = (ratesRes.ok && ratesRes.data && (ratesRes.data.allItems || ratesRes.data.items)) ? (ratesRes.data.allItems || ratesRes.data.items) : [];
            var adjList = (adjRes.data && adjRes.data.data) || [];
            var adjMap = {};
            adjList.forEach(function(a) { adjMap[a.currencyKey] = a; });
            function getRatePlaceholder(type) { return type === 'percent' ? t('rates_ph_percent') : type === 'delta_toman' ? t('rates_ph_delta') : t('rates_ph_fixed'); }
            var tableHtml = '<table class="sup-table" style="margin-top:0;"><thead><tr><th>' + t('rates_currency') + '</th><th>' + t('rates_current') + '</th><th>' + t('rates_adjust_type') + '</th><th>' + t('rates_value') + '</th></tr></thead><tbody>';
            var cardsHtml = '';
            items.forEach(function(it) {
                var adj = adjMap[it.key] || { adjustmentType: 'none', value: null };
                var type = adj.adjustmentType || 'none';
                var val = adj.value != null ? adj.value : '';
                var typeOpts = '<option value="none"' + (type === 'none' ? ' selected' : '') + '>' + t('rates_none') + '</option><option value="fixed"' + (type === 'fixed' ? ' selected' : '') + '>' + t('rates_fixed') + '</option><option value="delta_toman"' + (type === 'delta_toman' ? ' selected' : '') + '>' + t('rates_delta') + '</option><option value="percent"' + (type === 'percent' ? ' selected' : '') + '>' + t('rates_percent') + '</option>';
                var disp = (it.value != null && it.value !== '' && !isNaN(parseFloat(it.value))) ? formatPrice(it.value) : '—';
                var ph = getRatePlaceholder(type);
                tableHtml += '<tr><td>' + escapeHtml(rateLabel(it.key)) + '</td><td><strong>' + disp + '</strong></td><td><select data-rate-key="' + escapeHtml(it.key) + '" data-rate-type="type">' + typeOpts + '</select></td><td><input type="number" step="any" data-rate-key="' + escapeHtml(it.key) + '" data-rate-value="value" value="' + (val !== '' ? escapeHtml(String(val)) : '') + '" placeholder="' + escapeHtml(ph) + '"></td></tr>';
                cardsHtml += '<div class="rate-card" data-rate-key="' + escapeHtml(it.key) + '"><div class="rate-card-currency">' + escapeHtml(rateLabel(it.key)) + '</div><div class="rate-card-price">' + disp + '</div><div class="rate-card-type"><label>' + t('rates_adjust_type') + '</label><select data-rate-key="' + escapeHtml(it.key) + '" data-rate-type="type">' + typeOpts + '</select></div><div class="rate-card-value"><label>' + t('rates_value') + '</label><input type="number" step="any" data-rate-key="' + escapeHtml(it.key) + '" data-rate-value="value" value="' + (val !== '' ? escapeHtml(String(val)) : '') + '" placeholder="' + escapeHtml(ph) + '"></div></div>';
            });
            tableHtml += '</tbody></table>';
            el.innerHTML = '<div class="rates-table-wrap">' + tableHtml + '</div><div class="rates-cards-wrap">' + cardsHtml + '</div>';
            el.querySelectorAll('select[data-rate-key]').forEach(function(sel) {
                sel.addEventListener('change', function() {
                    var key = this.getAttribute('data-rate-key');
                    var inps = document.querySelectorAll('input[data-rate-key="' + key.replace(/"/g, '\\"') + '"]');
                    var ph = getRatePlaceholder(this.value);
                    inps.forEach(function(inp) { inp.placeholder = ph; });
                });
            });
        }
        async function saveRatesAdjustments() {
            var container = document.getElementById('ratesAdjustmentsTable');
            if (!container) return;
            var isMobile = window.matchMedia('(max-width: 768px)').matches;
            var items = isMobile ? container.querySelectorAll('.rate-card') : container.querySelectorAll('tbody tr');
            var adjustments = [];
            items.forEach(function(el) {
                var typeSel = el.querySelector('select[data-rate-key]');
                var valInp = el.querySelector('input[data-rate-key]');
                if (!typeSel || !valInp) return;
                var key = typeSel.getAttribute('data-rate-key');
                var type = typeSel.value || 'none';
                var val = valInp.value.trim();
                adjustments.push({ currencyKey: key, adjustmentType: type, value: (type !== 'none' && val !== '') ? parseFloat(val) : null });
            });
            var res = await apiFetch('/api/rates/adjustments', { method: 'PUT', body: JSON.stringify({ adjustments: adjustments }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_rates_saved')); fetchRates(); loadRatesAdjustments(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        var tickerConfigVisibleKeys = [];
        async function loadTickerConfig() {
            var box = document.getElementById('ratesTickerConfigBox');
            var listEl = document.getElementById('ratesTickerConfigList');
            var availEl = document.getElementById('ratesTickerConfigAvailable');
            if (!box || !listEl || !availEl) return;
            var canAccess = (currentUser && currentUser.permissions && currentUser.permissions.rates);
            if (!canAccess) { box.style.display = 'none'; return; }
            box.style.display = 'block';
            var res = await apiFetch('/api/rates/ticker-config');
            if (res.needLogin || !res.ok) return;
            var visibleKeys = (res.data && res.data.visibleKeys) || [];
            var available = (res.data && res.data.availableKeys) || [];
            tickerConfigVisibleKeys = visibleKeys.slice();
            listEl.innerHTML = tickerConfigVisibleKeys.map(function(k) {
                var lab = (available.find(function(a) { return a.key === k; }) || {}).label || rateLabel(k);
                return '<span class="ticker-config-chip" data-key="' + escapeHtml(k) + '">' + escapeHtml(lab) + ' <span class="chip-remove" data-remove-key="' + escapeHtml(k) + '">×</span></span>';
            }).join('');
            listEl.querySelectorAll('.chip-remove').forEach(function(btn) {
                btn.onclick = function() { removeTickerCurrency(this.getAttribute('data-remove-key')); };
            });
            var remaining = available.filter(function(a) { return tickerConfigVisibleKeys.indexOf(a.key) === -1; });
            availEl.innerHTML = remaining.length ? remaining.map(function(a) {
                return '<span class="ticker-config-add" data-add-key="' + escapeHtml(a.key) + '">+ ' + escapeHtml(a.label) + '</span>';
            }).join('') : '';
            availEl.querySelectorAll('.ticker-config-add').forEach(function(btn) {
                btn.onclick = function() { addTickerCurrency(this.getAttribute('data-add-key')); };
            });
        }
        function addTickerCurrency(key) {
            if (tickerConfigVisibleKeys.indexOf(key) === -1) { tickerConfigVisibleKeys.push(key); loadTickerConfig(); }
        }
        function removeTickerCurrency(key) {
            tickerConfigVisibleKeys = tickerConfigVisibleKeys.filter(function(k) { return k !== key; });
            loadTickerConfig();
        }
        async function saveTickerConfig() {
            var res = await apiFetch('/api/rates/ticker-config', { method: 'PUT', body: JSON.stringify({ visibleKeys: tickerConfigVisibleKeys }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_rates_saved')); fetchRates(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function loadCurrencies() {
            var box = document.getElementById('ratesCurrenciesBox');
            var listEl = document.getElementById('ratesCurrenciesList');
            if (!box || !listEl) return;
            var canAccess = (currentUser && currentUser.permissions && currentUser.permissions.rates);
            if (!canAccess) { box.style.display = 'none'; return; }
            box.style.display = 'block';
            listEl.innerHTML = t('loading');
            listEl.classList.add('empty');
            var res = await apiFetch('/api/rates/currencies');
            if (res.needLogin) return;
            if (!res.ok) { listEl.innerHTML = '<div class="empty">' + (res.data && res.data.error ? res.data.error : t('err_generic')) + '</div>'; return; }
            var data = (res.data && res.data.data) || [];
            if (data.length === 0) { listEl.innerHTML = '<div class="empty">' + (t('rates_no_currencies') || 'هنوز ارزی تعریف نشده. با «افزودن ارز» یکی اضافه کنید.') + '</div>'; return; }
            listEl.classList.remove('empty');
            listEl.innerHTML = data.map(function(c) {
                var apiStr = (c.apiKeys && c.apiKeys.length) ? c.apiKeys.join(', ') : '—';
                var apiDataAttr = (c.apiKeys && c.apiKeys.length) ? escapeHtml(apiStr.replace(/"/g, '&quot;')) : '';
                var labelAttr = escapeHtml((c.label || c.key).replace(/"/g, '&quot;'));
                return '<div class="rates-currency-row" data-key="' + escapeHtml(c.key) + '" data-label="' + labelAttr + '" data-apikeys="' + apiDataAttr + '"><span class="currency-key">' + escapeHtml(c.key) + '</span><span class="currency-label">' + escapeHtml(c.label || c.key) + '</span><span class="currency-apikeys">' + escapeHtml(apiStr) + '</span><div class="currency-actions"><button type="button" class="edit" onclick="openCurrencyModal(\'' + escapeHtml(c.key).replace(/'/g, "\\'") + '\')">' + (t('btn_edit') || t('edit') || 'ویرایش') + '</button><button type="button" class="delete" onclick="deleteCurrency(\'' + escapeHtml(c.key).replace(/'/g, "\\'") + '\')">' + (t('btn_delete') || 'حذف') + '</button></div></div>';
            }).join('');
        }
        function openCurrencyModal(existingKey) {
            var modal = document.getElementById('currencyModal');
            var titleEl = document.getElementById('currencyModalTitle');
            var keyInp = document.getElementById('currencyModalKey');
            var keyOriginal = document.getElementById('currencyModalKeyOriginal');
            var labelInp = document.getElementById('currencyModalLabel');
            var apiKeysInp = document.getElementById('currencyModalApiKeys');
            if (!modal || !keyInp) return;
            keyOriginal.value = existingKey || '';
            if (existingKey) {
                if (titleEl) titleEl.textContent = t('rates_edit_currency') || 'ویرایش ارز';
                keyInp.value = existingKey;
                keyInp.readOnly = true;
                keyInp.style.opacity = '0.8';
                var row = document.querySelector('.rates-currency-row[data-key="' + existingKey.replace(/"/g, '\\"') + '"]');
                if (row) {
                    labelInp.value = row.getAttribute('data-label') || existingKey;
                    apiKeysInp.value = row.getAttribute('data-apikeys') || '';
                } else { labelInp.value = existingKey; apiKeysInp.value = ''; }
            } else {
                if (titleEl) titleEl.textContent = t('rates_add_currency') || 'افزودن ارز';
                keyInp.value = '';
                keyInp.readOnly = false;
                keyInp.style.opacity = '1';
                labelInp.value = '';
                apiKeysInp.value = '';
            }
            modal.style.display = 'flex';
        }
        function closeCurrencyModal() {
            var modal = document.getElementById('currencyModal');
            if (modal) modal.style.display = 'none';
        }
        async function saveCurrencyFromModal() {
            var keyOriginal = (document.getElementById('currencyModalKeyOriginal') || {}).value;
            var key = (document.getElementById('currencyModalKey') || {}).value.trim().toLowerCase();
            var label = (document.getElementById('currencyModalLabel') || {}).value.trim() || key;
            var apiKeysStr = (document.getElementById('currencyModalApiKeys') || {}).value.trim();
            if (!key) { toast(t('rates_currency_key_required') || 'کلید ارز الزامی است', true); return; }
            var apiKeys = apiKeysStr ? apiKeysStr.split(/[\s,،]+/).map(function(s) { return s.trim(); }).filter(Boolean) : [];
            var res;
            if (keyOriginal) {
                res = await apiFetch('/api/rates/currencies/' + encodeURIComponent(keyOriginal), { method: 'PUT', body: JSON.stringify({ label: label, apiKeys: apiKeys }) });
            } else {
                res = await apiFetch('/api/rates/currencies', { method: 'POST', body: JSON.stringify({ key: key, label: label, apiKeys: apiKeys }) });
            }
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_rates_saved')); closeCurrencyModal(); loadCurrencies(); loadRatesAdjustments(); loadTickerConfig(); fetchRates(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function deleteCurrency(key) {
            if (!confirm((t('rates_delete_currency_confirm') || 'حذف این ارز؟ تعدیلات و نمایش در نوار قیمت آن هم حذف می‌شود.'))) return;
            var res = await apiFetch('/api/rates/currencies/' + encodeURIComponent(key), { method: 'DELETE' });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_rates_saved') || 'ذخیره شد'); loadCurrencies(); loadRatesAdjustments(); loadTickerConfig(); fetchRates(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        function initServicesTabs() {
            var tabs = document.querySelectorAll('.services-tab');
            var panels = document.querySelectorAll('.services-panel');
            tabs.forEach(function(tab) {
                tab.onclick = function() {
                    var t = tab.getAttribute('data-tab');
                    tabs.forEach(function(x) { x.classList.remove('active'); x.setAttribute('aria-selected', 'false'); });
                    panels.forEach(function(p) { p.classList.remove('show'); });
                    tab.classList.add('active');
                    tab.setAttribute('aria-selected', 'true');
                    var panel = document.getElementById('services' + (t === 'summary' ? 'Summary' : t === 'services' ? 'Services' : t === 'cashboxes' ? 'Cashboxes' : t === 'bankaccounts' ? 'Bankaccounts' : 'Transactions') + 'Panel');
                    if (panel) { panel.classList.add('show'); }
                    if (t === 'summary') loadServicesSummary();
                    else if (t === 'services') loadServices();
                    else if (t === 'cashboxes') loadCashBoxes();
                    else if (t === 'bankaccounts') loadBankAccounts();
                    else if (t === 'transactions') { loadCustomerFilterForTransactions(); loadTransactions(); }
                };
            });
        }
        async function loadCustomerFilterForTransactions() {
            var sel = document.getElementById('txCustomerFilter');
            if (!sel) return;
            var res = await apiFetch('/api/customers?limit=500');
            var list = (res.data && res.data.data) || [];
            var curVal = sel.value;
            sel.innerHTML = '<option value="">' + (LANG === 'fa' ? 'همه مشتریان' : 'All customers') + '</option>' + list.map(function(c) { return '<option value="' + c.id + '">' + escapeHtml(c.name || c.phone || '') + '</option>'; }).join('');
            if (curVal) sel.value = curVal;
        }
        function loadServicesPage() {
            var active = document.querySelector('.services-tab.active');
            var t = active ? active.getAttribute('data-tab') : 'summary';
            if (t === 'summary') loadServicesSummary();
            else if (t === 'services') loadServices();
            else if (t === 'cashboxes') loadCashBoxes();
            else if (t === 'bankaccounts') loadBankAccounts();
            else if (t === 'transactions') { loadCustomerFilterForTransactions(); loadTransactions(); }
        }
        function formatMoney(n, curr) { var x = parseFloat(n) || 0; return x.toLocaleString('fa-IR') + (curr === 'USD' ? ' $' : curr === 'EUR' ? ' €' : ' تومان'); }
        async function loadServicesSummary() {
            var res = await apiFetch('/api/exchange/summary');
            if (res.needLogin || !res.ok) return;
            var d = res.data || {};
            document.getElementById('summaryTotalCash').textContent = formatMoney(d.totalCash, 'IRR');
            document.getElementById('summaryTotalBank').textContent = formatMoney(d.totalBank, 'IRR');
            document.getElementById('summaryTotal').textContent = formatMoney(d.total, 'IRR');
            var cb = document.getElementById('summaryCashBoxes');
            var ba = document.getElementById('summaryBankAccounts');
            if (cb) cb.innerHTML = (d.cashBoxes || []).map(function(b) { return '<div class="exchange-summary-item"><span class="name">' + escapeHtml(b.name) + (b.branch && b.branch.name ? ' (' + escapeHtml(b.branch.name) + ')' : '') + '</span><span class="balance">' + formatMoney(b.balance, b.currency) + '</span></div>'; }).join('') || '<div class="empty">' + (LANG === 'fa' ? 'صندوقی تعریف نشده' : 'No cash boxes') + '</div>';
            if (ba) ba.innerHTML = (d.bankAccounts || []).map(function(b) { return '<div class="exchange-summary-item"><span class="name">' + escapeHtml(b.name) + (b.branch && b.branch.name ? ' (' + escapeHtml(b.branch.name) + ')' : '') + '</span><span class="balance">' + formatMoney(b.balance, b.currency) + '</span></div>'; }).join('') || '<div class="empty">' + (LANG === 'fa' ? 'حساب بانکی تعریف نشده' : 'No bank accounts') + '</div>';
        }
        async function loadCashBoxes() {
            var list = document.getElementById('cashBoxList');
            if (!list) return;
            list.innerHTML = t('loading');
            var res = await apiFetch('/api/exchange/cash-boxes');
            if (res.needLogin || !res.ok) { list.innerHTML = '<div class="empty">' + (res.data && res.data.error || t('err_generic')) + '</div>'; return; }
            var data = res.data || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'صندوقی تعریف نشده. افزودن صندوق کنید.' : 'No cash boxes. Add one.') + '</div>'; return; }
            list.innerHTML = data.map(function(b) {
                var badge = b.isActive ? '<span class="badge active">' + (LANG === 'fa' ? 'فعال' : 'Active') + '</span>' : '<span class="badge inactive">' + (LANG === 'fa' ? 'غیرفعال' : 'Inactive') + '</span>';
                return '<div class="list-item"><div><span class="name">' + escapeHtml(b.name) + '</span><div class="meta">' + (b.branch ? escapeHtml(b.branch.name) : '') + ' · ' + formatMoney(b.balance, b.currency) + '</div></div>' + badge + '<div><button type="button" class="btn-secondary btn-sm" onclick="openCashBoxModal(\'' + b.id + '\')">' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '</button> <button type="button" class="btn-secondary btn-sm" onclick="deleteCashBox(\'' + b.id + '\')">' + (LANG === 'fa' ? 'حذف' : 'Delete') + '</button></div></div>';
            }).join('');
        }
        async function loadBankAccounts() {
            var list = document.getElementById('bankAccountList');
            if (!list) return;
            list.innerHTML = t('loading');
            var res = await apiFetch('/api/exchange/bank-accounts');
            if (res.needLogin || !res.ok) { list.innerHTML = '<div class="empty">' + (res.data && res.data.error || t('err_generic')) + '</div>'; return; }
            var data = res.data || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'حساب بانکی تعریف نشده. افزودن حساب کنید.' : 'No bank accounts. Add one.') + '</div>'; return; }
            list.innerHTML = data.map(function(b) {
                var badge = b.isActive ? '<span class="badge active">' + (LANG === 'fa' ? 'فعال' : 'Active') + '</span>' : '<span class="badge inactive">' + (LANG === 'fa' ? 'غیرفعال' : 'Inactive') + '</span>';
                return '<div class="list-item"><div><span class="name">' + escapeHtml(b.name) + '</span><div class="meta">' + (b.bankName ? escapeHtml(b.bankName) + ' · ' : '') + formatMoney(b.balance, b.currency) + '</div></div>' + badge + '<div><button type="button" class="btn-secondary btn-sm" onclick="openBankAccountModal(\'' + b.id + '\')">' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '</button> <button type="button" class="btn-secondary btn-sm" onclick="deleteBankAccount(\'' + b.id + '\')">' + (LANG === 'fa' ? 'حذف' : 'Delete') + '</button></div></div>';
            }).join('');
        }
        async function loadTransactions() {
            var list = document.getElementById('transactionList');
            if (!list) return;
            list.innerHTML = t('loading');
            var params = [];
            var from = document.getElementById('txFromDate'); if (from && from.value) params.push('fromDate=' + encodeURIComponent(from.value));
            var to = document.getElementById('txToDate'); if (to && to.value) params.push('toDate=' + encodeURIComponent(to.value));
            var typ = document.getElementById('txTypeFilter'); if (typ && typ.value) params.push('type=' + encodeURIComponent(typ.value));
            var st = document.getElementById('txStatusFilter'); if (st && st.value) params.push('status=' + encodeURIComponent(st.value));
            var cust = document.getElementById('txCustomerFilter'); if (cust && cust.value) params.push('customerId=' + encodeURIComponent(cust.value));
            var res = await apiFetch('/api/exchange/transactions?' + params.join('&'));
            if (res.needLogin || !res.ok) { list.innerHTML = '<div class="empty">' + (res.data && res.data.error || t('err_generic')) + '</div>'; return; }
            var rows = (res.data && res.data.rows) || [];
            if (rows.length === 0) { list.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'تراکنشی یافت نشد' : 'No transactions') + '</div>'; return; }
            var typeLabels = { cash_in: 'ورود به صندوق', cash_out: 'خروج از صندوق', transfer_box: 'انتقال صندوق', bank_deposit: 'واریز بانک', bank_withdraw: 'برداشت بانک', transfer_account: 'انتقال حساب', income: 'درآمد', expense: 'هزینه' };
            var statusLabels = { pending: 'در انتظار تأیید', approved: 'تأیید شده', rejected: 'رد شده' };
            var statusClasses = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' };
            var canApprove = currentUser && ['owner', 'admin', 'manager'].indexOf(currentUser.role) >= 0;
            list.innerHTML = rows.map(function(tx) {
                var isIn = ['cash_in','transfer_box','bank_withdraw','income'].indexOf(tx.type) >= 0;
                var amt = parseFloat(tx.amount) || 0;
                var desc = (tx.description || '').slice(0, 60) + (tx.description && tx.description.length > 60 ? '…' : '');
                var ref = tx.reference ? ' · ' + escapeHtml(tx.reference) : '';
                var custName = (tx.customer && (tx.customer.name || tx.customer.phone)) ? escapeHtml(tx.customer.name || tx.customer.phone) : '';
                var custLink = tx.customerId ? '<a href="#" onclick="showPage(\'customers\'); showCustomerHistory(\'' + tx.customerId + '\'); return false;" class="tx-customer-link">' + custName + '</a>' : '';
                var statusBadge = '<span class="badge ' + (statusClasses[tx.status] || '') + '">' + (statusLabels[tx.status] || tx.status || 'pending') + '</span>';
                var actions = '<div class="tx-row-actions">';
                actions += '<button type="button" class="btn-secondary btn-sm" onclick="openTransactionModalForEdit(\'' + tx.id + '\')" title="' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '">' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '</button>';
                if (tx.status === 'pending' && canApprove) {
                    actions += ' <button type="button" class="btn-primary btn-sm" onclick="approveTransaction(\'' + tx.id + '\')" title="' + (LANG === 'fa' ? 'تأیید' : 'Approve') + '">' + (LANG === 'fa' ? 'تأیید' : 'Approve') + '</button>';
                    actions += ' <button type="button" class="btn-secondary btn-sm" onclick="rejectTransaction(\'' + tx.id + '\')" title="' + (LANG === 'fa' ? 'رد' : 'Reject') + '">' + (LANG === 'fa' ? 'رد' : 'Reject') + '</button>';
                }
                actions += '</div>';
                return '<div class="transaction-row" data-tx-id="' + tx.id + '"><div><span class="tx-type">' + (typeLabels[tx.type] || tx.type) + '</span> ' + statusBadge + (custLink ? ' <span class="tx-cust">' + custLink + '</span>' : '') + '<div class="meta" style="margin-top:4px;">' + escapeHtml(desc) + ref + '</div><div class="meta">' + (tx.transactionDate || '') + '</div></div><div class="tx-row-right"><span class="tx-amount ' + (isIn ? 'positive' : 'negative') + '">' + (isIn ? '+' : '-') + formatMoney(amt, tx.currency) + '</span>' + actions + '</div></div>';
            }).join('');
        }
        function openCashBoxModal(id) {
            var m = document.getElementById('cashBoxModal'); if (!m) return;
            m.style.display = 'flex';
            document.getElementById('cashBoxModalId').value = id || '';
            document.getElementById('cashBoxModalTitle').textContent = id ? (LANG === 'fa' ? 'ویرایش صندوق' : 'Edit cash box') : t('cashbox_add');
            document.getElementById('cashBoxModalName').value = '';
            document.getElementById('cashBoxModalBranch').value = '';
            document.getElementById('cashBoxModalCurrency').value = 'IRR';
            document.getElementById('cashBoxModalBalance').value = '0';
            document.getElementById('cashBoxModalDescription').value = '';
            document.getElementById('cashBoxModalActive').checked = true;
            loadBranchesForSelect(['cashBoxModalBranch']);
            if (id) apiFetch('/api/exchange/cash-boxes').then(function(r) { var b = (r.data || []).find(function(x) { return x.id === id; }); if (b) { document.getElementById('cashBoxModalName').value = b.name || ''; document.getElementById('cashBoxModalBranch').value = b.branchId || ''; document.getElementById('cashBoxModalCurrency').value = b.currency || 'IRR'; document.getElementById('cashBoxModalBalance').value = b.balance || 0; document.getElementById('cashBoxModalDescription').value = b.description || ''; document.getElementById('cashBoxModalActive').checked = b.isActive !== false; } });
        }
        function closeCashBoxModal() { var m = document.getElementById('cashBoxModal'); if (m) m.style.display = 'none'; }
        async function saveCashBoxFromModal() {
            var id = document.getElementById('cashBoxModalId').value.trim();
            var name = document.getElementById('cashBoxModalName').value.trim();
            var branchId = document.getElementById('cashBoxModalBranch').value || null;
            var currency = document.getElementById('cashBoxModalCurrency').value;
            var balance = parseFloat(document.getElementById('cashBoxModalBalance').value) || 0;
            var description = document.getElementById('cashBoxModalDescription').value.trim() || null;
            var isActive = document.getElementById('cashBoxModalActive').checked;
            if (!name) { toast(LANG === 'fa' ? 'نام صندوق الزامی است' : 'Name required', true); return; }
            var body = { name, branchId, currency, balance, description, isActive };
            var res = id ? await apiFetch('/api/exchange/cash-boxes/' + id, { method: 'PUT', body: JSON.stringify(body) }) : await apiFetch('/api/exchange/cash-boxes', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { closeCashBoxModal(); toast(t('btn_save')); loadCashBoxes(); loadServicesSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function deleteCashBox(id) { if (!confirm(LANG === 'fa' ? 'حذف این صندوق؟' : 'Delete this cash box?')) return; var res = await apiFetch('/api/exchange/cash-boxes/' + id, { method: 'DELETE' }); if (res.needLogin) return; if (res.ok) { toast(LANG === 'fa' ? 'حذف شد' : 'Deleted'); loadCashBoxes(); loadServicesSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); } }
        function openBankAccountModal(id) {
            var m = document.getElementById('bankAccountModal'); if (!m) return;
            m.style.display = 'flex';
            document.getElementById('bankAccountModalId').value = id || '';
            document.getElementById('bankAccountModalTitle').textContent = id ? (LANG === 'fa' ? 'ویرایش حساب بانکی' : 'Edit bank account') : t('bankaccount_add');
            document.getElementById('bankAccountModalName').value = '';
            document.getElementById('bankAccountModalBankName').value = '';
            document.getElementById('bankAccountModalAccountNumber').value = '';
            document.getElementById('bankAccountModalIban').value = '';
            document.getElementById('bankAccountModalBranch').value = '';
            document.getElementById('bankAccountModalCurrency').value = 'IRR';
            document.getElementById('bankAccountModalBalance').value = '0';
            document.getElementById('bankAccountModalDescription').value = '';
            document.getElementById('bankAccountModalActive').checked = true;
            loadBranchesForSelect(['bankAccountModalBranch']);
            if (id) apiFetch('/api/exchange/bank-accounts').then(function(r) { var b = (r.data || []).find(function(x) { return x.id === id; }); if (b) { document.getElementById('bankAccountModalName').value = b.name || ''; document.getElementById('bankAccountModalBankName').value = b.bankName || ''; document.getElementById('bankAccountModalAccountNumber').value = b.accountNumber || ''; document.getElementById('bankAccountModalIban').value = b.iban || ''; document.getElementById('bankAccountModalBranch').value = b.branchId || ''; document.getElementById('bankAccountModalCurrency').value = b.currency || 'IRR'; document.getElementById('bankAccountModalBalance').value = b.balance || 0; document.getElementById('bankAccountModalDescription').value = b.description || ''; document.getElementById('bankAccountModalActive').checked = b.isActive !== false; } });
        }
        function closeBankAccountModal() { var m = document.getElementById('bankAccountModal'); if (m) m.style.display = 'none'; }
        async function saveBankAccountFromModal() {
            var id = document.getElementById('bankAccountModalId').value.trim();
            var name = document.getElementById('bankAccountModalName').value.trim();
            var bankName = document.getElementById('bankAccountModalBankName').value.trim() || null;
            var accountNumber = document.getElementById('bankAccountModalAccountNumber').value.trim() || null;
            var iban = document.getElementById('bankAccountModalIban').value.trim() || null;
            var branchId = document.getElementById('bankAccountModalBranch').value || null;
            var currency = document.getElementById('bankAccountModalCurrency').value;
            var balance = parseFloat(document.getElementById('bankAccountModalBalance').value) || 0;
            var description = document.getElementById('bankAccountModalDescription').value.trim() || null;
            var isActive = document.getElementById('bankAccountModalActive').checked;
            if (!name) { toast(LANG === 'fa' ? 'نام حساب الزامی است' : 'Name required', true); return; }
            var body = { name, bankName, accountNumber, iban, branchId, currency, balance, description, isActive };
            var res = id ? await apiFetch('/api/exchange/bank-accounts/' + id, { method: 'PUT', body: JSON.stringify(body) }) : await apiFetch('/api/exchange/bank-accounts', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { closeBankAccountModal(); toast(t('btn_save')); loadBankAccounts(); loadServicesSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function deleteBankAccount(id) { if (!confirm(LANG === 'fa' ? 'حذف این حساب بانکی؟' : 'Delete this bank account?')) return; var res = await apiFetch('/api/exchange/bank-accounts/' + id, { method: 'DELETE' }); if (res.needLogin) return; if (res.ok) { toast(LANG === 'fa' ? 'حذف شد' : 'Deleted'); loadBankAccounts(); loadServicesSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); } }
        function openTransactionModal(prefillCustomerId) {
            var m = document.getElementById('transactionModal'); if (!m) return;
            document.getElementById('txModalId').value = '';
            var titleEl = document.getElementById('txModalTitle'); if (titleEl) titleEl.textContent = LANG === 'fa' ? 'ثبت تراکنش' : 'Add transaction';
            m.style.display = 'flex';
            document.getElementById('txModalType').value = 'cash_in';
            document.getElementById('txModalAmount').value = '';
            document.getElementById('txModalCurrency').value = 'IRR';
            document.getElementById('txModalFromCashBox').value = '';
            document.getElementById('txModalToCashBox').value = '';
            document.getElementById('txModalFromBankAccount').value = '';
            document.getElementById('txModalToBankAccount').value = '';
            document.getElementById('txModalCustomer').value = prefillCustomerId || '';
            document.getElementById('txModalDescription').value = '';
            document.getElementById('txModalReference').value = '';
            document.getElementById('txModalDate').value = new Date().toISOString().slice(0, 10);
            txModalUpdateFields();
            loadCashBoxesForTxSelect();
            loadBankAccountsForTxSelect();
            loadCustomersForTxSelect(prefillCustomerId);
        }
        async function openTransactionModalForEdit(txId) {
            var m = document.getElementById('transactionModal'); if (!m) return;
            var res = await apiFetch('/api/exchange/transactions/' + txId);
            if (!res.ok || !res.data) { toast((res.data && res.data.error) || t('err_generic'), true); return; }
            var tx = res.data;
            document.getElementById('txModalId').value = tx.id;
            var titleEl = document.getElementById('txModalTitle'); if (titleEl) titleEl.textContent = LANG === 'fa' ? 'ویرایش تراکنش' : 'Edit transaction';
            m.style.display = 'flex';
            document.getElementById('txModalType').value = tx.type || 'cash_in';
            document.getElementById('txModalAmount').value = tx.amount || '';
            document.getElementById('txModalCurrency').value = tx.currency || 'IRR';
            document.getElementById('txModalFromCashBox').value = tx.fromCashBoxId || '';
            document.getElementById('txModalToCashBox').value = tx.toCashBoxId || '';
            document.getElementById('txModalFromBankAccount').value = tx.fromBankAccountId || '';
            document.getElementById('txModalToBankAccount').value = tx.toBankAccountId || '';
            document.getElementById('txModalCustomer').value = tx.customerId || '';
            document.getElementById('txModalDescription').value = tx.description || '';
            document.getElementById('txModalReference').value = tx.reference || '';
            document.getElementById('txModalDate').value = (tx.transactionDate || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
            txModalUpdateFields();
            loadCashBoxesForTxSelect();
            loadBankAccountsForTxSelect();
            loadCustomersForTxSelect(tx.customerId);
        }
        async function approveTransaction(txId) {
            var res = await apiFetch('/api/exchange/transactions/' + txId + '/approve', { method: 'POST' });
            if (res.needLogin) return;
            if (res.ok) { toast(LANG === 'fa' ? 'تراکنش تأیید شد' : 'Transaction approved'); loadTransactions(); loadServicesSummary(); if (currentCustomerId) loadCustomerTransactions(currentCustomerId); loadCustomerTimeline(currentCustomerId); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function rejectTransaction(txId) {
            if (!confirm(LANG === 'fa' ? 'آیا از رد این تراکنش مطمئن هستید؟' : 'Reject this transaction?')) return;
            var res = await apiFetch('/api/exchange/transactions/' + txId + '/reject', { method: 'POST' });
            if (res.needLogin) return;
            if (res.ok) { toast(LANG === 'fa' ? 'تراکنش رد شد' : 'Transaction rejected'); loadTransactions(); loadServicesSummary(); if (currentCustomerId) loadCustomerTransactions(currentCustomerId); loadCustomerTimeline(currentCustomerId); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function txModalUpdateFields() {
            var t = document.getElementById('txModalType').value;
            var fromBox = document.getElementById('txModalFromBoxWrap'); var toBox = document.getElementById('txModalToBoxWrap');
            var fromBank = document.getElementById('txModalFromBankWrap'); var toBank = document.getElementById('txModalToBankWrap');
            if (fromBox) fromBox.style.display = ['cash_out','transfer_box','bank_deposit','expense'].indexOf(t) >= 0 ? 'block' : 'none';
            if (toBox) toBox.style.display = ['cash_in','transfer_box','bank_withdraw','income'].indexOf(t) >= 0 ? 'block' : 'none';
            if (fromBank) fromBank.style.display = ['bank_withdraw','transfer_account'].indexOf(t) >= 0 ? 'block' : 'none';
            if (toBank) toBank.style.display = ['bank_deposit','transfer_account'].indexOf(t) >= 0 ? 'block' : 'none';
        }
        async function loadCashBoxesForTxSelect() {
            var res = await apiFetch('/api/exchange/cash-boxes');
            var list = (res.data || []).filter(function(b) { return b.isActive; });
            var from = document.getElementById('txModalFromCashBox'); var to = document.getElementById('txModalToCashBox');
            if (from) { from.innerHTML = '<option value="">انتخاب صندوق</option>' + list.map(function(b) { return '<option value="' + b.id + '">' + escapeHtml(b.name) + ' (' + formatMoney(b.balance, b.currency) + ')</option>'; }).join(''); }
            if (to) { to.innerHTML = '<option value="">انتخاب صندوق</option>' + list.map(function(b) { return '<option value="' + b.id + '">' + escapeHtml(b.name) + ' (' + formatMoney(b.balance, b.currency) + ')</option>'; }).join(''); }
        }
        async function loadBankAccountsForTxSelect() {
            var res = await apiFetch('/api/exchange/bank-accounts');
            var list = (res.data || []).filter(function(b) { return b.isActive; });
            var from = document.getElementById('txModalFromBankAccount'); var to = document.getElementById('txModalToBankAccount');
            if (from) { from.innerHTML = '<option value="">انتخاب حساب</option>' + list.map(function(b) { return '<option value="' + b.id + '">' + escapeHtml(b.name) + ' (' + formatMoney(b.balance, b.currency) + ')</option>'; }).join(''); }
            if (to) { to.innerHTML = '<option value="">انتخاب حساب</option>' + list.map(function(b) { return '<option value="' + b.id + '">' + escapeHtml(b.name) + ' (' + formatMoney(b.balance, b.currency) + ')</option>'; }).join(''); }
        }
        async function loadCustomersForTxSelect(selectedId) {
            var res = await apiFetch('/api/customers?limit=500');
            var list = (res.data && res.data.data) || [];
            var sel = document.getElementById('txModalCustomer');
            if (!sel) return;
            sel.innerHTML = '<option value="">' + (LANG === 'fa' ? 'بدون مشتری' : 'No customer') + '</option>' + list.map(function(c) { return '<option value="' + c.id + '"' + (c.id === selectedId ? ' selected' : '') + '>' + escapeHtml(c.name || c.phone || '') + (c.phone ? ' · ' + escapeHtml(c.phone) : '') + '</option>'; }).join('');
        }
        (function(){ var el = document.getElementById('txModalType'); if (el) el.addEventListener('change', txModalUpdateFields); })();
        function closeTransactionModal() { var m = document.getElementById('transactionModal'); if (m) m.style.display = 'none'; }
        async function saveTransactionFromModal() {
            var txId = (document.getElementById('txModalId') && document.getElementById('txModalId').value) || '';
            var type = document.getElementById('txModalType').value;
            var amount = parseFloat(document.getElementById('txModalAmount').value);
            var currency = document.getElementById('txModalCurrency').value;
            var fromBox = document.getElementById('txModalFromCashBox').value || null;
            var toBox = document.getElementById('txModalToCashBox').value || null;
            var fromBank = document.getElementById('txModalFromBankAccount').value || null;
            var toBank = document.getElementById('txModalToBankAccount').value || null;
            var customerId = document.getElementById('txModalCustomer').value || null;
            var description = document.getElementById('txModalDescription').value.trim() || null;
            var reference = document.getElementById('txModalReference').value.trim() || null;
            var date = document.getElementById('txModalDate').value || new Date().toISOString().slice(0, 10);
            if (!amount || amount <= 0) { toast(LANG === 'fa' ? 'مبلغ معتبر وارد کنید' : 'Enter valid amount', true); return; }
            var body = { type, amount, currency, fromCashBoxId: fromBox, toCashBoxId: toBox, fromBankAccountId: fromBank, toBankAccountId: toBank, customerId, description, reference, transactionDate: date };
            var res = txId ? await apiFetch('/api/exchange/transactions/' + txId, { method: 'PUT', body: JSON.stringify(body) }) : await apiFetch('/api/exchange/transactions', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { closeTransactionModal(); toast(LANG === 'fa' ? 'ذخیره شد' : 'Saved'); loadTransactions(); loadServicesSummary(); if (currentCustomerId) loadCustomerTransactions(currentCustomerId); loadCustomerTimeline(currentCustomerId); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function loadServices() {
            var list = document.getElementById('serviceList');
            if (!list) return;
            list.innerHTML = t('loading');
            var res = await apiFetch('/api/services');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + (res.data && res.data.error ? res.data.error : t('err_generic')) + '</div>'; return; }
            var data = (res.data && res.data.data) || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'هنوز سرویسی تعریف نشده. با دکمه افزودن سرویس اضافه کنید.' : 'No services yet. Add one with the button above.') + '</div>'; return; }
            list.innerHTML = data.map(function(s) {
                var badge = s.isActive ? '<span class="badge active">' + (LANG === 'fa' ? 'فعال' : 'Active') + '</span>' : '<span class="badge inactive">' + (LANG === 'fa' ? 'غیرفعال' : 'Inactive') + '</span>';
                return '<div class="list-item"><div><span class="name">' + escapeHtml(s.name) + '</span>' + (s.code ? '<div class="meta">' + escapeHtml(s.code) + '</div>' : '') + (s.category ? '<div class="meta">' + escapeHtml(s.category) + '</div>' : '') + (s.description ? '<div class="meta">' + escapeHtml((s.description || '').slice(0, 80)) + (s.description.length > 80 ? '…' : '') + '</div>' : '') + '</div>' + badge + '<div><button type="button" class="btn-secondary btn-sm" onclick="openServiceModal(\'' + s.id + '\')">' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '</button> <button type="button" class="btn-secondary btn-sm" onclick="deleteService(\'' + s.id + '\')">' + (LANG === 'fa' ? 'حذف' : 'Delete') + '</button></div></div>';
            }).join('');
        }
        function openServiceModal(serviceId) {
            var modal = document.getElementById('serviceModal');
            if (!modal) return;
            modal.style.display = 'flex';
            document.getElementById('serviceModalId').value = serviceId || '';
            document.getElementById('serviceModalTitle').textContent = serviceId ? (LANG === 'fa' ? 'ویرایش سرویس' : 'Edit service') : t('service_add');
            document.getElementById('serviceModalName').value = '';
            document.getElementById('serviceModalCode').value = '';
            document.getElementById('serviceModalCategory').value = '';
            document.getElementById('serviceModalDescription').value = '';
            document.getElementById('serviceModalActive').checked = true;
            if (serviceId) {
                apiFetch('/api/services/' + serviceId).then(function(r) {
                    if (r.ok && r.data) {
                        var s = r.data;
                        document.getElementById('serviceModalName').value = s.name || '';
                        document.getElementById('serviceModalCode').value = s.code || '';
                        document.getElementById('serviceModalCategory').value = s.category || '';
                        document.getElementById('serviceModalDescription').value = s.description || '';
                        document.getElementById('serviceModalActive').checked = s.isActive !== false;
                    }
                });
            }
        }
        function closeServiceModal() { var m = document.getElementById('serviceModal'); if (m) m.style.display = 'none'; }
        async function saveServiceFromModal() {
            var id = document.getElementById('serviceModalId').value.trim();
            var name = document.getElementById('serviceModalName').value.trim();
            var code = document.getElementById('serviceModalCode').value.trim();
            var category = document.getElementById('serviceModalCategory').value.trim();
            var description = document.getElementById('serviceModalDescription').value.trim();
            var isActive = document.getElementById('serviceModalActive').checked;
            if (!name) { toast(LANG === 'fa' ? 'نام سرویس الزامی است' : 'Service name required', true); return; }
            if (id) {
                var res = await apiFetch('/api/services/' + id, { method: 'PUT', body: JSON.stringify({ name: name, code: code || null, category: category || null, description: description || null, isActive: isActive }) });
                if (res.needLogin) return;
                if (res.ok) { closeServiceModal(); toast(t('btn_save')); loadServices(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
            } else {
                var res = await apiFetch('/api/services', { method: 'POST', body: JSON.stringify({ name: name, code: code || null, category: category || null, description: description || null, isActive: isActive }) });
                if (res.needLogin) return;
                if (res.ok) { closeServiceModal(); toast(t('btn_save')); loadServices(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
            }
        }
        async function deleteService(id) {
            if (!confirm(LANG === 'fa' ? 'حذف این سرویس؟' : 'Delete this service?')) return;
            var res = await apiFetch('/api/services/' + id, { method: 'DELETE' });
            if (res.needLogin) return;
            if (res.ok) { toast(LANG === 'fa' ? 'حذف شد' : 'Deleted'); loadServices(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function startPresenceInterval() {
            if (presenceInterval) clearInterval(presenceInterval);
            apiFetch('/api/auth/me/presence', { method: 'PATCH', body: JSON.stringify({ status: 'online' }) }).catch(function(){});
            presenceInterval = setInterval(function() {
                apiFetch('/api/auth/me/presence', { method: 'PATCH', body: JSON.stringify({ status: 'online' }) }).catch(function(){});
            }, 30000);
        }
        function connectSocket() {
            if (!token || socket) return;
            try {
                if (typeof io !== 'undefined') {
                    socket = io({ auth: { token: token } });
                    socket.on('user_status', function() {
                        var active = document.querySelector('.nav-link.active');
                        if (active && active.getAttribute('data-page') === 'staff-activity') loadStaffActivity();
                    });
                    socket.on('new_message', function(data) {
                        var active = document.querySelector('.nav-link.active');
                        var onConv = active && active.getAttribute('data-page') === 'conversations';
                        var convId = data.conversationId || (data.conversation && data.conversation.id);
                        var viewingConv = onConv && currentConvId === convId;
                        if (onConv) { debouncedLoadConversations(400); updateNavBadges(); }
                        if (viewingConv && convId) loadMessages(convId);
                        else if (data.customer && !viewingConv) toast((LANG === 'fa' ? 'پیام جدید از ' : 'New message from ') + (data.customer.name || data.customer.phone || ''), false);
                    });
                    socket.on('user_login', function() {
                        var active = document.querySelector('.nav-link.active');
                        if (active && active.getAttribute('data-page') === 'staff-activity') loadStaffActivity();
                    });
                    socket.on('internal_message', function(data) {
                        playInternalChatSound();
                        var fromName = (data.fromUser && data.fromUser.name) || (LANG === 'fa' ? 'کاربر' : 'User');
                        var preview = (data.message && data.message.content) ? String(data.message.content).slice(0, 50) : '';
                        if (preview.length > 50) preview += '…';
                        var active = document.querySelector('.nav-link.active');
                        var onInternalPage = active && active.getAttribute('data-page') === 'internal-chat';
                        var viewingThread = currentInternalThreadId === data.threadId;
                        var popup = document.getElementById('internalChatPopup');
                        var popupOpen = popup && popup.style.display !== 'none';
                        var popupViewingThread = popupOpen && currentInternalThreadId === data.threadId;
                        if (onInternalPage && viewingThread) {
                            appendInternalMessage(data.message);
                            loadInternalThreads();
                        } else if (popupViewingThread) {
                            appendInternalMessageToPopup(data.message);
                            loadInternalThreads();
                        } else if (!onInternalPage) {
                            window.hasNewInternalChat = true; updateNavBadges();
                            loadInternalThreads();
                            toast((LANG === 'fa' ? 'پیام جدید از ' : 'New message from ') + fromName + (preview ? ': ' + preview : ''), false);
                            showInternalChatPopup(data.threadId, fromName);
                        } else if (!viewingThread) {
                            openInternalThread(data.threadId);
                        } else {
                            loadInternalThreads();
                        }
                    });
                    socket.on('ticket_reply', function(data) {
                        playInternalChatSound();
                        var fromName = (data.fromUser && data.fromUser.name) || (LANG === 'fa' ? 'کاربر' : 'User');
                        var preview = (data.reply && data.reply.content) ? String(data.reply.content).slice(0, 40) : '';
                        if (preview.length > 40) preview += '…';
                        var active = document.querySelector('.nav-link.active');
                        var onTicketsPage = active && active.getAttribute('data-page') === 'tickets';
                        var viewingTicket = currentTicketId === data.ticketId;
                        if (onTicketsPage && viewingTicket) {
                            appendTicketReply(data.reply);
                        } else {
                            if (!onTicketsPage) { window.navBadgeCounts.tickets = (window.navBadgeCounts.tickets || 0) + 1; updateNavBadges(); }
                            loadTickets();
                            toast((LANG === 'fa' ? 'پاسخ جدید به تیکت «' : 'New reply to ticket "') + (data.ticketTitle || '') + (LANG === 'fa' ? '» از ' : '" from ') + fromName + (preview ? ': ' + preview : ''), false);
                            if (!onTicketsPage) { showPage('tickets'); setTimeout(function(){ loadTicketDetail(data.ticketId); }, 150); }
                            else if (!viewingTicket) loadTicketDetail(data.ticketId);
                        }
                    });
                    socket.on('call_offer', function(data) {
                        if (internalCallIsJoining) {
                            handleCallOfferAsJoiner(data);
                            return;
                        }
                        if (internalCallPendingInvite) return;
                        internalCallPendingOffer = data;
                        internalCallIsIncoming = true;
                        playCallRingtone();
                        showInternalCallModal(data.type === 'video' ? t('incoming_video_call') : t('incoming_voice_call'), true);
                    });
                    socket.on('call_answer', function(data) {
                        if (data.threadId !== currentInternalThreadId) return;
                        var pc = internalCallPeers[data.fromUserId];
                        if (pc) pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(function() {}).catch(function(e) { console.warn('setRemoteDesc:', e); });
                    });
                    socket.on('call_ice', function(data) {
                        if (data.threadId !== currentInternalThreadId) return;
                        var pc = internalCallPeers[data.fromUserId];
                        if (pc && data.candidate) pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(function(e) { console.warn('addIce:', e); });
                    });
                    socket.on('call_participant_joined', function(data) {
                        if (data.threadId !== currentInternalThreadId || !internalCallLocalStream) return;
                        var newUserId = data.userId;
                        if (internalCallPeers[newUserId]) return;
                        var pc = new RTCPeerConnection({ iceServers: INTERNAL_CALL_ICE_SERVERS });
                        internalCallPeers[newUserId] = pc;
                        attachPeerConnectionStateHandlers(pc, newUserId);
                        internalCallLocalStream.getTracks().forEach(function(t){ pc.addTrack(t, internalCallLocalStream); });
                        pc.onicecandidate = function(e) { var sk = getSocket(); if (e.candidate && sk) sk.emit('call_ice', { toUserId: newUserId, threadId: currentInternalThreadId, candidate: e.candidate }); };
                        pc.ontrack = function(e) { var rv = getOrCreateRemoteVideoEl(newUserId); if (rv && e.streams && e.streams[0]) { rv.srcObject = e.streams[0]; rv.play().catch(function(){}); } };
                        pc.createOffer().then(function(offer) { return pc.setLocalDescription(offer).then(function() { return offer; }); }).then(function(offer) {
                            var sk = getSocket(); if (sk) sk.emit('call_offer', { toUserId: newUserId, threadId: currentInternalThreadId, type: internalCallType, sdp: offer });
                        }).catch(function(err) { console.warn('createOffer for new participant:', err); });
                    });
                    socket.on('call_participant_left', function(data) {
                        if (data.threadId !== currentInternalThreadId) return;
                        var pc = internalCallPeers[data.userId];
                        if (pc) { pc.close(); delete internalCallPeers[data.userId]; }
                        removeRemoteVideoEl(data.userId);
                        var addBtn = document.getElementById('internalCallAddBtn');
                        if (addBtn) addBtn.style.display = (Object.keys(internalCallPeers).length > 0) ? 'flex' : 'none';
                        if (Object.keys(internalCallPeers).length === 0) hideInternalCallModal();
                    });
                    socket.on('call_invite', function(data) {
                        internalCallPendingInvite = data;
                        currentInternalThreadId = data.threadId;
                        var fromName = (data.fromUserName || '').trim() || (LANG === 'fa' ? 'کاربر' : 'User');
                        var txt = document.getElementById('internalCallInviteText');
                        if (txt) txt.textContent = (LANG === 'fa' ? fromName + ' شما را به تماس دعوت کرده' : fromName + ' invites you to the call');
                        var mod = document.getElementById('internalCallInviteModal');
                        if (mod) mod.style.display = 'flex';
                        playCallRingtone();
                    });
                    socket.on('call_room_info', function(data) {
                        if (!internalCallPendingInvite) return;
                        internalCallPendingInvite.participantIds = data.participantIds || [];
                        internalCallPendingInvite.type = data.type || 'voice';
                    });
                    socket.on('call_invite_reject', function(data) {
                        var name = (data.userName || '').trim() || (LANG === 'fa' ? 'کاربر' : 'User');
                        toast(name + (LANG === 'fa' ? ' دعوت را رد کرد' : ' declined the invite'));
                    });
                    socket.on('call_end', function(data) {
                        if (data.threadId === currentInternalThreadId) endInternalCall();
                    });
                    socket.on('call_reject', function(data) {
                        if (data.threadId === currentInternalThreadId) { hideInternalCallModal(); internalCallPendingOffer = null; internalCallIsIncoming = false; toast(t('call_rejected')); }
                    });
                    socket.on('unanswered_alert', function(data) {
                        playInternalChatSound();
                        var cust = (data.customer && (data.customer.name || data.customer.phone)) || (LANG === 'fa' ? 'مشتری' : 'Customer');
                        var mins = data.minutesWaiting || 0;
                        var msg = (LANG === 'fa' ? 'مکالمه بدون پاسخ: ' : 'Unanswered: ') + cust + (LANG === 'fa' ? ' — ' + mins + ' دقیقه' : ' — ' + mins + ' min');
                        toast(msg, 8000);
                        var active = document.querySelector('.nav-link.active');
                        if (active && active.getAttribute('data-page') === 'conversations') debouncedLoadConversations(400);
                    });
                    socket.on('conversation_escalated', function(data) {
                        playInternalChatSound();
                        var cust = (data.customer && (data.customer.name || data.customer.phone)) || (LANG === 'fa' ? 'مشتری' : 'Customer');
                        var dept = data.department || (LANG === 'fa' ? 'پشتیبانی' : 'Support');
                        var msg = (LANG === 'fa' ? 'Escalation: ' : 'Escalated: ') + cust + (LANG === 'fa' ? ' به ' : ' to ') + dept;
                        toast(msg, 10000);
                        var active = document.querySelector('.nav-link.active');
                        if (active && active.getAttribute('data-page') === 'conversations') debouncedLoadConversations(400);
                    });
                    socket.on('important_announcement', function(data) {
                        playInternalChatSound();
                        window._lastImportantAnnouncementId = data.id;
                        var a = { id: data.id, title: data.title, body: data.body, fromUser: data.fromUser, targetType: 'all', targetId: null, createdAt: new Date().toISOString() };
                        showAnnouncementModal(a);
                        loadAnnouncements();
                        loadGeneralAnnouncementsMarquee();
                        if (typeof updateNavBadges === 'function') updateNavBadges();
                    });
                    socket.on('connect_error', function() { socket = null; });
                }
            } catch (e) { socket = null; }
        }
        function disconnectSocket() {
            if (socket) { socket.disconnect(); socket = null; }
        }
        var navBadgeRefreshInterval = null;
        function startNavBadgeRefresh() {
            if (navBadgeRefreshInterval) return;
            navBadgeRefreshInterval = setInterval(function() {
                if (!token) return;
                apiFetch('/api/analytics/dashboard').then(function(res) {
                    if (res.ok && res.data) updateNavBadges(res.data);
                }).catch(function(){});
            }, 120000);
        }
        function stopNavBadgeRefresh() { if (navBadgeRefreshInterval) { clearInterval(navBadgeRefreshInterval); navBadgeRefreshInterval = null; } }
        var callRingtoneInterval = null;
        var callRingtoneCtx = null;
        function playInternalChatSound() {
            try {
                var ctx = new (window.AudioContext || window.webkitAudioContext)();
                var playTone = function(freq, start, dur, vol) {
                    var osc = ctx.createOscillator();
                    var gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0, start);
                    gain.gain.linearRampToValueAtTime(vol || 0.08, start + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, start + (dur || 0.15));
                    osc.start(start);
                    osc.stop(start + (dur || 0.15));
                };
                playTone(523.25, 0, 0.1, 0.06);
                playTone(659.25, 0.12, 0.12, 0.05);
            } catch (e) {}
        }
        function playCallRingtone() {
            stopCallRingtone();
            try {
                var ctx = new (window.AudioContext || window.webkitAudioContext)();
                callRingtoneCtx = ctx;
                var playTone = function() {
                    if (!callRingtoneCtx) return;
                    var c = callRingtoneCtx;
                    var melody = [{ f: 523.25, t: 0 }, { f: 659.25, t: 0.12 }, { f: 783.99, t: 0.24 }, { f: 1046.5, t: 0.36 }];
                    var t0 = c.currentTime;
                    melody.forEach(function(n, i) {
                        var osc = c.createOscillator();
                        var osc2 = c.createOscillator();
                        var gain = c.createGain();
                        osc.type = 'sine';
                        osc2.type = 'sine';
                        osc.frequency.value = n.f;
                        osc2.frequency.value = n.f * 1.25;
                        osc.connect(gain);
                        osc2.connect(gain);
                        gain.connect(c.destination);
                        var st = t0 + n.t;
                        gain.gain.setValueAtTime(0, st);
                        gain.gain.linearRampToValueAtTime(0.06, st + 0.02);
                        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.22);
                        osc.start(st);
                        osc.stop(st + 0.22);
                        osc2.start(st);
                        osc2.stop(st + 0.22);
                    });
                };
                playTone();
                callRingtoneInterval = setInterval(playTone, 2000);
            } catch (e) {}
        }
        function stopCallRingtone() {
            if (callRingtoneInterval) { clearInterval(callRingtoneInterval); callRingtoneInterval = null; }
            callRingtoneCtx = null;
        }
        function playCallConnected() {
            stopCallRingtone();
            try {
                var ctx = new (window.AudioContext || window.webkitAudioContext)();
                var osc1 = ctx.createOscillator();
                var osc2 = ctx.createOscillator();
                var osc3 = ctx.createOscillator();
                var gain = ctx.createGain();
                osc1.type = 'sine';
                osc2.type = 'sine';
                osc3.type = 'sine';
                osc1.frequency.value = 523.25;
                osc2.frequency.value = 659.25;
                osc3.frequency.value = 783.99;
                osc1.connect(gain);
                osc2.connect(gain);
                osc3.connect(gain);
                gain.connect(ctx.destination);
                var t = ctx.currentTime;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.08, t + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
                osc1.start(t);
                osc1.stop(t + 0.4);
                osc2.start(t);
                osc2.stop(t + 0.4);
                osc3.start(t);
                osc3.stop(t + 0.4);
            } catch (e) {}
        }
        function isImageExt(name) { return /\.(png|jpg|jpeg|gif|webp)$/i.test(name || ''); }
        function isPdfExt(name) { return /\.pdf$/i.test(name || ''); }
        function renderInternalAttachment(a) {
            var allowDl = a.allowDownload !== false;
            var name = a.name || t('file');
            var fullUrl = (a.url && a.url.startsWith('/')) ? (window.API || '') + a.url : a.url;
            fullUrl = ensureHttpsUrl(fullUrl);
            if (allowDl) return '<a href="' + escapeHtml(fullUrl) + '" target="_blank" rel="noopener" style="color:var(--accent); display:block; margin-top:4px;">📎 ' + escapeHtml(name) + '</a>';
            if (isImageExt(name)) return '<div class="internal-att-viewonly" style="margin-top:6px;"><img src="' + escapeHtml(fullUrl) + '" alt="" style="max-width:100%; max-height:200px; border-radius:6px; pointer-events:none; user-select:none;" oncontextmenu="return false;"><span class="badge" style="font-size:0.7rem; margin-top:4px; display:inline-block;">' + (LANG === 'fa' ? 'فقط نمایش' : 'View only') + '</span></div>';
            if (isPdfExt(name)) return '<div class="internal-att-viewonly" style="margin-top:6px;"><iframe src="' + escapeHtml(fullUrl) + '#toolbar=0" style="width:100%; height:200px; border:1px solid var(--border); border-radius:6px;" oncontextmenu="return false;"></iframe><span class="badge" style="font-size:0.7rem; margin-top:4px; display:inline-block;">' + (LANG === 'fa' ? 'فقط نمایش' : 'View only') + '</span></div>';
            return '<div style="margin-top:4px;"><span style="color:var(--text-secondary);">📎 ' + escapeHtml(name) + '</span> <span class="badge" style="font-size:0.7rem;">' + (LANG === 'fa' ? 'فقط نمایش' : 'View only') + '</span></div>';
        }
        function toggleInternalFileOption() {
            var fi = document.getElementById('internalChatFile');
            var opt = document.getElementById('internalChatFileOption');
            if (opt) opt.style.display = (fi && fi.files && fi.files[0]) ? 'inline' : 'none';
        }
        function appendInternalMessage(m) {
            var list = document.getElementById('internalChatMessages');
            if (!list || !currentInternalThreadId) return;
            var emptyEl = list.querySelector('.empty');
            if (emptyEl) emptyEl.remove();
            var me = (currentUser && currentUser.id) || '';
            var isOut = m.fromUserId === me;
            var att = (m.attachments && m.attachments.length) ? m.attachments.map(renderInternalAttachment).join('') : '';
            var avatarHtml = internalMsgAvatarHtml(m.fromUser);
            var timeStr = (m.fromUser && m.fromUser.name ? m.fromUser.name : '') + ' · ' + (m.createdAt ? fmtTZ(m.createdAt, 'time') : '');
            var html = '<div class="msg ' + (isOut ? 'out' : 'in') + '">' + avatarHtml + '<div class="msg-body"><div>' + escapeHtml(m.content || '') + '</div>' + att + '<div class="time">' + escapeHtml(timeStr) + '</div></div></div>';
            list.insertAdjacentHTML('beforeend', html);
            list.scrollTop = list.scrollHeight;
        }
        var STAFF_ACTIVITY_INTERVAL_VISIBLE = 15000;
        var STAFF_ACTIVITY_INTERVAL_HIDDEN = 30000;
        function startStaffActivityLive() {
            if (staffActivityInterval) clearInterval(staffActivityInterval);
            var ms = (typeof document !== 'undefined' && document.hidden) ? STAFF_ACTIVITY_INTERVAL_HIDDEN : STAFF_ACTIVITY_INTERVAL_VISIBLE;
            staffActivityInterval = setInterval(loadStaffActivity, ms);
            if (typeof document !== 'undefined' && document.addEventListener) {
                document.removeEventListener('visibilitychange', _staffActivityVisibilityHandler);
                document.addEventListener('visibilitychange', _staffActivityVisibilityHandler);
            }
        }
        function _staffActivityVisibilityHandler() {
            if (!staffActivityInterval) return;
            clearInterval(staffActivityInterval);
            var ms = document.hidden ? STAFF_ACTIVITY_INTERVAL_HIDDEN : STAFF_ACTIVITY_INTERVAL_VISIBLE;
            staffActivityInterval = setInterval(loadStaffActivity, ms);
        }
        function stopStaffActivityLive() {
            if (staffActivityInterval) { clearInterval(staffActivityInterval); staffActivityInterval = null; }
            if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', _staffActivityVisibilityHandler);
        }

        function doHeaderSearch() {
            var inp = document.getElementById('headerSearch');
            var modalInp = document.getElementById('headerSearchModalInput');
            var q = (inp && inp.value) ? inp.value.trim() : ((modalInp && modalInp.value) ? modalInp.value.trim() : '');
            if (!q) return;
            var active = document.querySelector('.nav-link.active');
            var page = active ? active.getAttribute('data-page') : '';
            if (page === 'conversations') { showPage('conversations'); toast(LANG === 'en' ? 'Search in conversations is supported via API filter.' : 'جستج�� در ��Rست �&کا��&ات از ف�R�تر API پشت�Rبا� �R �&�R�Rش��د.'); }
            else if (page === 'customers') { showPage('customers'); toast(LANG === 'en' ? 'Search in customers is supported via API filter.' : 'جستج�� در �&شتر�Rا�  از ف�R�تر API پشت�Rبا� �R �&�R�Rش��د.'); }
            else toast(LANG === 'en' ? 'Search in this section coming soon.' : 'جستج�� در ا�R�  بخش ب�! ز��د�R.'); 
        }

        function toast(msg, isErr) {
            var el = document.getElementById('toast');
            el.textContent = msg;
            el.className = 'toast' + (isErr ? ' err' : '');
            el.style.display = 'block';
            setTimeout(function() { el.style.display = 'none'; }, 3500);
        }

        function setLoading(listId, count) {
            var list = document.getElementById(listId);
            if (!list) return;
            var isTicketList = listId === 'ticketList';
            var html = '';
            for (var i = 0; i < (count || 5); i++) {
                if (isTicketList) html += '<div class="ticket-card ticket-card-skeleton"><div class="ticket-card-body"><div class="loading-skeleton" style="height:12px;width:80px;margin-bottom:8px;"></div><div class="loading-skeleton" style="height:16px;width:90%;margin-bottom:6px;"></div><div class="loading-skeleton" style="height:12px;width:60%;"></div></div><div class="ticket-card-badges"><span class="loading-skeleton" style="height:24px;width:50px;border-radius:8px;"></span><span class="loading-skeleton" style="height:24px;width:60px;border-radius:8px;"></span></div></div>';
                else html += '<div class="loading-skeleton loading-row"></div>';
            }
            list.innerHTML = html;
        }

        async function apiFetch(url, opts) {
            var opt = opts || {};
            var h = opt.auth === false ? { 'Content-Type': 'application/json' } : headers();
            var r = await fetch(API + url, { ...opt, headers: { ...h, ...opt.headers }, body: opt.body });
            var text = await r.text();
            if ((text || '').trim().startsWith('<')) {
                return { ok: false, needLogin: false, error: 'سر��ر ب�! جا�R JSON پاسخ داد. از پ��ش�! backend دست��ر node server.js را اجرا ک� �Rد.' };
            }
            var data;
            try { data = JSON.parse(text); } catch (_) {
                return { ok: false, needLogin: false, error: 'پاسخ سر��ر � ا�&عتبر است' };
            }
            if (r.status === 401) {
                token = null; localStorage.removeItem('crm_token'); document.documentElement.classList.remove('auth-has-token'); document.getElementById('loginBox').style.display = 'flex'; document.getElementById('app').classList.remove('show');
                var errEl = document.getElementById('loginErr');
                if (errEl) errEl.textContent = (LANG === 'fa' ? 'نشست منقضی شده. لطفاً دوباره وارد شوید.' : 'Session expired. Please sign in again.');
                return { ok: false, needLogin: true, error: (data && data.error) ? data.error : (LANG === 'fa' ? 'لطفاً دوباره وارد شوید' : 'Please sign in again') };
            }
            return { ok: r.ok, status: r.status, data: data };
        }

        (function initLoginTogglePass() {
            var wrap = document.querySelector('.login-box .password-wrap');
            if (!wrap) return;
            var input = wrap.querySelector('input');
            var btn = document.getElementById('loginTogglePass');
            if (!input || !btn) return;
            btn.addEventListener('click', function() {
                var show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                var title = show ? (LANG === 'fa' ? 'مخفی کردن رمز' : 'Hide password') : (LANG === 'fa' ? 'نمایش رمز' : 'Show password');
                btn.setAttribute('title', title);
                btn.setAttribute('aria-label', title);
                btn.setAttribute('aria-pressed', show ? 'true' : 'false');
                btn.classList.toggle('active', show);
                var use = btn.querySelector('use');
                if (use) use.setAttribute('href', show ? '#icon-eye-off' : '#icon-eye');
            });
        })();

        (function setupLoginEnterKey() {
            function onLoginKeydown(e) {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                var totpStep = document.getElementById('loginStepTotp');
                var isTotpVisible = totpStep && totpStep.style.display !== 'none';
                if (isTotpVisible) {
                    if (typeof verifyTotpLogin === 'function') verifyTotpLogin();
                } else {
                    if (typeof login === 'function') login();
                }
            }
            var emailEl = document.getElementById('email');
            var passEl = document.getElementById('pass');
            var totpEl = document.getElementById('totpCode');
            if (emailEl) emailEl.addEventListener('keydown', onLoginKeydown);
            if (passEl) passEl.addEventListener('keydown', onLoginKeydown);
            if (totpEl) totpEl.addEventListener('keydown', onLoginKeydown);
        })();

        async function login() {
            var email = document.getElementById('email').value.trim();
            var pass = document.getElementById('pass').value;
            document.getElementById('loginErr').textContent = '';
            var btn = document.getElementById('btnLogin');
            btn.disabled = true;
            btn.textContent = t('login_loading');
            var r, text;
            try {
                r = await fetch(API + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, password: pass }) });
                text = await r.text();
            } catch (e) {
                btn.disabled = false;
                btn.textContent = t('login_btn');
                document.getElementById('loginErr').textContent = t('login_err_connect');
                return;
            }
            btn.disabled = false;
            btn.textContent = t('login_btn');
            if ((text || '').trim().startsWith('<')) {
                document.getElementById('loginErr').textContent = t('login_err_server_html');
                return;
            }
            var data;
            try { data = JSON.parse(text); } catch (_) {
                var hint;
                if (r.status === 0) hint = t('login_err_connect');
                else if (r.status === 429) hint = t('login_err_429');
                else hint = t('login_err_invalid') + ' (HTTP ' + r.status + ')';
                document.getElementById('loginErr').textContent = hint;
                return;
            }
            if (r.status === 429) {
                document.getElementById('loginErr').textContent = (data && data.error) ? data.error : t('login_err_429');
                return;
            }
            if (data.needTotp && data.tempToken) {
                window._totpTempToken = data.tempToken;
                document.getElementById('totpStepEmail').textContent = t('login_totp_for') + ' ' + (data.email || '') + ' ' + t('login_totp_enter');
                document.getElementById('loginStep1').style.display = 'none';
                document.getElementById('loginStepTotp').style.display = 'block';
                document.getElementById('totpCode').value = '';
                document.getElementById('totpErr').textContent = '';
                document.getElementById('totpCode').focus();
                return;
            }
            if (data.token) {
                token = data.token;
                localStorage.setItem('crm_token', token);
                document.documentElement.classList.add('auth-has-token');
                currentUser = data.user || {};
                setUserDisplay(currentUser);
                document.getElementById('loginBox').style.display = 'none';
                document.getElementById('app').classList.add('show');
                try {
                    applyNavByRole();
                    await loadPanelSettingsAndApply();
                    applyHashRoute();
                    startRatesInterval();
                    startPresenceInterval();
                    connectSocket();
                    startNavBadgeRefresh();
                    showTotpPromptIfNeeded();
                } catch (e) { console.error('Post-login init:', e); }
            } else {
                document.getElementById('loginErr').textContent = data.error || t('login_err_fail');
            }
        }
        function backToLoginStep1() {
            document.getElementById('loginStepTotp').style.display = 'none';
            document.getElementById('loginStep1').style.display = 'block';
            document.getElementById('loginStepForgot').style.display = 'none';
            document.getElementById('loginStepReset').style.display = 'none';
            window._totpTempToken = null;
        }
        function showForgotStep() {
            document.getElementById('loginStep1').style.display = 'none';
            document.getElementById('loginStepTotp').style.display = 'none';
            document.getElementById('loginStepReset').style.display = 'none';
            var el = document.getElementById('loginStepForgot');
            if (el) { el.style.display = 'block'; document.getElementById('forgotEmail').value = ''; document.getElementById('forgotErr').textContent = ''; document.getElementById('forgotSuccess').style.display = 'none'; }
        }
        function backToLoginFromForgot() {
            document.getElementById('loginStepForgot').style.display = 'none';
            document.getElementById('loginStep1').style.display = 'block';
        }
        async function submitForgotPassword() {
            var email = (document.getElementById('forgotEmail') && document.getElementById('forgotEmail').value || '').trim();
            var errEl = document.getElementById('forgotErr');
            var successEl = document.getElementById('forgotSuccess');
            var btn = document.getElementById('btnForgotSubmit');
            if (!email) { if (errEl) errEl.textContent = (LANG === 'fa' ? 'ایمیل را وارد کنید.' : 'Please enter your email.'); return; }
            if (errEl) errEl.textContent = '';
            if (successEl) successEl.style.display = 'none';
            if (btn) btn.disabled = true;
            try {
                var r = await fetch(API + '/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }) });
                var data = await r.json().catch(function() { return {}; });
                if (successEl) { successEl.textContent = (data.message || t('forgot_success_msg')); successEl.style.display = 'block'; }
            } catch (e) { if (errEl) errEl.textContent = t('login_err_connect'); }
            if (btn) btn.disabled = false;
        }
        function showResetStep(resetToken) {
            window._resetToken = resetToken;
            document.getElementById('loginStep1').style.display = 'none';
            document.getElementById('loginStepTotp').style.display = 'none';
            document.getElementById('loginStepForgot').style.display = 'none';
            var el = document.getElementById('loginStepReset');
            if (el) { el.style.display = 'block'; document.getElementById('resetNewPass').value = ''; document.getElementById('resetConfirmPass').value = ''; document.getElementById('resetErr').textContent = ''; }
        }
        function backToLoginFromReset() {
            window._resetToken = null;
            document.getElementById('loginStepReset').style.display = 'none';
            document.getElementById('loginStep1').style.display = 'block';
            try { var u = window.location.pathname + window.location.hash; window.history.replaceState(null, '', u.replace(/\?.*$/, '')); } catch (_) {}
        }
        async function submitResetPassword() {
            var newPass = document.getElementById('resetNewPass') && document.getElementById('resetNewPass').value || '';
            var confirmPass = document.getElementById('resetConfirmPass') && document.getElementById('resetConfirmPass').value || '';
            var errEl = document.getElementById('resetErr');
            var btn = document.getElementById('btnResetSubmit');
            if (newPass !== confirmPass) { if (errEl) errEl.textContent = t('reset_err_match'); return; }
            if (newPass.length < 6) { if (errEl) errEl.textContent = t('reset_err_length'); return; }
            if (!window._resetToken) { if (errEl) errEl.textContent = 'لینک منقضی شده است.'; return; }
            if (errEl) errEl.textContent = '';
            if (btn) btn.disabled = true;
            try {
                var r = await fetch(API + '/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: window._resetToken, newPassword: newPass }) });
                var data = await r.json().catch(function() { return {}; });
                if (r.ok && data.message) {
                    window._resetToken = null;
                    if (errEl) errEl.textContent = '';
                    try { window.history.replaceState(null, '', window.location.pathname + window.location.hash); } catch (_) {}
                    document.getElementById('loginStepReset').style.display = 'none';
                    document.getElementById('loginStep1').style.display = 'block';
                    document.getElementById('email').value = '';
                    document.getElementById('pass').value = '';
                    document.getElementById('loginErr').textContent = data.message;
                    document.getElementById('loginErr').style.color = 'var(--success, #059669)';
                    return;
                }
                if (errEl) errEl.textContent = (data.error || (LANG === 'fa' ? 'خطا در تغییر رمز.' : 'Failed to reset password.'));
            } catch (e) { if (errEl) errEl.textContent = t('login_err_connect'); }
            if (btn) btn.disabled = false;
        }
        (function checkResetPasswordUrl() {
            if (localStorage.getItem('crm_token')) return;
            var params = new URLSearchParams(window.location.search);
            var reset = params.get('reset');
            var token = params.get('token');
            if (reset === '1' && token && typeof showResetStep === 'function') showResetStep(token);
        })();
        async function verifyTotpLogin() {
            var code = (document.getElementById('totpCode') && document.getElementById('totpCode').value || '').replace(/\s/g, '');
            if (!code || code.length !== 6) { document.getElementById('totpErr').textContent = t('login_totp_code_required'); return; }
            if (!window._totpTempToken) { document.getElementById('totpErr').textContent = t('login_totp_retry'); return; }
            document.getElementById('totpErr').textContent = '';
            document.getElementById('btnTotpVerify').disabled = true;
            var r = await fetch(API + '/api/auth/totp/verify-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tempToken: window._totpTempToken, code: code }) });
            var data = await r.json().catch(function() { return {}; });
            document.getElementById('btnTotpVerify').disabled = false;
            if (data.token) {
                window._totpTempToken = null;
                token = data.token;
                localStorage.setItem('crm_token', token);
                document.documentElement.classList.add('auth-has-token');
                currentUser = data.user || {};
                setUserDisplay(currentUser);
                document.getElementById('loginBox').style.display = 'none';
                document.getElementById('app').classList.add('show');
                try {
                    applyNavByRole();
                    await loadPanelSettingsAndApply();
                    applyHashRoute();
                    startRatesInterval();
                    startPresenceInterval();
                    connectSocket();
                    startNavBadgeRefresh();
                    showTotpPromptIfNeeded();
                } catch (e) { console.error('Post-TOTP init:', e); }
            } else {
                document.getElementById('totpErr').textContent = data.error || t('login_totp_bad');
            }
        }
        if (typeof window !== 'undefined') {
            window.login = login;
            window.verifyTotpLogin = verifyTotpLogin;
            window.backToLoginStep1 = backToLoginStep1;
            window.showForgotStep = showForgotStep;
            window.backToLoginFromForgot = backToLoginFromForgot;
            window.submitForgotPassword = submitForgotPassword;
            window.submitResetPassword = submitResetPassword;
            window.backToLoginFromReset = backToLoginFromReset;
        }
        function showTotpPromptIfNeeded() {
            if (!currentUser) return;
            if (currentUser.totpEnabled) return;
            if (localStorage.getItem('totp_prompt_dismissed')) return;
            var ban = document.getElementById('totpPromptBanner');
            if (ban) ban.style.display = 'block';
        }
        function setElText(id, text) { var el = document.getElementById(id); if (el) el.textContent = text || '\u2014'; }
        function updateProfileAvatarPreview(urlOrName) {
            var el = document.getElementById('profileAvatarPreview');
            if (!el) return;
            var raw = (typeof urlOrName === 'string' && urlOrName.trim()) ? urlOrName.trim() : '';
            var url = null;
            if (raw.indexOf('http') === 0) url = raw;
            else if (raw.indexOf('/') === 0) url = (window.location.origin || '') + raw;
            var name = !url ? raw : (currentUser && (currentUser.firstName || currentUser.lastName || currentUser.name)) ? [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ').trim() || currentUser.name : '';
            var initial = (name && name[0]) ? name[0].toUpperCase() : '?';
            if (url) {
                var img = new Image();
                img.onload = function() { el.innerHTML = ''; el.appendChild(img); };
                img.onerror = function() { el.innerHTML = '<span>' + escapeHtml(initial) + '</span>'; };
                img.src = url;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
            } else {
                el.innerHTML = '<span>' + escapeHtml(initial) + '</span>';
            }
        }
        async function loadProfile() {
            var u = null;
            var res = await apiFetch('/api/users/me');
            if (res.ok && res.data) { u = res.data; currentUser = res.data; }
            else if (currentUser) u = currentUser;
            if (u) {
                var roleLabel = (LANG === 'fa' ? { owner: 'مالک', admin: 'ادمین', manager: 'مدیر', supervisor: 'ناظر', agent: 'کارمند' } : { owner: 'Owner', admin: 'Admin', manager: 'Manager', supervisor: 'Supervisor', agent: 'Agent' })[u.role] || u.role;
                var branchName = (u.branch && u.branch.name) ? u.branch.name : '\u2014';
                var deptName = (u.department && u.department.name) ? u.department.name : '\u2014';
                var lastLogin = u.lastLoginAt ? fmtTZ(u.lastLoginAt, 'datetime') : '\u2014';
                var displayName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.name || '\u2014';
                setElText('profileDisplayUsername', u.username ? '@' + u.username : '\u2014');
                setElText('profileDisplayName', displayName);
                setElText('profileDisplayEmail', u.email || '\u2014');
                setElText('profileRoleBadge', roleLabel);
                setElText('profileBranchBadge', branchName);
                setElText('profileDepartmentText', (LANG === 'fa' ? 'دپارتمان: ' : 'Dept: ') + deptName);
                setElText('profileLastLogin', (LANG === 'fa' ? 'آخرین ورود: ' : 'Last login: ') + lastLogin);
                setElText('profileEmail', u.email);
                setElText('profileDepartment', deptName);
                var canEditEmail = !!(currentUser && currentUser.permissions && currentUser.permissions.manage_users);
                var emailGroup = document.getElementById('profileEmailGroup');
                var emailReadonlyRow = document.getElementById('profileEmailReadonlyRow');
                var emailInput = document.getElementById('profileEmailInput');
                if (emailGroup && emailReadonlyRow && emailInput) {
                    if (canEditEmail) {
                        emailGroup.style.display = '';
                        emailReadonlyRow.style.display = 'none';
                        emailInput.value = u.email || '';
                    } else {
                        emailGroup.style.display = 'none';
                        emailReadonlyRow.style.display = '';
                    }
                }
                var usernameEl = document.getElementById('profileUsername');
                var firstEl = document.getElementById('profileFirstName');
                var lastEl = document.getElementById('profileLastName');
                var dobEl = document.getElementById('profileDateOfBirth');
                if (usernameEl) usernameEl.value = u.username || '';
                if (firstEl) firstEl.value = u.firstName || '';
                if (lastEl) lastEl.value = u.lastName || '';
                if (dobEl) dobEl.value = u.dateOfBirth || '';
                if (document.getElementById('profileDepartment')) document.getElementById('profileDepartment').value = (u.department && u.department.name) ? u.department.name : '�';
                if (document.getElementById('profilePhone')) document.getElementById('profilePhone').value = u.phone || '';
                var avatarEl = document.getElementById('profileAvatar');
                if (avatarEl) { avatarEl.value = u.avatar || ''; if (!avatarEl._bound) { avatarEl._bound = true; avatarEl.addEventListener('input', function() { updateProfileAvatarPreview(avatarEl.value); }); avatarEl.addEventListener('blur', function() { updateProfileAvatarPreview(avatarEl.value || displayName); }); } }
                var avatarFileEl = document.getElementById('profileAvatarFile');
                if (avatarFileEl && !avatarFileEl._bound) { avatarFileEl._bound = true; avatarFileEl.addEventListener('change', function() { if (avatarFileEl.files && avatarFileEl.files[0]) uploadProfileAvatar(avatarFileEl.files[0]); }); }
                if (document.getElementById('profilePassword')) document.getElementById('profilePassword').value = '';
                updateProfileAvatarPreview(u.avatar || displayName);
            }
            var statusEl = document.getElementById('profileTotpStatus');
            var actionsEl = document.getElementById('profileTotpActions');
            if (statusEl && actionsEl) {
                var enabled = !!(u && u.totpEnabled);
                statusEl.innerHTML = enabled ? '<span class="badge done">' + t('totp_active') + '</span>' : '<span class="badge pending">' + t('totp_inactive') + '</span>';
                if (enabled) {
                    actionsEl.innerHTML = '<button type="button" class="btn-secondary" onclick="openTotpDisableModal()">' + t('totp_disable_btn') + '</button>';
                } else {
                    actionsEl.innerHTML = '<button type="button" class="btn-primary" onclick="openTotpSetup()">' + t('totp_setup_btn') + '</button>';
                }
            }
        }
        async function uploadProfileAvatar(file) {
            var formData = new FormData();
            formData.append('file', file);
            var r = await fetch((API || '') + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
            var data = await r.json().catch(function() { return {}; });
            if (data.url) {
                var avatarInput = document.getElementById('profileAvatar');
                var avatarValue = (data.url.indexOf('http') === 0) ? data.url : data.url;
                if (avatarInput) { avatarInput.value = avatarValue; updateProfileAvatarPreview(avatarValue); }
                var patchRes = await apiFetch('/api/users/me', { method: 'PATCH', body: JSON.stringify({ avatar: avatarValue }) });
                if (patchRes.ok) { if (patchRes.data) currentUser = patchRes.data; setUserDisplay(currentUser); toast(t('saved') || (LANG === 'fa' ? 'تصویر بارگذاری و ذخیره شد' : 'Image uploaded and saved')); }
                else { toast(t('saved') || (LANG === 'fa' ? 'تصویر بارگذاری شد — ذخیره تغییرات را بزنید' : 'Image uploaded — click Save to persist')); }
            } else { toast((data.error) || t('err_generic'), true); }
        }
        async function saveProfile() {
            var username = document.getElementById('profileUsername') && document.getElementById('profileUsername').value;
            var firstName = document.getElementById('profileFirstName') && document.getElementById('profileFirstName').value;
            var lastName = document.getElementById('profileLastName') && document.getElementById('profileLastName').value;
            var dateOfBirth = document.getElementById('profileDateOfBirth') && document.getElementById('profileDateOfBirth').value;
            var phone = document.getElementById('profilePhone') && document.getElementById('profilePhone').value;
            var avatar = document.getElementById('profileAvatar') && document.getElementById('profileAvatar').value;
            var password = document.getElementById('profilePassword') && document.getElementById('profilePassword').value;
            var body = { firstName: (firstName || '').trim() || null, lastName: (lastName || '').trim() || null, dateOfBirth: (dateOfBirth || '').trim() || null, phone: (phone || '').trim() || null, avatar: (avatar || '').trim() || null };
            var canEditEmail = !!(currentUser && currentUser.permissions && currentUser.permissions.manage_users);
            if (canEditEmail) {
                var emailInput = document.getElementById('profileEmailInput');
                if (emailInput && emailInput.offsetParent !== null) {
                    var emailVal = (emailInput.value || '').trim();
                    if (emailVal) body.email = emailVal;
                }
            }
            var usernameTrim = (username || '').trim();
            if (usernameTrim) body.username = usernameTrim;
            if (password) body.password = password;
            var btn = document.getElementById('profileSaveBtn');
            if (btn) { btn.disabled = true; btn.textContent = (LANG === 'fa' ? 'در حال ذخیره...' : LANG === 'tr' ? 'Kaydediliyor...' : 'Saving...'); }
            var res = await apiFetch('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) });
            if (btn) { btn.disabled = false; btn.textContent = t('profile_save') || (LANG === 'fa' ? 'ذخیره تغییرات' : 'Save changes'); }
            if (res.needLogin) return;
            if (res.ok) {
                toast(t('saved'));
                if (res.data) currentUser = res.data;
                var passEl = document.getElementById('profilePassword');
                if (passEl) passEl.value = '';
                setUserDisplay(currentUser);
                loadProfile();
            } else {
                toast((res.data && res.data.error) || t('err_generic'), true);
            }
        }
        function closeTotpSetupModal() { document.getElementById('totpSetupModal').style.display = 'none'; }
        async function openTotpSetup() {
            var res = await apiFetch('/api/auth/totp/setup');
            if (res.needLogin || !res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); return; }
            var d = res.data;
            document.getElementById('totpSetupQr').innerHTML = d.qrCode ? '<img src="' + d.qrCode + '" alt="QR" style="max-width:220px; height:auto;">' : '';
            document.getElementById('totpSetupSecret').textContent = d.secret ? t('modal_totp_secret') + ' ' + d.secret : '';
            document.getElementById('totpSetupCode').value = '';
            document.getElementById('totpSetupModal').style.display = 'flex';
        }
        async function confirmTotpSetup() {
            var code = (document.getElementById('totpSetupCode') && document.getElementById('totpSetupCode').value || '').replace(/\s/g, '');
            if (!code || code.length !== 6) { toast(t('enter_6_digit'), true); return; }
            var res = await apiFetch('/api/auth/totp/confirm-setup', { method: 'POST', body: JSON.stringify({ code: code }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_totp_enabled')); closeTotpSetupModal(); currentUser.totpEnabled = true; loadProfile(); document.getElementById('totpPromptBanner').style.display = 'none'; } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function closeTotpDisableModal() { document.getElementById('totpDisableModal').style.display = 'none'; document.getElementById('totpDisablePassword').value = ''; }
        function openTotpDisableModal() { document.getElementById('totpDisablePassword').value = ''; document.getElementById('totpDisableModal').style.display = 'flex'; }
        async function disableTotpSubmit() {
            var password = document.getElementById('totpDisablePassword') && document.getElementById('totpDisablePassword').value;
            if (!password) { toast(t('enter_password'), true); return; }
            var res = await apiFetch('/api/auth/totp/disable', { method: 'POST', body: JSON.stringify({ password: password }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_totp_disabled')); closeTotpDisableModal(); currentUser.totpEnabled = false; loadProfile(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        async function logout() {
            if (token) {
                try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch (_) {}
            }
            if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }
            if (ratesInterval) { clearInterval(ratesInterval); ratesInterval = null; }
            if (tickerTimeInterval) { clearInterval(tickerTimeInterval); tickerTimeInterval = null; }
            stopStaffActivityLive();
            stopNavBadgeRefresh();
            disconnectSocket();
            token = null;
            currentUser = null;
            localStorage.removeItem('crm_token');
            document.documentElement.classList.remove('auth-has-token');
            document.getElementById('loginBox').style.display = 'flex';
            document.getElementById('app').classList.remove('show');
        }

        function escapeHtml(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
        function ensureHttpsUrl(url) { if (!url || typeof url !== 'string') return url; if (url.startsWith('http:') && window.location.protocol === 'https:') return 'https:' + url.slice(5); return url; }
        function resolveAvatarUrl(avatar) { if (!avatar || typeof avatar !== 'string') return ''; var s = avatar.trim(); if (!s) return ''; if (s.indexOf('http') === 0) return ensureHttpsUrl(s); var origin = window.location.origin || ''; if (s.indexOf('/') === 0) return origin + s; return origin + '/' + s; }
        function internalMsgAvatarHtml(fromUser) { var u = fromUser || {}; var name = (u.name || u.email || '').trim(); var initial = name[0] ? name[0].toUpperCase() : '?'; var pic = resolveAvatarUrl(u.avatar); if (pic) return '<span class="msg-avatar"><span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(pic) + '" alt="" onerror="this.style.display=\'none\'"></span>'; return '<span class="msg-avatar">' + escapeHtml(initial) + '</span>'; }
        function userDisplay(u) { return (u && (u.username || u.name || u.email)) || ''; }

        function refreshDashboard() {
            var btn = document.getElementById('dashboardRefreshBtn');
            if (btn) { btn.classList.add('loading'); btn.disabled = true; }
            loadDashboard().then(function() {
                if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
            }).catch(function() { if (btn) { btn.classList.remove('loading'); btn.disabled = false; } });
        }
        function setDashboardError(container, cardsTitleEl, message) {
            if (container) container.innerHTML = '<div class="dashboard-load-error empty">' + (message || (LANG === 'fa' ? 'بارگذاری ناموفق بود. دوباره تلاش کنید.' : 'Failed to load. Try again.')) + '</div>';
            if (cardsTitleEl) cardsTitleEl.style.display = 'none';
        }
        async function loadDashboard() {
            var container = document.getElementById('dashboardCards');
            var summaryEl = document.getElementById('dashboardSummary');
            var quickEl = document.getElementById('dashboardQuickActions');
            var attentionEl = document.getElementById('dashboardAttention');
            var cardsTitleEl = document.getElementById('dashboardCardsTitle');
            if (!container) return;
            var perms = (currentUser && currentUser.permissions) || {};
            var can = function(section) { return section === 'profile' || perms[section] !== false; };
            if (container) container.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            if (summaryEl) summaryEl.innerHTML = '';
            if (quickEl) quickEl.innerHTML = '';
            if (attentionEl) { attentionEl.innerHTML = ''; attentionEl.style.display = 'none'; }
            var res;
            try {
                res = await apiFetch('/api/analytics/dashboard');
            } catch (e) {
                setDashboardError(container, cardsTitleEl, LANG === 'fa' ? 'خطا در ارتباط با سرور.' : 'Network error.');
                return;
            }
            if (res.needLogin) {
                setDashboardError(container, cardsTitleEl, LANG === 'fa' ? 'لطفاً وارد شوید.' : 'Please sign in.');
                return;
            }
            var stats = res.ok && res.data ? res.data : {};
            var n = function(v) { return (v != null && typeof v === 'number') ? v : 0; };
            if (attentionEl && (n(stats.unreadConversations) > 0 || n(stats.tasksPending) > 0 || n(stats.unreadAnnouncements) > 0)) {
                var parts = [];
                if (can('conversations') && n(stats.unreadConversations) > 0) parts.push('<a href="#conversations" onclick="showPage(\'conversations\'); setConvQuickTab(\'unread\'); return false;" class="dashboard-attention-link">' + (LANG === 'fa' ? '&#128172; ' : '') + n(stats.unreadConversations) + (LANG === 'fa' ? ' مکالمه خوانده\u200cنشده' : ' unread conversation(s)') + '</a>');
                if (can('tasks') && n(stats.tasksPending) > 0) parts.push('<a href="#tasks" onclick="showPage(\'tasks\'); return false;" class="dashboard-attention-link">' + (LANG === 'fa' ? '&#128203; ' : '') + n(stats.tasksPending) + (LANG === 'fa' ? ' تسک در انتظار' : ' task(s) pending') + '</a>');
                if (can('announcements') && n(stats.unreadAnnouncements) > 0) parts.push('<a href="#announcements" onclick="showPage(\'announcements\'); return false;" class="dashboard-attention-link">' + (LANG === 'fa' ? '&#128276; ' : '') + n(stats.unreadAnnouncements) + (LANG === 'fa' ? ' اعلان خوانده\u200cنشده' : ' unread announcement(s)') + '</a>');
                if (parts.length) {
                    attentionEl.innerHTML = (LANG === 'fa' ? 'نیاز به توجه: ' : 'Needs attention: ') + parts.join(' · ');
                    attentionEl.style.display = 'block';
                }
            }
            if (summaryEl) {
                var summaryItems = [];
                if (can('staff_activity') || can('users')) {
                    summaryItems.push({ page: 'staff-activity', num: n(stats.staffOnline), label: t('dashboard_stat_online') });
                    summaryItems.push({ page: 'staff-activity', num: n(stats.loginsToday), label: t('dashboard_stat_logins_today') });
                }
                if (can('conversations')) {
                    summaryItems.push({ page: 'conversations', num: n(stats.openConversations), label: t('dashboard_stat_conversations'), warn: n(stats.unreadConversations) > 0 });
                    if (n(stats.unreadConversations) > 0) summaryItems.push({ page: 'conversations', num: n(stats.unreadConversations), label: t('dashboard_stat_unread'), warn: true });
                }
                if (can('tickets')) summaryItems.push({ page: 'tickets', num: n(stats.ticketsOpen), label: t('dashboard_stat_tickets') });
                if (can('customers')) summaryItems.push({ page: 'customers', num: n(stats.totalCustomers), label: t('dashboard_stat_customers') });
                if (can('tasks')) summaryItems.push({ page: 'tasks', num: n(stats.tasksPending), label: t('dashboard_stat_tasks') });
                if (can('conversations')) summaryItems.push({ page: 'conversations', num: n(stats.todayMessages), label: t('dashboard_stat_messages_today') });
                if (can('announcements') && n(stats.unreadAnnouncements) > 0) summaryItems.push({ page: 'announcements', num: n(stats.unreadAnnouncements), label: t('dashboard_stat_announcements'), warn: true });
                var summaryHtml = summaryItems.map(function(item) {
                    var cls = 'dashboard-stat-box' + (item.warn ? ' warn' : '');
                    return '<a href="#' + escapeHtml(item.page) + '" class="' + cls + '" onclick="showPage(\'' + item.page.replace(/'/g, "\\'") + '\'); return false;"><span class="stat-number">' + escapeHtml(String(item.num)) + '</span><span class="stat-label">' + escapeHtml(item.label) + '</span></a>';
                }).join('');
                summaryEl.innerHTML = summaryHtml || '';
            }
            if (quickEl) {
                var quickBtns = [];
                if (can('conversations')) quickBtns.push({ label: t('dashboard_quick_new_conv'), icon: 'icon-chat', onclick: "showPage('conversations'); openNewConvModal();" });
                if (can('customers')) quickBtns.push({ label: t('dashboard_quick_new_customer'), icon: 'icon-user-plus', onclick: "showPage('customers'); openCustomerModal();" });
                if (can('tickets')) quickBtns.push({ label: t('dashboard_quick_new_ticket'), icon: 'icon-ticket', onclick: "showPage('tickets'); setTimeout(function(){ toggleTicketForm(); }, 350);" });
                var quickHtml = quickBtns.map(function(b) {
                    return '<button type="button" class="btn-quick" onclick="' + escapeHtml(b.onclick) + '"><svg viewBox="0 0 24 24"><use href="#' + escapeHtml(b.icon) + '"/></svg>' + escapeHtml(b.label) + '</button>';
                }).join('');
                quickEl.innerHTML = quickHtml || '';
            }
            var cards = [
                { page: 'conversations', section: 'conversations', title: t('nav_conversations'), icon: 'icon-chat', stat: n(stats.unreadConversations) > 0 ? (n(stats.unreadConversations) + ' ' + (LANG === 'fa' ? 'خوانده\u200cنشده' : 'unread')) : (n(stats.openConversations) + ' ' + (LANG === 'fa' ? 'باز' : 'open')), badgeWarn: n(stats.unreadConversations) > 0 },
                { page: 'customers', section: 'customers', title: t('nav_customers'), icon: 'icon-users', stat: n(stats.totalCustomers) + (LANG === 'fa' ? ' مشتری' : ' customers') },
                { page: 'tickets', section: 'tickets', title: t('nav_tickets'), icon: 'icon-ticket', stat: n(stats.ticketsOpen) + (LANG === 'fa' ? ' تیکت باز' : ' open') },
                { page: 'tasks', section: 'tasks', title: t('nav_tasks'), icon: 'icon-task', stat: n(stats.tasksPending) + (LANG === 'fa' ? ' تسک در انتظار' : ' pending') },
                { page: 'announcements', section: 'announcements', title: t('nav_announcements'), icon: 'icon-user-online', stat: n(stats.announcementsCount) + (LANG === 'fa' ? ' اعلان' : ' announcements') },
                { page: 'departments', section: 'departments', title: t('nav_departments'), icon: 'icon-building', stat: null },
                { page: 'users', section: 'users', title: t('nav_users'), icon: 'icon-user', stat: null },
                { page: 'branches', section: 'branches', title: t('nav_branches'), icon: 'icon-building-2', stat: null },
                { page: 'processes', section: 'processes', title: t('nav_processes'), icon: 'icon-task', stat: null },
                { page: 'whatsapp', section: 'whatsapp', title: t('nav_whatsapp'), icon: 'icon-phone', stat: null },
                { page: 'rates', section: 'rates', title: t('nav_rates'), icon: 'icon-chart', stat: null },
                { page: 'services', section: 'services', title: t('nav_services'), icon: 'icon-building', stat: null },
                { page: 'profile', section: 'profile', title: t('nav_profile'), icon: 'icon-user', stat: null },
                { page: 'internal-chat', section: 'internal_chat', title: t('nav_internal_chat'), icon: 'icon-chat', stat: null },
                { page: 'supervision', section: 'supervision', title: t('nav_supervision'), icon: 'icon-chart', stat: null },
                { page: 'staff-activity', section: 'staff_activity', title: t('nav_staff_activity'), icon: 'icon-user-online', stat: null },
                { page: 'panel-settings', section: 'panel_settings', title: t('nav_panel_settings'), icon: 'icon-chart', stat: null }
            ];
            var html = '';
            cards.forEach(function(c) {
                if (!can(c.section)) return;
                var badge = c.stat ? ('<span class="card-badge' + (c.badgeWarn ? ' warn' : '') + '">' + escapeHtml(c.stat) + '</span>') : '';
                html += '<a href="#' + escapeHtml(c.page) + '" class="dashboard-card" data-page="' + escapeHtml(c.page) + '" onclick="showPage(\'' + c.page.replace(/'/g, "\\'") + '\'); return false;"><div class="card-icon"><svg viewBox="0 0 24 24"><use href="#' + c.icon + '"/></svg></div><div class="card-title">' + escapeHtml(c.title) + '</div>' + (c.stat ? '<p class="card-meta">' + escapeHtml(c.stat) + '</p>' : '') + badge + '</a>';
            });
            container.innerHTML = html || ('<div class="empty">' + (LANG === 'fa' ? 'دسترسی به بخشی وجود ندارد.' : 'No sections available.') + '</div>');
            if (cardsTitleEl) cardsTitleEl.style.display = html ? '' : 'none';
            updateNavBadges(stats);
        }

        async function loadGeneralAnnouncementsMarquee() {
            var banner = document.getElementById('announcementMarquee');
            if (!banner) return;
            try {
                var res = await apiFetch('/api/announcements/for-me');
                if (res.needLogin || !res.ok) { banner.style.display = 'none'; return; }
                var list = (res.data && res.data.data) ? res.data.data : [];
                var general = list.filter(function(a) { return a.targetType === 'all'; });
                var seenIds = {};
                general = general.filter(function(a) { if (a.id && seenIds[a.id]) return false; if (a.id) seenIds[a.id] = true; return true; });
                if (general.length === 0) { banner.style.display = 'none'; return; }
                var parts = general.map(function(a) { return (a.title || '') + (a.body ? ': ' + a.body : ''); });
                var full = parts.join('  •  ');
                if (!full.trim()) { banner.style.display = 'none'; return; }
                var inner = banner.querySelector('.announcement-marquee-inner');
                if (inner) { inner.innerHTML = escapeHtml(full); }
                banner.style.display = 'block';
            } catch (e) { banner.style.display = 'none'; }
        }

        var announcementsTab = 'all';
        var announcementsData = [];
        function setAnnouncementsTab(tab) {
            announcementsTab = tab || 'all';
            document.querySelectorAll('.announcements-tab').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-tab') === announcementsTab); });
            renderAnnouncementsList();
        }
        function filterAnnouncementsByTab(list) {
            if (announcementsTab === 'all') return list;
            if (announcementsTab === 'general') return list.filter(function(a) { return a.targetType === 'all'; });
            if (announcementsTab === 'department') return list.filter(function(a) { return a.targetType === 'department'; });
            if (announcementsTab === 'personal') return list.filter(function(a) { return a.targetType === 'user'; });
            return list;
        }
        function annTargetLabel(a) {
            if (a.targetType === 'all') return t('ann_all');
            if (a.targetType === 'department' && a.targetId) return a.targetName || t('ann_one_dept');
            if (a.targetType === 'user' && a.targetId) return a.targetName || t('ann_one_user');
            return '';
        }
        async function loadAnnouncements() {
            var list = document.getElementById('announcementList');
            if (!list) return;
            list.innerHTML = t('loading');
            var res = await apiFetch('/api/announcements/for-me');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + (res.data && res.data.error ? res.data.error : t('err_generic')) + '</div>'; return; }
            announcementsData = (res.data && res.data.data) || [];
            renderAnnouncementsList();
        }
        function renderAnnouncementsList() {
            var list = document.getElementById('announcementList');
            if (!list) return;
            var filtered = filterAnnouncementsByTab(announcementsData);
            if (filtered.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">📢</span><br>' + (LANG === 'fa' ? 'اعلانی وجود ندارد.' : 'No announcements.') + '</div>'; return; }
            list.innerHTML = filtered.map(function(a) {
                var fromName = (a.fromUser && a.fromUser.name) ? a.fromUser.name : '';
                var targetStr = annTargetLabel(a);
                var readCls = a.read ? ' ann-read' : '';
                var impBadge = a.isImportant ? '<span class="ann-badge-important">' + (LANG === 'fa' ? 'مهم' : 'Important') + '</span>' : '';
                var timeStr = a.createdAt ? fmtTZ(a.createdAt, 'datetime') : '';
                var bodyHtml = (escapeHtml(a.body || '') || '').replace(/\n/g, '<br>');
                var delBtn = a.canDelete ? '<button type="button" class="ann-delete-btn btn-secondary btn-sm" data-id="' + escapeHtml(a.id) + '" title="' + (t('ann_delete') || '') + '">' + (LANG === 'fa' ? 'حذف' : 'Delete') + '</button>' : '';
                return '<div class="announcement-card' + readCls + '" data-id="' + escapeHtml(a.id) + '"><div class="announcement-card-header"><span class="announcement-card-title">' + escapeHtml(a.title || '') + '</span><div class="announcement-card-header-right">' + impBadge + delBtn + '</div></div><div class="announcement-card-body">' + bodyHtml + '</div><div class="announcement-card-meta"><span>' + t('ann_from') + ' ' + escapeHtml(fromName) + '</span><span>' + t('ann_to') + ' ' + escapeHtml(targetStr) + '</span><span class="announcement-card-time">' + (t('ann_sent_at') ? t('ann_sent_at') + ' ' : '') + timeStr + '</span></div></div>';
            }).join('');
            list.querySelectorAll('.announcement-card').forEach(function(card) {
                card.onclick = function(e) { if (!e.target.closest('.ann-delete-btn')) markAnnouncementReadAndShow(card.getAttribute('data-id')); };
            });
            list.querySelectorAll('.ann-delete-btn').forEach(function(btn) {
                btn.onclick = function(e) { e.stopPropagation(); deleteAnnouncement(btn.getAttribute('data-id')); };
            });
        }
        async function markAnnouncementReadAndShow(id) {
            var a = announcementsData.find(function(x) { return x.id === id; });
            if (!a) return;
            if (!a.read) {
                await apiFetch('/api/announcements/' + id + '/read', { method: 'POST' });
                a.read = true;
                renderAnnouncementsList();
                if (typeof updateNavBadges === 'function') updateNavBadges();
            }
            showAnnouncementModal(a);
        }
        function showAnnouncementModal(a) {
            var modal = document.getElementById('announcementModal');
            if (!modal) return;
            document.getElementById('annModalTitle').textContent = a.title || '';
            document.getElementById('annModalBody').innerHTML = (escapeHtml(a.body || '') || '').replace(/\n/g, '<br>');
            var metaEl = document.getElementById('annModalMeta');
            if (metaEl) {
                var fromName = (a.fromUser && a.fromUser.name) ? a.fromUser.name : '';
                var targetStr = annTargetLabel(a);
                var timeStr = a.createdAt ? fmtTZ(a.createdAt, 'datetime') : '';
                metaEl.innerHTML = (t('ann_from') || '') + ' ' + escapeHtml(fromName) + ' · ' + (t('ann_to') || '') + ' ' + escapeHtml(targetStr) + (timeStr ? ' · ' + (t('ann_sent_at') || '') + ' ' + timeStr : '');
                metaEl.style.display = 'block';
            }
            modal.style.display = 'flex';
        }
        async function loadAnnouncementTargets() {
            var typeSel = document.getElementById('annTargetType');
            var idSel = document.getElementById('annTargetId');
            var wrap = document.getElementById('annTargetIdWrap');
            if (!typeSel || !idSel) return;
            var res = await apiFetch('/api/announcements/targets');
            if (res.needLogin || !res.ok) return;
            var users = res.users || [];
            var departments = res.departments || [];
            var isManager = currentUser && currentUser.role === 'manager';
            if (isManager && departments.length === 1) {
                typeSel.value = 'department';
                idSel.innerHTML = '<option value="' + departments[0].id + '">' + escapeHtml(departments[0].name) + '</option>';
                wrap.style.display = 'block';
            } else {
                typeSel.onchange = function() {
                    var v = typeSel.value;
                    wrap.style.display = (v === 'department' || v === 'user') ? 'block' : 'none';
                    idSel.innerHTML = '<option value="">' + t('ann_select') + '</option>';
                    if (v === 'department') departments.forEach(function(d) { idSel.innerHTML += '<option value="' + d.id + '">' + escapeHtml(d.name) + '</option>'; });
                    if (v === 'user') users.forEach(function(u) { idSel.innerHTML += '<option value="' + u.id + '">' + escapeHtml(u.name) + (u.department && u.department.name ? ' (' + u.department.name + ')' : '') + '</option>'; });
                };
                typeSel.dispatchEvent(new Event('change'));
            }
        }
        async function sendAnnouncement() {
            var title = (document.getElementById('annTitle') && document.getElementById('annTitle').value) || '';
            var body = (document.getElementById('annBody') && document.getElementById('annBody').value) || '';
            if (!title.trim() || !body.trim()) { toast(t('ann_title') + ' ' + (LANG === 'fa' ? 'و متن الزامی است' : 'and message are required'), true); return; }
            var targetType = (document.getElementById('annTargetType') && document.getElementById('annTargetType').value) || 'all';
            var targetId = (document.getElementById('annTargetId') && document.getElementById('annTargetId').value) || '';
            if (targetType !== 'all' && !targetId) { toast(t('ann_select'), true); return; }
            var isImportant = (document.getElementById('annImportant') && document.getElementById('annImportant').checked) || false;
            var payload = { title: title.trim(), body: body.trim(), isImportant: isImportant, targetType: targetType, targetId: targetType === 'all' ? null : targetId };
            var res = await apiFetch('/api/announcements', { method: 'POST', body: JSON.stringify(payload) });
            if (res.needLogin) return;
            if (res.ok) {
                document.getElementById('annTitle').value = '';
                document.getElementById('annBody').value = '';
                document.getElementById('annImportant').checked = false;
                toast(LANG === 'fa' ? 'اعلان ارسال شد.' : 'Announcement sent.');
                loadAnnouncements();
                loadGeneralAnnouncementsMarquee();
                if (typeof updateNavBadges === 'function') updateNavBadges();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function closeAnnouncementModal() {
            var id = window._lastImportantAnnouncementId;
            if (id) {
                window._lastImportantAnnouncementId = null;
                apiFetch('/api/announcements/' + id + '/read', { method: 'POST' }).then(function() { loadAnnouncements(); loadGeneralAnnouncementsMarquee(); if (typeof updateNavBadges === 'function') updateNavBadges(); });
            }
            var m = document.getElementById('announcementModal'); if (m) m.style.display = 'none';
        }
        async function deleteAnnouncement(id) {
            if (!id) return;
            if (!confirm(t('ann_delete_confirm') || (LANG === 'fa' ? 'حذف این اعلان؟' : 'Delete this announcement?'))) return;
            var res = await apiFetch('/api/announcements/' + id, { method: 'DELETE' });
            if (res.needLogin) return;
            if (res.ok) {
                toast(LANG === 'fa' ? 'اعلان حذف شد' : 'Announcement deleted');
                announcementsData = announcementsData.filter(function(a) { return a.id !== id; });
                renderAnnouncementsList();
                loadGeneralAnnouncementsMarquee();
                if (typeof updateNavBadges === 'function') updateNavBadges();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        var convQuickTab = 'all';
        function setConvQuickTab(tab) {
            convQuickTab = tab || 'all';
            document.querySelectorAll('.conv-tab').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-tab') === convQuickTab); });
            applyConvFilters();
        }
        function toggleConvAdvancedFilters() {
            var el = document.getElementById('convAdvancedFilters');
            var btn = document.getElementById('convFilterToggle');
            if (el && btn) { el.classList.toggle('show'); btn.setAttribute('aria-expanded', el.classList.contains('show')); }
        }
        async function loadConvFiltersInit() {
            await loadConvAssignees();
            loadBranchesForSelect(['convFilterBranch']);
            var res = await apiFetch('/api/departments');
            if (res.ok && res.data && res.data.data) {
                var sel = document.getElementById('convFilterDept');
                if (sel) {
                    var opt = '<option value="">' + (LANG === 'fa' ? 'همه دپارتمان‌ها' : 'All departments') + '</option>' + res.data.data.map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name || '') + '</option>'; }).join('');
                    sel.innerHTML = opt;
                }
            }
        }
        async function loadConversations() {
            var list = document.getElementById('convList');
            var statsEl = document.getElementById('convStats');
            setLoading('convList', 4);
            var q = '?limit=50';
            var statusEl = document.getElementById('convFilterStatus');
            var priorityEl = document.getElementById('convFilterPriority');
            var branchEl = document.getElementById('convFilterBranch');
            var deptEl = document.getElementById('convFilterDept');
            var assigneeEl = document.getElementById('convFilterAssignee');
            var searchEl = document.getElementById('convSearch');
            if (convQuickTab === 'unread') q += '&unread=true';
            else if (convQuickTab === 'unanswered') q += '&unanswered=true';
            else if (convQuickTab === 'open') q += '&status=open';
            else if (convQuickTab === 'mine' && currentUser && currentUser.id) q += '&assignedTo=' + encodeURIComponent(currentUser.id);
            if (convQuickTab === 'all' || convQuickTab === 'unread') { if (statusEl && statusEl.value) q += '&status=' + encodeURIComponent(statusEl.value); }
            if (priorityEl && priorityEl.value) q += '&priority=' + encodeURIComponent(priorityEl.value);
            if (branchEl && branchEl.value) q += '&branchId=' + encodeURIComponent(branchEl.value);
            if (deptEl && deptEl.value) q += '&departmentId=' + encodeURIComponent(deptEl.value);
            if ((convQuickTab === 'all' || convQuickTab === 'unread' || convQuickTab === 'unanswered' || convQuickTab === 'open') && assigneeEl && assigneeEl.value) q += '&assignedTo=' + encodeURIComponent(assigneeEl.value);
            if (searchEl && searchEl.value.trim()) q += '&search=' + encodeURIComponent(searchEl.value.trim());
            var res = await apiFetch('/api/conversations' + q);
            if (res.needLogin) return;
            if (!res.ok) { var ce = document.getElementById('convListCount'); if (ce) ce.textContent = ''; list.innerHTML = '<div class="empty"><span class="empty-icon">💬</span><br>' + t('loading_err') + ' ' + (res.data && res.data.error ? res.data.error : res.error || '') + '</div>'; return; }
            var data = res.data;
            if (statsEl && data.total != null) {
                var open = (data.data || []).filter(function(c){ return c.status === 'open'; }).length;
                var unread = (data.data || []).reduce(function(s,c){ return s + (c.unreadCount || 0); }, 0);
                statsEl.innerHTML = '<span class="conv-stat"><strong>' + (data.total || 0) + '</strong> ' + (LANG === 'fa' ? 'مکالمه' : 'conv') + '</span><span class="conv-stat"><strong>' + open + '</strong> ' + (LANG === 'fa' ? 'باز' : 'open') + '</span><span class="conv-stat"><strong>' + unread + '</strong> ' + (LANG === 'fa' ? 'خوانده\u200cنشده' : 'unread') + '</span>';
                statsEl.style.display = 'flex';
            }
            var countEl = document.getElementById('convListCount');
            var totalCount = data.total != null ? data.total : (data.data || []).length;
            if (countEl) countEl.textContent = totalCount > 0 ? '(' + totalCount + ')' : '';
            if (!data.data || data.data.length === 0) {
                list.innerHTML = '<div class="empty conv-empty"><span class="empty-icon">💬</span><p>' + t('empty_conv') + '</p><button type="button" class="btn-primary" onclick="openNewConvModal()">' + (t('conv_new') || (LANG === 'fa' ? 'مکالمه جدید' : 'New conversation')) + '</button></div>';
                return;
            }
            list.innerHTML = data.data.map(function(c) {
                var cust = c.customer || {};
                var name = cust.name || cust.phone || t('customer');
                var phone = cust.phone || '';
                var safeName = (name || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\');
                var safePhone = (phone || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\');
                var initial = (name && name[0]) ? name[0].toUpperCase() : (phone && phone[0]) ? phone[0] : '?';
                var profilePic = (cust.profilePic && String(cust.profilePic).trim()) ? cust.profilePic : '';
                if (profilePic && profilePic.indexOf('/') === 0) profilePic = (window.location.origin || '') + profilePic;
                profilePic = profilePic ? ensureHttpsUrl(profilePic) : '';
                var avatarHtml = profilePic && profilePic.indexOf('http') === 0 ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(profilePic) + '" alt="" onerror="this.style.display=\'none\'">' : escapeHtml(initial);
                var assigneeName = userDisplay(c.assignee);
                var statusT = LANG === 'fa' ? { open: 'باز', pending: 'در انتظار', closed: 'بسته', resolved: 'حل\u200cشده' } : { open: 'Open', pending: 'Pending', closed: 'Closed', resolved: 'Resolved' };
                var statusBadge = '<span class="badge ' + (c.status || 'open') + '">' + (statusT[c.status] || c.status) + '</span>';
                var priorityBadge = c.priority && c.priority !== 'normal' ? '<span class="badge ' + c.priority + '">' + (t('priority_' + c.priority) || c.priority) + '</span>' : '';
                var unreadBadge = (c.unreadCount > 0) ? '<span class="badge unread">' + c.unreadCount + '</span>' : '';
                var preview = (c.lastMessagePreview || '').trim();
                var timeStr = c.lastMessageAt ? fmtTZ(c.lastMessageAt, 'time') : '';
                var unansweredBadge = '';
                if (c.lastIncomingMessageAt && (!c.lastOutgoingMessageAt || new Date(c.lastIncomingMessageAt) > new Date(c.lastOutgoingMessageAt))) {
                    var mins = Math.floor((Date.now() - new Date(c.lastIncomingMessageAt).getTime()) / 60000);
                    unansweredBadge = '<span class="badge urgent" title="' + (LANG === 'fa' ? 'منتظر پاسخ' : 'Awaiting reply') + '">' + (LANG === 'fa' ? mins + ' دقیقه' : mins + ' min') + '</span>';
                }
                var activeClass = (c.id === currentConvId) ? ' active' : '';
                return '<div class="conv-list-item' + activeClass + '" data-id="' + c.id + '" data-profile-pic="' + escapeHtml(profilePic || '') + '" onclick="openChat(\'' + c.id + '\', \'' + safeName + '\', \'' + safePhone + '\', this.getAttribute(\'data-profile-pic\')||\'\')"><div class="conv-item-avatar">' + avatarHtml + '</div><div class="conv-item-body"><div class="conv-item-top"><span class="name">' + unreadBadge + escapeHtml(name) + '</span><span class="conv-item-time">' + timeStr + '</span></div><div class="conv-item-meta">' + escapeHtml(phone) + (assigneeName ? ' · ' + escapeHtml(assigneeName) : '') + '</div>' + (preview ? '<div class="conv-item-preview">' + escapeHtml(preview) + '</div>' : '') + '</div><div class="conv-item-badges">' + unansweredBadge + priorityBadge + statusBadge + '</div></div>';
            }).join('');
        }

        var currentConvDetail = null;
        function toggleChatDetailBar() {
            var bar = document.getElementById('convDetailBar');
            var btn = document.getElementById('chatDetailToggle');
            if (bar && btn) {
                bar.classList.toggle('collapsed');
                btn.classList.toggle('active', !bar.classList.contains('collapsed'));
            }
        }
        function closeChatMobile() {
            var chatArea = document.getElementById('chatArea');
            var layout = chatArea && chatArea.closest('.conv-layout');
            if (chatArea) chatArea.classList.remove('show');
            if (layout) layout.classList.remove('chat-open');
            var btn = document.querySelector('.chat-back-btn');
            if (btn) btn.style.display = 'none';
        }
        function updateChatBackBtn() {
            var btn = document.querySelector('.chat-back-btn');
            var chatArea = document.getElementById('chatArea');
            if (btn && chatArea && chatArea.classList.contains('show')) {
                btn.style.display = window.matchMedia('(max-width: 768px)').matches ? 'flex' : 'none';
            }
        }
        if (typeof window !== 'undefined') window.addEventListener('resize', updateChatBackBtn);
        function openChat(id, name, phone, profilePic) {
            currentConvId = id;
            currentConvDetail = null;
            var headerEl = document.getElementById('chatHeader');
            var avatarEl = document.getElementById('chatHeaderAvatar');
            var barEl = document.getElementById('convDetailBar');
            var badgesEl = document.getElementById('convDetailBadges');
            var actionsEl = document.getElementById('convDetailActions');
            var supPanel = document.getElementById('convSupervisionPanel');
            var supStats = document.getElementById('convSupervisionStats');
            if (headerEl) headerEl.textContent = name || phone || t('customer');
            if (avatarEl) {
                var pic = (profilePic || '').trim();
                if (pic && pic.indexOf('/') === 0) pic = (window.location.origin || '') + pic;
                pic = pic ? ensureHttpsUrl(pic) : '';
                var initial = (name && name[0]) ? name[0].toUpperCase() : (phone && phone[0]) ? phone[0] : '?';
                if (pic && pic.indexOf('http') === 0) {
                    avatarEl.innerHTML = '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(pic) + '" alt="" onerror="this.style.display=\'none\'">';
                } else {
                    avatarEl.innerHTML = '<span class="avatar-fallback">' + escapeHtml(initial) + '</span>';
                }
            }
            var chatArea = document.getElementById('chatArea');
            var layout = chatArea && chatArea.closest('.conv-layout');
            if (chatArea) chatArea.classList.add('show');
            if (layout) layout.classList.add('chat-open');
            var backBtn = document.querySelector('.chat-back-btn');
            if (backBtn) backBtn.style.display = window.matchMedia('(max-width: 768px)').matches ? 'flex' : 'none';
            if (barEl) barEl.style.display = 'none';
            apiFetch('/api/conversations/' + id + '/read', { method: 'POST' }).then(function() { loadConversations(); });
            loadMessages(id);
            var canViewSupervision = currentUser && ['owner', 'admin', 'manager', 'supervisor'].indexOf(currentUser.role) !== -1;
            if (canViewSupervision && supPanel && supStats) { loadConvStats(id, supStats); supPanel.style.display = 'block'; } else if (supPanel) supPanel.style.display = 'none';
            apiFetch('/api/conversations/' + id).then(function(res) {
                if (!res.ok || !res.data) return;
                currentConvDetail = res.data;
                if (!barEl || !badgesEl) return;
                var d = res.data;
                var assigneeName = userDisplay(d.assignee) || (LANG === 'fa' ? 'بدون تخصیص' : 'Unassigned');
                var deptName = (d.department && d.department.name) ? d.department.name : '';
                var statusT = LANG === 'fa' ? { open: 'باز', pending: 'در انتظار', closed: 'بسته', resolved: 'حل\u200cشده' } : { open: 'Open', pending: 'Pending', closed: 'Closed', resolved: 'Resolved' };
                var prioT = LANG === 'fa' ? { low: 'کم', normal: 'عادی', high: 'مهم', urgent: 'فوری' } : { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' };
                badgesEl.innerHTML = '<span class="conv-detail-badge"><span class="conv-badge-label">' + (LANG === 'fa' ? 'وضعیت' : 'Status') + '</span>' + (statusT[d.status] || d.status) + '</span><span class="conv-detail-badge"><span class="conv-badge-label">' + (LANG === 'fa' ? 'اولویت' : 'Priority') + '</span>' + (prioT[d.priority] || d.priority) + '</span><span class="conv-detail-badge conv-badge-assignee"><span class="conv-badge-label">' + (LANG === 'fa' ? 'مسئول' : 'Assignee') + '</span>' + escapeHtml(assigneeName) + '</span>' + (deptName ? '<span class="conv-detail-badge conv-badge-dept"><span class="conv-badge-label">' + (LANG === 'fa' ? 'دپارتمان' : 'Dept') + '</span>' + escapeHtml(deptName) + '</span>' : '');
                barEl.style.display = 'block';
                barEl.classList.remove('collapsed');
                var toggleBtn = document.getElementById('chatDetailToggle');
                if (toggleBtn) { toggleBtn.style.display = 'flex'; toggleBtn.classList.add('active'); }
                var canManage = (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin' || currentUser.role === 'manager'));
                var isAssignedToMe = d.assignedTo === (currentUser && currentUser.id);
                if (actionsEl) {
                    actionsEl.style.display = 'flex';
                    var assignBtn = document.getElementById('btnAssignToMe');
                    if (assignBtn) assignBtn.style.display = (canManage || !isAssignedToMe) ? '' : 'none';
                    actionsEl.querySelectorAll('select').forEach(function(el){ el.style.display = canManage ? '' : 'none'; });
                    var deptSel = document.getElementById('convDetailDept');
                    if (deptSel) deptSel.style.display = canManage ? '' : 'none';
                    var applyBtn = actionsEl.querySelector('[onclick="updateConvFromDetail()"]');
                    if (applyBtn) applyBtn.style.display = canManage ? '' : 'none';
                }
                if (canManage) {
                    var statusSel = document.getElementById('convDetailStatus');
                    var prioritySel = document.getElementById('convDetailPriority');
                    var assigneeSel = document.getElementById('convDetailAssignee');
                    var deptSel = document.getElementById('convDetailDept');
                    if (statusSel) statusSel.value = d.status || 'open';
                    if (prioritySel) prioritySel.value = d.priority || 'normal';
                    loadConvAssignees().then(function() {
                        if (assigneeSel) assigneeSel.value = d.assignedTo || '';
                        if (deptSel) deptSel.value = d.departmentId || '';
                    });
                }
            });
        }
        async function loadConvAssignees() {
            var selFilter = document.getElementById('convFilterAssignee');
            var selDetail = document.getElementById('convDetailAssignee');
            var selDetailDept = document.getElementById('convDetailDept');
            if (!selFilter && !selDetail && !selDetailDept) return;
            var res = await apiFetch('/api/users');
            if (!res.ok || !res.data || !res.data.data) return;
            var users = res.data.data;
            var opt = '<option value="">' + (LANG === 'fa' ? 'هر مسئول' : 'Any assignee') + '</option>' + users.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
            if (selFilter) selFilter.innerHTML = opt;
            var optDetail = '<option value="">' + (LANG === 'fa' ? 'بدون تخصیص' : 'Unassigned') + '</option>' + users.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
            if (selDetail) selDetail.innerHTML = optDetail;
            if (selDetailDept) {
                var deptRes = await apiFetch('/api/departments');
                if (deptRes.ok && deptRes.data && deptRes.data.data) {
                    var depts = deptRes.data.data;
                    selDetailDept.innerHTML = '<option value="">' + (LANG === 'fa' ? 'بدون دپارتمان' : 'No department') + '</option>' + depts.map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name || '') + '</option>'; }).join('');
                }
            }
        }
        function applyConvFilters() { loadConversations(); }
        function openNewConvModal() {
            document.getElementById('newConvModal').style.display = 'flex';
            document.getElementById('newConvCustomerSearch').value = '';
            loadNewConvCustomers();
        }
        function closeNewConvModal() { document.getElementById('newConvModal').style.display = 'none'; }
        async function loadNewConvCustomers(search) {
            var list = document.getElementById('newConvCustomerList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var q = '?limit=30';
            if (search && String(search).trim()) q += '&search=' + encodeURIComponent(String(search).trim());
            var res = await apiFetch('/api/customers' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + (res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            var data = res.data;
            if (!data.data || data.data.length === 0) { list.innerHTML = '<div class="empty">' + t('empty_customers') + '</div>'; return; }
            list.innerHTML = data.data.map(function(c) {
                var name = c.name || c.phone || t('customer');
                var initial = (name && name[0]) ? name[0].toUpperCase() : '?';
                var profilePic = (c.profilePic && String(c.profilePic).trim()) ? c.profilePic : '';
                if (profilePic && profilePic.indexOf('/') === 0) profilePic = (window.location.origin || '') + profilePic;
                profilePic = profilePic ? ensureHttpsUrl(profilePic) : '';
                var avatarHtml = profilePic && profilePic.indexOf('http') === 0 ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(profilePic) + '" alt="" onerror="this.style.display=\'none\'">' : escapeHtml(initial);
                return '<div class="new-conv-customer-item" onclick="startNewConversation(\'' + c.id + '\', \'' + (name || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\') + '\')"><span class="conv-item-avatar" style="width:36px;height:36px;font-size:0.9rem;">' + avatarHtml + '</span><span class="name">' + escapeHtml(name) + '</span><span class="meta">' + escapeHtml(c.phone || '') + '</span></div>';
            }).join('');
        }
        async function startNewConversation(customerId, name) {
            closeNewConvModal();
            var res = await apiFetch('/api/conversations', { method: 'POST', body: JSON.stringify({ customerId: customerId }) });
            if (res.needLogin) return;
            if (!res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); return; }
            var conv = res.data;
            var phone = (conv.customer && conv.customer.phone) || '';
            var pic = (conv.customer && conv.customer.profilePic) || '';
            openChat(conv.id, name || (conv.customer && conv.customer.name) || phone, phone, pic);
            loadConversations();
        }
        async function assignConvToMe() {
            if (!currentConvId || !currentUser) return;
            var assigneeSel = document.getElementById('convDetailAssignee');
            if (assigneeSel) assigneeSel.value = currentUser.id;
            await updateConvFromDetail();
        }
        async function updateConvFromDetail() {
            if (!currentConvId) return;
            var statusSel = document.getElementById('convDetailStatus');
            var prioritySel = document.getElementById('convDetailPriority');
            var assigneeSel = document.getElementById('convDetailAssignee');
            var deptSel = document.getElementById('convDetailDept');
            var body = {};
            if (statusSel) body.status = statusSel.value;
            if (prioritySel) body.priority = prioritySel.value;
            if (assigneeSel) body.assignedTo = assigneeSel.value || null;
            if (deptSel) body.departmentId = deptSel.value || null;
            var res = await apiFetch('/api/conversations/' + currentConvId, { method: 'PATCH', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('btn_save') || 'Saved'); if (currentConvDetail) currentConvDetail = res.data; var h = document.getElementById('chatHeader'); var activeItem = document.querySelector('.conv-list-item.active[data-id="' + currentConvId + '"]'); var pic = (activeItem && activeItem.getAttribute('data-profile-pic')) || (currentConvDetail && currentConvDetail.customer && currentConvDetail.customer.profilePic) || ''; openChat(currentConvId, h ? h.textContent : '', '', pic); loadConversations(); } else toast((res.data && res.data.error) || t('err_generic'), true);
        }

        function openChatFromHistory(el) {
            var convId = el.getAttribute('data-convid');
            var name = el.getAttribute('data-customername') || '';
            if (convId) { openChat(convId, name, ''); showPage('conversations'); }
        }

        async function loadMessages(id) {
            var el = document.getElementById('chatMessages');
            el.innerHTML = '<div class="loading-skeleton loading-row"></div><div class="loading-skeleton loading-row"></div><div class="loading-skeleton loading-row"></div>';
            var res = await apiFetch('/api/conversations/' + id + '/messages');
            if (res.needLogin) return;
            if (!res.ok) { el.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            var data = res.data;
            if (!data.data || data.data.length === 0) { el.innerHTML = '<div class="empty"><span class="empty-icon">�x�</span><br>' + t('empty_internal_msgs') + '</div>'; return; }
            var list = data.data.filter(function(m) {
                if (m.direction === 'outgoing') return true;
                var hasContent = (m.content && String(m.content).trim()) || (m.hasMedia && m.mediaData && (m.mediaData.url || m.mediaData.filename));
                return !!hasContent;
            });
            el.innerHTML = list.map(function(m) {
                var isOut = m.direction === 'outgoing';
                var time = m.timestamp ? fmtTZ(m.timestamp, 'time') : '';
                var senderLabel = '';
                if (isOut && m.user && (m.user.name || m.user.username)) {
                    senderLabel = '<div class="msg-sender">' + escapeHtml(m.user.name || m.user.username) + '</div>';
                }
                var mediaHtml = '';
                var baseUrl = (API && String(API).length) ? String(API).replace(/\/$/, '') : (typeof window !== 'undefined' && window.location && window.location.origin ? window.location.origin : '');
                function inferMediaType(msg) {
                    var t = (msg.type || 'document').toLowerCase();
                    if (t === 'image' || t === 'video' || t === 'audio' || t === 'ptt') return (t === 'ptt' ? 'audio' : t);
                    var md = msg.mediaData || {};
                    var mime = (md.mimetype || '').toLowerCase();
                    var name = (md.filename || msg.content || '').toLowerCase();
                    if (mime.indexOf('image/') === 0 || /\.(jpe?g|png|gif|webp|bmp)$/.test(name)) return 'image';
                    if (mime.indexOf('video/') === 0 || /\.(mp4|webm|mov|avi)$/.test(name)) return 'video';
                    if (mime.indexOf('audio/') === 0 || /\.(mp3|ogg|wav|m4a|opus|oga)$/.test(name)) return 'audio';
                    return 'document';
                }
                var mediaUrl = '';
                if (m.hasMedia && m.mediaData) {
                    var md = m.mediaData;
                    if (md.url && String(md.url).trim()) {
                        var rawUrl = String(md.url).trim();
                        var mediaBase = (rawUrl.startsWith('http')) ? '' : (window.location.origin || baseUrl);
                        mediaUrl = rawUrl.startsWith('http') ? rawUrl : (mediaBase + (rawUrl.startsWith('/') ? '' : '/') + rawUrl);
                        mediaUrl = ensureHttpsUrl(mediaUrl);
                    } else if (md.data && (inferMediaType(m) === 'image' || (md.mimetype || '').toLowerCase().indexOf('image/') === 0)) {
                        var mime = (md.mimetype || 'image/jpeg').split(';')[0].trim();
                        mediaUrl = 'data:' + mime + ';base64,' + md.data;
                    } else if (md.data && (inferMediaType(m) === 'audio' || (md.mimetype || '').toLowerCase().indexOf('audio/') === 0)) {
                        var mimeAudio = (md.mimetype || 'audio/ogg').split(';')[0].trim();
                        mediaUrl = 'data:' + mimeAudio + ';base64,' + md.data;
                    }
                }
                if (mediaUrl && m.hasMedia && m.mediaData) {
                    var mediaType = inferMediaType(m);
                    if (mediaType === 'image') {
                        var imgAlt = escapeHtml(m.mediaData.filename || (LANG === 'fa' ? 'تصویر' : 'Image'));
                        var fn = escapeHtml(m.mediaData.filename || m.content || (LANG === 'fa' ? 'تصویر' : 'Image'));
                        mediaHtml = '<div class="msg-media msg-media-image"><a href="' + escapeHtml(mediaUrl) + '" target="_blank" rel="noopener noreferrer" class="msg-media-link" data-open="1"><img src="' + escapeHtml(mediaUrl) + '" alt="' + imgAlt + '" loading="lazy" onerror="this.onerror=null;this.style.display=\'none\';var s=this.parentNode.querySelector(\'.msg-media-filename\');if(s)s.style.display=\'inline\';">' + '<span class="msg-media-filename" style="display:none;">📎 ' + fn + '</span></a></div>';
                    } else if (mediaType === 'video') {
                        mediaHtml = '<div class="msg-media"><video src="' + escapeHtml(mediaUrl) + '" controls preload="metadata"></video><a href="' + escapeHtml(mediaUrl) + '" target="_blank" rel="noopener noreferrer" class="msg-media-link" data-open="1">' + (LANG === 'fa' ? 'پخش ویدیو' : 'Play video') + '</a></div>';
                    } else if (mediaType === 'audio') {
                        var isPtt = (m.type || '').toLowerCase() === 'ptt' || /voice|\.ogg|\.webm|پیام صوتی|ptt/i.test(m.mediaData.filename || m.content || '');
                        var voiceClass = isPtt ? ' msg-media-voice' : '';
                        mediaHtml = '<div class="msg-media' + voiceClass + '"><audio src="' + escapeHtml(mediaUrl) + '" controls preload="metadata"></audio><a href="' + escapeHtml(mediaUrl) + '" target="_blank" rel="noopener noreferrer" class="msg-media-link" data-open="1">' + (LANG === 'fa' ? 'دانلود' : 'Download') + '</a></div>';
                    } else {
                        mediaHtml = '<div class="msg-media"><a href="' + escapeHtml(mediaUrl) + '" target="_blank" rel="noopener noreferrer" class="msg-file-link msg-media-link" data-open="1">📎 ' + escapeHtml(m.mediaData.filename || m.content || (LANG === 'fa' ? 'فایل' : 'File')) + '</a></div>';
                    }
                } else if (m.hasMedia && (m.content || (m.mediaData && m.mediaData.filename))) {
                    var fileName = (m.mediaData && m.mediaData.filename) || m.content || (LANG === 'fa' ? 'فایل' : 'File');
                    var isImageName = /\.(jpe?g|png|gif|webp|bmp)$/i.test(fileName);
                    mediaHtml = '<div class="msg-media msg-media-placeholder">' + (isImageName ? '🖼 ' : '📎 ') + escapeHtml(fileName) + '</div>';
                }
                var contentHtml = '';
                if (m.hasMedia && m.mediaData && m.mediaData.url && m.content) contentHtml = '<div class="msg-caption">' + escapeHtml(m.content) + '</div>';
                else if (m.content && !(m.hasMedia && !(m.mediaData && m.mediaData.url))) contentHtml = '<div>' + escapeHtml(m.content) + '</div>';
                return '<div class="msg ' + (isOut ? 'out' : 'in') + '">' + senderLabel + mediaHtml + contentHtml + '<div class="time">' + time + '</div></div>';
            }).join('');
            scrollChatToEnd(el);
        }
        function scrollChatToEnd(el) {
            if (!el) return;
            function doScroll() {
                el.scrollTop = el.scrollHeight;
                var last = el.lastElementChild;
                if (last && last.scrollIntoView) last.scrollIntoView({ block: 'end' });
            }
            doScroll();
            requestAnimationFrame(doScroll);
            setTimeout(doScroll, 50);
            setTimeout(doScroll, 200);
        }
        async function loadConvStats(convId, el) {
            if (!el) return;
            el.innerHTML = '<span class="loading-skeleton" style="display:inline-block;width:120px;height:20px;border-radius:4px;"></span>';
            var res = await apiFetch('/api/conversations/' + convId + '/stats');
            if (res.needLogin || !res.ok) { el.innerHTML = ''; return; }
            var s = res.data;
            var parts = [];
            if (s.firstResponseTimeMin != null) {
                var timeLabel = s.firstResponseTimeMin < 60 ? (s.firstResponseTimeMin + ' ' + (LANG === 'fa' ? 'دقیقه' : 'min')) : (Math.floor(s.firstResponseTimeMin / 60) + ' ' + (LANG === 'fa' ? 'ساعت' : 'hr'));
                parts.push('<span class="conv-stat-item"><span class="conv-stat-label">' + (LANG === 'fa' ? 'اولین پاسخ' : 'First response') + '</span>' + timeLabel + '</span>');
            }
            if (s.responders && s.responders.length > 0) {
                parts.push('<span class="conv-stat-item"><span class="conv-stat-label">' + (LANG === 'fa' ? 'پاسخ‌دهندگان' : 'Responders') + '</span>' + s.responders.map(function(r){ return escapeHtml(r.name); }).join(', ') + '</span>');
            }
            if (s.unreadCount > 0) {
                parts.push('<span class="conv-stat-item conv-stat-unread"><span class="conv-stat-label">' + (LANG === 'fa' ? 'خوانده‌نشده' : 'Unread') + '</span>' + s.unreadCount + '</span>');
            }
            parts.push('<span class="conv-stat-item"><span class="conv-stat-label">' + (LANG === 'fa' ? 'پیام‌ها' : 'Messages') + '</span>' + (s.messageCount || 0) + '</span>');
            el.innerHTML = parts.length ? parts.join('') : (LANG === 'fa' ? '—' : '—');
        }

        async function sendMsg() {
            var input = document.getElementById('msgInput');
            var fileInput = document.getElementById('msgFileInput');
            var content = (input.value || '').trim();
            var file = fileInput && fileInput.files && fileInput.files[0];
            if ((!content && !file) || !currentConvId) return;
            var media = null;
            if (file) {
                var fd = new FormData();
                fd.append('file', file);
                var uploadRes = await fetch(API + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
                var uploadData = await uploadRes.json().catch(function() { return {}; });
                if (!uploadRes.ok || !uploadData.url) { toast((uploadData.error || (LANG === 'en' ? 'Upload failed' : 'خطا در آپلود')), true); return; }
                media = { url: uploadData.url, filename: uploadData.name || file.name, mimetype: file.type };
                fileInput.value = '';
            }
            input.value = '';
            var res = await apiFetch('/api/conversations/' + currentConvId + '/send', { method: 'POST', body: JSON.stringify({ content: content || '', media: media }) });
            if (res.needLogin) return;
            if (res.ok) loadMessages(currentConvId);
            else toast((res.data && res.data.error) || (LANG === 'en' ? 'Send failed' : 'خطا در ارسال'), true);
        }

        var voiceRecorderState = { active: false, recorder: null, chunks: [] };
        function updateVoiceBtn() {
            var btn = document.getElementById('msgVoiceBtn');
            if (!btn) return;
            btn.classList.toggle('recording', voiceRecorderState.active);
            btn.setAttribute('title', voiceRecorderState.active ? (t('voice_stop') || (LANG === 'fa' ? 'توقف ضبط' : 'Stop recording')) : (t('voice_record') || (LANG === 'fa' ? 'ضبط پیام صوتی' : 'Voice message')));
            btn.setAttribute('aria-label', btn.getAttribute('title'));
        }
        function startVoiceRecord() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                toast(t('voice_no_support') || (LANG === 'fa' ? 'ضبط صدا در این مرورگر پشتیبانی نمی‌شود' : 'Voice recording not supported'), true);
                return;
            }
            navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
                var mime = (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) ? 'audio/webm;codecs=opus' : (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm')) ? 'audio/webm' : 'audio/ogg';
                try {
                    var recorder = new MediaRecorder(stream, { mimeType: mime });
                } catch (e) {
                    recorder = new MediaRecorder(stream);
                }
                voiceRecorderState.chunks = [];
                recorder.ondataavailable = function(e) { if (e.data && e.data.size) voiceRecorderState.chunks.push(e.data); };
                recorder.onstop = function() {
                    stream.getTracks().forEach(function(t) { t.stop(); });
                    var blob = new Blob(voiceRecorderState.chunks, { type: recorder.mimeType || 'audio/webm' });
                    voiceRecorderState.chunks = [];
                    if (blob.size > 0) sendVoiceMessage(blob);
                };
                recorder.start(200);
                voiceRecorderState.recorder = recorder;
                voiceRecorderState.active = true;
                updateVoiceBtn();
            }).catch(function() {
                toast(t('voice_no_permission') || (LANG === 'fa' ? 'دسترسی به میکروفون داده نشد' : 'Microphone access denied'), true);
            });
        }
        function stopVoiceRecord() {
            if (!voiceRecorderState.recorder) return;
            voiceRecorderState.recorder.stop();
            voiceRecorderState.recorder = null;
            voiceRecorderState.active = false;
            updateVoiceBtn();
        }
        function toggleVoiceRecord() {
            if (!currentConvId) { toast(LANG === 'fa' ? 'ابتدا یک مکالمه باز کنید' : 'Open a conversation first', true); return; }
            if (voiceRecorderState.active) stopVoiceRecord();
            else startVoiceRecord();
        }
        async function sendVoiceMessage(blob) {
            if (!currentConvId || !blob || blob.size === 0) return;
            var fd = new FormData();
            var ext = (blob.type || '').indexOf('ogg') >= 0 ? '.ogg' : '.webm';
            fd.append('file', blob, 'voice' + ext);
            var uploadRes = await fetch(API + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: fd });
            var uploadData = await uploadRes.json().catch(function() { return {}; });
            if (!uploadRes.ok || !uploadData.url) { toast((uploadData.error || (LANG === 'en' ? 'Upload failed' : 'خطا در آپلود')), true); return; }
            var media = { url: uploadData.url, filename: uploadData.name || 'voice' + ext, mimetype: blob.type || (ext === '.ogg' ? 'audio/ogg' : 'audio/webm') };
            var res = await apiFetch('/api/conversations/' + currentConvId + '/send', { method: 'POST', body: JSON.stringify({ content: '', media: media }) });
            if (res.needLogin) return;
            if (res.ok) loadMessages(currentConvId);
            else toast((res.data && res.data.error) || (LANG === 'en' ? 'Send failed' : 'خطا در ارسال'), true);
        }

        function sortCustomerList(arr, sortBy) {
            if (!arr || !arr.length) return arr;
            var key = sortBy || 'newest';
            return arr.slice().sort(function(a, b) {
                if (key === 'newest' || key === 'last_contact') {
                    var ta = a.lastContactAt ? new Date(a.lastContactAt).getTime() : 0;
                    var tb = b.lastContactAt ? new Date(b.lastContactAt).getTime() : 0;
                    return tb - ta;
                }
                if (key === 'oldest') {
                    var ta = a.lastContactAt ? new Date(a.lastContactAt).getTime() : 0;
                    var tb = b.lastContactAt ? new Date(b.lastContactAt).getTime() : 0;
                    return ta - tb;
                }
                if (key === 'name') {
                    var na = (a.name || a.phone || '').toLowerCase();
                    var nb = (b.name || b.phone || '').toLowerCase();
                    return na.localeCompare(nb, 'fa');
                }
                return 0;
            });
        }
        async function loadCustomers() {
            var list = document.getElementById('customerList');
            var statsEl = document.getElementById('customerStats');
            var countEl = document.getElementById('customerListCount');
            setLoading('customerList', 5);
            var q = '?limit=200';
            var searchEl = document.getElementById('customerSearch');
            var statusEl = document.getElementById('customerFilterStatus');
            if (searchEl && searchEl.value.trim()) q += '&search=' + encodeURIComponent(searchEl.value.trim());
            if (statusEl && statusEl.value) q += '&status=' + encodeURIComponent(statusEl.value);
            var res = await apiFetch('/api/customers' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty"><span class="empty-icon">&#128101;</span><br>' + (res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            var data = res.data;
            if (statsEl && data.stats) { statsEl.style.display = 'flex'; statsEl.innerHTML = '<span class="customer-stat"><strong>' + data.stats.total + '</strong> ' + (LANG === 'fa' ? 'مشتری' : 'customers') + '</span><span class="customer-stat"><strong>' + data.stats.active + '</strong> ' + (LANG === 'fa' ? 'فعال' : 'active') + '</span><span class="customer-stat"><strong>' + data.stats.inactive + '</strong> ' + (LANG === 'fa' ? 'غیرفعال' : 'inactive') + '</span><span class="customer-stat"><strong>' + data.stats.blocked + '</strong> ' + (LANG === 'fa' ? 'مسدود' : 'blocked') + '</span>'; }
            if (countEl) countEl.textContent = (data.total || 0) + ' ' + (LANG === 'fa' ? 'مشتری' : '');
            if (!data.data || data.data.length === 0) { list.innerHTML = '<div class="empty customer-empty-state"><span class="empty-icon">&#128100;</span><p>' + t('empty_customers') + '</p><button type="button" class="btn-primary" onclick="openCustomerModal()">' + escapeHtml(t('customer_add')) + '</button></div>'; return; }
            var sortEl = document.getElementById('customerSort');
            var sortVal = sortEl ? sortEl.value : 'newest';
            var sorted = sortCustomerList(data.data, sortVal);
            list.innerHTML = sorted.map(function(c) {
                var name = c.name || c.phone || t('customer');
                var initial = (name && name[0]) ? name[0].toUpperCase() : (c.phone && c.phone[0]) ? c.phone[0] : '?';
                var profilePic = (c.profilePic && String(c.profilePic).trim()) ? c.profilePic : '';
                if (profilePic && profilePic.indexOf('/') === 0) profilePic = (window.location.origin || '') + profilePic;
                profilePic = profilePic ? ensureHttpsUrl(profilePic) : '';
                var avatarHtml = profilePic && profilePic.indexOf('http') === 0 ? '<span class="customer-card-avatar-fallback">' + escapeHtml(initial) + '</span><img class="customer-card-avatar-img" src="' + escapeHtml(profilePic) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';var f=this.parentNode.querySelector(\'.customer-card-avatar-fallback\');if(f)f.style.display=\'flex\'">' : escapeHtml(initial);
                var statusClass = (c.status === 'blocked' ? 'blocked' : c.status === 'inactive' ? 'inactive' : 'active');
                var statusLabel = c.status === 'blocked' ? (LANG === 'fa' ? 'مسدود' : 'Blocked') : c.status === 'inactive' ? (LANG === 'fa' ? 'غیرفعال' : 'Inactive') : (LANG === 'fa' ? 'فعال' : 'Active');
                var lastContact = c.lastContactAt ? timeAgo(c.lastContactAt) : '—';
                var loc = c.lastOpenConv;
                var assigneeDept = loc && (loc.assignee || (loc.department && loc.department.name)) ? [loc.assignee && loc.assignee.name, loc.department && loc.department.name].filter(Boolean).join(' · ') : '';
                var safeName = (c.name || c.phone || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\');
                return '<div class="customer-card" onclick="showCustomerHistory(\'' + c.id + '\', \'' + safeName + '\')" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();showCustomerHistory(\'' + c.id + '\', \'' + safeName + '\')}"><div class="customer-card-main"><div class="customer-card-avatar">' + avatarHtml + '</div><div class="customer-card-body"><span class="customer-card-name">' + escapeHtml(c.name || c.phone) + '</span><div class="customer-card-meta">' + escapeHtml(c.phone || '') + (c.email ? ' · ' + escapeHtml(c.email) : '') + '</div><div class="customer-card-meta">' + lastContact + ' · ' + (c.totalConversations || 0) + ' ' + (LANG === 'fa' ? 'مکالمه' : 'conv') + (assigneeDept ? ' · ' + escapeHtml(assigneeDept) : '') + '</div></div><span class="badge ' + statusClass + '">' + statusLabel + '</span></div><button type="button" class="btn-primary customer-send-btn" onclick="event.stopPropagation();startCustomerChat(\'' + c.id + '\', \'' + safeName + '\', \'' + (c.phone || '').replace(/'/g, "\\'") + '\')" data-i18n="btn_send">ارسال</button></div>';
            }).join('');
        }
        async function startCustomerChat(customerId, name, phone) {
            var res = await apiFetch('/api/conversations', { method: 'POST', body: JSON.stringify({ customerId: customerId }) });
            if (res.needLogin) return;
            if (!res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); return; }
            var conv = res.data;
            var pic = (conv.customer && conv.customer.profilePic) || '';
            showPage('conversations');
            setTimeout(function() { openChat(conv.id, name || (conv.customer && conv.customer.name) || phone, phone || '', pic); loadConversations(); }, 100);
        }

        function applyCustomerFilters() { loadCustomers(); }

        var currentCustomerId = null;
        var currentCustomerData = null;
        async function showCustomerHistory(custId, name) {
            currentCustomerId = custId;
            document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('show'); p.style.display = 'none'; });
            document.getElementById('pageCustomerDetail').style.display = 'block';
            document.getElementById('pageCustomerDetail').classList.add('show');
            document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); });
            var cardEl = document.getElementById('customerDetailCard');
            var list = document.getElementById('customerHistoryList');
            var timelineEl = document.getElementById('customerTimelineList');
            var quickActionsEl = document.getElementById('customerDetailQuickActions');
            if (quickActionsEl) quickActionsEl.innerHTML = '';
            if (cardEl) cardEl.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            if (list) list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            if (timelineEl) timelineEl.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            document.querySelectorAll('.customer-detail-panel').forEach(function(p) { p.classList.remove('show'); p.style.display = 'none'; });
            var tlPanel = document.getElementById('customerTimelinePanel');
            if (tlPanel) { tlPanel.style.display = 'block'; tlPanel.classList.add('show'); }
            document.querySelectorAll('.customer-detail-tab').forEach(function(b) { b.classList.remove('active'); });
            var tlTab = document.querySelector('.customer-detail-tab[data-tab="timeline"]');
            if (tlTab) tlTab.classList.add('active');
            var resDetail = await apiFetch('/api/customers/' + custId);
            if (resDetail.needLogin) return;
            if (!resDetail.ok) { if (cardEl) cardEl.innerHTML = '<div class="empty">' + (resDetail.data && resDetail.data.error ? resDetail.data.error : '') + '</div>'; list.innerHTML = ''; return; }
            currentCustomerData = resDetail.data;
            var c = currentCustomerData;
            var initial = (c.name && c.name[0]) ? c.name[0].toUpperCase() : (c.phone && c.phone[0]) ? c.phone[0] : '?';
            var statusLabel = c.status === 'blocked' ? (LANG === 'fa' ? 'مسدود' : 'Blocked') : c.status === 'inactive' ? (LANG === 'fa' ? 'غیرفعال' : 'Inactive') : (LANG === 'fa' ? 'فعال' : 'Active');
            var firstContact = c.firstContactAt ? fmtTZ(c.firstContactAt, 'date') : '—';
            var lastContact = c.lastContactAt ? fmtTZ(c.lastContactAt, 'datetime') : '—';
            if (quickActionsEl) {
                var qName = (c.name || c.phone || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\');
                var qPhone = (c.phone || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\');
                quickActionsEl.innerHTML = '<button type="button" class="btn-primary customer-detail-action-btn" onclick="startCustomerChat(\'' + c.id + '\', \'' + qName + '\', \'' + qPhone + '\')">' + escapeHtml(t('customer_quick_chat')) + '</button><button type="button" class="btn-secondary customer-detail-action-btn" onclick="openCustomerModal(\'' + c.id + '\')">' + escapeHtml(t('customer_quick_edit')) + '</button><button type="button" class="btn-secondary customer-detail-action-btn" onclick="openTransactionModal(\'' + c.id + '\')">' + escapeHtml(t('transaction_add')) + '</button>';
            }
            var detailProfilePic = (c.profilePic && String(c.profilePic).trim()) ? c.profilePic : '';
            if (detailProfilePic && detailProfilePic.indexOf('/') === 0) detailProfilePic = (window.location.origin || '') + detailProfilePic;
            detailProfilePic = detailProfilePic ? ensureHttpsUrl(detailProfilePic) : '';
            var detailAvatarHtml = detailProfilePic && detailProfilePic.indexOf('http') === 0 ? '<span class="customer-detail-avatar-fallback">' + escapeHtml(initial) + '</span><img class="customer-detail-avatar-img" src="' + escapeHtml(detailProfilePic) + '" alt="" onerror="this.style.display=\'none\';var f=this.parentNode.querySelector(\'.customer-detail-avatar-fallback\');if(f)f.style.display=\'flex\'">' : initial;
            if (cardEl) cardEl.innerHTML = '<div class="customer-avatar">' + detailAvatarHtml + '</div><div class="customer-info"><h3>' + escapeHtml(c.name || c.phone) + '</h3><div class="customer-meta">' + (LANG === 'fa' ? 'تلفن: ' : 'Phone: ') + escapeHtml(c.phone || '—') + '</div>' + (c.email ? '<div class="customer-meta">' + (LANG === 'fa' ? 'ایمیل: ' : 'Email: ') + escapeHtml(c.email) + '</div>' : '') + '<div class="customer-meta">' + (LANG === 'fa' ? 'وضعیت: ' : 'Status: ') + '<span class="badge ' + (c.status || 'active') + '">' + statusLabel + '</span> · ' + (LANG === 'fa' ? 'اولین تماس: ' : 'First: ') + firstContact + ' · ' + (LANG === 'fa' ? 'آخرین تماس: ' : 'Last: ') + lastContact + '</div><div class="customer-meta">' + (c.totalConversations || 0) + ' ' + (LANG === 'fa' ? 'مکالمه' : 'conv') + ' · ' + (c.totalMessages || 0) + ' ' + (LANG === 'fa' ? 'پیام' : 'msgs') + '</div>' + (c.notes ? '<div class="customer-notes">' + escapeHtml(c.notes) + '</div>' : '') + '</div>';
            var res = await apiFetch('/api/customers/' + custId + '/conversations');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            var data = res.data;
            if (!data.data || data.data.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">�x9</span><br>' + t('no_conv_history') + '</div>'; } else {
            var safeName = (name || '').replace(/'/g, '&#39;');
            list.innerHTML = data.data.map(function(conv) {
                var date = conv.lastMessageAt ? fmtTZ(conv.lastMessageAt, 'datetime') : '';
                var who = [conv.assignee && conv.assignee.name, conv.lastOutgoingBy].filter(Boolean);
                var whoStr = who.length ? ' · ' + (LANG === 'fa' ? 'مسئول/چت: ' : 'by ') + who.join(', ') : '';
                return '<div class="list-item" data-convid="' + conv.id + '" data-customername="' + safeName + '" onclick="openChatFromHistory(this)"><div><span class="name">' + t('conversation') + ' ' + (conv.status || '') + '</span><div class="meta">' + (conv.messageCount || 0) + ' ' + (LANG === 'fa' ? 'پیام' : 'msgs') + whoStr + ' · ' + date + '</div></div></div>';
                }).join('');
            }
            loadCustomerTimeline(custId);
            initCustomerDetailTabs();
            var noteContentEl = document.getElementById('customerNoteContent');
            var noteAddBtn = document.getElementById('customerNoteAddBtn');
            if (noteContentEl) noteContentEl.placeholder = t('customer_note_ph') || (LANG === 'fa' ? 'متن گزارش یا یادداشت...' : 'Note or report text...');
            if (noteAddBtn && !noteAddBtn._bound) { noteAddBtn._bound = true; noteAddBtn.addEventListener('click', function() { addCustomerNote(custId); }); }
            var btnTx = document.getElementById('btnCustomerAddTransaction');
            if (btnTx && !btnTx._bound) { btnTx._bound = true; btnTx.onclick = function() { openTransactionModal(currentCustomerId); }; }
            var btnRefreshTx = document.getElementById('btnRefreshCustomerTransactions');
            if (btnRefreshTx && !btnRefreshTx._bound) { btnRefreshTx._bound = true; btnRefreshTx.onclick = function() { if (currentCustomerId) loadCustomerTransactions(currentCustomerId); }; }
            loadCustomerNotes(custId);
        }
        function goToServicesWithCustomerFilter() {
            if (!currentCustomerId) return;
            showPage('services');
            document.querySelectorAll('.services-tab').forEach(function(t) { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
            document.querySelectorAll('.services-panel').forEach(function(p) { p.classList.remove('show'); });
            var txTab = document.querySelector('.services-tab[data-tab="transactions"]');
            var txPanel = document.getElementById('servicesTransactionsPanel');
            if (txTab) { txTab.classList.add('active'); txTab.setAttribute('aria-selected', 'true'); }
            if (txPanel) { txPanel.classList.add('show'); }
            loadCustomerFilterForTransactions().then(function() {
                var custSel = document.getElementById('txCustomerFilter');
                if (custSel) custSel.value = currentCustomerId;
                loadTransactions();
            });
        }
        function initCustomerDetailTabs() {
            document.querySelectorAll('.customer-detail-tab').forEach(function(btn) {
                btn.onclick = function() {
                    var tab = this.getAttribute('data-tab');
                    document.querySelectorAll('.customer-detail-tab').forEach(function(b) { b.classList.remove('active'); });
                    document.querySelectorAll('.customer-detail-panel').forEach(function(p) { p.classList.remove('show'); p.style.display = 'none'; });
                    this.classList.add('active');
                    var pid = tab === 'timeline' ? 'customerTimelinePanel' : tab === 'conversations' ? 'customerConversationsPanel' : tab === 'transactions' ? 'customerTransactionsPanel' : 'customerNotesPanel';
                    var panel = document.getElementById(pid);
                    if (panel) { panel.style.display = 'block'; panel.classList.add('show'); }
                    if (tab === 'notes' && currentCustomerId) loadCustomerNotes(currentCustomerId);
                    if (tab === 'transactions' && currentCustomerId) loadCustomerTransactions(currentCustomerId);
                };
            });
        }
        var activityLabels = { message_sent: LANG === 'fa' ? 'ارسال پیام' : 'Message sent', conversation_assigned: LANG === 'fa' ? 'تخصیص مکالمه' : 'Conversation assigned', conversation_department_changed: LANG === 'fa' ? 'تغییر دپارتمان مکالمه' : 'Department changed', customer_note_added: LANG === 'fa' ? 'ثبت گزارش/یادداشت' : 'Note added' };
        async function loadCustomerTimeline(custId) {
            var list = document.getElementById('customerTimelineList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var res = await apiFetch('/api/customers/' + custId + '/timeline');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + (res.data && res.data.error ? res.data.error : t('err_generic')) + '</div>'; return; }
            var items = (res.data && res.data.data) || [];
            if (items.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">📋</span><br>' + (LANG === 'fa' ? 'هنوز فعالیتی ثبت نشده.' : 'No activity yet.') + '</div>'; return; }
            var safeName = (currentCustomerData && currentCustomerData.name) ? (currentCustomerData.name || '').replace(/'/g, '&#39;') : '';
            list.innerHTML = items.map(function(item) {
                var date = item.date ? fmtTZ(item.date, 'datetime') : '';
                if (item.type === 'conversation') {
                    var d = item.data;
                    var who = [d.assignee && d.assignee.name].filter(Boolean).join(', ');
                    return '<div class="customer-timeline-item customer-timeline-conv" data-convid="' + d.id + '" data-customername="' + safeName + '" onclick="openChatFromHistory(this)"><div class="customer-timeline-icon">💬</div><div class="customer-timeline-body"><div class="customer-timeline-title">' + (LANG === 'fa' ? 'مکالمه' : 'Conversation') + ' ' + (d.status || '') + '</div><div class="customer-timeline-meta">' + (d.messageCount || 0) + ' ' + (LANG === 'fa' ? 'پیام' : 'msgs') + (who ? ' · ' + (LANG === 'fa' ? 'مسئول: ' : 'Assignee: ') + escapeHtml(who) : '') + ' · ' + date + '</div></div></div>';
                }
                if (item.type === 'note') {
                    var n = item.data;
                    var un = userDisplay(n.user);
                    return '<div class="customer-timeline-item customer-timeline-note"><div class="customer-timeline-icon">📝</div><div class="customer-timeline-body"><div class="customer-timeline-title">' + (LANG === 'fa' ? 'گزارش/یادداشت' : 'Note') + ' · ' + escapeHtml(un) + '</div><div class="customer-timeline-content">' + escapeHtml((n.content || '').slice(0, 300)) + (n.content && n.content.length > 300 ? '…' : '') + '</div><div class="customer-timeline-meta">' + date + '</div></div></div>';
                }
                if (item.type === 'activity') {
                    var a = item.data;
                    var un = userDisplay(a.user);
                    var label = (LANG === 'fa' ? activityLabels[a.action] : null) || a.action || '';
                    return '<div class="customer-timeline-item customer-timeline-activity"><div class="customer-timeline-icon">⚡</div><div class="customer-timeline-body"><div class="customer-timeline-title">' + escapeHtml(label) + ' · ' + escapeHtml(un) + '</div><div class="customer-timeline-meta">' + escapeHtml(a.summary || '') + ' · ' + date + '</div></div></div>';
                }
                if (item.type === 'transaction') {
                    var tx = item.data;
                    var txLabels = { cash_in: 'ورود به صندوق', cash_out: 'خروج از صندوق', transfer_box: 'انتقال صندوق', bank_deposit: 'واریز بانک', bank_withdraw: 'برداشت بانک', transfer_account: 'انتقال حساب', income: 'درآمد', expense: 'هزینه' };
                    var isIn = ['cash_in','transfer_box','bank_withdraw','income'].indexOf(tx.type) >= 0;
                    var amt = parseFloat(tx.amount) || 0;
                    var desc = (tx.description || '').slice(0, 80) + (tx.description && tx.description.length > 80 ? '…' : '');
                    return '<div class="customer-timeline-item customer-timeline-transaction"><div class="customer-timeline-icon">💰</div><div class="customer-timeline-body"><div class="customer-timeline-title">' + (txLabels[tx.type] || tx.type) + '</div><div class="customer-timeline-content">' + escapeHtml(desc) + '</div><div class="customer-timeline-meta">' + date + ' · <span class="tx-amount ' + (isIn ? 'positive' : 'negative') + '">' + (isIn ? '+' : '-') + formatMoney(amt, tx.currency) + '</span></div></div></div>';
                }
                return '';
            }).join('');
        }
        async function loadCustomerTransactions(custId) {
            var list = document.getElementById('customerTransactionsList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var res = await apiFetch('/api/customers/' + custId + '/transactions');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + (res.data && res.data.error ? res.data.error : t('err_generic')) + '</div>'; return; }
            var rows = (res.data && res.data.data) || [];
            if (rows.length === 0) {
                list.innerHTML = '<div class="customer-transactions-empty"><div class="customer-transactions-empty-icon">\uD83D\uDCB0</div><p class="customer-transactions-empty-text">' + (LANG === 'fa' ? 'تراکنشی برای این مشتری ثبت نشده.' : 'No transactions for this customer.') + '</p><p class="customer-transactions-empty-hint">' + (LANG === 'fa' ? 'با دکمه\u200Cی «ثبت تراکنش» اولین تراکنش را ثبت کنید.' : 'Use «Register transaction» to add the first one.') + '</p></div>';
                return;
            }
            var typeLabels = { cash_in: LANG === 'fa' ? 'ورود به صندوق' : 'Cash in', cash_out: LANG === 'fa' ? 'خروج از صندوق' : 'Cash out', transfer_box: LANG === 'fa' ? 'انتقال صندوق' : 'Transfer', bank_deposit: LANG === 'fa' ? 'واریز بانک' : 'Bank deposit', bank_withdraw: LANG === 'fa' ? 'برداشت بانک' : 'Bank withdraw', transfer_account: LANG === 'fa' ? 'انتقال حساب' : 'Transfer account', income: LANG === 'fa' ? 'درآمد' : 'Income', expense: LANG === 'fa' ? 'هزینه' : 'Expense', buy: LANG === 'fa' ? 'خرید' : 'Buy', sell: LANG === 'fa' ? 'فروش' : 'Sell' };
            var statusLabels = { pending: LANG === 'fa' ? 'در انتظار تأیید' : 'Pending', approved: LANG === 'fa' ? 'تأیید شده' : 'Approved', rejected: LANG === 'fa' ? 'رد شده' : 'Rejected' };
            var statusClasses = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' };
            var canApprove = currentUser && ['owner', 'admin', 'manager'].indexOf(currentUser.role) >= 0;
            var inTypes = ['cash_in','transfer_box','bank_withdraw','income','sell','buy'];
            var totalIn = 0; var totalOut = 0;
            rows.forEach(function(tx) {
                var amt = parseFloat(tx.amount) || 0;
                if (inTypes.indexOf(tx.type) >= 0) totalIn += amt; else totalOut += amt;
            });
            var summaryHtml = '<div class="customer-transactions-summary"><span class="customer-transactions-summary-count">' + (LANG === 'fa' ? 'تعداد: ' : 'Count: ') + rows.length + '</span><span class="customer-transactions-summary-in">' + (LANG === 'fa' ? 'جمع ورودی: ' : 'Total in: ') + '<strong class="tx-amount positive">' + formatMoney(totalIn, 'IRR') + '</strong></span><span class="customer-transactions-summary-out">' + (LANG === 'fa' ? 'جمع خروجی: ' : 'Total out: ') + '<strong class="tx-amount negative">' + formatMoney(totalOut, 'IRR') + '</strong></span></div>';
            list.innerHTML = summaryHtml + rows.map(function(tx) {
                var isIn = inTypes.indexOf(tx.type) >= 0;
                var amt = parseFloat(tx.amount) || 0;
                var desc = (tx.description || '').slice(0, 60) + (tx.description && tx.description.length > 60 ? '\u2026' : '');
                var ref = tx.reference ? ' \u00B7 ' + escapeHtml(tx.reference) : '';
                var statusBadge = '<span class="badge ' + (statusClasses[tx.status] || '') + '">' + (statusLabels[tx.status] || tx.status || 'pending') + '</span>';
                var actions = '<div class="tx-row-actions">';
                actions += '<button type="button" class="btn-secondary btn-sm" onclick="openTransactionModalForEdit(\'' + tx.id + '\')" title="' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '">' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '</button>';
                if (tx.status === 'pending' && canApprove) {
                    actions += ' <button type="button" class="btn-primary btn-sm" onclick="approveTransaction(\'' + tx.id + '\')" title="' + (LANG === 'fa' ? 'تأیید' : 'Approve') + '">' + (LANG === 'fa' ? 'تأیید' : 'Approve') + '</button>';
                    actions += ' <button type="button" class="btn-secondary btn-sm" onclick="rejectTransaction(\'' + tx.id + '\')" title="' + (LANG === 'fa' ? 'رد' : 'Reject') + '">' + (LANG === 'fa' ? 'رد' : 'Reject') + '</button>';
                }
                actions += '</div>';
                var dateStr = tx.transactionDate || (tx.createdAt ? tx.createdAt.toString().slice(0, 10) : '');
                return '<div class="transaction-row customer-transaction-row"><div><span class="tx-type">' + (typeLabels[tx.type] || tx.type) + '</span> ' + statusBadge + '<div class="meta" style="margin-top:4px;">' + escapeHtml(desc) + ref + '</div><div class="meta">' + dateStr + '</div></div><div class="tx-row-right"><span class="tx-amount ' + (isIn ? 'positive' : 'negative') + '">' + (isIn ? '+' : '-') + formatMoney(amt, tx.currency) + '</span>' + actions + '</div></div>';
            }).join('');
        }
        async function loadCustomerNotes(custId) {
            var list = document.getElementById('customerNotesList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var res = await apiFetch('/api/customers/' + custId + '/notes');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + (res.data && res.data.error ? res.data.error : t('err_generic')) + '</div>'; return; }
            var data = res.data;
            var notes = (data && data.data) ? data.data : [];
            if (notes.length === 0) { list.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'هنوز یادداشتی ثبت نشده.' : 'No notes yet.') + '</div>'; return; }
            list.innerHTML = notes.map(function(n) {
                var userName = userDisplay(n.user);
                var date = n.createdAt ? fmtTZ(n.createdAt, 'datetime') : '';
                return '<div class="customer-note-item"><div class="customer-note-meta">' + escapeHtml(userName) + ' \u00B7 ' + date + '</div><div class="customer-note-content">' + escapeHtml((n.content || '').slice(0, 500)) + (n.content && n.content.length > 500 ? '\u2026' : '') + '</div></div>';
            }).join('');
        }
        async function addCustomerNote(custId) {
            var textarea = document.getElementById('customerNoteContent');
            var content = (textarea && textarea.value || '').trim();
            if (!content) { toast(LANG === 'fa' ? 'متن یادداشت الزامی است' : 'Note text required', true); return; }
            var btn = document.getElementById('customerNoteAddBtn');
            if (btn) btn.disabled = true;
            var res = await apiFetch('/api/customers/' + custId + '/notes', { method: 'POST', body: JSON.stringify({ content: content }) });
            if (btn) btn.disabled = false;
            if (res.needLogin) return;
            if (res.ok) { if (textarea) textarea.value = ''; toast(t('saved') || (LANG === 'fa' ? 'ذخیره شد' : 'Saved')); loadCustomerNotes(custId); loadCustomerTimeline(custId); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        function openCustomerModal(customerId) {
            var modal = document.getElementById('customerModal');
            if (!modal) return;
            modal.style.display = 'flex';
            document.getElementById('customerModalId').value = customerId || '';
            document.getElementById('customerModalTitle').textContent = customerId ? (LANG === 'fa' ? 'ویرایش مشتری' : 'Edit customer') : t('customer_add');
            document.getElementById('customerModalName').value = '';
            document.getElementById('customerModalPhone').value = '';
            document.getElementById('customerModalEmail').value = '';
            document.getElementById('customerModalStatus').value = 'active';
            document.getElementById('customerModalNotes').value = '';
            if (customerId && currentCustomerData && currentCustomerData.id === customerId) {
                document.getElementById('customerModalName').value = currentCustomerData.name || '';
                document.getElementById('customerModalPhone').value = currentCustomerData.phone || '';
                document.getElementById('customerModalEmail').value = currentCustomerData.email || '';
                document.getElementById('customerModalStatus').value = currentCustomerData.status || 'active';
                document.getElementById('customerModalNotes').value = currentCustomerData.notes || '';
            }
        }
        function closeCustomerModal() { var m = document.getElementById('customerModal'); if (m) m.style.display = 'none'; }
        async function saveCustomerFromModal() {
            var id = document.getElementById('customerModalId').value.trim();
            var name = document.getElementById('customerModalName').value.trim();
            var phone = (document.getElementById('customerModalPhone').value || '').trim().replace(/\s/g, '');
            var email = (document.getElementById('customerModalEmail').value || '').trim();
            var status = document.getElementById('customerModalStatus').value || 'active';
            var notes = (document.getElementById('customerModalNotes').value || '').trim();
            if (!name) { toast(LANG === 'fa' ? 'نام الزامی است' : 'Name required', true); return; }
            if (!id && !phone) { toast(LANG === 'fa' ? 'تلفن برای مشتری جدید الزامی است' : 'Phone required', true); return; }
            if (id) {
                var res = await apiFetch('/api/customers/' + id, { method: 'PUT', body: JSON.stringify({ name: name || undefined, phone: phone || undefined, email: email || undefined, status: status, notes: notes || undefined }) });
                if (res.needLogin) return;
                if (res.ok) { closeCustomerModal(); toast(t('btn_save')); if (currentCustomerId === id) currentCustomerData = res.data; showCustomerHistory(id, res.data.name || res.data.phone); loadCustomers(); } else toast((res.data && res.data.error) || t('err_generic'), true);
            } else {
                var res = await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify({ name: name, phone: phone, email: email || undefined, status: status, notes: notes || undefined }) });
                if (res.needLogin) return;
                if (res.ok) { closeCustomerModal(); toast(t('btn_save')); loadCustomers(); } else toast((res.data && res.data.error) || t('err_generic'), true);
            }
        }

        function setUserDisplay(u) {
            if (!u) return;
            var emailEl = document.getElementById('userEmail');
            var avatarEl = document.getElementById('userAvatar');
            if (emailEl) emailEl.textContent = u.username || u.email || u.name || '';
            if (avatarEl) {
                var avatarUrl = (u.avatar || '').trim();
                if (avatarUrl.indexOf('/') === 0) avatarUrl = (window.location.origin || '') + avatarUrl;
                if (avatarUrl && avatarUrl.indexOf('http') === 0) {
                    var img = document.createElement('img');
                    img.src = avatarUrl;
                    img.alt = '';
                    img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover'; img.style.borderRadius = 'inherit';
                    img.onerror = function() { avatarEl.innerHTML = ''; avatarEl.textContent = (u.name && u.name[0]) ? u.name[0].toUpperCase() : (u.email && u.email[0] ? u.email[0].toUpperCase() : '?'); };
                    avatarEl.innerHTML = '';
                    avatarEl.appendChild(img);
                } else {
                    avatarEl.innerHTML = '';
                    avatarEl.textContent = (u.name && u.name[0]) ? u.name[0].toUpperCase() : (u.email && u.email[0] ? u.email[0].toUpperCase() : '?');
                }
            }
        }
        function applyNavByRole() {
            var perms = (currentUser && currentUser.permissions) || {};
            document.querySelectorAll('.nav-link[data-section]').forEach(function(link) {
                var section = link.getAttribute('data-section');
                link.style.display = perms[section] !== false ? '' : 'none';
            });
        }
        function applyBranding(s) {
            if (!s) return;
            var defTitle = (LANG === 'fa' ? 'پورتال کارکنان کایا | صرافی کایا' : 'Kaya Exchange | Staff Portal');
            var defSite = (LANG === 'fa' ? 'صرافی کایا' : 'Kaya Exchange');
            var defFooter = (LANG === 'fa' ? 'صرافی کایا — پورتال کارکنان' : 'Kaya Exchange — Staff Portal');
            if (s.pageTitle) document.title = s.pageTitle; else document.title = defTitle;
            var fav = document.getElementById('favicon');
            if (fav) fav.href = (s.faviconUrl && s.faviconUrl.trim()) ? s.faviconUrl : ('data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'><rect width=\'32\' height=\'32\' rx=\'8\' fill=\'%23059669\'/><path fill=\'%23fff\' d=\'M10 8h4l2 4 2-4h4v12h-3v-6l-1.5 3L16 11v9h-3V8zm8 6h2v4h-2v-4z\'/></svg>');
            var logoText = s.siteName || defSite;
            var headerIcon = document.getElementById('headerLogoIcon');
            if (headerIcon) {
                if (s.logoUrl && s.logoUrl.trim()) { headerIcon.innerHTML = '<img src="' + escapeHtml(s.logoUrl) + '" alt="" style="width:28px;height:28px;object-fit:contain">'; } else { headerIcon.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icon-logo"/></svg>'; }
            }
            var headerLogoText = document.getElementById('headerLogoText');
            if (headerLogoText) headerLogoText.textContent = logoText;
            var headerLogo = document.getElementById('headerLogo');
            if (headerLogo) headerLogo.setAttribute('aria-label', logoText + (LANG === 'fa' ? ' — بازگشت به داشبورد' : ' — Back to dashboard'));
            var footerBrand = document.getElementById('appFooterBrand');
            if (footerBrand) footerBrand.textContent = (s.footerText && s.footerText.trim()) ? s.footerText : defFooter;
            var appFooter = document.getElementById('appFooter');
            if (appFooter) {
                appFooter.style.display = (s.showFooter === false) ? 'none' : '';
                var style = (s.footerStyle && ['accent', 'minimal', 'compact', 'line'].indexOf(s.footerStyle) >= 0) ? s.footerStyle : 'accent';
                appFooter.classList.remove('app-footer--accent', 'app-footer--minimal', 'app-footer--compact', 'app-footer--line');
                appFooter.classList.add('app-footer--' + style);
            }
            var loginTitleEl = document.getElementById('loginTitle');
            if (loginTitleEl) loginTitleEl.textContent = (s.loginTitle && s.loginTitle.trim()) ? s.loginTitle : (LANG === 'fa' ? 'پورتال کارکنان کایا' : 'Kaya Staff Portal');
            var setLoginLogo = function(containerId, size) {
                var c = document.getElementById(containerId);
                if (!c) return;
                if (s.logoUrl && s.logoUrl.trim()) { c.innerHTML = '<img src="' + escapeHtml(s.logoUrl) + '" alt="" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain">'; } else { c.innerHTML = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#icon-logo"/></svg>'; }
            };
            setLoginLogo('loginLogo', 48);
            setLoginLogo('loginLogoTotp', 40);
        }
        var HIDDEN_SECTIONS = [];
        function applyHiddenSections(hidden) {
            HIDDEN_SECTIONS = Array.isArray(hidden) ? hidden : [];
            document.querySelectorAll('.nav-link[data-page]').forEach(function(link) {
                var page = link.getAttribute('data-page');
                link.style.display = HIDDEN_SECTIONS.indexOf(page) >= 0 ? 'none' : '';
            });
        }
        async function loadPanelSettingsAndApply() {
            var res = await apiFetch('/api/panel-settings');
            if (res.ok && res.data) {
                applyBranding(res.data);
                if (res.data.hiddenSections) applyHiddenSections(res.data.hiddenSections);
                if (res.data.supportedLanguages && window.applySupportedLanguages) window.applySupportedLanguages(res.data.supportedLanguages, res.data.defaultLanguage);
                return;
            }
            fetch(API + '/api/panel-settings/public/branding').then(function(r) { return r.json(); }).then(function(data) { if (data && (data.siteName != null || data.logoUrl != null || data.faviconUrl != null || data.loginTitle != null || data.pageTitle != null || data.footerText != null || data.showFooter !== undefined || data.footerStyle != null)) applyBranding(data); }).catch(function() {});
            fetch(API + '/api/panel-settings/public/visibility').then(function(r) { return r.json(); }).then(function(data) { if (data && data.hiddenSections) applyHiddenSections(data.hiddenSections); }).catch(function() {});
            fetch(API + '/api/panel-settings/public/languages').then(function(r) { return r.json(); }).then(function(data) { if (data && data.supportedLanguages) window.applySupportedLanguages(data.supportedLanguages, data.defaultLanguage); }).catch(function() {});
        }
        var SECTIONS_FOR_VISIBILITY = [
            { page: 'dashboard', labelKey: 'nav_dashboard' },
            { page: 'conversations', labelKey: 'nav_conversations' },
            { page: 'customers', labelKey: 'nav_customers' },
            { page: 'tickets', labelKey: 'nav_tickets' },
            { page: 'tasks', labelKey: 'nav_tasks' },
            { page: 'processes', labelKey: 'nav_processes' },
            { page: 'departments', labelKey: 'nav_departments' },
            { page: 'users', labelKey: 'nav_users' },
            { page: 'branches', labelKey: 'nav_branches' },
            { page: 'supervision', labelKey: 'nav_supervision' },
            { page: 'staff-activity', labelKey: 'nav_staff_activity' },
            { page: 'profile', labelKey: 'nav_profile' },
            { page: 'internal-chat', labelKey: 'nav_internal_chat' },
            { page: 'announcements', labelKey: 'nav_announcements' },
            { page: 'whatsapp', labelKey: 'nav_whatsapp' },
            { page: 'rates', labelKey: 'nav_rates' },
            { page: 'services', labelKey: 'nav_services' },
            { page: 'panel-settings', labelKey: 'nav_panel_settings' }
        ];
        async function loadPanelSettings() {
            var loadingEl = document.getElementById('panelSettingsLoading');
            var contentEl = document.getElementById('panelSettingsContent');
            if (loadingEl) loadingEl.style.display = 'flex';
            if (contentEl) contentEl.style.display = 'none';
            var res = await apiFetch('/api/panel-settings');
            if (loadingEl) loadingEl.style.display = 'none';
            if (contentEl) contentEl.style.display = 'block';
            if (!res.ok) { toast(res.data && res.data.error ? res.data.error : t('err_generic'), true); return; }
            var d = res.data || {};
            var set = function(id, v) { var el = document.getElementById(id); if (el) el.value = v != null ? v : ''; };
            set('panelSettingSiteName', d.siteName);
            set('panelSettingLogoUrl', d.logoUrl);
            set('panelSettingFaviconUrl', d.faviconUrl);
            set('panelSettingLoginTitle', d.loginTitle);
            set('panelSettingPageTitle', d.pageTitle);
            set('panelSettingFooterText', d.footerText);
            var footerStyleEl = document.getElementById('panelSettingFooterStyle');
            if (footerStyleEl) footerStyleEl.value = (d.footerStyle && ['accent', 'minimal', 'compact', 'line'].indexOf(d.footerStyle) >= 0) ? d.footerStyle : 'accent';
            var hideFooterEl = document.getElementById('panelSettingHideFooter');
            if (hideFooterEl) hideFooterEl.checked = d.showFooter === false;
            var langModeEl = document.getElementById('panelSettingLanguageMode');
            var validModes = ['single', 'single_en', 'single_tr', 'bilingual', 'bilingual_fa_tr', 'bilingual_en_tr', 'trilingual'];
            if (langModeEl) langModeEl.value = validModes.indexOf(d.languageMode) >= 0 ? d.languageMode : 'trilingual';
            set('panelSettingDefaultLanguage', (d.defaultLanguage === 'fa' || d.defaultLanguage === 'en' || d.defaultLanguage === 'tr') ? d.defaultLanguage : 'fa');
            if (typeof updatePanelLanguageHint === 'function') updatePanelLanguageHint();
            if (typeof toggleDefaultLanguageVisibility === 'function') toggleDefaultLanguageVisibility();
            set('panelSettingSmtpHost', d.smtpHost);
            set('panelSettingSmtpPort', d.smtpPort);
            set('panelSettingSmtpUser', d.smtpUser);
            set('panelSettingSmtpPass', d.smtpPass != null ? d.smtpPass : '');
            set('panelSettingSmtpFrom', d.smtpFrom);
            set('panelSettingSmtpFromName', d.smtpFromName);
            var smtpSecureEl = document.getElementById('panelSettingSmtpSecure');
            if (smtpSecureEl) smtpSecureEl.checked = !!d.smtpSecure;
            var loginNotifEl = document.getElementById('panelSettingEmailLoginNotification');
            if (loginNotifEl) loginNotifEl.checked = !!d.emailLoginNotification;
            var hidden = Array.isArray(d.hiddenSections) ? d.hiddenSections : [];
            var container = document.getElementById('panelVisibilityToggles');
            if (container) {
                container.innerHTML = '';
                SECTIONS_FOR_VISIBILITY.forEach(function(s) {
                    var item = document.createElement('div');
                    item.className = 'panel-visibility-item';
                    var label = document.createElement('label');
                    var cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.dataset.page = s.page;
                    cb.checked = hidden.indexOf(s.page) < 0;
                    cb.id = 'panelVisible_' + s.page;
                    label.setAttribute('for', cb.id);
                    label.appendChild(cb);
                    label.appendChild(document.createTextNode(' ' + (t(s.labelKey) || s.page)));
                    item.appendChild(label);
                    container.appendChild(item);
                });
            }
            previewPanelLogo(d.logoUrl || '');
            previewPanelFavicon(d.faviconUrl || '');
            updatePanelLivePreview();
            loadCompanyEmails();
            loadCompanyEmailUserSelect();
            if (typeof initCompanyEmailsHandlers === 'function') initCompanyEmailsHandlers();
        }
        async function loadCompanyEmailUserSelect() {
            var sel = document.getElementById('companyEmailAssignedUser');
            if (!sel) return;
            var first = sel.options[0];
            sel.innerHTML = '';
            if (first) sel.appendChild(first);
            var res = await apiFetch('/api/users');
            if (!res.ok || !res.data || !res.data.data) return;
            res.data.data.forEach(function(u) {
                var opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = (u.name || u.username || u.email || u.id).trim() || ('User ' + u.id);
                sel.appendChild(opt);
            });
        }
        async function loadCompanyEmails() {
            var tbody = document.getElementById('companyEmailsTableBody');
            var emptyEl = document.getElementById('companyEmailsEmpty');
            if (!tbody) return;
            var res = await apiFetch('/api/company-emails');
            if (!res.ok) { if (emptyEl) emptyEl.style.display = 'block'; tbody.innerHTML = ''; return; }
            var list = (res.data && res.data.data) || [];
            if (list.length === 0) {
                tbody.innerHTML = '';
                if (emptyEl) emptyEl.style.display = 'block';
                return;
            }
            if (emptyEl) emptyEl.style.display = 'none';
            function escapeHtml(s) { if (s == null) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
            tbody.innerHTML = list.map(function(item) {
                var assigned = (item.assignedUser && (item.assignedUser.name || item.assignedUser.email)) || '—';
                var passBadge = item.hasPassword ? '<span class="badge badge-success">✓</span>' : '<span class="badge badge-muted">—</span>';
                var statusBadge = item.isActive ? '<span class="badge badge-success">' + (LANG === 'fa' ? 'فعال' : 'Active') + '</span>' : '<span class="badge badge-muted">' + (LANG === 'fa' ? 'غیرفعال' : 'Inactive') + '</span>';
                var sendCredsBtn = item.assignedUser && item.hasPassword ? '<button type="button" class="btn-sm btn-secondary company-email-send-creds" data-id="' + item.id + '" title="' + (t('panel_company_email_send_creds') || '') + '">' + (LANG === 'fa' ? 'ارسال ورود' : 'Send') + '</button>' : '';
                return '<tr data-id="' + item.id + '"><td>' + escapeHtml(item.email) + '</td><td>' + escapeHtml(item.label || '') + '</td><td>' + escapeHtml(assigned) + '</td><td>' + passBadge + '</td><td>' + statusBadge + '</td><td class="company-email-actions"><button type="button" class="btn-sm btn-secondary company-email-edit" data-id="' + item.id + '">' + (LANG === 'fa' ? 'ویرایش' : 'Edit') + '</button> ' + sendCredsBtn + ' <button type="button" class="btn-sm btn-danger company-email-delete" data-id="' + item.id + '">' + (LANG === 'fa' ? 'حذف' : 'Delete') + '</button></td></tr>';
            }).join('');
        }
        function openCompanyEmailForm(item) {
            var box = document.getElementById('companyEmailFormBox');
            var idEl = document.getElementById('companyEmailId');
            if (!box || !idEl) return;
            if (item) {
                idEl.value = item.id;
                document.getElementById('companyEmailAddress').value = item.email || '';
                document.getElementById('companyEmailLabel').value = item.label || '';
                document.getElementById('companyEmailAssignedUser').value = item.assignedUserId || '';
                document.getElementById('companyEmailPassword').value = '';
                document.getElementById('companyEmailNotes').value = item.notes || '';
                document.getElementById('companyEmailActive').checked = item.isActive !== false;
            } else {
                idEl.value = '';
                document.getElementById('companyEmailAddress').value = '';
                document.getElementById('companyEmailLabel').value = '';
                document.getElementById('companyEmailAssignedUser').value = '';
                document.getElementById('companyEmailPassword').value = '';
                document.getElementById('companyEmailNotes').value = '';
                document.getElementById('companyEmailActive').checked = true;
            }
            box.style.display = 'block';
        }
        function closeCompanyEmailForm() {
            var box = document.getElementById('companyEmailFormBox');
            if (box) box.style.display = 'none';
        }
        async function saveCompanyEmail() {
            var idEl = document.getElementById('companyEmailId');
            var email = (document.getElementById('companyEmailAddress') && document.getElementById('companyEmailAddress').value || '').trim();
            var label = (document.getElementById('companyEmailLabel') && document.getElementById('companyEmailLabel').value || '').trim();
            var assignedUserId = (document.getElementById('companyEmailAssignedUser') && document.getElementById('companyEmailAssignedUser').value || '') || null;
            var password = (document.getElementById('companyEmailPassword') && document.getElementById('companyEmailPassword').value || '').trim();
            var notes = (document.getElementById('companyEmailNotes') && document.getElementById('companyEmailNotes').value || '').trim();
            var isActive = document.getElementById('companyEmailActive') && document.getElementById('companyEmailActive').checked;
            if (!email) { toast(LANG === 'fa' ? 'آدرس ایمیل را وارد کنید.' : 'Enter email address.', true); return; }
            var payload = { email: email, label: label || null, assignedUserId: assignedUserId, notes: notes || null, isActive: isActive };
            if (password) payload.password = password;
            var url = '/api/company-emails';
            var method = 'POST';
            if (idEl && idEl.value) { url = '/api/company-emails/' + idEl.value; method = 'PUT'; }
            var res = await apiFetch(url, { method: method, body: JSON.stringify(payload) });
            if (res.ok) { toast(t('btn_save')); closeCompanyEmailForm(); loadCompanyEmails(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function deleteCompanyEmail(id) {
            if (!confirm(LANG === 'fa' ? 'این ایمیل شرکتی حذف شود؟' : 'Delete this company email?')) return;
            var res = await apiFetch('/api/company-emails/' + id, { method: 'DELETE' });
            if (res.ok) { toast(LANG === 'fa' ? 'حذف شد' : 'Deleted'); loadCompanyEmails(); closeCompanyEmailForm(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function sendCompanyEmailCredentials(id) {
            var res = await apiFetch('/api/company-emails/' + id + '/send-credentials', { method: 'POST', body: JSON.stringify({}) });
            if (res.ok) toast((res.data && res.data.message) || (LANG === 'fa' ? 'ارسال شد' : 'Sent')); else toast((res.data && res.data.error) || t('err_generic'), true);
        }
        var companyEmailsHandlersInited = false;
        function initCompanyEmailsHandlers() {
            if (companyEmailsHandlersInited) return;
            companyEmailsHandlersInited = true;
            var addBtn = document.getElementById('btnAddCompanyEmail');
            if (addBtn) addBtn.addEventListener('click', function() { openCompanyEmailForm(null); });
            var cancelBtn = document.getElementById('companyEmailCancelBtn');
            if (cancelBtn) cancelBtn.addEventListener('click', closeCompanyEmailForm);
            var saveBtn = document.getElementById('companyEmailSaveBtn');
            if (saveBtn) saveBtn.addEventListener('click', function() { saveCompanyEmail(); });
            var tbody = document.getElementById('companyEmailsTableBody');
            if (tbody) tbody.addEventListener('click', function(e) {
                var target = e.target;
                if (!target || !target.classList) return;
                var id = target.getAttribute('data-id');
                if (!id) return;
                if (target.classList.contains('company-email-edit')) {
                    apiFetch('/api/company-emails/' + id).then(function(res) { if (res.ok && res.data) openCompanyEmailForm(res.data); });
                } else if (target.classList.contains('company-email-delete')) deleteCompanyEmail(id);
                else if (target.classList.contains('company-email-send-creds')) sendCompanyEmailCredentials(id);
            });
        }
        function updatePanelLivePreview() {
            var siteName = (document.getElementById('panelSettingSiteName') && document.getElementById('panelSettingSiteName').value.trim()) || (LANG === 'fa' ? 'صرافی کایا' : 'Kaya Exchange');
            var pageTitle = (document.getElementById('panelSettingPageTitle') && document.getElementById('panelSettingPageTitle').value.trim()) || (LANG === 'fa' ? 'پورتال کارکنان | صرافی کایا' : 'Staff Portal | Kaya Exchange');
            var logoUrl = (document.getElementById('panelSettingLogoUrl') && document.getElementById('panelSettingLogoUrl').value.trim()) || '';
            var faviconUrl = (document.getElementById('panelSettingFaviconUrl') && document.getElementById('panelSettingFaviconUrl').value.trim()) || '';
            var titleEl = document.getElementById('panelPreviewPageTitle');
            var siteNameEl = document.getElementById('panelPreviewSiteName');
            var logoEl = document.getElementById('panelPreviewLogo');
            var logoPlaceholder = document.getElementById('panelPreviewLogoPlaceholder');
            var faviconEl = document.getElementById('panelPreviewFavicon');
            if (titleEl) titleEl.textContent = pageTitle;
            if (siteNameEl) siteNameEl.textContent = siteName;
            if (logoEl) { if (logoUrl) { logoEl.src = logoUrl; logoEl.style.display = ''; if (logoPlaceholder) logoPlaceholder.style.display = 'none'; } else { logoEl.removeAttribute('src'); logoEl.style.display = 'none'; if (logoPlaceholder) logoPlaceholder.style.display = ''; } }
            if (faviconEl) { if (faviconUrl) { faviconEl.src = faviconUrl; faviconEl.style.display = ''; } else { faviconEl.removeAttribute('src'); faviconEl.style.display = 'none'; } }
        }
        function updatePanelLanguageHint() {
            var sel = document.getElementById('panelSettingLanguageMode');
            var hint = document.getElementById('panelLanguageModeDesc');
            if (!sel || !hint) return;
            var mode = sel.value;
            var hints = { single: 'panel_language_hint_single', single_en: 'panel_language_hint_single_en', single_tr: 'panel_language_hint_single_tr', bilingual: 'panel_language_hint_bilingual', bilingual_fa_tr: 'panel_language_hint_bilingual_fa_tr', bilingual_en_tr: 'panel_language_hint_bilingual_en_tr', trilingual: 'panel_language_hint_trilingual' };
            hint.textContent = t(hints[mode] || 'panel_language_hint_trilingual') !== (hints[mode] || 'panel_language_hint_trilingual') ? t(hints[mode] || 'panel_language_hint_trilingual') : '';
        }
        function toggleDefaultLanguageVisibility() {
            var wrap = document.getElementById('panelDefaultLanguageWrap');
            var sel = document.getElementById('panelSettingLanguageMode');
            if (!wrap || !sel) return;
            var multi = ['bilingual', 'bilingual_fa_tr', 'bilingual_en_tr', 'trilingual'].indexOf(sel.value) >= 0;
            wrap.style.display = multi ? 'block' : 'none';
        }
        function previewPanelLogo(url) {
            var wrap = document.getElementById('panelLogoPreview');
            var img = document.getElementById('panelLogoPreviewImg');
            if (!wrap || !img) return;
            url = (url || '').trim();
            if (url) { wrap.style.display = 'block'; img.src = url; img.style.display = ''; img.onerror = function() { img.style.display = 'none'; }; } else { wrap.style.display = 'none'; }
        }
        function previewPanelFavicon(url) {
            var wrap = document.getElementById('panelFaviconPreview');
            var img = document.getElementById('panelFaviconPreviewImg');
            if (!wrap || !img) return;
            url = (url || '').trim();
            if (url) { wrap.style.display = 'block'; img.src = url; img.style.display = ''; img.onerror = function() { img.style.display = 'none'; }; } else { wrap.style.display = 'none'; }
        }
        async function savePanelSettings() {
            var btn = document.getElementById('panelSettingsSaveBtn');
            var statusEl = document.getElementById('panelSettingsSaveStatus');
            if (btn) { btn.disabled = true; btn.textContent = (LANG === 'fa' ? 'در حال ذخیره...' : LANG === 'tr' ? 'Kaydediliyor...' : 'Saving...'); }
            if (statusEl) { statusEl.style.display = 'none'; statusEl.className = 'panel-settings-save-status'; }
            var get = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
            var hiddenSections = [];
            document.querySelectorAll('#panelVisibilityToggles input[type="checkbox"][data-page]').forEach(function(cb) {
                if (!cb.checked) hiddenSections.push(cb.dataset.page);
            });
            var payload = {
                siteName: get('panelSettingSiteName'),
                logoUrl: get('panelSettingLogoUrl'),
                faviconUrl: get('panelSettingFaviconUrl'),
                loginTitle: get('panelSettingLoginTitle'),
                pageTitle: get('panelSettingPageTitle'),
                footerText: get('panelSettingFooterText'),
                showFooter: !(document.getElementById('panelSettingHideFooter') && document.getElementById('panelSettingHideFooter').checked),
                footerStyle: (function() { var el = document.getElementById('panelSettingFooterStyle'); var v = el ? el.value : 'accent'; return (v && ['accent', 'minimal', 'compact', 'line'].indexOf(v) >= 0) ? v : 'accent'; })(),
                smtpHost: get('panelSettingSmtpHost'),
                smtpPort: get('panelSettingSmtpPort'),
                smtpUser: get('panelSettingSmtpUser'),
                smtpPass: get('panelSettingSmtpPass'),
                smtpFrom: get('panelSettingSmtpFrom'),
                smtpFromName: get('panelSettingSmtpFromName'),
                smtpSecure: !!(document.getElementById('panelSettingSmtpSecure') && document.getElementById('panelSettingSmtpSecure').checked),
                emailLoginNotification: !!(document.getElementById('panelSettingEmailLoginNotification') && document.getElementById('panelSettingEmailLoginNotification').checked),
                hiddenSections: hiddenSections
            };
            var langModeEl = document.getElementById('panelSettingLanguageMode');
            var validModes = ['single', 'single_en', 'single_tr', 'bilingual', 'bilingual_fa_tr', 'bilingual_en_tr', 'trilingual'];
            payload.languageMode = (langModeEl && validModes.indexOf(langModeEl.value) >= 0) ? langModeEl.value : 'trilingual';
            var defaultLangEl = document.getElementById('panelSettingDefaultLanguage');
            if (defaultLangEl && (defaultLangEl.value === 'fa' || defaultLangEl.value === 'en' || defaultLangEl.value === 'tr')) payload.defaultLanguage = defaultLangEl.value;
            var res = await apiFetch('/api/panel-settings', { method: 'PUT', body: JSON.stringify(payload) });
            if (btn) { btn.disabled = false; btn.textContent = t('btn_save'); }
            if (res.ok && res.data) {
                var savedFooterStyle = (function() { var el = document.getElementById('panelSettingFooterStyle'); var v = el ? el.value : ''; return (v && ['accent', 'minimal', 'compact', 'line'].indexOf(v) >= 0) ? v : null; })();
                if (savedFooterStyle != null) res.data.footerStyle = savedFooterStyle;
                applyBranding(res.data);
                if (res.data.hiddenSections) applyHiddenSections(res.data.hiddenSections);
                var mode = res.data.languageMode;
                if (mode && window.applySupportedLanguages) window.applySupportedLanguages(mode === 'single' ? ['fa'] : mode === 'bilingual' ? ['fa', 'en'] : ['fa', 'en', 'tr']);
                toast(t('saved'));
                if (statusEl) { statusEl.textContent = (LANG === 'fa' ? 'ذخیره شد' : LANG === 'tr' ? 'Kaydedildi' : 'Saved'); statusEl.className = 'panel-settings-save-status saved'; statusEl.style.display = 'inline'; setTimeout(function() { statusEl.style.display = 'none'; }, 3000); }
            } else {
                toast((res.data && res.data.error) || t('err_generic'), true);
                if (statusEl) { statusEl.textContent = (res.data && res.data.error) || t('err_generic'); statusEl.className = 'panel-settings-save-status error'; statusEl.style.display = 'inline'; }
            }
        }
        async function sendPanelTestEmail() {
            var toEl = document.getElementById('panelTestEmailTo');
            var btn = document.getElementById('panelTestEmailBtn');
            var statusEl = document.getElementById('panelTestEmailStatus');
            var to = (toEl && toEl.value || '').trim();
            if (!to) { toast(LANG === 'fa' ? 'آدرس ایمیل را وارد کنید.' : 'Enter email address.', true); return; }
            if (btn) { btn.disabled = true; btn.textContent = (LANG === 'fa' ? 'در حال ارسال...' : 'Sending...'); }
            if (statusEl) { statusEl.style.display = 'none'; }
            try {
                var res = await apiFetch('/api/panel-settings/test-email', { method: 'POST', body: JSON.stringify({ to: to }) });
                if (res.ok && res.data && res.data.ok) {
                    toast(res.data.message || (LANG === 'fa' ? 'ایمیل تست ارسال شد.' : 'Test email sent.'));
                    if (statusEl) { statusEl.textContent = (LANG === 'fa' ? 'ارسال شد' : 'Sent'); statusEl.className = 'panel-test-email-status success'; statusEl.style.display = 'inline'; }
                } else {
                    toast((res.data && res.data.error) || (LANG === 'fa' ? 'ارسال ناموفق' : 'Send failed'), true);
                    if (statusEl) { statusEl.textContent = (res.data && res.data.error) || ''; statusEl.className = 'panel-test-email-status error'; statusEl.style.display = 'inline'; }
                }
            } catch (e) {
                toast(LANG === 'fa' ? 'خطا در ارسال' : 'Send error', true);
                if (statusEl) { statusEl.textContent = (e && e.message) || ''; statusEl.className = 'panel-test-email-status error'; statusEl.style.display = 'inline'; }
            }
            if (btn) { btn.disabled = false; btn.textContent = t('panel_test_email_btn'); }
        }
        var VALID_PAGES = ['dashboard','conversations','customers','departments','users','tickets','tasks','processes','whatsapp','branches','supervision','staff-activity','profile','announcements','internal-chat','rates','services','panel-settings'];
        function applyHashRoute() {
            var hash = (location.hash || '').replace(/^#/, '');
            var page = VALID_PAGES.indexOf(hash) >= 0 ? hash : (function() { try { var last = sessionStorage.getItem('crm_last_page'); return last && VALID_PAGES.indexOf(last) >= 0 ? last : 'dashboard'; } catch (_) { return 'dashboard'; } })();
            showPage(page);
        }
        function toggleSidebarMobile() { var s = document.getElementById('sidebar'); var o = document.getElementById('sidebarOverlay'); var btn = document.getElementById('headerMenuBtn'); if (s && s.classList.contains('sidebar-open')) { closeSidebarMobile(); } else { if (s) s.classList.add('sidebar-open'); if (o) { o.classList.add('show'); o.style.display = 'block'; document.body.style.overflow = 'hidden'; } if (btn) btn.setAttribute('aria-expanded', 'true'); } }
        function closeSidebarMobile() { var s = document.getElementById('sidebar'); var o = document.getElementById('sidebarOverlay'); var btn = document.getElementById('headerMenuBtn'); if (s) s.classList.remove('sidebar-open'); if (o) { o.classList.remove('show'); o.style.display = 'none'; document.body.style.overflow = ''; } if (btn) btn.setAttribute('aria-expanded', 'false'); }
        function showPage(page) {
            if (page === 'panel-settings' && (!currentUser || !currentUser.permissions || currentUser.permissions.panel_settings !== true)) { page = 'dashboard'; var base = (window.location.pathname && window.location.pathname !== '/dashboard.html') ? window.location.pathname : '/'; try { window.history.replaceState(null, '', base + '#dashboard'); } catch (e) {} }
            if (HIDDEN_SECTIONS && HIDDEN_SECTIONS.indexOf(page) >= 0) { page = 'dashboard'; var base = (window.location.pathname && window.location.pathname !== '/dashboard.html') ? window.location.pathname : '/'; try { window.history.replaceState(null, '', base + '#dashboard'); } catch (e) {} }
            var prevPage = (document.querySelector('.nav-link.active') || {}).getAttribute('data-page');
            closeSidebarMobile();
            if (qrRefreshInterval && page !== 'whatsapp') { clearInterval(qrRefreshInterval); qrRefreshInterval = null; }
            if (page && window.location.hash !== '#' + page) { var base = (window.location.pathname && window.location.pathname !== '/dashboard.html') ? window.location.pathname : '/'; try { window.history.replaceState(null, '', base + '#' + page); } catch (e) {} }
            try { sessionStorage.setItem('crm_last_page', page); } catch (_) {}
            document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); if (l.getAttribute('data-page') === page) l.classList.add('active'); });
            document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('show'); p.style.display = 'none'; });
            var ids = { dashboard: 'pageDashboard', conversations: 'pageConversations', customers: 'pageCustomers', departments: 'pageDepartments', users: 'pageUsers', tickets: 'pageTickets', tasks: 'pageTasks', processes: 'pageProcesses', whatsapp: 'pageWhatsapp', branches: 'pageBranches', supervision: 'pageSupervision', 'staff-activity': 'pageStaffActivity', profile: 'pageProfile', announcements: 'pageAnnouncements', 'internal-chat': 'pageInternalChat', rates: 'pageRates', services: 'pageServices', 'panel-settings': 'pagePanelSettings' };
            if (ids[page]) { var el = document.getElementById(ids[page]); if (el) { el.style.display = (page === 'conversations' || page === 'internal-chat') ? 'flex' : 'block'; el.classList.add('show'); } }
            var content = document.querySelector('.content');
            if (content) { content.classList.toggle('page-conversations', page === 'conversations'); }
            if (page === 'dashboard') loadDashboard();
            if (page === 'conversations') { loadConvFiltersInit(); loadConversations(); }
            if (page === 'customers') loadCustomers();
            if (page === 'departments') { loadDepartments(); loadBranchesForSelect(['deptBranch']); }
            if (page === 'users') { document.getElementById('userFormBox').style.display = 'none'; document.getElementById('btnAddUser').style.display = (currentUser && currentUser.permissions && currentUser.permissions.manage_users) ? '' : 'none'; document.getElementById('btnCancelUserForm').style.display = 'none'; loadUsers(); loadDeptsForUser(); loadBranchesForSelect(['userBranch','userEditBranch']); initUserAddPerms(); initUserFilters(); initUserEditTabs(); }
            if (page === 'tickets') { loadTicketFiltersInit(); loadTickets(); }
            if (page === 'tasks') { loadTasksFilters(); loadTasks(); loadTasksSummary(); initTaskSearchDebounce(); }
            if (page === 'processes') { initProcessTabs(); loadProcessTemplates(); loadProcessInstances(); loadProcessTemplateSelect(); }
            if (page === 'whatsapp') { loadWhatsappStatus(); loadWhatsappWelcomeConfig(); }
            if (page === 'rates') { loadRatesAdjustments(); loadTickerConfig(); loadCurrencies(); }
            if (page === 'services') { initServicesTabs(); loadServicesPage(); }
            if (page === 'branches') { loadBranches(); }
            if (page === 'staff-activity') { loadStaffActivity(); startStaffActivityLive(); } else { stopStaffActivityLive(); }
            if (page === 'profile') loadProfile();
            if (page === 'announcements') { loadAnnouncements(); if (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin' || currentUser.role === 'manager')) { document.getElementById('announcementSendBox').style.display = 'block'; loadAnnouncementTargets(); } else document.getElementById('announcementSendBox').style.display = 'none'; }
            if (page === 'internal-chat') { window.hasNewInternalChat = false; updateNavBadges(); var popupTid = currentInternalThreadId; closeInternalChatPopup(); var wrap = document.getElementById('internalChatLayoutWrap'); if (wrap) wrap.classList.remove('internal-chat-mobile-chat-open'); loadInternalThreads(); loadInternalUsers(); if (popupTid) setTimeout(function(){ openInternalThread(popupTid); }, 150); }
            if (page === 'supervision') { loadSupervisionFiltersInit(); loadSupervisionPerformance(); document.querySelectorAll('.sup-tab').forEach(function(b){ b.classList.remove('active'); if(b.getAttribute('data-tab')==='performance') b.classList.add('active'); }); document.querySelectorAll('.sup-panel').forEach(function(p){ p.classList.remove('show'); if(p.id==='supPerformance') p.classList.add('show'); }); }
            if (page === 'panel-settings') loadPanelSettings();
            var prevPage = (document.querySelector('.nav-link.active') || {}).getAttribute('data-page');
            if (prevPage === 'internal-chat' && page !== 'internal-chat' && currentInternalThreadId) {
                var headerEl = document.getElementById('internalChatHeader');
                var name = (headerEl && headerEl.textContent) ? headerEl.textContent.trim() : (LANG === 'fa' ? 'چت' : 'Chat');
                showInternalChatPopup(currentInternalThreadId, name);
                var pane = document.getElementById('internalChatPane');
                if (pane) pane.style.display = 'none';
                var wrap = document.getElementById('internalChatLayoutWrap');
                if (wrap) wrap.classList.remove('internal-chat-has-chat', 'internal-chat-mobile-chat-open');
            }
            updateInternalChatFloatingBtn();
        }

        function toggleTicketForm() {
            var box = document.getElementById('ticketFormBox');
            if (box.style.display === 'none') { box.style.display = 'block'; loadTicketFormSelects(); } else { box.style.display = 'none'; }
        }
        async function loadTicketFiltersInit() {
            await loadTicketFormSelects();
            var res = await apiFetch('/api/departments');
            if (res.ok && res.data && res.data.data) {
                var sel = document.getElementById('ticketFilterDept');
                if (sel) sel.innerHTML = '<option value="">' + (LANG === 'fa' ? 'همه دپارتمان‌ها' : 'All depts') + '</option>' + res.data.data.map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name || '') + '</option>'; }).join('');
            }
        }
        async function loadTicketFormSelects() {
            var res = await apiFetch('/api/users');
            if (!res.ok || !res.data || !res.data.data) return;
            var users = res.data.data;
            var unassOpt = '<option value="">' + (LANG === 'fa' ? 'بدون تخصیص' : 'Unassigned') + '</option>' + users.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
            var anyOpt = '<option value="">' + (LANG === 'fa' ? 'هر مسئول' : 'Any') + '</option>' + users.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
            var a1 = document.getElementById('ticketAssignee'); if (a1) a1.innerHTML = unassOpt;
            var a2 = document.getElementById('ticketFilterAssignee'); if (a2) a2.innerHTML = anyOpt;
            var a3 = document.getElementById('ticketDetailAssignee'); if (a3) a3.innerHTML = unassOpt;
            var deptRes = await apiFetch('/api/departments');
            if (deptRes.ok && deptRes.data && deptRes.data.data) {
                var deptOpt = '<option value="">' + (LANG === 'fa' ? 'بدون دپارتمان' : 'No dept') + '</option>' + deptRes.data.data.map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name || '') + '</option>'; }).join('');
                var td = document.getElementById('ticketDept'); if (td) td.innerHTML = deptOpt;
            }
        }
        function applyTicketFilters() { loadTickets(); }
        async function loadTickets() {
            var list = document.getElementById('ticketList');
            var statsEl = document.getElementById('ticketStats');
            if (!list) return;
            setLoading('ticketList', 4);
            var q = '?limit=50';
            var s = document.getElementById('ticketFilterStatus'); if (s && s.value) q += '&status=' + encodeURIComponent(s.value);
            var p = document.getElementById('ticketFilterPriority'); if (p && p.value) q += '&priority=' + encodeURIComponent(p.value);
            var a = document.getElementById('ticketFilterAssignee'); if (a && a.value) q += '&assignedTo=' + encodeURIComponent(a.value);
            var d = document.getElementById('ticketFilterDept'); if (d && d.value) q += '&departmentId=' + encodeURIComponent(d.value);
            var search = document.getElementById('ticketSearch'); if (search && search.value.trim()) q += '&search=' + encodeURIComponent(search.value.trim());
            var sortEl = document.getElementById('ticketFilterSort'); if (sortEl && sortEl.value) q += '&sort=' + encodeURIComponent(sortEl.value);
            try {
                var res = await apiFetch('/api/tickets' + q);
                var statsRes = await apiFetch('/api/tickets/stats');
                if (res.needLogin) return;
                if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
                var data = res.data;
                if (!data) { list.innerHTML = '<div class="empty">' + t('err_generic') + '</div>'; return; }
                var rows = Array.isArray(data.data) ? data.data : (Array.isArray(data.rows) ? data.rows : []);
                var stats;
                if (statsRes.ok && statsRes.data) { stats = statsRes.data; } else { stats = { total: data.total || rows.length || 0, open: 0, in_progress: 0, resolved: 0, closed: 0 }; rows.forEach(function(x){ if (stats[x.status] !== undefined) stats[x.status]++; }); }
                if (statsEl) {
                    var archCount = stats.archived || 0;
                    statsEl.innerHTML = '<div class="ticket-stat-card"><div class="ticket-stat-val">' + (stats.total || 0) + '</div><div class="ticket-stat-label">' + (LANG === 'fa' ? 'کل' : 'Total') + '</div></div><div class="ticket-stat-card ticket-stat-open"><div class="ticket-stat-val">' + (stats.open || 0) + '</div><div class="ticket-stat-label">' + t('status_open') + '</div></div><div class="ticket-stat-card ticket-stat-progress"><div class="ticket-stat-val">' + (stats.in_progress || 0) + '</div><div class="ticket-stat-label">' + t('status_in_progress') + '</div></div><div class="ticket-stat-card ticket-stat-resolved"><div class="ticket-stat-val">' + (stats.resolved || 0) + '</div><div class="ticket-stat-label">' + t('status_resolved') + '</div></div><div class="ticket-stat-card ticket-stat-closed"><div class="ticket-stat-val">' + (stats.closed || 0) + '</div><div class="ticket-stat-label">' + t('status_closed') + '</div></div><div class="ticket-stat-card ticket-stat-archived"><div class="ticket-stat-val">' + archCount + '</div><div class="ticket-stat-label">' + t('status_archived') + '</div></div>';
                    statsEl.style.display = 'grid';
                }
                if (rows.length === 0) { list.innerHTML = '<div class="empty ticket-list-empty"><span class="empty-icon">🎫</span><p>' + t('empty_tickets') + '</p><button type="button" class="btn-primary" onclick="toggleTicketForm()" style="margin-top:12px;">' + t('create_ticket') + '</button></div>'; return; }
                list.innerHTML = rows.map(function(tk) {
                    var statusLabel = tk.status === 'open' ? t('status_open') : tk.status === 'in_progress' ? t('status_in_progress') : tk.status === 'resolved' ? t('status_resolved') : tk.status === 'closed' ? t('status_closed') : tk.status === 'archived' ? t('status_archived') : tk.status || '';
                    var prioLabel = { low: t('priority_low'), normal: t('priority_normal'), high: t('priority_high'), urgent: t('priority_urgent') }[tk.priority] || tk.priority || '';
                    var assign = userDisplay(tk.assignee);
                    var dept = (tk.department && tk.department.name) ? tk.department.name : '';
                    var createdStr = tk.createdAt ? (fmtTZ ? fmtTZ(tk.createdAt, 'datetime') : tk.createdAt) : '';
                    var meta = [createdStr, userDisplay(tk.creator), assign, dept].filter(Boolean).join(' · ');
                    var num = (tk.ticketNumber || '').trim();
                    var numHtml = num ? '<span class="ticket-number">' + escapeHtml(num) + '</span> ' : '';
                    return '<div class="ticket-card" onclick="loadTicketDetail(\'' + (tk.id || '').replace(/'/g, "\\'") + '\')"><div class="ticket-card-body">' + numHtml + '<span class="ticket-card-title">' + escapeHtml(tk.title || '') + '</span><div class="ticket-card-meta">' + escapeHtml(meta) + '</div></div><div class="ticket-card-badges"><span class="ticket-badge ticket-badge-prio ' + (tk.priority || '') + '">' + escapeHtml(prioLabel) + '</span><span class="ticket-badge ticket-badge-status ' + (tk.status || '') + '">' + escapeHtml(statusLabel) + '</span></div></div>';
                }).join('');
            } catch (e) {
                list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (e && e.message ? escapeHtml(e.message) : '') + '</div>';
            }
        }
        var currentTicketId = null;
        function showTicketList() {
            document.getElementById('ticketDetail').style.display = 'none';
            document.getElementById('ticketList').style.display = 'block';
            currentTicketId = null;
            document.getElementById('ticketReplyContent').value = '';
            document.getElementById('ticketReplyFile').value = '';
            document.getElementById('ticketReplyAttachments').textContent = '';
            loadTickets();
        }
        function canManageTickets() { var r = (currentUser && currentUser.role) || ''; if (['owner','admin','manager','supervisor'].indexOf(r) >= 0) return true; return !!(currentUser && currentUser.permissions && currentUser.permissions.manage_tickets); }
        var ticketEditMode = false;
        function toggleTicketEditMode() {
            ticketEditMode = !ticketEditMode;
            var titleEl = document.getElementById('ticketDetailTitle');
            var titleEdit = document.getElementById('ticketDetailTitleEdit');
            var titleInput = document.getElementById('ticketDetailTitleInput');
            var descEl = document.getElementById('ticketDetailDesc');
            var descEdit = document.getElementById('ticketDetailDescEdit');
            var descInput = document.getElementById('ticketDetailDescInput');
            var editBtn = document.getElementById('ticketEditBtn');
            if (ticketEditMode) {
                if (titleEl) titleEl.style.display = 'none';
                if (titleEdit) titleEdit.style.display = 'block';
                if (titleInput) { titleInput.value = titleEl ? titleEl.textContent : ''; titleInput.focus(); }
                if (descEl) descEl.style.display = 'none';
                if (descEdit) descEdit.style.display = 'block';
                if (descInput) descInput.value = descEl ? descEl.textContent : '';
                if (editBtn) editBtn.textContent = t('cancel') || (LANG === 'fa' ? 'انصراف' : 'Cancel');
            } else {
                if (titleEl) titleEl.style.display = '';
                if (titleEdit) titleEdit.style.display = 'none';
                if (descEl) descEl.style.display = (descEl && descEl.textContent.trim()) ? '' : 'none';
                if (descEdit) descEdit.style.display = 'none';
                if (editBtn) editBtn.textContent = t('btn_edit') || (LANG === 'fa' ? 'ویرایش' : 'Edit');
            }
        }
        async function updateTicketFromDetail() {
            if (!currentTicketId) return;
            var statusSel = document.getElementById('ticketDetailStatus');
            var assigneeSel = document.getElementById('ticketDetailAssignee');
            var prioritySel = document.getElementById('ticketDetailPriority');
            var dueInp = document.getElementById('ticketDetailDueDate');
            var titleInput = document.getElementById('ticketDetailTitleInput');
            var descInput = document.getElementById('ticketDetailDescInput');
            var body = {};
            if (statusSel) body.status = statusSel.value;
            if (assigneeSel) body.assignedTo = assigneeSel.value || null;
            if (prioritySel) body.priority = prioritySel.value;
            if (dueInp) body.dueDate = dueInp.value ? dueInp.value : null;
            if (ticketEditMode && titleInput) { body.title = titleInput.value.trim(); if (!body.title) { toast(t('ticket_title_required') || (LANG === 'fa' ? 'عنوان الزامی است' : 'Title required'), true); return; } }
            if (ticketEditMode && descInput !== undefined) body.description = descInput.value || '';
            var res = await apiFetch('/api/tickets/' + currentTicketId, { method: 'PUT', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { if (ticketEditMode) { ticketEditMode = false; toggleTicketEditMode(); } toast(t('btn_save')); loadTicketDetail(currentTicketId); loadTickets(); } else toast((res.data && res.data.error) || t('err_generic'), true);
        }
        function archiveTicket() {
            if (!currentTicketId) return;
            updateTicketStatus(currentTicketId, 'archived');
        }
        function deleteTicketConfirm() {
            if (!currentTicketId) return;
            if (!confirm(LANG === 'fa' ? 'آیا از حذف این تیکت مطمئن هستید؟ این عمل قابل بازگشت نیست.' : 'Delete this ticket? This cannot be undone.')) return;
            deleteTicket(currentTicketId);
        }
        async function updateTicketStatus(id, status) {
            var res = await apiFetch('/api/tickets/' + id, { method: 'PUT', body: JSON.stringify({ status: status }) });
            if (res.needLogin) return;
            if (res.ok) { toast(LANG === 'fa' ? 'تیکت به آرشیو ارسال شد' : 'Ticket archived'); loadTicketDetail(currentTicketId); loadTickets(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function deleteTicket(id) {
            var res = await apiFetch('/api/tickets/' + id, { method: 'DELETE' });
            if (res.needLogin) return;
            if (res.ok) { toast(LANG === 'fa' ? 'تیکت حذف شد' : 'Ticket deleted'); showTicketList(); loadTickets(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function loadTicketDetail(id) {
            currentTicketId = id;
            ticketEditMode = false;
            document.getElementById('ticketList').style.display = 'none';
            document.getElementById('ticketDetail').style.display = 'block';
            var titleEdit = document.getElementById('ticketDetailTitleEdit');
            var descEdit = document.getElementById('ticketDetailDescEdit');
            if (titleEdit) titleEdit.style.display = 'none';
            if (descEdit) descEdit.style.display = 'none';
            var titleEl = document.getElementById('ticketDetailTitle');
            if (titleEl) titleEl.style.display = '';
            var editBtn = document.getElementById('ticketEditBtn');
            if (editBtn) { editBtn.textContent = t('btn_edit') || (LANG === 'fa' ? 'ویرایش' : 'Edit'); editBtn.style.display = canManageTickets() ? '' : 'none'; }
            var delBtn = document.getElementById('ticketDeleteBtn');
            var archBtn = document.getElementById('ticketArchiveBtn');
            if (delBtn) delBtn.style.display = canManageTickets() ? '' : 'none';
            if (archBtn) archBtn.style.display = canManageTickets() ? '' : 'none';
            var res = await apiFetch('/api/tickets/' + id);
            if (res.needLogin) return;
            if (!res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); showTicketList(); return; }
            var t = res.data;
            var numEl = document.getElementById('ticketDetailNumber');
            if (numEl) numEl.textContent = (t.ticketNumber || '').trim() || '';
            document.getElementById('ticketDetailTitle').textContent = t.title || '';
            var statusLabel = t.status === 'open' ? t('status_open') : t.status === 'in_progress' ? t('status_in_progress') : t.status === 'resolved' ? t('status_resolved') : t.status === 'closed' ? t('status_closed') : t.status === 'archived' ? t('status_archived') : t.status || '';
            var prioLabel = { low: t('priority_low'), normal: t('priority_normal'), high: t('priority_high'), urgent: t('priority_urgent') }[t.priority] || t.priority || '';
            var createdStr = t.createdAt ? (fmtTZ ? fmtTZ(t.createdAt, 'datetime') : t.createdAt) : '';
            var metaParts = [(LANG === 'fa' ? 'تاریخ ثبت: ' : 'Created: ') + createdStr, t('creator_label') + ' ' + userDisplay(t.creator), t('assignee_label') + ' ' + userDisplay(t.assignee), t('th_status') + ': ' + statusLabel, t('ticket_priority') + ': ' + prioLabel];
            if (t.department && t.department.name) metaParts.push((t('label_dept') || 'دپارتمان') + ': ' + t.department.name);
            if (t.dueDate) metaParts.push(t('due_label') + ' ' + (fmtTZ ? fmtTZ(t.dueDate, 'date') : t.dueDate));
            document.getElementById('ticketDetailMeta').textContent = metaParts.join(' | ');
            var descEl = document.getElementById('ticketDetailDesc');
            if (descEl) { descEl.textContent = (t.description || '').trim(); descEl.style.display = (t.description || '').trim() ? '' : 'none'; }
            var overdueEl = document.getElementById('ticketDetailOverdue');
            if (overdueEl) {
                var due = t.dueDate;
                var isOverdue = due && ['open','in_progress'].indexOf(t.status) >= 0 && new Date(due) < new Date();
                overdueEl.style.display = isOverdue ? '' : 'none';
            }
            var statusSel = document.getElementById('ticketDetailStatus');
            var assigneeSel = document.getElementById('ticketDetailAssignee');
            var prioritySel = document.getElementById('ticketDetailPriority');
            var dueInp = document.getElementById('ticketDetailDueDate');
            if (statusSel) statusSel.value = t.status || 'open';
            if (assigneeSel) { await loadTicketFormSelects(); assigneeSel.value = t.assignedTo || ''; }
            if (prioritySel) prioritySel.value = t.priority || 'normal';
            if (dueInp && t.dueDate) { var d = new Date(t.dueDate); dueInp.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); } else if (dueInp) dueInp.value = '';
            var repliesHtml = (t.replies || []).map(function(r) {
                var att = (r.attachments && r.attachments.length) ? r.attachments.map(function(a) { return '<a href="' + escapeHtml(a.url) + '" target="_blank" rel="noopener" style="color:var(--accent); margin-left:8px;">📎 ' + escapeHtml(a.name || t('file')) + '</a>'; }).join('') : '';
                return '<div class="ticket-reply-msg ' + (String(r.userId) === String(currentUser && currentUser.id) ? 'out' : 'in') + '"><div class="ticket-reply-content">' + escapeHtml(r.content || '') + '</div>' + att + '<div class="ticket-reply-meta">' + userDisplay(r.user) + ' · ' + (r.createdAt ? fmtTZ(r.createdAt, 'datetime') : '') + '</div></div>';
            }).join('');
            document.getElementById('ticketReplies').innerHTML = repliesHtml || '<p class="ticket-no-replies text-muted">' + t('no_reply') + '</p>';
            document.getElementById('ticketReplyContent').value = '';
            document.getElementById('ticketReplyFile').value = '';
            document.getElementById('ticketReplyAttachments').textContent = '';
        }
        async function submitTicketReply() {
            if (!currentTicketId) return;
            var content = (document.getElementById('ticketReplyContent') && document.getElementById('ticketReplyContent').value) || '';
            var fileInput = document.getElementById('ticketReplyFile');
            var attachments = [];
            if (fileInput && fileInput.files && fileInput.files[0]) {
                var formData = new FormData();
                formData.append('file', fileInput.files[0]);
                var up = await fetch((API || '') + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
                var upData = await up.json().catch(function() { return {}; });
                if (!up.ok || !upData.url) { toast((upData.error || (LANG === 'fa' ? 'خطا در آپلود فایل' : 'Upload failed')), true); return; }
                attachments.push({ url: upData.url, name: upData.name || (t('file') || 'فایل'), size: upData.size });
            }
            if (!content.trim() && attachments.length === 0) { toast(t('reply_or_file_required'), true); return; }
            var res = await apiFetch('/api/tickets/' + currentTicketId + '/replies', { method: 'POST', body: JSON.stringify({ content: content.trim() || (LANG === 'fa' ? '(پیوست)' : '(Attachment)'), attachments: attachments }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_reply_sent')); loadTicketDetail(currentTicketId); if (fileInput) fileInput.value = ''; var attEl = document.getElementById('ticketReplyAttachments'); if (attEl) attEl.textContent = ''; } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        var currentTaskId = null;
        function taskStatusLabel(s) { return { pending: t('status_pending'), in_progress: t('status_in_progress'), done: t('status_done'), cancelled: t('status_cancelled') }[s] || s; }
        function taskPriorityLabel(s) { return { low: t('priority_low'), normal: t('priority_normal'), high: t('priority_high'), urgent: t('priority_urgent') }[s] || s; }
        function toggleTaskForm() {
            var box = document.getElementById('taskFormBox');
            var btn = document.getElementById('btnTaskCreate');
            if (box && btn) {
                var show = box.style.display !== 'block';
                box.style.display = show ? 'block' : 'none';
                btn.textContent = show ? (t('cancel') || (LANG === 'fa' ? 'انصراف' : 'Cancel')) : (t('new_task') || (LANG === 'fa' ? 'تسک جدید' : 'New task'));
            }
        }
        function toggleTaskAssignTarget() {
            var typeSel = document.getElementById('taskAssignType');
            var userSel = document.getElementById('taskAssignUser');
            var deptSel = document.getElementById('taskAssignDept');
            var isUser = typeSel && typeSel.value === 'user';
            if (userSel) userSel.style.display = isUser ? '' : 'none';
            if (deptSel) deptSel.style.display = isUser ? 'none' : '';
        }
        function loadTasksFilters() {
            var userSel = document.getElementById('taskAssignUser');
            var deptSel = document.getElementById('taskAssignDept');
            var branchSel = document.getElementById('taskBranch');
            Promise.all([apiFetch('/api/users'), apiFetch('/api/departments'), apiFetch('/api/branches')]).then(function(ress) {
                var users = (ress[0].data && ress[0].data.data) || [];
                var depts = (ress[1].data && ress[1].data.data) || [];
                var branches = (ress[2].data && ress[2].data.data) || [];
                if (userSel) userSel.innerHTML = '<option value="">' + t('select_user_task') + '</option>' + users.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
                if (deptSel) deptSel.innerHTML = '<option value="">' + t('select_dept') + '</option>' + depts.map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name) + '</option>'; }).join('');
                if (branchSel) branchSel.innerHTML = '<option value="">' + t('no_branch') + '</option>' + branches.map(function(b){ return '<option value="' + b.id + '">' + escapeHtml(b.name || '') + '</option>'; }).join('');
                var filterDept = document.getElementById('taskFilterDept');
                var filterUser = document.getElementById('taskFilterUser');
                var myDeptOpt = (currentUser && currentUser.departmentId) ? '<option value="__my_dept__">' + (LANG === 'fa' ? 'دپارتمان من' : 'My department') + '</option>' : '';
                if (filterDept) filterDept.innerHTML = '<option value="">' + t('all_depts') + '</option>' + myDeptOpt + depts.map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name) + '</option>'; }).join('');
                if (filterUser) filterUser.innerHTML = '<option value="">' + t('filter_all_users') + '</option>' + users.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
                var filterBranch = document.getElementById('taskFilterBranch');
                if (filterBranch) filterBranch.innerHTML = '<option value="">' + t('all_branches') + '</option>' + branches.map(function(b){ return '<option value="' + b.id + '">' + escapeHtml(b.name || '') + '</option>'; }).join('');
            });
        }
        function initTaskSearchDebounce() {
            var inp = document.getElementById('taskSearch');
            if (inp && !inp._taskSearchBound) {
                inp._taskSearchBound = true;
                inp.addEventListener('input', function() {
                    clearTimeout(window._taskSearchT);
                    window._taskSearchT = setTimeout(function() { loadTasks(); }, 400);
                });
            }
        }
        async function loadTasks() {
            var list = document.getElementById('taskList');
            if (!list) return;
            setLoading('taskList', 4);
            var status = (document.getElementById('taskFilterStatus') && document.getElementById('taskFilterStatus').value) || '';
            var deptEl = document.getElementById('taskFilterDept');
            var dept = deptEl ? deptEl.value : '';
            if (dept === '__my_dept__' && currentUser && currentUser.departmentId) dept = currentUser.departmentId;
            var user = (document.getElementById('taskFilterUser') && document.getElementById('taskFilterUser').value) || '';
            var branch = (document.getElementById('taskFilterBranch') && document.getElementById('taskFilterBranch').value) || '';
            var search = (document.getElementById('taskSearch') && document.getElementById('taskSearch').value || '').trim();
            var q = '?limit=50';
            if (status) q += '&status=' + encodeURIComponent(status);
            if (dept && dept !== '__my_dept__') q += '&assignedToDepartmentId=' + encodeURIComponent(dept);
            if (user) q += '&assignedTo=' + encodeURIComponent(user);
            if (branch) q += '&branchId=' + encodeURIComponent(branch);
            if (search) q += '&search=' + encodeURIComponent(search);
            var res = await apiFetch('/api/tasks' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            var data = res.data;
            if (!data.data || data.data.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">�x9</span><br>' + t('empty_tasks') + '</div>'; return; }
            list.innerHTML = data.data.map(function(t) {
                var assign = t.assignedToDepartmentId && t.department ? (LANG === 'fa' ? 'دپارتمان ' : 'Dept ') + escapeHtml(t.department.name) + (LANG === 'fa' ? ' (همه اعضا)' : ' (all)') : userDisplay(t.assignee) || '—';
                var due = t.dueDate ? fmtTZ(t.dueDate, 'date') : '';
                var isOverdue = t.dueDate && (t.status === 'pending' || t.status === 'in_progress') && new Date(t.dueDate) < new Date();
                var overdueBadge = isOverdue ? '<span class="badge overdue" title="' + (t('overdue') || 'مهلت گذشته') + '">' + (t('overdue') || 'مهلت گذشته') + '</span>' : '';
                var prioBadge = t.priority && t.priority !== 'normal' ? '<span class="badge ' + t.priority + '">' + escapeHtml(taskPriorityLabel(t.priority)) + '</span>' : '';
                return '<div class="task-list-item' + (isOverdue ? ' task-overdue' : '') + '" onclick="loadTaskDetail(\'' + t.id + '\')"><div class="task-item-body"><span class="name">' + escapeHtml(t.title) + '</span><div class="meta">' + assign + ' · ' + taskStatusLabel(t.status) + (due ? ' · ' + t('due_label') + ' ' + due : '') + '</div></div><div class="task-item-badges">' + overdueBadge + prioBadge + '<span class="badge ' + (t.status || '') + '">' + taskStatusLabel(t.status) + '</span></div></div>';
            }).join('');
        }
        async function loadTasksSummary() {
            var box = document.getElementById('tasksSummaryBox');
            if (!box) return;
            var role = (currentUser && currentUser.role) || '';
            if (role !== 'owner' && role !== 'admin' && role !== 'manager' && role !== 'supervisor') { box.style.display = 'none'; return; }
            var res = await apiFetch('/api/tasks/summary');
            if (res.needLogin || !res.ok) { box.style.display = 'none'; return; }
            var d = res.data;
            var html = '';
            if (d.byDepartment && d.byDepartment.length) {
                html += '<div class="stat-card" style="min-width:220px;"><div class="label" style="margin-bottom:12px;">' + t('by_dept') + '</div>';
                d.byDepartment.forEach(function(x) {
                    var sep = LANG === 'fa' ? '، ' : ', ';
                    html += '<div class="task-summary-row" style="margin-top:8px; font-size:0.9rem; padding:6px 0; border-bottom:1px solid var(--border);">' + escapeHtml(x.department && x.department.name ? x.department.name : '') + ': ' + t('status_pending') + ' ' + (x.pending||0) + sep + t('status_in_progress') + ' ' + (x.in_progress||0) + sep + t('status_done') + ' ' + (x.done||0) + '</div>';
                });
                html += '</div>';
            }
            if (d.byUser && d.byUser.length) {
                html += '<div class="stat-card" style="min-width:220px;"><div class="label" style="margin-bottom:12px;">' + t('by_user') + '</div>';
                d.byUser.forEach(function(x) {
                    var sep = LANG === 'fa' ? '، ' : ', ';
                    html += '<div class="task-summary-row" style="margin-top:8px; font-size:0.9rem; padding:6px 0; border-bottom:1px solid var(--border);">' + escapeHtml(userDisplay(x.user)) + ': ' + t('status_pending') + ' ' + (x.pending||0) + sep + t('status_in_progress') + ' ' + (x.in_progress||0) + sep + t('status_done') + ' ' + (x.done||0) + '</div>';
                });
                html += '</div>';
            }
            box.innerHTML = html || '';
            box.style.display = (html ? 'flex' : 'none');
        }
        async function addTask() {
            var title = (document.getElementById('taskTitle') && document.getElementById('taskTitle').value) || '';
            if (!title.trim()) { toast(t('task_title_required'), true); return; }
            var type = (document.getElementById('taskAssignType') && document.getElementById('taskAssignType').value) || 'user';
            var userId = type === 'user' ? (document.getElementById('taskAssignUser') && document.getElementById('taskAssignUser').value) : null;
            var deptId = type === 'department' ? (document.getElementById('taskAssignDept') && document.getElementById('taskAssignDept').value) : null;
            if (!userId && !deptId) { toast(t('select_assignee'), true); return; }
            var body = { title: title.trim(), description: (document.getElementById('taskDesc') && document.getElementById('taskDesc').value) || '', assignedTo: userId || undefined, assignedToDepartmentId: deptId || undefined, priority: (document.getElementById('taskPriority') && document.getElementById('taskPriority').value) || 'normal' };
            var due = document.getElementById('taskDueDate') && document.getElementById('taskDueDate').value;
            if (due) body.dueDate = new Date(due).toISOString();
            var branchId = document.getElementById('taskBranch') && document.getElementById('taskBranch').value;
            if (branchId) body.branchId = branchId;
            var res = await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) {
                if (document.getElementById('taskTitle')) document.getElementById('taskTitle').value = '';
                if (document.getElementById('taskDesc')) document.getElementById('taskDesc').value = '';
                if (document.getElementById('taskBranch')) document.getElementById('taskBranch').value = '';
                if (document.getElementById('taskDueDate')) document.getElementById('taskDueDate').value = '';
                toast(t('toast_task_created'));
                loadTasks();
                loadTasksSummary();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function showTaskList() {
            document.getElementById('taskDetailBox').style.display = 'none';
            document.getElementById('taskList').style.display = 'block';
            currentTaskId = null;
            loadTasks();
        }
        function toggleTaskDetailAssign() {
            var typeSel = document.getElementById('taskDetailAssignType');
            var userSel = document.getElementById('taskDetailAssignUser');
            var deptSel = document.getElementById('taskDetailAssignDept');
            var isUser = typeSel && typeSel.value === 'user';
            if (userSel) userSel.style.display = isUser ? '' : 'none';
            if (deptSel) deptSel.style.display = isUser ? 'none' : '';
        }
        async function updateTaskFromDetail() {
            if (!currentTaskId) return;
            var typeSel = document.getElementById('taskDetailAssignType');
            var userSel = document.getElementById('taskDetailAssignUser');
            var deptSel = document.getElementById('taskDetailAssignDept');
            var type = typeSel ? typeSel.value : 'user';
            var userId = type === 'user' && userSel ? userSel.value : null;
            var deptId = type === 'department' && deptSel ? deptSel.value : null;
            if (!userId && !deptId) { toast(t('select_assignee'), true); return; }
            var body = { assignedTo: type === 'user' ? userId : null, assignedToDepartmentId: type === 'department' ? deptId : null };
            var statusSel = document.getElementById('taskDetailStatus');
            if (statusSel && statusSel.value) body.status = statusSel.value;
            var dueEl = document.getElementById('taskDetailDueDate');
            if (dueEl) body.dueDate = dueEl.value ? new Date(dueEl.value).toISOString() : null;
            var prioEl = document.getElementById('taskDetailPriority');
            if (prioEl && prioEl.value) body.priority = prioEl.value;
            var branchEl = document.getElementById('taskDetailBranch');
            if (branchEl) body.branchId = branchEl.value || null;
            var res = await apiFetch('/api/tasks/' + currentTaskId, { method: 'PUT', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_status_updated')); loadTaskDetail(currentTaskId); loadTasks(); loadTasksSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function loadTaskDetail(id) {
            currentTaskId = id;
            document.getElementById('taskList').style.display = 'none';
            document.getElementById('taskDetailBox').style.display = 'block';
            var ress = await Promise.all([apiFetch('/api/tasks/' + id), apiFetch('/api/users'), apiFetch('/api/departments'), apiFetch('/api/branches')]);
            var taskRes = ress[0];
            if (taskRes.needLogin) return;
            if (!taskRes.ok) { toast((taskRes.data && taskRes.data.error) || t('err_generic'), true); showTaskList(); return; }
            var taskData = taskRes.data;
            var users = (ress[1].data && ress[1].data.data) || [];
            var depts = (ress[2].data && ress[2].data.data) || [];
            var branches = (ress[3].data && ress[3].data.data) || [];
            var assign = taskData.assignedToDepartmentId && taskData.department ? (LANG === 'fa' ? 'دپارتمان ' : 'Dept ') + escapeHtml(taskData.department.name) + (LANG === 'fa' ? ' (همه اعضا)' : ' (all)') : userDisplay(taskData.assignee) || '\u2014';
            var creator = userDisplay(taskData.creator) || '\u2014';
            var due = taskData.dueDate ? fmtTZ(taskData.dueDate, 'datetime') : '\u2014';
            var statusOpts = ['pending','in_progress','done','cancelled'].map(function(s){ return '<option value="' + s + '"' + (taskData.status === s ? ' selected' : '') + '>' + taskStatusLabel(s) + '</option>'; }).join('');
            var prioOpts = ['low','normal','high','urgent'].map(function(p){ return '<option value="' + p + '"' + ((taskData.priority || 'normal') === p ? ' selected' : '') + '>' + taskPriorityLabel(p) + '</option>'; }).join('');
            var userOpts = users.map(function(u){ return '<option value="' + u.id + '"' + (taskData.assignedTo === u.id ? ' selected' : '') + '>' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
            var deptOpts = depts.map(function(d){ return '<option value="' + d.id + '"' + (taskData.assignedToDepartmentId === d.id ? ' selected' : '') + '>' + escapeHtml(d.name) + '</option>'; }).join('');
            var branchOpts = '<option value="">' + t('no_branch') + '</option>' + branches.map(function(b){ return '<option value="' + b.id + '"' + (taskData.branchId === b.id ? ' selected' : '') + '>' + escapeHtml(b.name || '') + '</option>'; }).join('');
            var isDept = !!taskData.assignedToDepartmentId;
            var dueVal = taskData.dueDate ? (function(){ var d=new Date(taskData.dueDate); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); })() : '';
            var branchName = taskData.branch && taskData.branch.name ? escapeHtml(taskData.branch.name) : '\u2014';
            var editHtml = '<div class="task-detail-edit" style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border);">' +
                '<label>' + t('assign_to') + '</label><div class="task-assign-row"><select id="taskDetailAssignType" onchange="toggleTaskDetailAssign()"><option value="user"' + (!isDept?' selected':'') + '>' + t('assign_user') + '</option><option value="department"' + (isDept?' selected':'') + '>' + t('assign_dept') + '</option></select>' +
                '<select id="taskDetailAssignUser" style="min-width:180px;' + (isDept?' display:none':'') + '"><option value="">' + t('select_user_task') + '</option>' + userOpts + '</select>' +
                '<select id="taskDetailAssignDept" style="min-width:180px;' + (!isDept?' display:none':'') + '"><option value="">' + t('select_dept') + '</option>' + deptOpts + '</select></div>' +
                '<label>' + t('th_branch') + '</label><select id="taskDetailBranch">' + branchOpts + '</select>' +
                '<div class="task-form-row"><div><label>' + t('due_date') + '</label><input id="taskDetailDueDate" type="datetime-local" value="' + dueVal + '"></div>' +
                '<div><label>' + t('ticket_priority') + '</label><select id="taskDetailPriority">' + prioOpts + '</select></div></div>' +
                '<label>' + t('change_status') + '</label><select id="taskDetailStatus">' + statusOpts + '</select>' +
                ' <button type="button" class="btn-primary" onclick="updateTaskFromDetail()">' + t('btn_apply') + '</button></div>';
            document.getElementById('taskDetailContent').innerHTML =
                '<div class="form-box" style="max-width:100%;"><h3 style="margin:0 0 8px;">' + escapeHtml(taskData.title) + '</h3>' +
                (taskData.description ? '<p style="color:var(--text-secondary); margin:8px 0;">' + escapeHtml(taskData.description) + '</p>' : '') +
                '<p style="font-size:0.9rem; color:var(--text-muted);">' + t('creator_label') + ' ' + escapeHtml(creator) + ' | ' + t('assignee_label') + ' ' + escapeHtml(assign) + ' | ' + t('due_label') + ' ' + due + ' | ' + t('th_branch') + ': ' + branchName + ' | ' + t('ticket_priority') + ': ' + taskPriorityLabel(taskData.priority) + '</p>' + editHtml;
            var updates = (taskData.updates || []).map(function(u) {
                return '<div class="msg in" style="margin:8px 0;"><div>' + escapeHtml(u.content) + '</div><div class="time">' + userDisplay(u.user) + ' � ' + (u.createdAt ? fmtTZ(u.createdAt, 'datetime') : '') + '</div></div>';
            }).join('');
            document.getElementById('taskUpdatesList').innerHTML = updates ? '<h4 style="font-size:1rem; margin:12px 0;">' + t('updates') + '</h4>' + updates : '<p class="text-muted" style="color:var(--text-muted);">' + t('no_updates') + '</p>';
            document.getElementById('taskUpdateContent').value = '';
        }
        async function updateTaskStatus() {
            if (!currentTaskId) return;
            var sel = document.getElementById('taskDetailStatus');
            var status = sel ? sel.value : '';
            if (!status) return;
            var res = await apiFetch('/api/tasks/' + currentTaskId, { method: 'PUT', body: JSON.stringify({ status: status }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_status_updated')); loadTaskDetail(currentTaskId); loadTasks(); loadTasksSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function addTaskUpdate() {
            if (!currentTaskId) return;
            var content = (document.getElementById('taskUpdateContent') && document.getElementById('taskUpdateContent').value) || '';
            if (!content.trim()) { toast(t('task_update_required'), true); return; }
            var statusChange = document.getElementById('taskUpdateStatusChange') && document.getElementById('taskUpdateStatusChange').value;
            var body = { content: content.trim() };
            if (statusChange) body.statusChange = statusChange;
            var res = await apiFetch('/api/tasks/' + currentTaskId + '/updates', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { document.getElementById('taskUpdateContent').value = ''; var sc=document.getElementById('taskUpdateStatusChange'); if(sc)sc.value=''; toast(t('toast_update_added')); loadTaskDetail(currentTaskId); loadTasks(); loadTasksSummary(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        function initProcessTabs() {
            document.querySelectorAll('.process-tab').forEach(function(btn) {
                btn.onclick = function() {
                    var tab = this.getAttribute('data-tab');
                    document.querySelectorAll('.process-tab').forEach(function(b){ b.classList.remove('active'); });
                    this.classList.add('active');
                    document.querySelectorAll('.process-panel').forEach(function(p){ p.classList.remove('show'); p.style.display = 'none'; });
                    if (tab === 'templates') { document.getElementById('processTemplatesPanel').style.display = 'block'; document.getElementById('processTemplatesPanel').classList.add('show'); loadProcessTemplates(); }
                    else { document.getElementById('processInstancesPanel').style.display = 'block'; document.getElementById('processInstancesPanel').classList.add('show'); loadProcessInstances(); }
                };
            });
        }
        async function loadProcessTemplateSelect() {
            var sel = document.getElementById('processInstanceTemplate');
            var startSel = document.getElementById('processStartTemplateId');
            var res = await apiFetch('/api/processes/templates');
            if (!res.ok || !res.data || !res.data.data) return;
            var opts = '<option value="">' + t('all_templates') + '</option>' + res.data.data.filter(function(t){ return t.isActive; }).map(function(t){ return '<option value="' + t.id + '">' + escapeHtml(t.name) + '</option>'; }).join('');
            if (sel) sel.innerHTML = opts;
        }
        async function loadProcessTemplates() {
            var list = document.getElementById('processTemplatesList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var res = await apiFetch('/api/processes/templates');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + '</div>'; return; }
            var data = (res.data && res.data.data) || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">�x9</span><br>' + t('empty_process_templates') + '</div>'; return; }
            list.innerHTML = data.map(function(t) {
                var stages = (t.stages || []).map(function(s){ return s.name; }).join(' �  ');
                var cnt = (t.instanceCount || 0);
                return '<div class="list-item" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
                    '<div><span class="name">' + escapeHtml(t.name) + '</span><div class="meta">' + (stages || '�') + ' | ' + (t('all_templates') === 'All templates' ? 'Instances: ' : '� �&��� �!: ') + cnt + '</div></div>' +
                    '<div style="display:flex; gap:6px;"><button type="button" class="btn-secondary" style="padding:6px 12px;" onclick="openProcessStartInstanceModal(\'' + t.id + '\')">' + t('process_start_instance') + '</button>' +
                    '<button type="button" class="btn-secondary" style="padding:6px 12px;" onclick="openProcessTemplateModal(\'' + t.id + '\')">' + t('edit') + '</button>' +
                    '<button type="button" class="btn-secondary" style="padding:6px 12px;" onclick="deleteProcessTemplate(\'' + t.id + '\')">�</button></div></div>';
            }).join('');
        }
        async function loadProcessInstances() {
            var list = document.getElementById('processInstancesList');
            var box = document.getElementById('processInstanceDetailBox');
            if (!list) return;
            if (box && box.style.display !== 'none') return;
            list.style.display = 'block';
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var status = (document.getElementById('processInstanceStatus') && document.getElementById('processInstanceStatus').value) || '';
            var templateId = (document.getElementById('processInstanceTemplate') && document.getElementById('processInstanceTemplate').value) || '';
            var q = '?limit=50';
            if (status) q += '&status=' + encodeURIComponent(status);
            if (templateId) q += '&templateId=' + encodeURIComponent(templateId);
            var res = await apiFetch('/api/processes/instances' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + '</div>'; return; }
            var data = (res.data && res.data.data) || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">�x</span><br>' + t('empty_process_instances') + '</div>'; return; }
            list.innerHTML = data.map(function(i) {
                var statusLabel = i.status === 'active' ? t('status_active') : i.status === 'completed' ? t('status_done') : t('status_cancelled');
                var templateName = (i.template && i.template.name) ? i.template.name : '�';
                var assignee = userDisplay(i.assignee) || '�';
                return '<div class="list-item" onclick="loadProcessInstanceDetail(\'' + i.id + '\')" style="cursor:pointer;"><div><span class="name">' + escapeHtml(i.title) + '</span><div class="meta">' + escapeHtml(templateName) + ' ⬢ ' + assignee + ' ⬢ ' + statusLabel + '</div></div><span class="badge ' + (i.status || '') + '">' + statusLabel + '</span></div>';
            }).join('');
        }
        var currentProcessInstanceId = null;
        function showProcessInstancesList() {
            document.getElementById('processInstanceDetailBox').style.display = 'none';
            document.getElementById('processInstancesList').style.display = 'block';
            currentProcessInstanceId = null;
            loadProcessInstances();
        }
        async function loadProcessInstanceDetail(id) {
            currentProcessInstanceId = id;
            document.getElementById('processInstancesList').style.display = 'none';
            document.getElementById('processInstanceDetailBox').style.display = 'block';
            var res = await apiFetch('/api/processes/instances/' + id);
            if (res.needLogin) return;
            if (!res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); showProcessInstancesList(); return; }
            var i = res.data;
            var template = i.template || {};
            var stages = template.stages || [];
            var currentIdx = i.currentStageIndex != null ? i.currentStageIndex : 0;
            var currentStageName = (stages[currentIdx] && stages[currentIdx].name) ? stages[currentIdx].name : t('process_current_stage');
            var assignee = userDisplay(i.assignee) || '�';
            var creator = userDisplay(i.creator) || '�';
            var stepsHtml = (i.steps || []).map(function(s) {
                var done = s.completedAt ? '�S ' : '';
                return '<div class="msg in" style="margin:6px 0;"><div>' + done + escapeHtml(s.stageName) + (s.notes ? ' � ' + escapeHtml(s.notes) : '') + '</div><div class="time">' + userDisplay(s.assignee) + ' ⬢ ' + (s.startedAt ? fmtTZ(s.startedAt, 'datetime') : '') + (s.completedAt ? ' �  ' + fmtTZ(s.completedAt, 'datetime') : '') + '</div></div>';
            }).join('');
            document.getElementById('processInstanceDetailContent').innerHTML =
                '<div class="form-box" style="max-width:100%;"><h3 style="margin:0 0 8px;">' + escapeHtml(i.title) + '</h3>' +
                '<p style="font-size:0.9rem; color:var(--text-muted);">' + t('creator_label') + ' ' + escapeHtml(creator) + ' | ' + t('assignee_label') + ' ' + assignee + ' | ' + t('process_current_stage') + ': ' + escapeHtml(currentStageName) + '</p>' +
                '<h4 style="font-size:1rem; margin:12px 0;">' + t('history') + '</h4>' + (stepsHtml || '<p class="text-muted">�</p>') + '</div>';
            var advanceBox = document.getElementById('processInstanceAdvanceBox');
            if (i.status !== 'active') { advanceBox.innerHTML = ''; return; }
            var isLast = currentIdx >= stages.length - 1;
            advanceBox.innerHTML = '<label>' + t('process_notes') + '</label><textarea id="processAdvanceNotes" rows="2" style="width:100%; margin-bottom:8px;"></textarea>' +
                (isLast ? '<button type="button" class="btn-primary" onclick="advanceProcessInstance(true)">' + t('process_complete') + '</button>' : '<button type="button" class="btn-primary" onclick="advanceProcessInstance(false)">' + t('process_advance') + '</button>');
        }
        async function advanceProcessInstance(complete) {
            if (!currentProcessInstanceId) return;
            var notes = (document.getElementById('processAdvanceNotes') && document.getElementById('processAdvanceNotes').value) || '';
            var res = await apiFetch('/api/processes/instances/' + currentProcessInstanceId + '/advance', { method: 'POST', body: JSON.stringify({ notes: notes }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_status_updated')); loadProcessInstanceDetail(currentProcessInstanceId); loadProcessInstances(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function openProcessTemplateModal(id) {
            document.getElementById('processTemplateId').value = id || '';
            document.getElementById('processTemplateName').value = '';
            document.getElementById('processTemplateDesc').value = '';
            document.getElementById('processTemplateStagesContainer').innerHTML = '';
            document.getElementById('processTemplateModalTitle').textContent = id ? t('edit') : t('process_add_template');
            if (id) {
                apiFetch('/api/processes/templates/' + id).then(function(res) {
                    if (res.ok && res.data) {
                        var t = res.data;
                        document.getElementById('processTemplateName').value = t.name || '';
                        document.getElementById('processTemplateDesc').value = t.description || '';
                        var stages = t.stages || [];
                        stages.forEach(function(s) { addProcessTemplateStageRow(s.name); });
                    }
                });
            } else { addProcessTemplateStageRow(); }
            document.getElementById('modalProcessTemplate').style.display = 'flex';
        }
        function addProcessTemplateStageRow(name) {
            var name = (typeof name === 'string') ? name : '';
            var container = document.getElementById('processTemplateStagesContainer');
            var div = document.createElement('div');
            div.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; align-items:center;';
            div.innerHTML = '<input type="text" class="process-stage-name" data-i18n-ph="process_stage_name" placeholder="' + (t('process_stage_name') || '� ا�& �&رح��!') + '" value="' + escapeHtml(name) + '" style="flex:1;"> <button type="button" class="btn-secondary" style="padding:4px 10px;" onclick="this.parentElement.remove()">�</button>';
            container.appendChild(div);
        }
        function closeProcessTemplateModal() { document.getElementById('modalProcessTemplate').style.display = 'none'; }
        async function saveProcessTemplate() {
            var id = document.getElementById('processTemplateId').value;
            var name = (document.getElementById('processTemplateName') && document.getElementById('processTemplateName').value) || '';
            if (!name.trim()) { toast(t('dept_name_required'), true); return; }
            var desc = (document.getElementById('processTemplateDesc') && document.getElementById('processTemplateDesc').value) || '';
            var inputs = document.querySelectorAll('#processTemplateStagesContainer .process-stage-name');
            var stages = [];
            inputs.forEach(function(inp, i) { var v = (inp.value || '').trim(); if (v) stages.push({ name: v, order: i }); });
            if (stages.length === 0) { toast(t('process_min_one_stage'), true); return; }
            var body = { name: name.trim(), description: desc, stages: stages };
            var url = id ? '/api/processes/templates/' + id : '/api/processes/templates';
            var method = id ? 'PUT' : 'POST';
            var res = await apiFetch(url, { method: method, body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { closeProcessTemplateModal(); loadProcessTemplates(); loadProcessTemplateSelect(); toast(t('btn_save')); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function deleteProcessTemplate(id) {
            if (!confirm(LANG === 'en' ? 'Delete this template?' : 'ا�R�  �ا�ب حذف ش��د�x')) return;
            var res = await apiFetch('/api/processes/templates/' + id, { method: 'DELETE' });
            if (res.ok) { loadProcessTemplates(); loadProcessTemplateSelect(); toast(t('btn_save')); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function openProcessStartInstanceModal(templateId, refType, refId, suggestedTitle) {
            document.getElementById('processStartRefType').value = refType || '';
            document.getElementById('processStartRefId').value = refId || '';
            document.getElementById('processStartTitle').value = (suggestedTitle && suggestedTitle.trim()) ? suggestedTitle.trim() : '';
            document.getElementById('processStartAssignedTo').value = '';
            apiFetch('/api/processes/templates').then(function(res) {
                var sel = document.getElementById('processStartTemplateSel');
                if (!sel) return;
                var list = (res.data && res.data.data) || [];
                var active = list.filter(function(t){ return t.isActive !== false; });
                sel.innerHTML = '<option value="">' + t('all_templates') + '</option>' + active.map(function(t){ return '<option value="' + t.id + '">' + escapeHtml(t.name) + '</option>'; }).join('');
                if (templateId) sel.value = templateId;
            });
            apiFetch('/api/users').then(function(res) {
                var sel = document.getElementById('processStartAssignedTo');
                if (!sel) return;
                var users = (res.data && res.data.data) || [];
                sel.innerHTML = '<option value="">' + t('no_user') + '</option>' + users.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.name) + '</option>'; }).join('');
            });
            document.getElementById('modalProcessStartInstance').style.display = 'flex';
        }
        function closeProcessStartInstanceModal() { document.getElementById('modalProcessStartInstance').style.display = 'none'; }
        async function startProcessInstance() {
            var templateId = (document.getElementById('processStartTemplateSel') && document.getElementById('processStartTemplateSel').value) || '';
            var title = (document.getElementById('processStartTitle') && document.getElementById('processStartTitle').value) || '';
            if (!templateId || !title.trim()) { toast(t('ticket_title_required'), true); return; }
            var assignedTo = (document.getElementById('processStartAssignedTo') && document.getElementById('processStartAssignedTo').value) || null;
            var refType = (document.getElementById('processStartRefType') && document.getElementById('processStartRefType').value) || null;
            var refId = (document.getElementById('processStartRefId') && document.getElementById('processStartRefId').value) || null;
            var body = { templateId: templateId, title: title.trim(), assignedTo: assignedTo || undefined };
            if (refType && refId) { body.referenceType = refType; body.referenceId = refId; }
            var res = await apiFetch('/api/processes/instances', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { closeProcessStartInstanceModal(); loadProcessInstances(); loadProcessTemplates(); toast(t('toast_task_created')); document.querySelectorAll('.process-tab').forEach(function(b){ if(b.getAttribute('data-tab')==='instances') b.click(); }); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function startProcessFromTicket() {
            if (!currentTicketId) return;
            var titleEl = document.getElementById('ticketDetailTitle');
            var suggestedTitle = titleEl ? titleEl.textContent : '';
            showPage('processes');
            setTimeout(function() {
                loadProcessTemplateSelect();
                openProcessStartInstanceModal(null, 'ticket', currentTicketId, suggestedTitle);
            }, 400);
        }

        async function addTicket() {
            var title = document.getElementById('ticketTitle').value.trim();
            if (!title) { toast(t('ticket_title_required'), true); return; }
            var assigneeEl = document.getElementById('ticketAssignee');
            var deptEl = document.getElementById('ticketDept');
            var dueEl = document.getElementById('ticketDueDate');
            var body = { title: title, description: (document.getElementById('ticketDesc').value || '').trim(), priority: (document.getElementById('ticketPriority').value || 'normal') };
            if (assigneeEl && assigneeEl.value) body.assignedTo = assigneeEl.value;
            if (deptEl && deptEl.value) body.departmentId = deptEl.value;
            if (dueEl && dueEl.value) body.dueDate = dueEl.value;
            var res = await apiFetch('/api/tickets', { method: 'POST', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { document.getElementById('ticketTitle').value = ''; document.getElementById('ticketDesc').value = ''; var dueInp = document.getElementById('ticketDueDate'); if (dueInp) dueInp.value = ''; document.getElementById('ticketFormBox').style.display = 'none'; toast(t('toast_ticket_created')); loadTickets(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        var _editingDeptId = null;
        function cancelDeptEdit() {
            _editingDeptId = null;
            document.getElementById('deptName').value = '';
            document.getElementById('deptDesc').value = '';
            document.getElementById('deptKeywords').value = '';
            var colorEl = document.getElementById('deptColor'); if (colorEl) colorEl.value = '#10b981';
            var defEl = document.getElementById('deptIsDefault'); if (defEl) defEl.checked = false;
            var actEl = document.getElementById('deptIsActive'); if (actEl) actEl.checked = true;
            var branchEl = document.getElementById('deptBranch'); if (branchEl) branchEl.value = '';
            var btn = document.getElementById('btnDeptSave'); if (btn) { btn.textContent = t('add_dept'); btn.setAttribute('data-i18n', 'add_dept'); }
            var cancelBtn = document.getElementById('btnDeptCancel'); if (cancelBtn) cancelBtn.style.display = 'none';
        }
        function editDepartment(idx) {
            var list = window._deptListData;
            if (!list || !list[idx]) return;
            var d = list[idx];
            _editingDeptId = d.id;
            document.getElementById('deptName').value = d.name || '';
            document.getElementById('deptDesc').value = d.description || '';
            document.getElementById('deptKeywords').value = d.keywords || '';
            var colorEl = document.getElementById('deptColor'); if (colorEl) colorEl.value = (d.color || '#10b981').replace(/^#?/, '#');
            var defEl = document.getElementById('deptIsDefault'); if (defEl) defEl.checked = !!d.isDefault;
            var actEl = document.getElementById('deptIsActive'); if (actEl) actEl.checked = d.isActive !== false;
            var branchEl = document.getElementById('deptBranch'); if (branchEl) branchEl.value = d.branchId || '';
            var btn = document.getElementById('btnDeptSave'); if (btn) { btn.textContent = t('save_changes'); btn.setAttribute('data-i18n', 'save_changes'); }
            var cancelBtn = document.getElementById('btnDeptCancel'); if (cancelBtn) cancelBtn.style.display = '';
            toast(t('dept_edit_hint'), false);
        }
        function normalizeKeywordsInput(raw) {
            if (!raw || !raw.trim()) return '';
            var parts = raw.split(/[,،;\s]+/).map(function(p) { return p.trim(); }).filter(Boolean);
            var seen = {};
            return parts.filter(function(p) { var k = p.toLowerCase(); if (seen[k]) return false; seen[k] = true; return true; }).join(', ');
        }
        function formatDeptKeywords() {
            var el = document.getElementById('deptKeywords');
            if (!el) return;
            el.value = normalizeKeywordsInput(el.value);
            toast(LANG === 'fa' ? 'کلمات کلیدی مرتب شد' : 'Keywords formatted');
        }
        async function saveDepartment() {
            var name = document.getElementById('deptName').value.trim();
            if (!name) { toast(t('dept_name_required'), true); return; }
            var branchId = document.getElementById('deptBranch').value || null;
            var colorEl = document.getElementById('deptColor');
            var defEl = document.getElementById('deptIsDefault');
            var actEl = document.getElementById('deptIsActive');
            var keywordsRaw = document.getElementById('deptKeywords').value;
            var body = { name: name, description: document.getElementById('deptDesc').value.trim(), keywords: normalizeKeywordsInput(keywordsRaw), branchId: branchId };
            if (colorEl) body.color = colorEl.value || '#10b981';
            if (defEl) body.isDefault = defEl.checked;
            if (actEl) body.isActive = actEl.checked;
            var res;
            if (_editingDeptId) {
                res = await apiFetch('/api/departments/' + _editingDeptId, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                res = await apiFetch('/api/departments', { method: 'POST', body: JSON.stringify(body) });
            }
            if (res.needLogin) return;
            if (res.ok) {
                cancelDeptEdit();
                toast(_editingDeptId ? t('toast_dept_updated') : t('toast_dept_added'));
                loadDepartments();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        var userListData = [];
        function initUserFilters() {
            var searchEl = document.getElementById('userSearchInput');
            var roleEl = document.getElementById('userFilterRole');
            var statusEl = document.getElementById('userFilterStatus');
            if (searchEl) searchEl.oninput = searchEl.onkeyup = function() { filterAndRenderUsers(); };
            if (statusEl) statusEl.onchange = function() { filterAndRenderUsers(); };
            if (roleEl) roleEl.onchange = function() {
                document.querySelectorAll('#userRolePills .pill').forEach(function(x) { x.classList.remove('active'); });
                var p = document.querySelector('#userRolePills .pill[data-role="' + (roleEl.value || '') + '"]');
                if (p) p.classList.add('active');
                filterAndRenderUsers();
            };
            document.querySelectorAll('#userRolePills .pill').forEach(function(p) {
                p.onclick = function() {
                    document.querySelectorAll('#userRolePills .pill').forEach(function(x) { x.classList.remove('active'); });
                    this.classList.add('active');
                    var r = this.getAttribute('data-role') || '';
                    if (roleEl) roleEl.value = r;
                    filterAndRenderUsers();
                };
            });
        }
        function initUserEditTabs() {
            document.querySelectorAll('.user-edit-tab').forEach(function(btn) {
                btn.onclick = function() {
                    var tab = this.getAttribute('data-tab');
                    document.querySelectorAll('.user-edit-tab').forEach(function(b) { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
                    document.querySelectorAll('.user-edit-tab-panel').forEach(function(p) { p.classList.remove('active'); p.style.display = 'none'; });
                    this.classList.add('active'); this.setAttribute('aria-selected', 'true');
                    var panel = document.getElementById('userEditTab' + (tab === 'info' ? 'Info' : 'Perms'));
                    if (panel) { panel.classList.add('active'); panel.style.display = 'block'; }
                };
            });
        }
        function userInitial(u) {
            if (u.avatar && String(u.avatar).trim()) return null;
            return (u.name && u.name[0]) ? u.name[0].toUpperCase() : (u.email && u.email[0] ? u.email[0].toUpperCase() : '?');
        }
        function filterAndRenderUsers() {
            var search = (document.getElementById('userSearchInput') && document.getElementById('userSearchInput').value) || '';
            var roleFilter = (document.getElementById('userFilterRole') && document.getElementById('userFilterRole').value) || '';
            var statusFilter = (document.getElementById('userFilterStatus') && document.getElementById('userFilterStatus').value) || '';
            var q = search.trim().toLowerCase();
            var filtered = userListData.filter(function(u) {
                if (statusFilter === 'active' && u.isActive === false) return false;
                if (statusFilter === 'blocked' && u.isActive !== false) return false;
                if (roleFilter && u.role !== roleFilter) return false;
                if (!q) return true;
                var name = (u.name || '').toLowerCase();
                var email = (u.email || '').toLowerCase();
                var username = (u.username || '').toLowerCase();
                return name.indexOf(q) >= 0 || email.indexOf(q) >= 0 || username.indexOf(q) >= 0;
            });
            renderUserList(filtered);
        }
        function renderUserList(users) {
            var list = document.getElementById('userList');
            if (!list) return;
            var canManage = (currentUser && currentUser.permissions && currentUser.permissions.manage_users);
            var canViewActivity = currentUser && ['owner', 'admin', 'manager', 'supervisor'].indexOf(currentUser.role) !== -1;
            var roleLabels = { owner: t('role_owner'), admin: t('role_admin'), manager: t('role_manager'), supervisor: t('role_supervisor'), agent: t('role_agent') };
            var statusLabels = { online: t('status_online'), away: t('status_away') || 'دور', busy: t('status_busy') || 'مشغول', offline: t('status_offline') || 'آفلاین' };
            if (!users || users.length === 0) { list.innerHTML = '<div class="empty" style="grid-column:1/-1;"><span class="empty-icon">👤</span><br>' + t('empty_users') + '</div>'; return; }
            list.innerHTML = users.map(function(u) {
                var initial = userInitial(u) || '?';
                var avatarUrl = (u.avatar && String(u.avatar).trim()) ? ((u.avatar.indexOf('/') === 0 ? (window.location.origin || '') : '') + u.avatar) : '';
                var onerr = 'this.style.display=' + String.fromCharCode(39) + 'none' + String.fromCharCode(39);
                var avatarHtml = avatarUrl ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(avatarUrl) + '" alt="" onerror="' + onerr + '">' : initial;
                var deptBranch = [];
                if (u.department && u.department.name) deptBranch.push(escapeHtml(u.department.name));
                if (u.branch && u.branch.name) deptBranch.push(escapeHtml(u.branch.name));
                var statusClass = (u.status && ['online', 'away', 'busy'].indexOf(u.status) !== -1) ? u.status : 'offline';
                var statusLabel = statusLabels[u.status] || statusLabels.offline;
                var lastLoginStr = u.lastLoginAt ? timeAgo(u.lastLoginAt) : (LANG === 'fa' ? 'هرگز' : 'Never');
                var inactiveClass = u.isActive === false ? ' inactive' : '';
                var blockedBadge = u.isActive === false ? '<span class="badge cancelled">' + t('blocked') + '</span>' : '';
                var roleBadge = '<span class="badge" style="background:var(--accent-soft);color:var(--accent);">' + escapeHtml(roleLabels[u.role] || u.role) + '</span>';
                var statusBadge = '<span class="status-dot ' + statusClass + '" title="' + escapeHtml(statusLabel) + '"></span>';
                var btns = [];
                if (canViewActivity) btns.push('<button type="button" class="btn-secondary btn-sm" onclick="event.stopPropagation();openStaffDetailModal(\'' + u.id + '\')">' + t('view_activity') + '</button>');
                if (canManage) btns.push('<button type="button" class="btn-secondary btn-sm" onclick="event.stopPropagation();openUserEdit(\'' + u.id + '\')">' + t('edit_access') + '</button>');
                var btn = btns.join(' ');
                var cardClick = canViewActivity ? 'onclick="openStaffDetailModal(\'' + u.id + '\')" style="cursor:pointer;"' : '';
                return '<div class="user-card' + inactiveClass + '" ' + cardClick + '><div class="user-card-header"><div class="user-card-avatar">' + avatarHtml + '</div><div class="user-card-name">' + statusBadge + ' ' + escapeHtml(u.name) + ' ' + blockedBadge + '</div></div><div class="user-card-body"><div class="user-card-email">' + escapeHtml(u.email || '') + '</div><div class="user-card-meta">' + (deptBranch.length ? deptBranch.join(' · ') : '') + '</div><div class="user-card-meta">' + (LANG === 'fa' ? 'آخرین ورود: ' : 'Last login: ') + lastLoginStr + '</div><div class="user-card-badges">' + roleBadge + '</div></div><div class="user-card-actions" onclick="event.stopPropagation();">' + btn + '</div></div>';
            }).join('');
        }
        function toggleUserForm() {
            var box = document.getElementById('userFormBox');
            var btnAdd = document.getElementById('btnAddUser');
            var btnCancel = document.getElementById('btnCancelUserForm');
            var visible = box.style.display === 'block';
            box.style.display = visible ? 'none' : 'block';
            btnAdd.style.display = visible ? '' : 'none';
            if (btnCancel) btnCancel.style.display = visible ? 'none' : '';
        }
        function initUserAddPerms() {
            var box = document.getElementById('userAddPermsBox');
            var cont = document.getElementById('userAddPerms');
            if (!box || !cont || !(currentUser && currentUser.permissions && currentUser.permissions.manage_users)) return;
            var canGrantManageUsers = (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin'));
            var html = Object.keys(sectionLabels).map(function(k) {
                if (k === 'manage_users' && !canGrantManageUsers) return '';
                return '<label style="display:block; margin:6px 0;"><input type="checkbox" data-perm="' + k + '"> ' + sectionLabel(k) + '</label>';
            }).join('');
            cont.innerHTML = html;
            box.style.display = 'block';
        }
        async function loadUsers() {
            var list = document.getElementById('userList');
            setLoading('userList', 4);
            var res = await apiFetch('/api/users');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            var data = res.data;
            userListData = data.data || [];
            if (userListData.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">👤</span><br>' + t('empty_users') + '</div>'; return; }
            filterAndRenderUsers();
        }
        var currentEditUserId = null;
        var sectionLabels = { dashboard: 'page_dashboard', conversations: 'section_conversations', customers: 'section_customers', tickets: 'section_tickets', tasks: 'section_tasks', departments: 'section_departments', users: 'section_users', branches: 'section_branches', supervision: 'section_supervision', staff_activity: 'section_staff_activity', announcements: 'section_announcements', internal_chat: 'section_internal_chat', whatsapp: 'section_whatsapp', rates: 'section_rates', services: 'section_services', processes: 'section_processes', panel_settings: 'page_panel_settings', manage_users: 'section_manage_users', manage_tickets: 'section_manage_tickets' };
        var permGroups = [
            { key: 'communications', title: 'user_perms_group_communications', keys: ['conversations', 'customers', 'tickets', 'internal_chat', 'whatsapp', 'announcements'] },
            { key: 'organization', title: 'user_perms_group_organization', keys: ['dashboard', 'departments', 'users', 'branches', 'tasks', 'processes', 'staff_activity', 'supervision'] },
            { key: 'settings', title: 'user_perms_group_settings', keys: ['rates', 'services', 'panel_settings'] },
            { key: 'special', title: 'user_perms_group_special', keys: ['manage_users', 'manage_tickets'] }
        ];
        function sectionLabel(k) { var lbl = t(sectionLabels[k] || k); return (lbl && String(lbl).trim()) ? lbl : (sectionLabels[k] || k); }
        function closeUserEditModal() { document.getElementById('userEditModal').style.display = 'none'; currentEditUserId = null; }
        function userPermsSelectAll(checked) {
            document.querySelectorAll('#userEditPerms input[data-perm]').forEach(function(cb) { cb.checked = !!checked; });
        }
        function userPermsSelectGroup(groupKey, checked) {
            var group = permGroups.find(function(g) { return g.key === groupKey; });
            if (!group) return;
            group.keys.forEach(function(k) {
                var cb = document.querySelector('#userEditPerms input[data-perm="' + k + '"]');
                if (cb) cb.checked = !!checked;
            });
        }
        async function openUserEdit(userId) {
            var res = await apiFetch('/api/users/' + userId);
            if (res.needLogin || !res.ok) return;
            var u = res.data;
            currentEditUserId = userId;
            document.querySelectorAll('.user-edit-tab').forEach(function(b) { b.classList.remove('active'); b.setAttribute('aria-selected', b.getAttribute('data-tab') === 'info' ? 'true' : 'false'); if (b.getAttribute('data-tab') === 'info') b.classList.add('active'); });
            document.getElementById('userEditTabInfo').classList.add('active'); document.getElementById('userEditTabInfo').style.display = 'block';
            document.getElementById('userEditTabPerms').classList.remove('active'); document.getElementById('userEditTabPerms').style.display = 'none';
            document.getElementById('userEditId').value = u.id;
            document.getElementById('userEditName').value = u.name || '';
            document.getElementById('userEditUsername').value = u.username || '';
            document.getElementById('userEditEmail').value = u.email || '';
            document.getElementById('userEditRole').value = u.role || 'agent';
            document.getElementById('userEditDept').value = u.departmentId || '';
            document.getElementById('userEditBranch').value = u.branchId || '';
            document.getElementById('userEditActive').checked = u.isActive !== false;
            document.getElementById('userEditPassword').value = '';
            var skillsEl = document.getElementById('userEditSkillsKeywords');
            if (skillsEl) skillsEl.value = (u.settings && u.settings.skillsKeywords) || '';
            var perms = u.permissions || {};
            var canGrantSpecial = (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin'));
            var html = '';
            permGroups.forEach(function(gr) {
                var visibleKeys = gr.keys.filter(function(k) { return (k !== 'manage_users' && k !== 'manage_tickets') || canGrantSpecial; });
                if (visibleKeys.length === 0) return;
                html += '<div class="user-edit-perm-group" data-group="' + gr.key + '">';
                html += '<div class="user-edit-perm-group-header"><span class="user-edit-perm-group-title">' + (t(gr.title) || gr.key) + '</span><span class="user-edit-perm-group-toggles"><button type="button" class="btn-user-perms-group" onclick="userPermsSelectGroup(\'' + gr.key + '\', true)">' + (t('user_perms_all') || 'همه') + '</button><button type="button" class="btn-user-perms-group" onclick="userPermsSelectGroup(\'' + gr.key + '\', false)">' + (t('user_perms_none') || 'هیچ‌کدام') + '</button></span></div>';
                html += '<div class="user-edit-perm-group-items">';
                visibleKeys.forEach(function(k) {
                    var checked = perms[k] !== false ? ' checked' : '';
                    var lbl = sectionLabel(k);
                    html += '<label class="user-edit-perm-item"><input type="checkbox" data-perm="' + k + '"' + checked + '><span class="user-edit-perm-label">' + escapeHtml(lbl) + '</span></label>';
                });
                html += '</div></div>';
            });
            document.getElementById('userEditPerms').innerHTML = html;
            var btnDel = document.getElementById('btnUserDelete');
            if (btnDel) btnDel.style.display = (currentUser && currentUser.permissions && currentUser.permissions.manage_users) && u.id !== (currentUser && currentUser.id) ? '' : 'none';
            document.getElementById('userEditModal').style.display = 'flex';
        }
        function openDeleteUserModal() {
            if (!currentEditUserId) return;
            var u = userListData.find(function(x) { return x.id === currentEditUserId; });
            if (!u) return;
            document.getElementById('deleteUserModalText').textContent = (LANG === 'fa' ? 'مکالمات، تسک‌ها، تیکت‌ها و فرایندهای ' : 'Conversations, tasks, tickets and processes of ') + (u.name || u.email) + (LANG === 'fa' ? ' به کاربر انتخابی منتقل و حساب غیرفعال می‌شود.' : ' will be transferred and the account will be deactivated.');
            var sel = document.getElementById('deleteUserTransferTo');
            var others = userListData.filter(function(x) { return x.id !== currentEditUserId && x.isActive !== false; });
            sel.innerHTML = '<option value="">' + (LANG === 'fa' ? 'انتخاب کاربر' : 'Select user') + '</option>' + others.map(function(x) { return '<option value="' + x.id + '">' + escapeHtml(x.name || x.username || x.email) + '</option>'; }).join('');
            var permCb = document.getElementById('deleteUserPermanent');
            if (permCb) permCb.checked = false;
            document.getElementById('deleteUserModal').style.display = 'flex';
        }
        function closeDeleteUserModal() { document.getElementById('deleteUserModal').style.display = 'none'; }
        async function confirmDeleteUser() {
            if (!currentEditUserId) return;
            var transferTo = document.getElementById('deleteUserTransferTo').value;
            if (!transferTo) { toast(LANG === 'fa' ? 'انتخاب کاربر برای انتقال الزامی است' : 'Select user to transfer data to', true); return; }
            var permanent = document.getElementById('deleteUserPermanent') && document.getElementById('deleteUserPermanent').checked;
            var endpoint = permanent ? '/api/users/' + currentEditUserId + '/permanent-delete' : '/api/users/' + currentEditUserId + '/delete-with-transfer';
            var btn = document.getElementById('btnConfirmDeleteUser');
            if (btn) { btn.disabled = true; btn.textContent = LANG === 'fa' ? 'در حال پردازش...' : 'Processing...'; }
            var res = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify({ transferToUserId: transferTo }) });
            if (btn) { btn.disabled = false; btn.textContent = t('user_delete_confirm_btn') || (LANG === 'fa' ? 'حذف و انتقال' : 'Delete & transfer'); }
            if (res.needLogin) return;
            if (res.ok) {
                toast(permanent ? (t('user_permanent_deleted') || (LANG === 'fa' ? 'کاربر به‌طور دائمی حذف شد' : 'User permanently deleted')) : (t('user_deleted_transferred') || (LANG === 'fa' ? 'کاربر غیرفعال و داده‌ها منتقل شد' : 'User deactivated and data transferred')));
                closeDeleteUserModal(); closeUserEditModal(); loadUsers();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function saveUserEdit() {
            if (!currentEditUserId) return;
            var perms = {};
            document.querySelectorAll('#userEditPerms input[data-perm]').forEach(function(cb) {
                perms[cb.getAttribute('data-perm')] = cb.checked;
            });
            var skillsEl = document.getElementById('userEditSkillsKeywords');
            var payload = {
                name: document.getElementById('userEditName').value.trim(),
                username: document.getElementById('userEditUsername').value.trim() || null,
                email: document.getElementById('userEditEmail').value.trim(),
                role: document.getElementById('userEditRole').value,
                departmentId: document.getElementById('userEditDept').value || null,
                branchId: document.getElementById('userEditBranch').value || null,
                isActive: document.getElementById('userEditActive').checked,
                permissions: perms,
                skillsKeywords: skillsEl ? skillsEl.value.trim() || null : null
            };
            var pw = document.getElementById('userEditPassword').value;
            if (pw) payload.password = pw;
            var res = await apiFetch('/api/users/' + currentEditUserId, { method: 'PUT', body: JSON.stringify(payload) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('saved')); closeUserEditModal(); loadUsers(); if (currentEditUserId === (currentUser && currentUser.id)) { apiFetch('/api/users/me').then(function(r) { if (r.ok && r.data) { currentUser = r.data; applyNavByRole(); } }); } } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        async function loadDeptsForUser() {
            var res = await apiFetch('/api/departments');
            if (res.needLogin) return;
            var arr = (res.data && res.data.data) || [];
            var opt = '<option value="">' + t('no_dept') + '</option>' + arr.map(function(d) { return '<option value="' + d.id + '">' + escapeHtml(d.name) + '</option>'; }).join('');
            ['userDept','userEditDept'].forEach(function(id) { var el = document.getElementById(id); if (el) el.innerHTML = opt; });
        }

        async function addUser() {
            if (!(currentUser && currentUser.permissions && currentUser.permissions.manage_users)) { toast(t('manage_users_required'), true); return; }
            var name = document.getElementById('userName').value.trim();
            var email = document.getElementById('userEmailAdd').value.trim();
            var password = document.getElementById('userPass').value;
            if (!name || !email || !password) { toast(t('required_name_email_pass'), true); return; }
            var username = (document.getElementById('userUsernameAdd') && document.getElementById('userUsernameAdd').value) ? document.getElementById('userUsernameAdd').value.trim() : null;
            var branchId = document.getElementById('userBranch').value || null;
            var deptId = document.getElementById('userDept').value || null;
            var perms = {};
            var permsEl = document.getElementById('userAddPerms');
            if (permsEl) permsEl.querySelectorAll('input[data-perm]').forEach(function(cb) { perms[cb.getAttribute('data-perm')] = cb.checked; });
            var skillsEl = document.getElementById('userSkillsAdd');
            var skillsKeywords = (skillsEl && skillsEl.value.trim()) || null;
            var res = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify({ name: name, username: username, email: email, password: password, role: document.getElementById('userRole').value, departmentId: deptId, branchId: branchId, permissions: perms, skillsKeywords: skillsKeywords }) });
            if (res.needLogin) return;
            if (res.ok) {
                document.getElementById('userName').value = '';
                if (document.getElementById('userUsernameAdd')) document.getElementById('userUsernameAdd').value = '';
                document.getElementById('userEmailAdd').value = '';
                document.getElementById('userPass').value = '';
                if (document.getElementById('userSkillsAdd')) document.getElementById('userSkillsAdd').value = '';
                toast(t('toast_user_added')); loadUsers(); toggleUserForm();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        var currentInternalThreadId = null;
        var currentInternalThreadOtherUserId = null;
        var currentInternalThreadParticipants = [];
        var internalCallPeers = {};
        var internalCallLocalStream = null;
        var internalCallPendingOffer = null;
        var internalCallPendingInvite = null;
        var internalCallIsIncoming = false;
        var internalCallIsJoining = false;
        var internalCallType = 'voice';
        var internalCallMicMuted = false;
        var internalCallCameraOff = false;
        var internalCallStartedAt = null;
        var internalCallDurationInterval = null;
        var INTERNAL_CALL_ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:stun2.l.google.com:19302' }];
        function getSocket() { return socket; }
        function getInternalCallOtherDisplay() {
            var id = currentInternalThreadOtherUserId || (internalCallPendingInvite && internalCallPendingInvite.fromUserId) || (internalCallPendingOffer && internalCallPendingOffer.fromUserId);
            if (!id) return { name: '', initial: '?' };
            var p = (currentInternalThreadParticipants || []).find(function(x) { return String(x.id) === String(id); });
            var name = (p && (p.name || p.email)) || (internalCallPendingInvite && internalCallPendingInvite.fromUserName) || '';
            var initial = (name && name.trim()[0]) ? name.trim()[0].toUpperCase() : '?';
            return { name: name || (LANG === 'fa' ? 'طرف تماس' : 'Contact'), initial: initial };
        }
        function formatCallDuration(ms) {
            var s = Math.floor(ms / 1000);
            var m = Math.floor(s / 60);
            s = s % 60;
            return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        }
        function startInternalCallDurationTimer() {
            if (internalCallDurationInterval) return;
            internalCallStartedAt = internalCallStartedAt || Date.now();
            var el = document.getElementById('internalCallDuration');
            if (el) { el.style.display = 'block'; el.textContent = formatCallDuration(0); }
            internalCallDurationInterval = setInterval(function() {
                var el = document.getElementById('internalCallDuration');
                if (el) el.textContent = formatCallDuration(Date.now() - internalCallStartedAt);
            }, 1000);
        }
        function stopInternalCallDurationTimer() {
            if (internalCallDurationInterval) { clearInterval(internalCallDurationInterval); internalCallDurationInterval = null; }
            internalCallStartedAt = null;
            var el = document.getElementById('internalCallDuration');
            if (el) el.style.display = 'none';
        }
        function updateInternalCallConnectionStatus(text, stateClass) {
            var el = document.getElementById('internalCallConnectionStatus');
            if (!el) return;
            el.textContent = text || '';
            el.style.display = text ? 'block' : 'none';
            el.className = 'internal-call-connection-status' + (stateClass ? ' ' + stateClass : '');
        }
        function attachPeerConnectionStateHandlers(pc, userId) {
            if (!pc) return;
            function updateState() {
                var state = pc.iceConnectionState || (pc.connectionState || '');
                if (state === 'connected' || state === 'completed') updateInternalCallConnectionStatus(t('call_connected') || 'متصل', 'connected');
                else if (state === 'connecting' || state === 'checking') updateInternalCallConnectionStatus(t('call_connecting') || 'در حال اتصال...', 'connecting');
                else if (state === 'failed') updateInternalCallConnectionStatus(t('call_failed') || 'خطا در اتصال', 'failed');
                else if (state === 'disconnected') updateInternalCallConnectionStatus(t('call_connecting') || 'در حال اتصال...', 'connecting');
            }
            pc.oniceconnectionstatechange = updateState;
            try { pc.onconnectionstatechange = updateState; } catch (e) {}
            updateState();
        }
        function getOrCreateRemoteVideoEl(userId) {
            var container = document.getElementById('internalCallRemoteVideos');
            if (!container) return null;
            var id = 'internalCallRemoteVideo_' + userId;
            var el = document.getElementById(id);
            if (!el) { el = document.createElement('video'); el.id = id; el.className = 'internal-call-remote-video'; el.autoplay = true; el.playsInline = true; container.appendChild(el); }
            return el;
        }
        function removeRemoteVideoEl(userId) {
            var el = document.getElementById('internalCallRemoteVideo_' + userId);
            if (el) { el.srcObject = null; el.remove(); }
        }
        var internalThreadsCache = [];
        async function loadInternalThreads() {
            var list = document.getElementById('internalThreadList');
            if (!list) return;
            list.innerHTML = t('loading');
            var res = await apiFetch('/api/internal/threads');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('loading_err') + '</div>'; return; }
            var data = (res.data && res.data.data) || [];
            internalThreadsCache = data;
            renderInternalThreadList(data);
            updateInternalChatFloatingBtn();
        }
        function renderInternalThreadList(data) {
            var list = document.getElementById('internalThreadList');
            if (!list) return;
            list.classList.remove('empty');
            if (data.length === 0) { list.innerHTML = '<div class="empty internal-chat-empty-state"><span class="empty-icon">\uD83D\uDCAC</span><p>' + (t('start_chat_hint') || (LANG === 'fa' ? 'گفتگویی را انتخاب کنید یا گفتگوی جدید شروع کنید.' : 'Select a conversation or start a new one.')) + '</p></div>'; return; }
            var me = (currentUser && currentUser.id) || '';
            list.innerHTML = data.map(function(t) {
                var participants = t.participants || [];
                var names = participants.map(function(p) { return p.name || p.email || ''; }).join(', ');
                var first = participants[0];
                var initial = (first && (first.name || first.email || '').trim()[0]) ? (first.name || first.email || '').trim()[0].toUpperCase() : '\u003F';
                var avatarUrl = resolveAvatarUrl(first && first.avatar);
                var avatarHtml = avatarUrl ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(avatarUrl) + '" alt="" onerror="this.style.display=\'none\'">' : escapeHtml(initial);
                var last = t.lastMessage ? (t.lastMessage.content || '').slice(0, 45) + ((t.lastMessage.content || '').length > 45 ? '\u2026' : '') : '\u2014';
                var timeStr = t.lastMessageAt ? fmtTZ(t.lastMessageAt, 'time') : '';
                var fromLabel = t.lastMessage && t.lastMessage.fromUser && String(t.lastMessage.fromUser.id) !== String(me) ? (t.lastMessage.fromUser.name || '') + ': ' : '';
                return '<div class="list-item internal-chat-thread-item" data-id="' + escapeHtml(t.id) + '" onclick="openInternalThread(\'' + t.id + '\')" style="cursor:pointer;"><div class="list-item-avatar internal-chat-thread-avatar">' + avatarHtml + '</div><div class="list-item-body"><span class="name">' + escapeHtml(names || t('chat')) + '</span><div class="meta">' + escapeHtml(fromLabel + last) + '</div></div><span class="internal-chat-thread-time">' + escapeHtml(timeStr) + '</span></div>';
            }).join('');
        }
        function filterInternalThreads(q) {
            q = (q || '').trim().toLowerCase();
            if (!q) { renderInternalThreadList(internalThreadsCache); return; }
            var filtered = internalThreadsCache.filter(function(th) {
                var names = (th.participants || []).map(function(p) { return (p.name || '') + ' ' + (p.email || ''); }).join(' ').toLowerCase();
                var last = (th.lastMessage && th.lastMessage.content) ? th.lastMessage.content.toLowerCase() : '';
                return names.indexOf(q) >= 0 || last.indexOf(q) >= 0;
            });
            renderInternalThreadList(filtered);
        }
        function updateInternalChatFloatingBtn() {
            var btn = document.getElementById('internalChatFloatingBtn');
            var popup = document.getElementById('internalChatPopup');
            var perms = (currentUser && currentUser.permissions) || {};
            var hasAccess = perms.internal_chat !== false;
            if (!btn) return;
            if (!hasAccess) { btn.style.display = 'none'; return; }
            btn.style.display = 'flex';
            var badge = document.getElementById('internalChatFloatingBadge');
            if (badge) { badge.style.display = window.hasNewInternalChat ? 'flex' : 'none'; badge.textContent = window.navBadgeCounts && window.navBadgeCounts['internal-chat'] ? window.navBadgeCounts['internal-chat'] : '1'; }
        }
        function toggleInternalChatFloating() {
            var popup = document.getElementById('internalChatPopup');
            if (popup && popup.style.display !== 'none') { popup.classList.remove('minimized'); popup.style.display = 'flex'; return; }
            if (currentInternalThreadId) {
                var headerEl = document.getElementById('internalChatHeader');
                var name = (headerEl && headerEl.textContent) ? headerEl.textContent.trim() : (LANG === 'fa' ? 'چت' : 'Chat');
                showInternalChatPopup(currentInternalThreadId, name);
            } else { openInternalChatPopupPicker(); }
        }
        function selectThreadInPopup(threadId) {
            var t = (internalThreadsCache || []).find(function(x) { return String(x.id) === String(threadId); });
            var names = (t && (t.participants || []).map(function(p) { return p.name || p.email || ''; }).join(', ')) || (LANG === 'fa' ? 'چت' : 'Chat');
            showInternalChatPopup(threadId, names);
        }
        async function openInternalChatPopupPicker() {
            var popup = document.getElementById('internalChatPopup');
            var titleEl = document.getElementById('internalChatPopupTitle');
            var listEl = document.getElementById('internalChatPopupThreadList');
            var messagesEl = document.getElementById('internalChatPopupMessages');
            var quickEl = document.getElementById('internalChatPopupQuickReplies');
            var sendWrap = document.querySelector('.internal-chat-popup-send');
            if (!popup || !listEl) return;
            if (titleEl) titleEl.textContent = LANG === 'fa' ? 'چت داخلی' : 'Internal chat';
            listEl.style.display = 'flex';
            listEl.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            if (messagesEl) messagesEl.style.display = 'none';
            if (quickEl) quickEl.style.display = 'none';
            if (sendWrap) sendWrap.style.display = 'none';
            popup.style.display = 'flex';
            var btn = document.getElementById('internalChatFloatingBtn');
            if (btn) btn.classList.add('internal-chat-floating-btn-open');
            try {
                var res = await apiFetch('/api/internal/threads');
                if (res.needLogin || !res.ok) { listEl.innerHTML = '<div class="empty">' + (t('loading_err') || '') + '</div>'; return; }
                var data = (res.data && res.data.data) || [];
                internalThreadsCache = data;
                var me = (currentUser && currentUser.id) || '';
                var itemsHtml = data.map(function(t) {
                    var participants = t.participants || [];
                    var names = participants.map(function(p) { return p.name || p.email || ''; }).join(', ');
                    var first = participants[0];
                    var initial = (first && (first.name || first.email || '').trim()[0]) ? (first.name || first.email || '').trim()[0].toUpperCase() : '\u003F';
                    var avatarUrl = resolveAvatarUrl(first && first.avatar);
                    var avatarHtml = avatarUrl ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(avatarUrl) + '" alt="" onerror="this.style.display=\'none\'">' : escapeHtml(initial);
                    var last = t.lastMessage ? (t.lastMessage.content || '').slice(0, 35) + ((t.lastMessage.content || '').length > 35 ? '\u2026' : '') : '\u2014';
                    var timeStr = t.lastMessageAt ? fmtTZ(t.lastMessageAt, 'time') : '';
                    var safeId = String(t.id).replace(/'/g, "\\'");
                    return '<button type="button" class="internal-chat-popup-thread-item" data-id="' + escapeHtml(t.id) + '" onclick="selectThreadInPopup(\'' + safeId + '\')"><span class="internal-chat-popup-thread-avatar">' + avatarHtml + '</span><div class="internal-chat-popup-thread-body"><span class="internal-chat-popup-thread-name">' + escapeHtml(names || t('chat')) + '</span><div class="internal-chat-popup-thread-meta">' + escapeHtml(last) + '</div></div><span class="internal-chat-popup-thread-time">' + escapeHtml(timeStr) + '</span></button>';
                }).join('');
                var newBtn = '<button type="button" class="internal-chat-popup-new-btn" onclick="closeInternalChatPopup(); showPage(\'internal-chat\');">' + (LANG === 'fa' ? '\u2795 گفتگوی جدید' : '+ New conversation') + '</button>';
                listEl.innerHTML = (data.length === 0 ? '<div class="empty internal-chat-empty-state"><span class="empty-icon">\uD83D\uDCAC</span><p>' + (t('start_chat_hint') || '') + '</p></div>' : '') + itemsHtml + newBtn;
            } catch (e) {
                listEl.innerHTML = '<div class="empty">' + (t('loading_err') || '') + '</div>';
            }
        }
        async function loadInternalUsers() {
            var res = await apiFetch('/api/internal/users');
            if (res.needLogin || !res.ok) return;
            var sel = document.getElementById('internalNewChatUser');
            var data = (res.data && res.data.data) || [];
            sel.innerHTML = '<option value="">' + t('select_user') + '</option>' + data.map(function(u) { return '<option value="' + u.id + '">' + escapeHtml(u.name) + '</option>'; }).join('');
        }
        function showNewChatForm() { document.getElementById('internalNewChatForm').style.display = 'block'; loadInternalUsers(); }
        function hideNewChatForm() { document.getElementById('internalNewChatForm').style.display = 'none'; }
        function showInternalCallModal(statusText, showAccept) {
            var modal = document.getElementById('internalCallModal');
            var statusEl = document.getElementById('internalCallStatus');
            var connEl = document.getElementById('internalCallConnectionStatus');
            var acceptBtn = document.getElementById('internalCallAcceptBtn');
            var rejectBtn = document.getElementById('internalCallRejectBtn');
            var endBtn = document.getElementById('internalCallEndBtn');
            var addBtn = document.getElementById('internalCallAddBtn');
            var micBtn = document.getElementById('internalCallMicBtn');
            var cameraBtn = document.getElementById('internalCallCameraBtn');
            var localV = document.getElementById('internalCallLocalVideo');
            var container = document.getElementById('internalCallRemoteVideos');
            var videosWrap = document.getElementById('internalCallVideos');
            var voicePlaceholder = document.getElementById('internalCallVoicePlaceholder');
            var voiceAvatar = document.getElementById('internalCallVoiceAvatar');
            var voiceName = document.getElementById('internalCallVoiceName');
            var isVoice = internalCallType === 'voice';
            if (statusEl) statusEl.textContent = statusText || '';
            if (voicePlaceholder) voicePlaceholder.style.display = isVoice ? 'flex' : 'none';
            if (videosWrap) videosWrap.style.display = isVoice ? 'none' : 'block';
            if (isVoice) {
                var d = getInternalCallOtherDisplay();
                if (voiceAvatar) voiceAvatar.textContent = d.initial;
                if (voiceName) voiceName.textContent = d.name;
            }
            var isInCall = (statusText === t('in_call') || statusText === 'In call') && !showAccept;
            if (isInCall) startInternalCallDurationTimer();
            else stopInternalCallDurationTimer();
            if (connEl) { connEl.style.display = 'none'; connEl.textContent = ''; connEl.className = 'internal-call-connection-status'; }
            if (acceptBtn) acceptBtn.style.display = showAccept ? 'flex' : 'none';
            /* فقط یکی از دو دکمه قرمز: هنگام برقراری/در انتظار = «لغو»، بعد از اتصال = «قطع تماس» */
            if (rejectBtn) {
                rejectBtn.style.display = isInCall ? 'none' : 'flex';
                rejectBtn.textContent = showAccept ? t('reject_call') : (t('cancel_call') || t('reject_call'));
                rejectBtn.setAttribute('data-i18n', showAccept ? 'reject_call' : 'cancel_call');
            }
            if (endBtn) endBtn.style.display = isInCall ? 'flex' : 'none';
            if (addBtn) addBtn.style.display = 'none';
            if (micBtn) { micBtn.style.display = showAccept ? 'none' : 'flex'; micBtn.classList.toggle('muted', internalCallMicMuted); micBtn.title = internalCallMicMuted ? (t('call_unmute') || 'وصل میکروفون') : (t('call_mute') || 'قطع میکروفون'); }
            if (cameraBtn) { cameraBtn.style.display = (showAccept || internalCallType !== 'video') ? 'none' : 'flex'; cameraBtn.classList.toggle('off', internalCallCameraOff); cameraBtn.title = internalCallCameraOff ? (t('call_camera_on') || 'روشن کردن دوربین') : (t('call_camera_off') || 'خاموش کردن دوربین'); }
            if (localV) { localV.srcObject = null; localV.style.display = 'none'; }
            if (container) container.innerHTML = '';
            if (modal) modal.style.display = 'flex';
        }
        function hideInternalCallModal() {
            stopCallRingtone();
            stopInternalCallDurationTimer();
            var modal = document.getElementById('internalCallModal');
            if (modal) modal.style.display = 'none';
            if (internalCallLocalStream) { internalCallLocalStream.getTracks().forEach(function(t){ t.stop(); }); internalCallLocalStream = null; }
            var localV = document.getElementById('internalCallLocalVideo');
            if (localV) localV.srcObject = null;
            Object.keys(internalCallPeers).forEach(function(uid) { var pc = internalCallPeers[uid]; if (pc) pc.close(); });
            internalCallPeers = {};
            var container = document.getElementById('internalCallRemoteVideos');
            if (container) container.innerHTML = '';
            internalCallPendingOffer = null;
            internalCallPendingInvite = null;
            internalCallIsIncoming = false;
            internalCallMicMuted = false;
            internalCallCameraOff = false;
            updateInternalCallConnectionStatus('', '');
        }
        function toggleInternalCallMic() {
            if (!internalCallLocalStream) return;
            var audioTracks = internalCallLocalStream.getAudioTracks();
            var currentlyEnabled = audioTracks.length > 0 && audioTracks[0].enabled;
            internalCallMicMuted = currentlyEnabled;
            if (audioTracks.length) audioTracks[0].enabled = !currentlyEnabled;
            var micBtn = document.getElementById('internalCallMicBtn');
            if (micBtn) { micBtn.classList.toggle('muted', internalCallMicMuted); micBtn.title = internalCallMicMuted ? (t('call_unmute') || 'وصل میکروفون') : (t('call_mute') || 'قطع میکروفون'); }
        }
        function toggleInternalCallCamera() {
            if (!internalCallLocalStream) return;
            var videoTracks = internalCallLocalStream.getVideoTracks();
            if (videoTracks.length) {
                internalCallCameraOff = videoTracks[0].enabled;
                videoTracks[0].enabled = !internalCallCameraOff;
            } else internalCallCameraOff = true;
            var localV = document.getElementById('internalCallLocalVideo');
            if (localV) localV.style.display = internalCallCameraOff ? 'none' : 'block';
            var cameraBtn = document.getElementById('internalCallCameraBtn');
            if (cameraBtn) { cameraBtn.classList.toggle('off', internalCallCameraOff); cameraBtn.title = internalCallCameraOff ? (t('call_camera_on') || 'روشن کردن دوربین') : (t('call_camera_off') || 'خاموش کردن دوربین'); }
        }
        async function startInternalCall(type) {
            if (!currentInternalThreadId || !currentInternalThreadOtherUserId) { toast(t('select_conversation_first'), true); return; }
            var s = getSocket();
            if (!s || !s.connected) { toast(t('user_offline') || 'کاربر آفلاین است', true); return; }
            try {
                internalCallType = type;
                internalCallLocalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
                var pc = new RTCPeerConnection({ iceServers: INTERNAL_CALL_ICE_SERVERS });
                var toId = currentInternalThreadOtherUserId;
                internalCallPeers[toId] = pc;
                attachPeerConnectionStateHandlers(pc, toId);
                internalCallLocalStream.getTracks().forEach(function(t){ pc.addTrack(t, internalCallLocalStream); });
                pc.onicecandidate = function(e) { if (e.candidate && s) s.emit('call_ice', { toUserId: toId, threadId: currentInternalThreadId, candidate: e.candidate }); };
                pc.ontrack = function(e) { var rv = getOrCreateRemoteVideoEl(toId); if (rv && e.streams && e.streams[0]) { rv.srcObject = e.streams[0]; rv.play().catch(function(){}); } };
                var offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                s.emit('call_offer', { toUserId: toId, threadId: currentInternalThreadId, type: type, sdp: offer });
                showInternalCallModal(type === 'video' ? t('calling_video') : t('calling_voice'), false);
                var localV = document.getElementById('internalCallLocalVideo');
                if (localV) { localV.srcObject = internalCallLocalStream; localV.style.display = type === 'video' ? 'block' : 'none'; }
                var addBtn = document.getElementById('internalCallAddBtn');
                if (addBtn) addBtn.style.display = 'flex';
                var micBtn = document.getElementById('internalCallMicBtn');
                if (micBtn) { micBtn.style.display = 'flex'; micBtn.classList.toggle('muted', internalCallMicMuted); }
                var cameraBtn = document.getElementById('internalCallCameraBtn');
                if (cameraBtn) { cameraBtn.style.display = type === 'video' ? 'flex' : 'none'; cameraBtn.classList.toggle('off', internalCallCameraOff); }
            } catch (e) { toast((e.name || 'Error') + ': ' + (e.message || ''), true); hideInternalCallModal(); }
        }
        async function acceptInternalCall() {
            if (!internalCallPendingOffer) return;
            var toUserId = internalCallPendingOffer.fromUserId;
            var threadId = internalCallPendingOffer.threadId;
            var s = getSocket();
            if (!s || !s.connected) return;
            try {
                var type = internalCallPendingOffer.type || 'voice';
                internalCallType = type;
                internalCallLocalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
                var pc = new RTCPeerConnection({ iceServers: INTERNAL_CALL_ICE_SERVERS });
                internalCallPeers[toUserId] = pc;
                attachPeerConnectionStateHandlers(pc, toUserId);
                internalCallLocalStream.getTracks().forEach(function(t){ pc.addTrack(t, internalCallLocalStream); });
                pc.onicecandidate = function(e) { if (e.candidate && s) s.emit('call_ice', { toUserId: toUserId, threadId: threadId, candidate: e.candidate }); };
                pc.ontrack = function(e) { var rv = getOrCreateRemoteVideoEl(toUserId); if (rv && e.streams && e.streams[0]) { rv.srcObject = e.streams[0]; rv.play().catch(function(){}); } };
                await pc.setRemoteDescription(new RTCSessionDescription(internalCallPendingOffer.sdp));
                var answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                s.emit('call_answer', { toUserId: toUserId, threadId: threadId, sdp: answer });
                currentInternalThreadId = threadId;
                currentInternalThreadOtherUserId = toUserId;
                showInternalCallModal(t('in_call'), false);
                var localV = document.getElementById('internalCallLocalVideo');
                if (localV) { localV.srcObject = internalCallLocalStream; localV.style.display = type === 'video' ? 'block' : 'none'; }
                var addBtn = document.getElementById('internalCallAddBtn');
                if (addBtn) addBtn.style.display = 'flex';
                var micBtn = document.getElementById('internalCallMicBtn');
                if (micBtn) { micBtn.style.display = 'flex'; micBtn.classList.toggle('muted', internalCallMicMuted); }
                var cameraBtn = document.getElementById('internalCallCameraBtn');
                if (cameraBtn) { cameraBtn.style.display = type === 'video' ? 'flex' : 'none'; cameraBtn.classList.toggle('off', internalCallCameraOff); }
                internalCallPendingOffer = null;
                internalCallIsIncoming = false;
                playCallConnected();
            } catch (e) { toast((e.name || 'Error') + ': ' + (e.message || ''), true); rejectInternalCall(); }
        }
        function rejectInternalCall() {
            var s = getSocket();
            var toUserId = internalCallPendingOffer ? internalCallPendingOffer.fromUserId : currentInternalThreadOtherUserId;
            var threadId = internalCallPendingOffer ? internalCallPendingOffer.threadId : currentInternalThreadId;
            if (s && s.connected && toUserId && threadId) s.emit('call_reject', { toUserId: toUserId, threadId: threadId });
            hideInternalCallModal();
        }
        function endInternalCall() {
            var s = getSocket();
            if (s && s.connected && currentInternalThreadId) s.emit('call_end', { threadId: currentInternalThreadId });
            hideInternalCallModal();
        }
        async function handleCallOfferAsJoiner(data) {
            var fromUserId = data.fromUserId;
            var threadId = data.threadId;
            var s = getSocket();
            if (!s || threadId !== currentInternalThreadId || internalCallPeers[fromUserId]) return;
            try {
                var pc = new RTCPeerConnection({ iceServers: INTERNAL_CALL_ICE_SERVERS });
                internalCallPeers[fromUserId] = pc;
                attachPeerConnectionStateHandlers(pc, fromUserId);
                internalCallLocalStream.getTracks().forEach(function(t){ pc.addTrack(t, internalCallLocalStream); });
                pc.onicecandidate = function(e) { if (e.candidate && s) s.emit('call_ice', { toUserId: fromUserId, threadId: threadId, candidate: e.candidate }); };
                pc.ontrack = function(e) { var rv = getOrCreateRemoteVideoEl(fromUserId); if (rv && e.streams && e.streams[0]) { rv.srcObject = e.streams[0]; rv.play().catch(function(){}); } };
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                var answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                s.emit('call_answer', { toUserId: fromUserId, threadId: threadId, sdp: answer });
            } catch (err) { console.warn('handleCallOfferAsJoiner:', err); }
        }
        async function acceptInternalCallInvite() {
            if (!internalCallPendingInvite) return;
            var threadId = internalCallPendingInvite.threadId;
            var type = internalCallPendingInvite.type || 'voice';
            var s = getSocket();
            if (!s || !s.connected) return;
            try {
                document.getElementById('internalCallInviteModal').style.display = 'none';
                currentInternalThreadId = threadId;
                currentInternalThreadOtherUserId = internalCallPendingInvite.fromUserId;
                internalCallType = type;
                internalCallIsJoining = true;
                internalCallLocalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
                s.emit('call_invite_accept', { threadId: threadId, type: type });
                showInternalCallModal(t('in_call'), false);
                var localV = document.getElementById('internalCallLocalVideo');
                if (localV) { localV.srcObject = internalCallLocalStream; localV.style.display = type === 'video' ? 'block' : 'none'; }
                var addBtn = document.getElementById('internalCallAddBtn');
                if (addBtn) addBtn.style.display = 'flex';
                var micBtn = document.getElementById('internalCallMicBtn');
                if (micBtn) { micBtn.style.display = 'flex'; micBtn.classList.toggle('muted', internalCallMicMuted); }
                var cameraBtn = document.getElementById('internalCallCameraBtn');
                if (cameraBtn) { cameraBtn.style.display = type === 'video' ? 'flex' : 'none'; cameraBtn.classList.toggle('off', internalCallCameraOff); }
                internalCallPendingInvite = null;
                playCallConnected();
                setTimeout(function() { internalCallIsJoining = false; }, 5000);
            } catch (e) { toast((e.name || 'Error') + ': ' + (e.message || ''), true); rejectInternalCallInvite(); }
        }
        function rejectInternalCallInvite() {
            stopCallRingtone();
            var s = getSocket();
            if (internalCallPendingInvite && s && s.connected) s.emit('call_invite_reject', { fromUserId: internalCallPendingInvite.fromUserId, threadId: internalCallPendingInvite.threadId });
            internalCallPendingInvite = null;
            var mod = document.getElementById('internalCallInviteModal');
            if (mod) mod.style.display = 'none';
        }
        var addToCallParticipantsCache = [];
        function renderAddToCallList(participants) {
            var list = document.getElementById('addToCallList');
            if (!list) return;
            addToCallParticipantsCache = participants || addToCallParticipantsCache;
            var search = (document.getElementById('addToCallSearch') && document.getElementById('addToCallSearch').value) || '';
            var q = search.trim().toLowerCase();
            var filtered = q ? addToCallParticipantsCache.filter(function(p) {
                var name = (p.name || p.email || '').toLowerCase();
                return name.indexOf(q) >= 0;
            }) : addToCallParticipantsCache;
            list.innerHTML = filtered.map(function(p) {
                var name = p.name || p.email || p.id;
                var initial = (name && name.toString().trim()[0]) ? name.toString().trim()[0].toUpperCase() : '?';
                return '<label class="add-to-call-item" data-user-id="' + escapeHtml(p.id) + '"><input type="checkbox" class="add-to-call-check" data-user-id="' + escapeHtml(p.id) + '"><span class="add-to-call-avatar">' + escapeHtml(initial) + '</span><span class="add-to-call-name">' + escapeHtml(name) + '</span></label>';
            }).join('');
            var selAll = document.getElementById('addToCallSelectAll');
            if (selAll) selAll.checked = false;
        }
        function filterAddToCallList() {
            renderAddToCallList(addToCallParticipantsCache);
        }
        function toggleAddToCallSelectAll(checked) {
            var list = document.getElementById('addToCallList');
            if (!list) return;
            list.querySelectorAll('.add-to-call-check').forEach(function(cb) {
                if (cb.closest('.add-to-call-item').style.display !== 'none') cb.checked = !!checked;
            });
        }
        function showAddToCallModal() {
            var list = document.getElementById('addToCallList');
            if (!list) return;
            var inCallIds = Object.keys(internalCallPeers);
            var participants = currentInternalThreadParticipants.filter(function(p) {
                var id = String(p.id);
                return id !== String(currentUser && currentUser.id) && inCallIds.indexOf(id) < 0;
            });
            if (participants.length === 0) { toast(LANG === 'fa' ? 'همه در تماس هستند' : 'Everyone is already in the call', true); return; }
            var searchEl = document.getElementById('addToCallSearch');
            if (searchEl) searchEl.value = '';
            var selAll = document.getElementById('addToCallSelectAll');
            if (selAll) selAll.checked = false;
            renderAddToCallList(participants);
            document.getElementById('addToCallModal').style.display = 'flex';
        }
        function closeAddToCallModal() {
            var mod = document.getElementById('addToCallModal');
            if (mod) mod.style.display = 'none';
        }
        function inviteSelectedToCall() {
            var list = document.getElementById('addToCallList');
            if (!list) return;
            var checked = list.querySelectorAll('.add-to-call-check:checked');
            var ids = Array.from(checked).map(function(cb) { return cb.getAttribute('data-user-id'); }).filter(Boolean);
            if (ids.length === 0) { toast(LANG === 'fa' ? 'حداقل یک نفر را انتخاب کنید' : 'Select at least one person', true); return; }
            var s = getSocket();
            if (!s || !s.connected || !currentInternalThreadId) { toast(t('user_offline') || (LANG === 'fa' ? 'اتصال برقرار نیست' : 'Not connected'), true); return; }
            ids.forEach(function(userId) {
                s.emit('call_invite', { toUserId: userId, threadId: currentInternalThreadId });
            });
            closeAddToCallModal();
            toast(ids.length === 1 ? (LANG === 'fa' ? 'دعوت ارسال شد' : 'Invite sent') : (LANG === 'fa' ? 'دعوت به ' + ids.length + ' نفر ارسال شد' : 'Invite sent to ' + ids.length + ' people'));
        }
        function inviteToCall(userId) {
            var s = getSocket();
            if (!s || !s.connected || !currentInternalThreadId) return;
            s.emit('call_invite', { toUserId: userId, threadId: currentInternalThreadId });
            toast((LANG === 'fa' ? 'دعوت ارسال شد' : 'Invite sent'));
        }
        async function startInternalChat() {
            var sel = document.getElementById('internalNewChatUser');
            var opts = sel ? Array.from(sel.selectedOptions || []) : [];
            var userIds = opts.map(function(o) { return o.value; }).filter(function(v) { return v; });
            if (!userIds.length) { toast(t('select_user_first'), true); return; }
            var res = await apiFetch('/api/internal/threads', { method: 'POST', body: JSON.stringify({ userIds: userIds }) });
            if (res.needLogin) return;
            if (res.ok) { hideNewChatForm(); openInternalThread(res.data.id); loadInternalThreads(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function backToInternalChatList() {
            var wrap = document.getElementById('internalChatLayoutWrap');
            var pane = document.getElementById('internalChatPane');
            if (wrap) { wrap.classList.remove('internal-chat-mobile-chat-open', 'internal-chat-has-chat'); }
            if (pane) pane.style.display = 'none';
        }
        function isInternalChatMobile() { return window.matchMedia('(max-width: 768px)').matches; }
        async function openInternalThread(threadId) {
            currentInternalThreadId = threadId;
            currentInternalThreadOtherUserId = null;
            var pane = document.getElementById('internalChatPane');
            var wrap = document.getElementById('internalChatLayoutWrap');
            pane.style.display = 'flex';
            if (wrap) { wrap.classList.add('internal-chat-has-chat'); if (isInternalChatMobile()) wrap.classList.add('internal-chat-mobile-chat-open'); }
            var partRes = await apiFetch('/api/internal/threads');
            if (partRes.ok && partRes.data && partRes.data.data) {
                var t = partRes.data.data.find(function(x) { return x.id === threadId; });
                var headerEl = document.getElementById('internalChatHeader');
                if (headerEl) headerEl.textContent = t && t.participants ? t.participants.map(function(p) { return p.name; }).join(', ') : t('chat');
                var others = t && t.participants ? t.participants.filter(function(p) { return String(p.id) !== String(currentUser && currentUser.id); }) : [];
                currentInternalThreadOtherUserId = others.length ? others[0].id : null;
                currentInternalThreadParticipants = t && t.participants ? t.participants : [];
                var headerAvatarEl = document.getElementById('internalChatHeaderAvatar');
                if (headerAvatarEl) {
                    var other = others[0];
                    var initial = (other && (other.name || other.email || '').trim()[0]) ? (other.name || other.email || '').trim()[0].toUpperCase() : '\u003F';
                    var pic = resolveAvatarUrl(other && other.avatar);
                    if (pic) headerAvatarEl.innerHTML = '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(pic) + '" alt="" onerror="this.style.display=\'none\'">';
                    else { headerAvatarEl.innerHTML = ''; headerAvatarEl.textContent = initial; }
                }
                var callBtns = document.getElementById('internalChatCallBtns');
                if (callBtns) callBtns.style.display = currentInternalThreadOtherUserId ? 'flex' : 'none';
            }
            loadInternalMessages(threadId);
        }
        function insertInternalChatQuickReply(text) {
            var inp = document.getElementById('internalChatInput');
            if (inp) { inp.value = (inp.value ? inp.value + ' ' : '') + text; inp.focus(); }
        }
        async function loadInternalMessages(threadId) {
            var list = document.getElementById('internalChatMessages');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var res = await apiFetch('/api/internal/threads/' + threadId + '/messages');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('loading_err') + '</div>'; return; }
            var data = (res.data && res.data.data) || [];
            var me = (currentUser && currentUser.id) || '';
            var quickEl = document.getElementById('internalChatQuickReplies');
            if (quickEl) {
                if (data.length === 0) {
                    quickEl.style.display = 'flex';
                    var chips = [{ key: 'quick_reply_hi', text: LANG === 'fa' ? 'سلام' : 'Hi' }, { key: 'quick_reply_gotit', text: LANG === 'fa' ? 'متوجه شدم' : 'Got it' }, { key: 'quick_reply_later', text: LANG === 'fa' ? 'بعداً پاسخ می‌دهم' : 'Will reply later' }, { key: 'quick_reply_checking', text: LANG === 'fa' ? 'در حال بررسی' : 'Checking' }];
                    quickEl.innerHTML = chips.map(function(c) { return '<button type="button" class="internal-quick-reply-chip" data-reply="' + String(c.text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '">' + t(c.key) + '</button>'; }).join('');
                    quickEl.querySelectorAll('.internal-quick-reply-chip').forEach(function(btn) { btn.onclick = function() { insertInternalChatQuickReply(this.getAttribute('data-reply') || ''); }; });
                } else { quickEl.style.display = 'none'; quickEl.innerHTML = ''; }
            }
            list.innerHTML = data.length === 0 ? '<div class="empty internal-chat-empty-state"><span class="empty-icon">💬</span><p>' + t('start_chat_hint') + '</p></div>' : data.map(function(m) {
                var isOut = m.fromUserId === me;
                var att = (m.attachments && m.attachments.length) ? m.attachments.map(renderInternalAttachment).join('') : '';
                var avatarHtml = internalMsgAvatarHtml(m.fromUser);
                var timeStr = (m.fromUser && m.fromUser.name ? m.fromUser.name : '') + ' · ' + (m.createdAt ? fmtTZ(m.createdAt, 'time') : '');
                return '<div class="msg ' + (isOut ? 'out' : 'in') + '">' + avatarHtml + '<div class="msg-body"><div>' + escapeHtml(m.content || '') + '</div>' + att + '<div class="time">' + escapeHtml(timeStr) + '</div></div></div>';
            }).join('');
            list.scrollTop = list.scrollHeight;
        }
        function appendTicketReply(r) {
            var list = document.getElementById('ticketReplies');
            if (!list || !currentTicketId) return;
            var noReply = list.querySelector('.text-muted');
            if (noReply) noReply.remove();
            var isOut = String(r.userId) === String(currentUser && currentUser.id);
            var att = (r.attachments && r.attachments.length) ? r.attachments.map(function(a) { return '<a href="' + escapeHtml(a.url) + '" target="_blank" rel="noopener" style="color:var(--accent); margin-left:8px;">📎 ' + escapeHtml(a.name || t('file')) + '</a>'; }).join('') : '';
            var html = '<div class="msg ' + (isOut ? 'out' : 'in') + '" style="margin:8px 0;"><div>' + escapeHtml(r.content || '') + '</div>' + att + '<div class="time">' + userDisplay(r.user) + ' · ' + (r.createdAt ? fmtTZ(r.createdAt, 'datetime') : '') + '</div></div>';
            list.insertAdjacentHTML('beforeend', html);
            list.scrollTop = list.scrollHeight;
        }
        async function sendInternalMessage() {
            if (!currentInternalThreadId) { toast(t('select_conversation_first'), true); return; }
            var content = (document.getElementById('internalChatInput') && document.getElementById('internalChatInput').value) || '';
            var fileInput = document.getElementById('internalChatFile');
            var allowDownload = !(document.getElementById('internalChatAllowDownload') && !document.getElementById('internalChatAllowDownload').checked);
            var attachments = [];
            if (fileInput && fileInput.files && fileInput.files[0]) {
                var formData = new FormData();
                formData.append('file', fileInput.files[0]);
                var up = await fetch(API + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
                var upData = await up.json();
                if (upData.url) attachments.push({ url: upData.url, name: upData.name || t('file'), size: upData.size, allowDownload: allowDownload });
            }
            if (!content.trim() && attachments.length === 0) { toast(t('enter_text_or_file'), true); return; }
            var res = await apiFetch('/api/internal/threads/' + currentInternalThreadId + '/messages', { method: 'POST', body: JSON.stringify({ content: content.trim() || '(پیوست)', attachments: attachments }) });
            if (res.needLogin) return;
            if (res.ok) {
                document.getElementById('internalChatInput').value = '';
                if (fileInput) { fileInput.value = ''; toggleInternalFileOption(); }
                var msg = res.data;
                if (msg) { msg.fromUserId = msg.fromUserId || (msg.fromUser && msg.fromUser.id); appendInternalMessage(msg); }
                loadInternalThreads();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function showInternalChatPopup(threadId, fromName) {
            currentInternalThreadId = threadId;
            var popup = document.getElementById('internalChatPopup');
            var titleEl = document.getElementById('internalChatPopupTitle');
            var listEl = document.getElementById('internalChatPopupThreadList');
            var messagesEl = document.getElementById('internalChatPopupMessages');
            var quickEl = document.getElementById('internalChatPopupQuickReplies');
            var sendWrap = document.querySelector('.internal-chat-popup-send');
            if (titleEl) titleEl.textContent = (LANG === 'fa' ? 'پیام از ' : 'Message from ') + (fromName || '');
            if (listEl) listEl.style.display = 'none';
            if (messagesEl) messagesEl.style.display = 'flex';
            if (sendWrap) sendWrap.style.display = 'flex';
            if (popup) popup.style.display = 'flex';
            var btn = document.getElementById('internalChatFloatingBtn');
            if (btn) btn.classList.add('internal-chat-floating-btn-open');
            loadInternalMessagesForPopup(threadId);
        }
        function closeInternalChatPopup() {
            var popup = document.getElementById('internalChatPopup');
            if (popup) { popup.style.display = 'none'; popup.classList.remove('minimized'); }
            var btn = document.getElementById('internalChatFloatingBtn');
            if (btn) btn.classList.remove('internal-chat-floating-btn-open');
            currentInternalThreadId = null;
        }
        function toggleInternalChatPopupMinimize() {
            var popup = document.getElementById('internalChatPopup');
            if (!popup) return;
            popup.classList.toggle('minimized');
            var btn = popup.querySelector('.internal-chat-popup-minimize');
            if (btn) {
                btn.title = popup.classList.contains('minimized') ? (LANG === 'fa' ? 'باز کردن' : 'Expand') : (LANG === 'fa' ? 'کوچک‌سازی' : 'Minimize');
                var svg = btn.querySelector('svg');
                if (svg) svg.innerHTML = popup.classList.contains('minimized') ? '<path d="M19 12H5M12 19l-7-7 7-7"/>' : '<path d="M5 12h14"/>';
            }
        }
        function handlePopupChatKeydown(e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendInternalMessageFromPopup(); }
        }
        function insertPopupQuickReply(text) {
            var inp = document.getElementById('internalChatPopupInput');
            if (inp) { inp.value = (inp.value ? inp.value + ' ' : '') + text; inp.focus(); }
        }
        function openInternalChatFromPopup() {
            var tid = currentInternalThreadId;
            closeInternalChatPopup();
            showPage('internal-chat');
            setTimeout(function() { openInternalThread(tid); loadInternalThreads(); loadInternalUsers(); }, 100);
        }
        function appendInternalMessageToPopup(m) {
            var list = document.getElementById('internalChatPopupMessages');
            if (!list || !currentInternalThreadId) return;
            var emptyEl = list.querySelector('.empty');
            if (emptyEl) emptyEl.remove();
            var quickEl = document.getElementById('internalChatPopupQuickReplies');
            if (quickEl) { quickEl.style.display = 'none'; quickEl.innerHTML = ''; }
            var me = (currentUser && currentUser.id) || '';
            var isOut = m.fromUserId === me;
            var att = (m.attachments && m.attachments.length) ? m.attachments.map(renderInternalAttachment).join('') : '';
            var avatarHtml = internalMsgAvatarHtml(m.fromUser);
            var timeStr = (m.fromUser && m.fromUser.name ? m.fromUser.name : '') + ' · ' + (m.createdAt ? fmtTZ(m.createdAt, 'time') : '');
            var html = '<div class="msg ' + (isOut ? 'out' : 'in') + '">' + avatarHtml + '<div class="msg-body"><div>' + escapeHtml(m.content || '') + '</div>' + att + '<div class="time">' + escapeHtml(timeStr) + '</div></div></div>';
            list.insertAdjacentHTML('beforeend', html);
            list.scrollTop = list.scrollHeight;
        }
        async function loadInternalMessagesForPopup(threadId) {
            var list = document.getElementById('internalChatPopupMessages');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var res = await apiFetch('/api/internal/threads/' + threadId + '/messages');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('loading_err') + '</div>'; return; }
            var data = (res.data && res.data.data) || [];
            var me = (currentUser && currentUser.id) || '';
            var quickEl = document.getElementById('internalChatPopupQuickReplies');
            if (quickEl) {
                if (data.length === 0) {
                    quickEl.style.display = 'flex';
                    var chips = [{ key: 'quick_reply_hi', text: LANG === 'fa' ? 'سلام' : 'Hi' }, { key: 'quick_reply_gotit', text: LANG === 'fa' ? 'متوجه شدم' : 'Got it' }, { key: 'quick_reply_later', text: LANG === 'fa' ? 'بعداً پاسخ می‌دهم' : 'Will reply later' }, { key: 'quick_reply_checking', text: LANG === 'fa' ? 'در حال بررسی' : 'Checking' }];
                    quickEl.innerHTML = chips.map(function(c) { var s = String(c.text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); return '<button type="button" class="internal-quick-reply-chip" data-reply="' + s + '">' + t(c.key) + '</button>'; }).join('');
                    quickEl.querySelectorAll('.internal-quick-reply-chip').forEach(function(btn) { btn.onclick = function() { insertPopupQuickReply(this.getAttribute('data-reply') || ''); }; });
                } else { quickEl.style.display = 'none'; quickEl.innerHTML = ''; }
            }
            list.innerHTML = data.length === 0 ? '<div class="empty internal-chat-empty-state"><span class="empty-icon">💬</span><p>' + t('start_chat_hint') + '</p></div>' : data.map(function(m) {
                var isOut = m.fromUserId === me;
                var att = (m.attachments && m.attachments.length) ? m.attachments.map(renderInternalAttachment).join('') : '';
                var avatarHtml = internalMsgAvatarHtml(m.fromUser);
                var timeStr = (m.fromUser && m.fromUser.name ? m.fromUser.name : '') + ' · ' + (m.createdAt ? fmtTZ(m.createdAt, 'time') : '');
                return '<div class="msg ' + (isOut ? 'out' : 'in') + '">' + avatarHtml + '<div class="msg-body"><div>' + escapeHtml(m.content || '') + '</div>' + att + '<div class="time">' + escapeHtml(timeStr) + '</div></div></div>';
            }).join('');
            list.scrollTop = list.scrollHeight;
        }
        async function sendInternalMessageFromPopup() {
            if (!currentInternalThreadId) return;
            var inp = document.getElementById('internalChatPopupInput');
            var fileInput = document.getElementById('internalChatPopupFile');
            var content = (inp && inp.value) ? inp.value.trim() : '';
            var attachments = [];
            if (fileInput && fileInput.files && fileInput.files[0]) {
                var formData = new FormData();
                formData.append('file', fileInput.files[0]);
                var up = await fetch(API + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
                var upData = await up.json();
                if (upData.url) attachments.push({ url: upData.url, name: upData.name || t('file'), size: upData.size, allowDownload: true });
            }
            if (!content && attachments.length === 0) { toast(t('enter_text_or_file'), true); return; }
            var res = await apiFetch('/api/internal/threads/' + currentInternalThreadId + '/messages', { method: 'POST', body: JSON.stringify({ content: content || '(پیوست)', attachments: attachments }) });
            if (res.needLogin) return;
            if (res.ok) {
                if (inp) inp.value = '';
                if (fileInput) fileInput.value = '';
                var fileLabel = document.getElementById('internalChatPopupFileLabel');
                if (fileLabel) { fileLabel.textContent = ''; fileLabel.style.display = 'none'; }
                var msg = res.data;
                if (msg) { msg.fromUserId = msg.fromUserId || (msg.fromUser && msg.fromUser.id); appendInternalMessageToPopup(msg); }
                loadInternalThreads();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        var qrRefreshInterval = null;
        var qrRetryTimeout = null;
        var isWhatsappPolling = false;
        var WHATSAPP_POLL_MS = 4000;
        var WHATSAPP_QR_RETRY_MS = 3000;

        function setWhatsappStatusBadge(status) {
            var badge = document.getElementById('whatsappStatusBadge');
            if (!badge) return;
            badge.className = 'whatsapp-status-badge whatsapp-status-' + status;
            if (status === 'connected') badge.textContent = LANG === 'fa' ? 'متصل' : 'Connected';
            else if (status === 'starting') badge.textContent = LANG === 'fa' ? 'در حال اتصال...' : 'Connecting...';
            else if (status === 'checking') badge.textContent = LANG === 'fa' ? 'در حال بررسی...' : 'Checking...';
            else badge.textContent = LANG === 'fa' ? 'قطع' : 'Disconnected';
        }

        async function loadWhatsappStatus(isInitial) {
            var st = document.getElementById('gatewayStatus');
            var qrBox = document.getElementById('qrBox');
            var qrUnavailable = document.getElementById('whatsappQrUnavailable');
            var qrWaitingMsg = document.getElementById('qrWaitingMsg');
            var qrImg = document.getElementById('qrImg');
            var btn = document.getElementById('btnStartGateway');
            var btnStartClient = document.getElementById('btnStartWhatsApp');
            var btnDisconnect = document.getElementById('btnDisconnectWhatsApp');
            var lastCard = document.getElementById('whatsappLastConnectionCard');
            if (qrRetryTimeout) { clearTimeout(qrRetryTimeout); qrRetryTimeout = null; }
            if (qrRefreshInterval) { clearInterval(qrRefreshInterval); qrRefreshInterval = null; }
            if (isInitial !== false) {
                st.className = 'whatsapp-status-line empty';
                st.textContent = t('whatsapp_checking');
                setWhatsappStatusBadge('checking');
                if (btn) btn.style.display = 'none';
                if (btnStartClient) btnStartClient.style.display = 'none';
                if (btnDisconnect) btnDisconnect.disabled = true;
                qrBox.style.display = 'none';
                if (qrUnavailable) qrUnavailable.style.display = 'none';
                if (qrWaitingMsg) qrWaitingMsg.style.display = 'none';
                var af = document.getElementById('whatsappAuthFailure');
                if (af) { af.style.display = 'none'; af.textContent = ''; }
            }
            var ping;
            try { ping = await apiFetch('/api/ping', { auth: false }); } catch (e) { ping = { needLogin: true }; }
            if (ping.needLogin || (ping.data && !ping.data.ok)) {
                st.className = 'whatsapp-status-line empty';
                st.textContent = t('whatsapp_server_err');
                setWhatsappStatusBadge('disconnected');
                return;
            }
            var res = await apiFetch('/api/gateway/status');
            if (res.needLogin) return;
            var data = res.data;
            if (data && data.error) {
                st.className = 'whatsapp-status-line empty';
                st.textContent = t('whatsapp_gateway_off');
                setWhatsappStatusBadge('disconnected');
                if (btn) { btn.style.display = 'inline-block'; btn.textContent = t('whatsapp_start_btn'); }
                if (qrUnavailable) qrUnavailable.style.display = 'none';
                return;
            }
            st.className = 'whatsapp-status-line';
            var phase = data && data.phase;
            var statusLabel = data && data.whatsapp ? t('whatsapp_connected') : (phase === 'authenticated' ? t('whatsapp_syncing') : (data && data.starting ? (LANG === 'fa' ? 'در حال اتصال...' : 'Connecting...') : t('whatsapp_disconnected')));
            var statusText = t('whatsapp_status') + ' ' + statusLabel + ' | ' + t('redis') + ': ' + (data && data.redis ? t('active') : t('inactive'));
            st.textContent = statusText;
            var authFailureEl = document.getElementById('whatsappAuthFailure');
            if (authFailureEl) {
                if (data && data.authFailure) {
                    authFailureEl.style.display = 'block';
                    authFailureEl.textContent = (LANG === 'fa' ? 'خطای احراز هویت: ' : 'Auth error: ') + data.authFailure;
                } else {
                    authFailureEl.style.display = 'none';
                    authFailureEl.textContent = '';
                }
            }
            if (data && data.whatsapp) {
                isWhatsappPolling = false;
                setWhatsappStatusBadge('connected');
                qrBox.style.display = 'none';
                if (qrUnavailable) qrUnavailable.style.display = 'none';
                if (qrWaitingMsg) qrWaitingMsg.style.display = 'none';
                if (authFailureEl) authFailureEl.style.display = 'none';
                if (btnDisconnect) { btnDisconnect.textContent = t('whatsapp_disconnect_btn'); btnDisconnect.disabled = false; }
                if (lastCard) {
                    lastCard.style.display = 'block';
                    var lastStatus = document.getElementById('whatsappLastStatus');
                    var lastNumber = document.getElementById('whatsappLastNumber');
                    var lastResult = document.getElementById('whatsappLastResult');
                    if (lastStatus) lastStatus.textContent = t('whatsapp_connected');
                    if (lastNumber) lastNumber.textContent = (data.number || data.pushname) || '—';
                    if (lastResult) lastResult.textContent = LANG === 'fa' ? 'موفق' : 'Success';
                }
                loadWhatsappDeptRouting();
                loadWhatsappUnassigned();
                return;
            }
            setWhatsappStatusBadge(data && data.starting ? 'starting' : 'disconnected');
            if (lastCard) lastCard.style.display = 'none';
            if (btnDisconnect) btnDisconnect.disabled = true;
            loadWhatsappDeptRouting();
            var qrRes = await apiFetch('/api/gateway/qr');
            if (qrRes.needLogin) return;
            var qrData = qrRes.data;
            if (qrData && qrData.qr) {
                qrImg.src = qrData.qr;
                qrBox.style.display = 'block';
                if (qrUnavailable) qrUnavailable.style.display = 'none';
                if (phase === 'authenticated' && qrWaitingMsg) { qrWaitingMsg.style.display = 'block'; qrWaitingMsg.textContent = t('whatsapp_syncing'); } else if (qrWaitingMsg) qrWaitingMsg.style.display = 'none';
                isWhatsappPolling = true;
                var pollMs = 2000;
                qrRefreshInterval = setInterval(function() { loadWhatsappStatus(false); }, pollMs);
            } else {
                qrBox.style.display = 'none';
                if (qrWaitingMsg) qrWaitingMsg.style.display = 'none';
                if (btnStartClient) { btnStartClient.style.display = 'inline-block'; btnStartClient.textContent = t('whatsapp_start_client_btn'); }
                if (data && data.starting && qrUnavailable) {
                    qrUnavailable.style.display = 'block';
                    qrRetryTimeout = setTimeout(function() { loadWhatsappStatus(false); }, WHATSAPP_QR_RETRY_MS);
                } else if (qrUnavailable) qrUnavailable.style.display = 'none';
            }
        }

        async function startGateway() {
            var res = await apiFetch('/api/admin/start-gateway', { method: 'POST' });
            if (res.needLogin) return;
            var msg = (res.data && (res.data.message || res.data.error)) || t('done_msg');
            toast(msg);
            if (res.ok) setTimeout(loadWhatsappStatus, 3000);
        }
        async function startWhatsAppClient() {
            var res = await apiFetch('/api/gateway/start', { method: 'POST' });
            if (res.needLogin) return;
            var msg = (res.data && (res.data.message || res.data.error)) || t('done_msg');
            toast(msg);
            if (res.ok) setTimeout(loadWhatsappStatus, 3000);
        }
        async function disconnectWhatsApp() {
            var btnDisconnect = document.getElementById('btnDisconnectWhatsApp');
            if (btnDisconnect && btnDisconnect.disabled) return;
            if (btnDisconnect) btnDisconnect.disabled = true;
            toast(LANG === 'fa' ? 'در حال قطع اتصال...' : 'Disconnecting...');
            try {
                var res = await apiFetch('/api/gateway/stop', { method: 'POST', body: JSON.stringify({}) });
                if (res.needLogin) { if (btnDisconnect) btnDisconnect.disabled = false; return; }
                var msg = res.ok ? t('done_msg') : ((res.data && res.data.error) || res.error || t('err_generic'));
                toast(msg, !res.ok);
                if (res.ok) setTimeout(loadWhatsappStatus, 1500);
            } catch (e) {
                toast((e && e.message) || t('err_generic'), true);
            }
            if (btnDisconnect) btnDisconnect.disabled = false;
        }
        async function loadWhatsappWelcomeConfig() {
            var ta = document.getElementById('whatsappWelcomeMessage');
            var cb = document.getElementById('whatsappWelcomeEnabled');
            var alertIn = document.getElementById('whatsappAlertMinutes');
            var escalateIn = document.getElementById('whatsappEscalateMinutes');
            var deptSel = document.getElementById('whatsappEscalationDept');
            var res = await apiFetch('/api/whatsapp/config');
            if (res.needLogin) return;
            if (res.ok && res.data) {
                if (ta) ta.value = res.data.welcomeMessage || '';
                if (cb) cb.checked = res.data.welcomeEnabled !== false;
                if (alertIn) alertIn.value = res.data.alertUnansweredAfterMinutes ?? 5;
                if (escalateIn) escalateIn.value = res.data.escalateUnansweredAfterMinutes ?? 15;
                if (deptSel) {
                    var deptRes = await apiFetch('/api/departments');
                    if (deptRes.ok && deptRes.data && deptRes.data.data) {
                        var opts = deptRes.data.data.filter(function(d){ return d.isActive !== false; }).map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name || '') + '</option>'; });
                        deptSel.innerHTML = '<option value="">' + (LANG === 'fa' ? 'پشتیبانی (پیش‌فرض)' : 'Support (default)') + '</option>' + opts.join('');
                        deptSel.value = res.data.escalationDepartmentId || '';
                    }
                }
            }
        }
        async function saveWhatsappUnansweredConfig() {
            var alertIn = document.getElementById('whatsappAlertMinutes');
            var escalateIn = document.getElementById('whatsappEscalateMinutes');
            var deptSel = document.getElementById('whatsappEscalationDept');
            if (!alertIn || !escalateIn) return;
            var res = await apiFetch('/api/whatsapp/config', {
                method: 'PUT',
                body: JSON.stringify({
                    alertUnansweredAfterMinutes: parseInt(alertIn.value) || 5,
                    escalateUnansweredAfterMinutes: parseInt(escalateIn.value) || 15,
                    escalationDepartmentId: (deptSel && deptSel.value) || null
                })
            });
            if (res.needLogin) return;
            toast(res.ok ? t('done_msg') : (res.data && res.data.error) || t('err_generic'));
        }
        async function saveWhatsappWelcomeConfig() {
            var ta = document.getElementById('whatsappWelcomeMessage');
            var cb = document.getElementById('whatsappWelcomeEnabled');
            if (!ta || !cb) return;
            var res = await apiFetch('/api/whatsapp/config', {
                method: 'PUT',
                body: JSON.stringify({ welcomeMessage: ta.value.trim(), welcomeEnabled: cb.checked })
            });
            if (res.needLogin) return;
            toast(res.ok ? t('done_msg') : (res.data && res.data.error) || t('err_generic'));
        }
        async function loadWhatsappDeptRouting() {
            var box = document.getElementById('whatsappDeptRouting');
            var list = document.getElementById('whatsappDeptList');
            if (!box || !list) return;
            box.style.display = 'block';
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var res = await apiFetch('/api/departments');
            if (res.needLogin) return;
            if (!res.ok || !res.data || !res.data.data) { list.innerHTML = '<div class="empty">' + t('err_generic') + '</div>'; return; }
            var depts = res.data.data.filter(function(d){ return d.isActive !== false; });
            if (depts.length === 0) { list.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'دپارتمانی تعریف نشده' : 'No departments') + '</div>'; return; }
            list.innerHTML = depts.map(function(d) {
                var kw = (d.keywords || '').trim() || '—';
                var def = d.isDefault ? ' <span class="badge" style="font-size:0.7rem;">' + (LANG === 'fa' ? 'پیش‌فرض' : 'Default') + '</span>' : '';
                return '<div class="list-item" style="padding:10px 14px;"><span class="name">' + escapeHtml(d.name || '') + def + '</span><div class="meta" style="font-size:0.85rem; margin-top:4px;">' + (LANG === 'fa' ? 'کلمات کلیدی: ' : 'Keywords: ') + escapeHtml(kw) + '</div></div>';
            }).join('');
        }
        async function loadWhatsappUnassigned() {
            var box = document.getElementById('whatsappUnassignedBox');
            var list = document.getElementById('whatsappUnassignedList');
            if (!box || !list) return;
            var res = await apiFetch('/api/conversations?status=open&unassigned=1&limit=15');
            if (res.needLogin) return;
            if (!res.ok || !res.data) return;
            var convs = res.data.data || [];
            if (convs.length === 0) { box.style.display = 'none'; return; }
            box.style.display = 'block';
            list.innerHTML = convs.map(function(c) {
                var name = (c.customer && (c.customer.name || c.customer.phone)) || (LANG === 'fa' ? 'مشتری' : 'Customer');
                var preview = (c.lastMessagePreview || '').slice(0, 50);
                if (preview.length >= 50) preview += '…';
                return '<div class="list-item" data-convid="' + c.id + '" onclick="openChat(\'' + c.id + '\', \'' + (name || '').replace(/'/g, "\\'") + '\', \'\'); showPage(\'conversations\');" style="cursor:pointer;"><span class="name">' + escapeHtml(name) + '</span><div class="meta">' + escapeHtml(preview) + '</div></div>';
            }).join('');
        }

        async function loadDepartments() {
            var list = document.getElementById('deptList');
            setLoading('deptList', 4);
            var canEdit = currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin' || currentUser.role === 'manager' || (currentUser.permissions && currentUser.permissions.manage_users));
            var q = canEdit ? '?all=1' : '';
            var res = await apiFetch('/api/departments' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            var data = res.data;
            if (!data.data || data.data.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">🏢</span><br>' + t('empty_dept') + '</div>'; return; }
            window._deptListData = data.data;
            list.innerHTML = data.data.map(function(d, idx) {
                var branchName = (d.branch && d.branch.name) ? d.branch.name : '';
                var color = (d.color || '#10b981').replace(/^#?/, '#');
                var kw = (d.keywords || '').trim();
                if (kw.length > 120) kw = kw.slice(0, 117) + '…';
                var meta = [d.description, branchName].filter(Boolean).join(' · ');
                var inactive = d.isActive === false;
                var defBadge = d.isDefault ? '<span class="dept-card-badge">' + (LANG === 'fa' ? 'پیش‌فرض' : 'Default') + '</span>' : '';
                var editBtn = canEdit ? '<button type="button" class="btn-secondary dept-edit-btn" onclick="editDepartment(' + idx + ')">' + t('edit') + '</button>' : '';
                var metaHtml = meta ? '<div class="dept-card-meta">' + escapeHtml(meta) + '</div>' : '';
                var kwHtml = kw ? '<div class="dept-card-keywords">' + escapeHtml(kw) + '</div>' : '';
                return '<div class="dept-card' + (inactive ? ' dept-inactive' : '') + '" data-id="' + d.id + '"><div class="dept-card-header"><div class="dept-card-title"><span class="dept-card-color" style="background:' + color + ';"></span><span class="dept-card-name">' + defBadge + escapeHtml(d.name || '') + '</span></div><div class="dept-card-actions">' + editBtn + '</div></div>' + metaHtml + kwHtml + '</div>';
            }).join('');
        }

        async function loadBranchesForSelect(selectIds) {
            var res = await apiFetch('/api/branches');
            if (res.needLogin || !res.ok) return;
            var arr = (res.data && res.data.data) || [];
            var opt = '<option value="">' + t('no_branch') + '</option>' + arr.map(function(b) { return '<option value="' + b.id + '">' + escapeHtml(b.name + (b.city ? ' - ' + b.city : '') + (b.country ? ' (' + b.country + ')' : '')) + '</option>'; }).join('');
            var allBranchOpt = '<option value="">' + t('all_branches') + '</option>' + arr.map(function(b) { return '<option value="' + b.id + '">' + escapeHtml(b.name + (b.city ? ' - ' + b.city : '')) + '</option>'; }).join('');
            (selectIds || ['userBranch', 'deptBranch', 'supBranch', 'supActBranch']).forEach(function(id) {
                var el = document.getElementById(id);
                if (el) { el.innerHTML = (id === 'supBranch' || id === 'supActBranch' || id === 'convFilterBranch') ? allBranchOpt : opt; }
            });
        }

        async function loadBranches() {
            var list = document.getElementById('branchList');
            if (!list) return;
            setLoading('branchList', 4);
            var res = await apiFetch('/api/branches');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            var data = res.data;
            if (!data.data || data.data.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">🏢</span><br>' + t('empty_branches') + '</div>'; return; }
            var role = (currentUser && currentUser.role) || '';
            var canEdit = (role === 'owner' || role === 'admin');
            list.innerHTML = data.data.map(function(b) {
                var loc = [b.city, b.country].filter(Boolean).join(' — ');
                var name = (b.name || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                var city = (b.city || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                var country = (b.country || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                var editBtn = canEdit ? '<button type="button" class="btn-secondary branch-edit-btn" onclick="var c=this.closest(\'.branch-card\'); editBranch(c.getAttribute(\'data-id\'), c.getAttribute(\'data-name\')||\'\', c.getAttribute(\'data-city\')||\'\', c.getAttribute(\'data-country\')||\'\')">' + t('edit') + '</button>' : '';
                var iconHtml = '<span class="branch-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><use href="#icon-building-2"/></svg></span>';
                return '<div class="branch-card" data-id="' + b.id + '" data-name="' + name + '" data-city="' + city + '" data-country="' + country + '"><div class="branch-card-header"><div class="branch-card-title">' + iconHtml + '<span class="branch-card-name">' + escapeHtml(b.name) + '</span></div><div class="branch-card-actions">' + editBtn + '</div></div>' + (loc ? '<div class="branch-card-meta">' + escapeHtml(loc) + '</div>' : '') + '</div>';
            }).join('');
        }


        async function addBranch() {
            var id = window._editingBranchId;
            var name = document.getElementById('branchName').value.trim();
            if (!name) { toast(t('branch_name_required'), true); return; }
            var city = document.getElementById('branchCity').value.trim();
            var country = document.getElementById('branchCountry').value.trim();
            var res;
            if (id) {
                res = await apiFetch('/api/branches/' + id, { method: 'PUT', body: JSON.stringify({ name: name, city: city || null, country: country || null }) });
                window._editingBranchId = null;
            } else {
                res = await apiFetch('/api/branches', { method: 'POST', body: JSON.stringify({ name: name, city: city || null, country: country || null }) });
            }
            if (res.needLogin) return;
            if (res.ok) {
                document.getElementById('branchName').value = '';
                document.getElementById('branchCity').value = '';
                document.getElementById('branchCountry').value = '';
                var btnSave = document.getElementById('btnBranchSave');
                var btnCancel = document.getElementById('btnBranchCancel');
                if (btnSave) btnSave.textContent = t('add_branch');
                if (btnCancel) btnCancel.style.display = 'none';
                toast(id ? t('toast_branch_updated') : t('toast_branch_added'));
                loadBranches();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        function editBranch(id, name, city, country) {
            document.getElementById('branchName').value = (name || '').replace(/&quot;/g, '"').replace(/&lt;/g, '<');
            document.getElementById('branchCity').value = (city || '').replace(/&quot;/g, '"').replace(/&lt;/g, '<');
            document.getElementById('branchCountry').value = (country || '').replace(/&quot;/g, '"').replace(/&lt;/g, '<');
            window._editingBranchId = id;
            var btnSave = document.getElementById('btnBranchSave');
            var btnCancel = document.getElementById('btnBranchCancel');
            if (btnSave) btnSave.textContent = t('edit');
            if (btnCancel) btnCancel.style.display = 'inline-flex';
            toast(t('edit_branch_hint'), false);
        }

        function cancelBranchEdit() {
            window._editingBranchId = null;
            document.getElementById('branchName').value = '';
            document.getElementById('branchCity').value = '';
            document.getElementById('branchCountry').value = '';
            var btnSave = document.getElementById('btnBranchSave');
            var btnCancel = document.getElementById('btnBranchCancel');
            if (btnSave) btnSave.textContent = t('add_branch');
            if (btnCancel) btnCancel.style.display = 'none';
        }

        async function loadSupervisionFiltersInit() {
            await loadBranchesForSelect(['supBranch', 'supActBranch']);
            var deptRes = await apiFetch('/api/departments?all=1');
            if (deptRes.ok && deptRes.data && deptRes.data.data) {
                var sel = document.getElementById('supDept');
                if (sel) sel.innerHTML = '<option value="">' + t('all_departments') + '</option>' + deptRes.data.data.map(function(d){ return '<option value="' + d.id + '">' + escapeHtml(d.name || '') + '</option>'; }).join('');
            }
            var userRes = await apiFetch('/api/users');
            if (userRes.ok && userRes.data && userRes.data.data) {
                var anyOpt = '<option value="">' + t('any_assignee') + '</option>' + userRes.data.data.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email || '') + '</option>'; }).join('');
                var allOpt = '<option value="">' + t('all_users') + '</option>' + userRes.data.data.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email || '') + '</option>'; }).join('');
                var u1 = document.getElementById('supUser'); if (u1) u1.innerHTML = anyOpt;
                var u2 = document.getElementById('supActUser'); if (u2) u2.innerHTML = allOpt;
                var u3 = document.getElementById('supIntChatUser'); if (u3) u3.innerHTML = allOpt;
            }
        }

        async function loadSupervisionPerformance() {
            var el = document.getElementById('supPerformanceContent');
            if (!el) return;
            el.innerHTML = '<div class="loading-skeleton loading-row"></div><div class="loading-skeleton loading-row"></div>';
            el.className = 'empty';
            var res = await apiFetch('/api/supervision/performance');
            if (res.needLogin) return;
            if (!res.ok) { el.innerHTML = t('err_generic') + ': ' + (res.data && res.data.error ? res.data.error : ''); return; }
            var d = res.data;
            var summary = d.summary || {};
            var html = '<div class="sup-stat-cards stat-cards">';
            html += '<div class="stat-card"><div class="val">' + (summary.conversationCount || 0) + '</div><div class="label">' + t('total_conversations') + '</div></div>';
            html += '<div class="stat-card"><div class="val">' + (summary.messageCount || 0) + '</div><div class="label">' + t('outgoing_messages') + '</div></div>';
            html += '<div class="stat-card stat-card-accent"><div class="val">' + (summary.openCount || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'باز' : 'Open') + '</div></div>';
            html += '<div class="stat-card"><div class="val">' + (summary.pendingCount || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'در انتظار' : 'Pending') + '</div></div>';
            html += '<div class="stat-card"><div class="val">' + (summary.unassignedCount || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'بدون تخصیص' : 'Unassigned') + '</div></div>';
            html += '<div class="stat-card"><div class="val">' + (summary.todayMessageCount || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'پیام امروز' : 'Today') + '</div></div>';
            html += '</div>';
            if (d.branches && d.branches.length) {
                html += '<h3 class="sup-section-title">' + t('sup_by_branch') + '</h3><div class="sup-branch-cards">';
                d.branches.forEach(function(b) { html += '<div class="sup-branch-card"><div class="sup-branch-name">' + escapeHtml(b.name) + '</div><div class="sup-branch-meta">' + escapeHtml((b.city || '') + (b.city && b.country ? ' \u00B7 ' : '') + (b.country || '')) + '</div><div class="sup-branch-count">' + (b.conversationCount || 0) + '</div></div>'; });
                html += '</div>';
            }
            if (d.users && d.users.length) {
                html += '<h3 class="sup-section-title">' + t('sup_by_user') + '</h3><div class="sup-user-cards">';
                d.users.forEach(function(u) { var bn = (u.branch && u.branch.name) ? u.branch.name : ''; html += '<div class="sup-user-card" data-user-id="' + escapeHtml(u.id) + '" onclick="openStaffDetailModal(this.getAttribute(\'data-user-id\'))" title="' + (LANG === 'fa' ? 'جزئیات فعالیت' : 'Activity detail') + '"><div class="sup-user-name">' + escapeHtml(u.name || u.email || '') + '</div><div class="sup-user-meta">' + (u.branch && u.branch.name ? escapeHtml(u.branch.name) : '�') + '</div><div class="sup-user-count">' + (u.outgoingMessageCount || 0) + '</div></div>'; });
                html += '</div>';
            }
            el.className = '';
            el.innerHTML = html || '<div class="empty">' + t('no_data') + '</div>';
        }

        async function loadSupervisionConversations() {
            var list = document.getElementById('supConvList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var branchId = document.getElementById('supBranch') && document.getElementById('supBranch').value ? document.getElementById('supBranch').value : '';
            var deptId = document.getElementById('supDept') && document.getElementById('supDept').value ? document.getElementById('supDept').value : '';
            var userId = document.getElementById('supUser') && document.getElementById('supUser').value ? document.getElementById('supUser').value : '';
            var status = document.getElementById('supStatus') && document.getElementById('supStatus').value ? document.getElementById('supStatus').value : '';
            var unassigned = document.getElementById('supUnassigned') && document.getElementById('supUnassigned').checked;
            var q = '?limit=50';
            if (branchId) q += '&branchId=' + encodeURIComponent(branchId);
            if (deptId) q += '&departmentId=' + encodeURIComponent(deptId);
            if (userId) q += '&userId=' + encodeURIComponent(userId);
            if (status) q += '&status=' + encodeURIComponent(status);
            if (unassigned) q += '&unassigned=1';
            var res = await apiFetch('/api/supervision/conversations' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            var data = res.data.data || [];
            var total = res.data.total || data.length;
            if (data.length === 0) { list.innerHTML = '<div class="empty">' + t('empty_conv') + '</div>'; return; }
            var dash = '\u2014';
            list.innerHTML = '<div class="sup-conv-count">' + total + ' ' + (LANG === 'fa' ? 'مکالمه' : 'conversations') + '</div><table class="sup-table sup-responsive-table sup-conv-table"><thead><tr><th>' + t('th_customer') + '</th><th>' + t('th_branch') + '</th><th>' + t('th_dept') + '</th><th>' + t('th_assignee') + '</th><th>' + t('th_status') + '</th><th>' + (LANG === 'fa' ? 'آخرین پیام' : 'Last') + '</th></tr></thead><tbody>' + data.map(function(c) {
                var cust = c.customer || {};
                var branch = c.branch ? c.branch.name : '�';
                var dept = c.department ? c.department.name : '�';
                var assignee = userDisplay(c.assignee) || '�';
                var cl = [t('th_customer'),t('th_branch'),t('th_dept'),t('th_assignee'),t('th_status'),(LANG === 'fa' ? 'آخرین پیام' : 'Last')]; var lm = c.lastMessageAt ? fmtTZ(c.lastMessageAt, 'datetime') : dash; return '<tr><td data-label="'+cl[0]+'">' + escapeHtml(cust.name || cust.phone || '�') + '</td><td data-label="'+cl[1]+'">' + escapeHtml(branch) + '</td><td data-label="'+cl[2]+'">' + escapeHtml(dept) + '</td><td data-label="'+cl[3]+'">' + escapeHtml(assignee) + '</td><td data-label="'+cl[4]+'">' + (c.status || '�') + '</td><td data-label="'+cl[5]+'">' + lm + '</td></tr>';
            }).join('') + '</tbody></table>';
        }

        async function loadStaffActivity() {
            var onlineList = document.getElementById('onlineStaffList');
            var loginsList = document.getElementById('loginsList');
            var countEl = document.getElementById('onlineCount');
            var loginsTodayEl = document.getElementById('loginsTodayCount');
            var loginsTotalEl = document.getElementById('loginsTotalCount');
            var updatedEl = document.getElementById('staffActivityUpdated');
            if (onlineList) onlineList.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            if (loginsList) loginsList.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var onlineRes = await apiFetch('/api/supervision/online');
            if (onlineRes.needLogin) return;
            if (onlineRes.ok && onlineRes.data && onlineRes.data.data) {
                var users = onlineRes.data.data;
                if (countEl) countEl.textContent = users.length;
                if (onlineList) {
                    if (users.length === 0) onlineList.innerHTML = '<div class="empty">' + t('no_staff_online') + '</div>';
                    else onlineList.innerHTML = '<table class="sup-table staff-table"><thead><tr><th>' + t('label_name') + '</th><th>' + t('th_email') + '</th><th>' + t('th_branch') + '</th><th>' + t('th_status') + '</th><th>' + t('th_last_login') + '</th></tr></thead><tbody>' + users.map(function(u) {
                        var statusClass = (u.status || 'offline').toLowerCase();
                        var statusLabel = { online: t('status_online'), away: t('status_away'), busy: t('status_busy'), offline: t('status_offline') }[statusClass] || u.status;
                        var lastLogin = u.lastLoginAt ? fmtTZ(u.lastLoginAt, 'datetime') : '�';
                        var branchName = (u.branch && u.branch.name) ? u.branch.name : '�';
                        var lbl = [t('label_name'),t('th_email'),t('th_branch'),t('th_status'),t('th_last_login')]; return '<tr class="staff-row" data-user-id="' + escapeHtml(u.id || '') + '" onclick="var uid=this.getAttribute(\'data-user-id\');if(uid&&event.target.tagName!==\'A\')openStaffDetailModal(uid)" style="cursor:pointer"><td data-label="'+lbl[0]+'">' + escapeHtml(userDisplay(u)) + '</td><td data-label="'+lbl[1]+'">' + escapeHtml(u.email || '\u2014') + '</td><td data-label="'+lbl[2]+'">' + escapeHtml(branchName) + '</td><td data-label="'+lbl[3]+'"><span class="status-dot ' + statusClass + '"></span>' + statusLabel + '</td><td data-label="'+lbl[4]+'">' + lastLogin + '</td></tr>';
                    }).join('') + '</tbody></table>';
                }
            } else { if (onlineList) onlineList.innerHTML = '<div class="empty">' + t('loading_err') + '</div>'; if (countEl) countEl.textContent = '0'; }
            var loginsRes = await apiFetch('/api/supervision/logins?limit=50');
            if (loginsRes.needLogin) return;
            if (loginsRes.ok && loginsRes.data && loginsRes.data.data) {
                var rows = loginsRes.data.data;
                var todayStr = fmtTZ(new Date(), 'date');
                function isToday(d) { try { return d && fmtTZ(d, 'date') === todayStr; } catch(e) { return false; } }
                var loginsToday = rows.filter(function(r) { return isToday(r.createdAt); }).length;
                if (loginsTodayEl) loginsTodayEl.textContent = loginsToday;
                if (loginsTotalEl) loginsTotalEl.textContent = rows.length;
                if (loginsList) {
                    if (rows.length === 0) loginsList.innerHTML = '<div class="empty">' + t('empty_no_logins') + '</div>';
                    else loginsList.innerHTML = '<table class="sup-table staff-table"><thead><tr><th>' + t('th_user') + '</th><th>' + t('th_email') + '</th><th>' + t('th_branch') + '</th><th>' + t('th_login_time') + '</th><th>' + t('th_summary') + '</th></tr></thead><tbody>' + rows.map(function(r) {
                        var user = r.user || {};
                        var branch = r.branch ? r.branch.name : '�';
                        var time = r.createdAt ? fmtTZ(r.createdAt, 'datetime') : '';
                        var uid = r.userId || (user && user.id) || '';
                        var rowAttrs = uid ? ' class="staff-row" data-user-id="' + escapeHtml(uid) + '" onclick="openStaffDetailModal(this.getAttribute(\'data-user-id\'))" style="cursor:pointer"' : '';
                        var ll = [t('th_user'),t('th_email'),t('th_branch'),t('th_login_time'),t('th_summary')]; return '<tr' + rowAttrs + '><td data-label="'+ll[0]+'">' + escapeHtml(userDisplay(user)) + '</td><td data-label="'+ll[1]+'">' + escapeHtml(user.email || '\u2014') + '</td><td data-label="'+ll[2]+'">' + escapeHtml(branch) + '</td><td data-label="'+ll[3]+'">' + time + '</td><td data-label="'+ll[4]+'">' + escapeHtml(r.summary || '') + '</td></tr>';
                    }).join('') + '</tbody></table>';
                }
            } else { if (loginsList) loginsList.innerHTML = '<div class="empty">' + t('login_err_load') + '</div>'; if (loginsTodayEl) loginsTodayEl.textContent = '0'; if (loginsTotalEl) loginsTotalEl.textContent = '0'; }
            if (updatedEl) { updatedEl.style.display = 'block'; updatedEl.textContent = (LANG === 'fa' ? 'آخرین به\u200Cروزرسانی: ' : 'Last updated: ') + fmtTZ(new Date().toISOString(), 'datetime'); }
        }

        function openStaffDetailModal(userId) {
            if (!userId) return;
            var modal = document.getElementById('staffDetailModal');
            var loading = document.getElementById('staffDetailLoading');
            var content = document.getElementById('staffDetailContent');
            if (!modal || !loading || !content) return;
            modal.style.display = 'flex';
            loading.style.display = 'block';
            content.style.display = 'none';
            content.innerHTML = '';
            loadStaffDetail(userId);
        }
        function closeStaffDetailModal() {
            var modal = document.getElementById('staffDetailModal');
            if (modal) modal.style.display = 'none';
        }
        async function loadStaffDetail(userId) {
            var loading = document.getElementById('staffDetailLoading');
            var content = document.getElementById('staffDetailContent');
            if (!userId || !loading || !content) return;
            try {
                var res = await apiFetch('/api/supervision/user/' + encodeURIComponent(userId) + '/detail');
                loading.style.display = 'none';
                content.style.display = 'block';
                if (res.needLogin || !res.ok) { content.innerHTML = '<div class="empty">' + (res.data && res.data.error ? res.data.error : t('loading_err')) + '</div>'; return; }
                var d = res.data;
                var u = d.user || {};
                var s = d.stats || {};
                var actLabels = { message_sent: t('action_message_sent'), conversation_assigned: t('action_conv_assigned'), customer_note_added: (LANG === 'fa' ? 'ثبت گزارش/یادداشت' : 'Customer note') };
                var html = '<div class="staff-detail-stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:20px;">';
                html += '<div class="stat-card"><div class="val">' + (s.onlineHoursTotal || '0') + '</div><div class="label">' + (LANG === 'fa' ? 'ساعت آنلاین (کل)' : 'Hours online') + '</div></div>';
                html += '<div class="stat-card"><div class="val">' + (s.sessionsCount || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'تعداد نشست' : 'Sessions') + '</div></div>';
                html += '<div class="stat-card"><div class="val">' + (s.conversationsAssigned || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'مکالمه تخصیص‌یافته' : 'Conversations') + '</div></div>';
                html += '<div class="stat-card"><div class="val">' + (s.messagesSent || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'پیام ارسالی' : 'Messages sent') + '</div></div>';
                html += '<div class="stat-card"><div class="val">' + (s.ticketsCreated || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'تیکت ثبت‌شده' : 'Tickets created') + '</div></div>';
                html += '<div class="stat-card"><div class="val">' + (s.ticketsReplied || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'پاسخ تیکت' : 'Ticket replies') + '</div></div>';
                html += '<div class="stat-card"><div class="val">' + (s.tasksCompleted || 0) + '</div><div class="label">' + (LANG === 'fa' ? 'تسک انجام‌شده' : 'Tasks completed') + '</div></div>';
                html += '</div>';
                if (d.sessions && d.sessions.length > 0) {
                    html += '<h4 style="font-size:0.95rem;margin:16px 0 8px;">' + (LANG === 'fa' ? 'ورود و خروج' : 'Login & Logout') + '</h4>';
                    html += '<table class="sup-table"><thead><tr><th>' + (LANG === 'fa' ? 'ورود' : 'Login') + '</th><th>' + (LANG === 'fa' ? 'خروج' : 'Logout') + '</th><th>' + (LANG === 'fa' ? 'دقایق' : 'Minutes') + '</th></tr></thead><tbody>';
                    d.sessions.forEach(function(s) {
                        var login = s.loginAt ? fmtTZ(s.loginAt, 'datetime') : '\u2014';
                        var logout = s.logoutAt ? fmtTZ(s.logoutAt, 'datetime') : (LANG === 'fa' ? 'در حال حاضر' : 'Now');
                        html += '<tr><td>' + login + '</td><td>' + logout + '</td><td>' + (s.minutes || 0) + '</td></tr>';
                    });
                    html += '</tbody></table>';
                }
                if (d.conversations && d.conversations.length > 0) {
                    html += '<h4 style="font-size:0.95rem;margin:16px 0 8px;">' + (LANG === 'fa' ? 'مکالمات تخصیص‌یافته (با چه کسانی صحبت کرده)' : 'Assigned conversations (who they talked to)') + '</h4>';
                    html += '<div class="staff-conv-list" style="max-height:200px;overflow-y:auto;">';
                    d.conversations.forEach(function(c) {
                        var custName = (c.customer && (c.customer.name || c.customer.phone)) ? (c.customer.name || c.customer.phone) : (LANG === 'fa' ? 'مشتری' : 'Customer');
                        var lastMsg = c.lastMessageAt ? fmtTZ(c.lastMessageAt, 'datetime') : '';
                        var safeName = (custName || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        html += '<div class="staff-conv-item" data-convid="' + escapeHtml(c.id) + '" data-custname="' + escapeHtml(safeName) + '" onclick="var el=event.currentTarget;openChat(el.getAttribute(\'data-convid\'),el.getAttribute(\'data-custname\')||\'\',\'\');showPage(\'conversations\');closeStaffDetailModal();" style="padding:10px 12px;margin-bottom:6px;background:var(--bg-secondary);border-radius:var(--radius-sm);border:1px solid var(--border);cursor:pointer;transition:background 0.2s;"><div style="font-weight:600;">' + escapeHtml(custName) + '</div><div style="font-size:0.8rem;color:var(--text-muted);">' + lastMsg + '</div></div>';
                    });
                    html += '</div>';
                }
                if (d.recentActivities && d.recentActivities.length > 0) {
                    html += '<h4 style="font-size:0.95rem;margin:16px 0 8px;">' + (LANG === 'fa' ? 'آخرین فعالیت‌ها' : 'Recent activities') + '</h4>';
                    html += '<table class="sup-table"><thead><tr><th>' + t('th_time') + '</th><th>' + t('th_action') + '</th><th>' + t('th_summary') + '</th></tr></thead><tbody>';
                    d.recentActivities.forEach(function(a) {
                        html += '<tr><td>' + (a.createdAt ? fmtTZ(a.createdAt, 'datetime') : '') + '</td><td>' + escapeHtml(actLabels[a.action] || a.action || '') + '</td><td>' + escapeHtml(a.summary || '') + '</td></tr>';
                    });
                    html += '</tbody></table>';
                }
                if (!d.sessions || d.sessions.length === 0) { if (!d.recentActivities || d.recentActivities.length === 0) { if (!d.conversations || d.conversations.length === 0) html += '<p class="text-muted" style="font-size:0.9rem;">' + (LANG === 'fa' ? 'ورود/خروج ثبت‌شده‌ای یافت نشد. با خروج صحیح از سیستم، ساعات آنلاین دقیق‌تر محاسبه می‌شود.' : 'No login/logout records yet.') + '</p>'; } }
                content.innerHTML = html;
                var titleEl = document.getElementById('staffDetailTitle');
                if (titleEl) titleEl.textContent = (LANG === 'fa' ? 'جزئیات فعالیت: ' : 'Activity: ') + (userDisplay(u) || u.email || userId);
            } catch (e) { loading.style.display = 'none'; content.style.display = 'block'; content.innerHTML = '<div class="empty">' + (e.message || t('loading_err')) + '</div>'; }
        }

        async function loadSupervisionActivity() {
            var list = document.getElementById('supActList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var branchId = document.getElementById('supActBranch') && document.getElementById('supActBranch').value ? document.getElementById('supActBranch').value : '';
            var userId = document.getElementById('supActUser') && document.getElementById('supActUser').value ? document.getElementById('supActUser').value : '';
            var action = document.getElementById('supActAction') && document.getElementById('supActAction').value ? document.getElementById('supActAction').value : '';
            var q = '?limit=100';
            if (branchId) q += '&branchId=' + encodeURIComponent(branchId);
            if (userId) q += '&userId=' + encodeURIComponent(userId);
            if (action) q += '&action=' + encodeURIComponent(action);
            var res = await apiFetch('/api/supervision/activity' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            var data = res.data.data || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty">' + t('no_data') + '</div>'; return; }
            list.innerHTML = '<table class="sup-table sup-responsive-table"><thead><tr><th>' + t('th_time') + '</th><th>' + t('th_user') + '</th><th>' + t('th_branch') + '</th><th>' + t('th_action') + '</th><th>' + t('th_summary') + '</th></tr></thead><tbody>' + data.map(function(a) {
                var time = a.createdAt ? fmtTZ(a.createdAt, 'datetime') : '';
                var user = userDisplay(a.user) || '�';
                var branch = a.branch ? a.branch.name : '�';
                var al = [t('th_time'),t('th_user'),t('th_branch'),t('th_action'),t('th_summary')]; return '<tr><td data-label="'+al[0]+'">' + time + '</td><td data-label="'+al[1]+'">' + escapeHtml(user) + '</td><td data-label="'+al[2]+'">' + escapeHtml(branch) + '</td><td data-label="'+al[3]+'">' + escapeHtml(a.action || '') + '</td><td data-label="'+al[4]+'">' + escapeHtml(a.summary || '') + '</td></tr>';
            }).join('') + '</tbody></table>';
        }

        async function loadSupervisionInternalChats() {
            var list = document.getElementById('supIntChatList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var userId = document.getElementById('supIntChatUser') && document.getElementById('supIntChatUser').value ? document.getElementById('supIntChatUser').value : '';
            var q = '?limit=50&page=1';
            if (userId) q += '&userId=' + encodeURIComponent(userId);
            var res = await apiFetch('/api/supervision/internal-chats' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + (res.data && res.data.error ? res.data.error : t('loading_err')) + '</div>'; return; }
            var data = res.data.data || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'چت داخلی‌ای یافت نشد.' : 'No internal chats.') + '</div>'; return; }
            list.innerHTML = '<table class="sup-table sup-responsive-table"><thead><tr><th>' + (LANG === 'fa' ? 'شرکت‌کنندگان' : 'Participants') + '</th><th>' + (LANG === 'fa' ? 'آخرین پیام' : 'Last message') + '</th><th>' + (LANG === 'fa' ? 'عملیات' : 'Action') + '</th></tr></thead><tbody>' + data.map(function(t) {
                var names = (t.participants || []).map(function(p) { return p.name || p.email || ''; }).join(', ');
                var last = t.lastMessage ? (t.lastMessage.content || '').slice(0, 60) + ((t.lastMessage.content || '').length > 60 ? '\u2026' : '') : '\u2014';
                var from = t.lastMessage && t.lastMessage.fromUser ? t.lastMessage.fromUser.name || '' : '';
                return '<tr><td data-label="' + (LANG === 'fa' ? 'شرکت\u200Cکنندگان' : 'Participants') + '">' + escapeHtml(names || '\u2014') + '</td><td data-label="' + (LANG === 'fa' ? 'آخرین پیام' : 'Last') + '">' + escapeHtml(last) + (from ? ' <span class="text-muted">(' + escapeHtml(from) + ')</span>' : '') + '</td><td data-label="' + (LANG === 'fa' ? 'عملیات' : 'Action') + '"><button type="button" class="btn-secondary btn-sm" onclick="openSupInternalChatDetail(\'' + escapeHtml(t.id) + '\')">' + (LANG === 'fa' ? 'مشاهده' : 'View') + '</button></td></tr>';
            }).join('') + '</tbody></table>';
        }
        function openSupInternalChatDetail(threadId) {
            var modal = document.getElementById('supInternalChatDetailModal');
            var content = document.getElementById('supIntChatModalContent');
            var titleEl = document.getElementById('supIntChatModalTitle');
            if (!modal || !content) return;
            modal.style.display = 'flex';
            content.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            (async function() {
                var res = await apiFetch('/api/supervision/internal-chats/' + encodeURIComponent(threadId) + '/messages');
                if (res.needLogin || !res.ok) { content.innerHTML = '<div class="empty">' + (res.data && res.data.error || t('loading_err')) + '</div>'; return; }
                var messages = res.data.data || [];
                var thread = res.data.thread || {};
                var partNames = (thread.participants || []).map(function(p) { return p.name || p.email; }).join(', ');
                if (titleEl) titleEl.textContent = (LANG === 'fa' ? 'چت: ' : 'Chat: ') + (partNames || threadId);
                if (messages.length === 0) { content.innerHTML = '<div class="empty">' + (LANG === 'fa' ? 'پیامی در این گفتگو نیست.' : 'No messages.') + '</div>'; return; }
                var html = '<div class="sup-int-chat-messages" style="display:flex;flex-direction:column;gap:12px;">';
                messages.forEach(function(m) {
                    var fromName = (m.fromUser && m.fromUser.name) || (m.fromUser && m.fromUser.email) || '';
                    var att = (m.attachments && m.attachments.length) ? m.attachments.map(function(a) { return '<a href="' + escapeHtml(a.url) + '" target="_blank" rel="noopener" style="color:var(--accent);">\uD83D\uDCCE ' + escapeHtml(a.name || '') + '</a>'; }).join(' ') : '';
                    html += '<div style="padding:12px 16px;background:var(--bg-secondary);border-radius:10px;border:1px solid var(--border);"><div style="font-weight:600;margin-bottom:6px;color:var(--accent);">' + escapeHtml(fromName) + '</div><div>' + escapeHtml(m.content || '') + '</div>' + att + '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:6px;">' + (m.createdAt ? fmtTZ(m.createdAt, 'datetime') : '') + '</div></div>';
                });
                html += '</div>';
                content.innerHTML = html;
            })();
        }
        function closeSupInternalChatModal() {
            var modal = document.getElementById('supInternalChatDetailModal');
            if (modal) modal.style.display = 'none';
        }

        document.querySelectorAll('.sup-tab').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var tab = this.getAttribute('data-tab');
                document.querySelectorAll('.sup-tab').forEach(function(b) { b.classList.remove('active'); if (b.getAttribute('data-tab') === tab) b.classList.add('active'); });
                document.querySelectorAll('.sup-panel').forEach(function(p) { p.classList.remove('show'); if ((p.id === 'supPerformance' && tab === 'performance') || (p.id === 'supConversations' && tab === 'conversations') || (p.id === 'supInternalChats' && tab === 'internal-chats') || (p.id === 'supActivity' && tab === 'activity')) p.classList.add('show'); });
                if (tab === 'performance') loadSupervisionPerformance();
                if (tab === 'conversations') loadSupervisionConversations();
                if (tab === 'internal-chats') loadSupervisionInternalChats();
                if (tab === 'activity') loadSupervisionActivity();
            });
        });

        document.querySelectorAll('.nav-link').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showPage(this.getAttribute('data-page'));
            });
        });
        window.addEventListener('hashchange', function() { if (document.getElementById('app').classList.contains('show')) applyHashRoute(); });

        (function initMobileTicker() {
            var btn = document.getElementById('tickerToggleMobile');
            var ticker = document.getElementById('priceTicker');
            if (!btn || !ticker) return;
            var isMobile = function() { return window.innerWidth <= 768; };
            if (isMobile()) ticker.classList.add('ticker-collapsed');
            window.addEventListener('resize', function() { if (!isMobile()) ticker.classList.remove('ticker-collapsed'); });
            btn.addEventListener('click', function() { ticker.classList.toggle('ticker-collapsed'); });
        })();
        (function initTickerTouchScroll() {
            var items = document.getElementById('tickerItems');
            if (!items) return;
            var touchEndTid = null;
            function addPause() {
                items.classList.add('ticker-touch-active');
                if (touchEndTid) clearTimeout(touchEndTid);
            }
            function removePauseLater() {
                touchEndTid = setTimeout(function() { items.classList.remove('ticker-touch-active'); touchEndTid = null; }, 400);
            }
            items.addEventListener('touchstart', addPause, { passive: true });
            items.addEventListener('touchend', removePauseLater, { passive: true });
            items.addEventListener('touchcancel', removePauseLater, { passive: true });
        })();
        (function initChatMediaLinks() {
            document.addEventListener('click', function(e) {
                var chatEl = document.getElementById('chatMessages');
                if (!chatEl || !chatEl.contains(e.target)) return;
                var a = e.target.closest && e.target.closest('.msg-media a[href], a.msg-media-link, a.msg-file-link');
                if (!a || !a.href) return;
                if (e.ctrlKey || e.metaKey || e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                window.open(a.href, '_blank', 'noopener,noreferrer');
            });
        })();
        (function initFooterYear() {
            var el = document.getElementById('appFooterYear');
            if (el) el.textContent = new Date().getFullYear();
        })();

        (function initLang() {
            var l = localStorage.getItem('crm_lang') || 'fa';
            setLang(l);
        })();

        (function exposeOnclickHandlers() {
            window.login = login;
            window.logout = logout;
            window.showPage = showPage;
            window.savePanelSettings = savePanelSettings;
            window.loadPanelSettings = loadPanelSettings;
            window.sendPanelTestEmail = sendPanelTestEmail;
            window.previewPanelLogo = previewPanelLogo;
            window.previewPanelFavicon = previewPanelFavicon;
            window.updatePanelLivePreview = updatePanelLivePreview;
            window.userPermsSelectAll = userPermsSelectAll;
            window.userPermsSelectGroup = userPermsSelectGroup;
            window.verifyTotpLogin = verifyTotpLogin;
            window.backToLoginStep1 = backToLoginStep1;
            window.closeSidebarMobile = closeSidebarMobile;
            window.toggleSidebarMobile = toggleSidebarMobile;
            window.doHeaderSearch = doHeaderSearch;
            var headerSearchModalEscHandler = null;
            window.openHeaderSearchPopup = function() {
                var m = document.getElementById('headerSearchModal');
                var inp = document.getElementById('headerSearchModalInput');
                if (m && inp) {
                    var mainInp = document.getElementById('headerSearch');
                    if (mainInp && mainInp.value) inp.value = mainInp.value;
                    m.style.display = 'flex';
                    m.setAttribute('aria-hidden', 'false');
                    setTimeout(function() { inp.focus(); }, 100);
                    if (headerSearchModalEscHandler) document.removeEventListener('keydown', headerSearchModalEscHandler);
                    headerSearchModalEscHandler = function(e) {
                        if (e.key === 'Escape') {
                            closeHeaderSearchPopup();
                        }
                    };
                    document.addEventListener('keydown', headerSearchModalEscHandler);
                }
            };
            window.closeHeaderSearchPopup = function() {
                var m = document.getElementById('headerSearchModal');
                if (m) {
                    m.style.display = 'none';
                    m.setAttribute('aria-hidden', 'true');
                    if (headerSearchModalEscHandler) {
                        document.removeEventListener('keydown', headerSearchModalEscHandler);
                        headerSearchModalEscHandler = null;
                    }
                }
            };
            window.doHeaderSearchFromModal = function() {
                var modalInp = document.getElementById('headerSearchModalInput');
                var mainInp = document.getElementById('headerSearch');
                if (modalInp && mainInp) {
                    mainInp.value = modalInp.value;
                    doHeaderSearch();
                    closeHeaderSearchPopup();
                }
            };
            window.toggleLangDropdown = function() {
                var btn = document.getElementById('langDropdownBtn');
                var wrap = btn ? btn.closest('.lang-dropdown-wrap') : null;
                if (!wrap) return;
                wrap.classList.toggle('open');
                var menu = document.getElementById('langDropdownMenu');
                if (menu && btn) {
                    var open = wrap.classList.contains('open');
                    menu.setAttribute('aria-hidden', !open);
                    btn.setAttribute('aria-expanded', open);
                    if (open) {
                        var closeOnOutside = function(e) {
                            if (!wrap.contains(e.target)) {
                                closeLangDropdown();
                                document.removeEventListener('click', closeOnOutside);
                            }
                        };
                        setTimeout(function() { document.addEventListener('click', closeOnOutside); }, 0);
                    }
                }
            };
            window.closeLangDropdown = function() {
                var wrap = document.querySelector('.lang-dropdown-wrap.open');
                if (wrap) {
                    wrap.classList.remove('open');
                    var menu = document.getElementById('langDropdownMenu');
                    var btn = document.getElementById('langDropdownBtn');
                    if (menu) menu.setAttribute('aria-hidden', 'true');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                }
            };
            window.savePanelSettings = savePanelSettings;
            window.loadPanelSettings = loadPanelSettings;
            window.sendPanelTestEmail = sendPanelTestEmail;
            window.previewPanelLogo = previewPanelLogo;
            window.previewPanelFavicon = previewPanelFavicon;
            window.updatePanelLivePreview = updatePanelLivePreview;
            window.userPermsSelectAll = userPermsSelectAll;
            window.userPermsSelectGroup = userPermsSelectGroup;
            window.openSupInternalChatDetail = openSupInternalChatDetail;
            window.closeSupInternalChatModal = closeSupInternalChatModal;
            window.filterInternalThreads = filterInternalThreads;
            window.toggleInternalChatFloating = toggleInternalChatFloating;
            window.selectThreadInPopup = selectThreadInPopup;
            window.filterInternalThreads = filterInternalThreads;
            window.toggleInternalChatFloating = toggleInternalChatFloating;
        })();

        if (token) {
            apiFetch('/api/auth/me').then(async function(res) {
                if (res.needLogin || !res.ok) { logout(); return; }
                var u = res.data;
                currentUser = u;
                if (u && u.email) {
                    setUserDisplay(u);
                    document.documentElement.classList.add('auth-has-token');
                    document.getElementById('loginBox').style.display = 'none';
                    document.getElementById('app').classList.add('show');
                    try {
                        applyNavByRole();
                        await loadPanelSettingsAndApply();
                        applyHashRoute();
                        loadGeneralAnnouncementsMarquee();
                        startRatesInterval();
                        startPresenceInterval();
                        connectSocket();
                        startNavBadgeRefresh();
                        showTotpPromptIfNeeded();
                    } catch (e) { console.error('Post-me init:', e); }
                } else { logout(); }
            }).catch(function() { logout(); });
        } else {
            fetch(API + '/api/panel-settings/public/branding').then(function(r) { return r.json(); }).then(function(data) { if (data && (data.siteName != null || data.logoUrl != null || data.faviconUrl != null || data.loginTitle != null || data.pageTitle != null)) applyBranding(data); }).catch(function() {});
        }