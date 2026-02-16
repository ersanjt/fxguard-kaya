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
                    lang_fa: 'فارس�R',
                    lang_en: 'English',
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
                    header_search: 'جستج�� در �&کا��&ات�R �&شتر�Rا� ...',
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
                    page_customer_detail: 'تار�Rخ� �! �&شتر�R',
                    btn_send: 'ارسا�',
                    btn_save: 'ذخ�Rر�!',
                    btn_back: 'بازگشت',
                    btn_apply: 'اع�&ا�',
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
                    footer_text: 'صراف�R کا�Rا � پ��رتا� کارک� ا� ',
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
                    saved: 'ذخ�Rر�! شد',
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
                    dept_branch: 'شعب�!', dept_name: '� ا�& دپارت�&ا� ', dept_desc: 'ت��ض�Rحات', dept_keywords: 'ک��&ات ک��Rد�R (با کا�&ا)', add_dept: 'افز��د�  دپارت�&ا� ',
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
                    branch_name: '� ا�& شعب�!', branch_city: 'ش�!ر', branch_country: 'کش��ر', branch_ph_name: '�&ثا�: دفتر ت�!را� ', branch_ph_city: '�&ثا�: ت�!را� ', branch_ph_country: '�&ثا�: ا�Rرا� ', add_branch: 'افز��د�  شعب�!', edit: '���Rرا�Rش',
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
                    lang_fa: 'فارس�R',
                    lang_en: 'English',
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
                    header_search: 'Search conversations, customers...',
                    header_logout: 'Log out',
                    logo_kaya: 'Kaya Exchange',
                    page_dashboard: 'Dashboard',
                    dashboard_welcome: 'Key information and quick access to panel sections',
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
                    page_customer_detail: 'Customer history',
                    btn_send: 'Send',
                    btn_save: 'Save',
                    btn_back: 'Back',
                    btn_apply: 'Apply',
                    msg_placeholder: 'Type your message...',
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
                    modal_user_perms: 'Section access:',
                    modal_ann_title: 'Important notice',
                    modal_ann_gotit: 'Got it',
                    footer_text: 'Kaya Exchange � Staff portal',
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
                    saved: 'Saved',
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
                    ticker_last: 'Last updated:',
                    dept_branch: 'Branch', dept_name: 'Department name', dept_desc: 'Description', dept_keywords: 'Keywords (comma-separated)', add_dept: 'Add department',
                    dept_ph_name: 'e.g. Technical support', dept_ph_optional: 'Optional', dept_ph_keywords: 'e.g. issue, support',
                    users_intro: 'Only the owner or users with "User management" access can create users and edit permissions.',
                    label_name: 'Name', label_email: 'Email', label_password: 'Password', label_role: 'Role', label_dept: 'Department', label_branch: 'Branch',
                    user_ph_name: 'Full name', user_ph_pass: 'At least 6 characters', add_user: 'Add user', role_agent: 'Agent', role_manager: 'Manager', role_admin: 'Admin',
                    ticket_title: 'Ticket title', ticket_desc: 'Description', ticket_priority: 'Priority', create_ticket: 'Create ticket', ticket_ph_subject: 'Subject', ticket_ph_search: 'Search number or title...', tickets_intro: 'Official section for submitting and tracking requests. Each ticket has a unique number.', overdue: 'Overdue',
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
                    new_chat: 'New conversation', select_conversation: 'Select conversation', msg_ph_short: 'Message...', attach_file: 'Attach file',
                    file_allow_download: 'Allow download and save', file_view_only: 'View only in chat',
                    start_chat_with: 'Start conversation with', start_chat: 'Start chat', internal_chat_open_full: 'Open full chat', cancel: 'Cancel',
                    branch_name: 'Branch name', branch_city: 'City', branch_country: 'Country', branch_ph_name: 'e.g. Tehran office', branch_ph_city: 'e.g. Tehran', branch_ph_country: 'e.g. Iran', add_branch: 'Add branch', edit: 'Edit',
                    staff_online: 'Staff online', staff_intro: 'Recent logins and online staff � for managers and above', last_logins: 'Recent logins',
                    sup_performance: 'Performance summary', sup_conversations: 'Conversations', sup_activity: 'Activity log', sup_branch_status: 'Branch / status', apply_filter: 'Apply filter',
                    sup_by_branch: 'By branch', sup_by_user: 'User performance (outgoing messages)', total_conversations: 'Total conversations', outgoing_messages: 'Outgoing messages',
                    th_branch: 'Branch', th_city_country: 'City/Country', th_conv_count: 'Conversations', th_user: 'User', th_email: 'Email', th_status: 'Status', th_last_login: 'Last login',
                    th_customer: 'Customer', th_dept: 'Department', th_assignee: 'Assignee', th_time: 'Time', th_action: 'Action', th_summary: 'Summary', th_login_time: 'Login time',
                    all_actions: 'All actions', action_message_sent: 'Message sent', action_conv_assigned: 'Conversation assigned', status_open: 'Open', status_closed: 'Closed', status_resolved: 'Resolved',
                    whatsapp_checking: 'Checking...', whatsapp_scan_qr: 'Scan QR code with WhatsApp mobile app', whatsapp_start_btn: 'Start WhatsApp Gateway',
                    whatsapp_server_err: 'Backend server is not responding correctly.', whatsapp_gateway_off: 'Gateway is not running. Click the button below to start it.',
                    whatsapp_status: 'WhatsApp status:', whatsapp_connected: 'Connected �S', whatsapp_disconnected: 'Disconnected', redis: 'Redis', active: 'Active', inactive: 'Inactive', done_msg: 'Done',
                    rates_intro: 'Prices are fetched from API and shown in the bottom bar for everyone.', rates_adjust_type: 'Adjustment type',
                    rates_none: 'No change', rates_fixed: 'Fixed', rates_delta: '± Amount', rates_percent: '± Percent', rates_currency: 'Currency', rates_current: 'Current price (bar)', rates_value: 'Value',
                    no_data: 'No data.', loading_err: 'Error loading.', select_user: 'Select user',
                    empty_conv_list: 'No conversations. Click "New conversation".', chat: 'Chat', empty_internal_msgs: 'No messages yet.', file: 'File',
                    conv_new: 'New conversation', conv_select_customer: 'Select customer', conv_assign_me: 'Assign to me',
                    empty_no_logins: 'No logins recorded yet.', no_staff_online: 'No staff online.', login_err_load: 'Error loading logins.',
                    required_name_email_pass: 'Name, email and password are required', select_user_first: 'Please select a user', select_conversation_first: 'Please select a conversation',
                    enter_text_or_file: 'Enter text or attach a file', manage_users_required: 'User management access required',
                    branch_name_required: 'Branch name is required', edit_branch_hint: 'Edit the fields and click "Add branch" to update.',
                    ticket_title_required: 'Ticket title is required', reply_or_file_required: 'Reply text or a file is required', task_title_required: 'Task title is required',
                    select_assignee: 'Select user or department', task_update_required: 'Update text is required', dept_name_required: 'Department name is required',
                    enter_password: 'Enter password', enter_6_digit: 'Enter the 6-digit code',
                    creator_label: 'Creator:', assignee_label: 'Assigned to:', due_label: 'Due:', no_reply: 'No replies yet.', conversation: 'Conversation', history: 'History:',
                    by_dept: 'By department', by_user: 'By user', pending_count: 'Pending', in_progress_count: 'In progress', done_count: 'Done',
                    customer: 'Customer', no_conv_history: 'No conversations yet.', blocked: 'Blocked', edit_access: 'Edit / access',
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
                    process_start_from_ticket: 'Start process for this ticket'
                }
            };
            if (window.__I18N_FA) { for (var k in window.__I18N_FA) I18N.fa[k] = window.__I18N_FA[k]; }
            window.LANG = LANG;
            window.t = function(k) { return (I18N[LANG] && I18N[LANG][k]) || I18N.fa[k] || k; };
            window.setLang = function(l) {
                LANG = l;
                localStorage.setItem('crm_lang', l);
                document.documentElement.lang = l === 'en' ? 'en' : 'fa';
                document.documentElement.dir = l === 'en' ? 'ltr' : 'rtl';
                document.body.classList.toggle('ltr', l === 'en');
                document.querySelectorAll('.lang-switch button').forEach(function(btn) {
                    var onclick = btn.getAttribute('onclick') || '';
                    if (onclick.indexOf("'fa'") >= 0) { if (l === 'fa') btn.classList.add('active'); else btn.classList.remove('active'); }
                    else if (onclick.indexOf("'en'") >= 0) { if (l === 'en') btn.classList.add('active'); else btn.classList.remove('active'); }
                });
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
            };
        })();
        const API = '';
        let token = localStorage.getItem('crm_token');
        let currentConvId = null;
        let currentUser = null;
        let ratesInterval = null;
        let presenceInterval = null;
        let staffActivityInterval = null;
        let socket = null;
        window.APP_TIMEZONE = 'Europe/Istanbul';
        window.navBadgeCounts = {};
        window.hasNewInternalChat = false;
        fetch((API || '') + '/api/config').then(function(r){ return r.json(); }).then(function(c){ if (c && c.timezone) window.APP_TIMEZONE = c.timezone; }).catch(function(){});
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
        function fmtTZ(d, opts) {
            if (!d) return '';
            var date = d instanceof Date ? d : new Date(d);
            if (isNaN(date.getTime())) return '';
            var tz = window.APP_TIMEZONE || 'Europe/Istanbul';
            var base = { timeZone: tz };
            if (typeof opts === 'string') {
                if (opts === 'time') return new Intl.DateTimeFormat(LANG === 'en' ? 'en-US' : 'fa-IR', Object.assign({}, base, { hour: '2-digit', minute: '2-digit' })).format(date);
                if (opts === 'date') return new Intl.DateTimeFormat(LANG === 'en' ? 'en-US' : 'fa-IR', Object.assign({}, base, { dateStyle: 'short' })).format(date);
                if (opts === 'datetime') return new Intl.DateTimeFormat(LANG === 'en' ? 'en-US' : 'fa-IR', Object.assign({}, base, { dateStyle: 'short', timeStyle: 'short' })).format(date);
            }
            return new Intl.DateTimeFormat(LANG === 'en' ? 'en-US' : 'fa-IR', Object.assign({}, base, opts || {})).format(date);
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
        function formatTickerDateTime(updatedAtStr) {
            var d;
            try {
                if (updatedAtStr) {
                    var s = String(updatedAtStr).trim();
                    if (s.indexOf(' ') >= 0 && s.indexOf('T') < 0) s = s.replace(' ', 'T');
                    // فقط ISO (YYYY-MM-DD...) یا تایم‌استمپ عددی — جلوگیری از تفسیر اشتباه فرمت‌هایی مثل 06/09/783 یا 05/14/807 که سال غلط می‌داد
                    if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s)) d = new Date(s);
                    else if (/^\d{10,13}$/.test(s)) d = new Date(parseInt(s, 10));
                    else d = new Date();
                } else d = new Date();
            } catch (e) { d = new Date(); }
            if (isNaN(d.getTime())) d = new Date();
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
                miladi = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
            } catch (e) {
                miladi = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
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
                label: t('ticker_last') || 'آخرین بروزرسانی',
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
            var fmt = formatTickerDateTime(data.updatedAt);
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
                itemsEl.innerHTML = items.map(function(it) {
                    var ch = it.change;
                    var chClass = ch > 0 ? ' up' : ch < 0 ? ' down' : ' neutral';
                    var chText = formatChange(ch);
                    return '<span class="ticker-item"><span class="ticker-label">' + escapeHtml(it.label || rateLabel(it.key)) + '</span><span class="ticker-value">' + escapeHtml(formatPrice(it.value)) + '</span>' + (chText ? '<span class="ticker-change' + chClass + '">' + escapeHtml(chText) + '</span>' : '') + '</span>';
                }).join('');
            }
        }

        function startRatesInterval() {
            if (ratesInterval) clearInterval(ratesInterval);
            fetchRates();
            ratesInterval = setInterval(fetchRates, 10 * 60 * 1000);
        }
        function rateLabel(key) { return t(key) || key; }
        async function loadRatesAdjustments() {
            var el = document.getElementById('ratesAdjustmentsTable');
            if (!el) return;
            el.innerHTML = t('loading');
            var canAccess = (currentUser && currentUser.permissions && currentUser.permissions.rates);
            if (!canAccess) { el.innerHTML = '<div class="empty">' + (LANG === 'en' ? 'You do not have access to this section.' : 'دسترس�R ب�! ا�R�  بخش � دار�Rد.') + '</div>'; return; }
            var ratesRes = await apiFetch('/api/rates');
            var adjRes = await apiFetch('/api/rates/adjustments');
            if (ratesRes.needLogin || adjRes.needLogin) return;
            if (!adjRes.ok) { el.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (adjRes.data && adjRes.data.error ? adjRes.data.error : '') + '</div>'; return; }
            var items = (ratesRes.ok && ratesRes.data && (ratesRes.data.allItems || ratesRes.data.items)) ? (ratesRes.data.allItems || ratesRes.data.items) : [];
            var adjList = (adjRes.data && adjRes.data.data) || [];
            var adjMap = {};
            adjList.forEach(function(a) { adjMap[a.currencyKey] = a; });
            var html = '<table class="sup-table" style="margin-top:0;"><thead><tr><th>' + t('rates_currency') + '</th><th>' + t('rates_current') + '</th><th>' + t('rates_adjust_type') + '</th><th>' + t('rates_value') + '</th></tr></thead><tbody>';
            items.forEach(function(it) {
                var adj = adjMap[it.key] || { adjustmentType: 'none', value: null };
                var type = adj.adjustmentType || 'none';
                var val = adj.value != null ? adj.value : '';
                var typeOpts = '<option value="none"' + (type === 'none' ? ' selected' : '') + '>' + t('rates_none') + '</option><option value="fixed"' + (type === 'fixed' ? ' selected' : '') + '>' + t('rates_fixed') + '</option><option value="delta_toman"' + (type === 'delta_toman' ? ' selected' : '') + '>' + t('rates_delta') + '</option><option value="percent"' + (type === 'percent' ? ' selected' : '') + '>' + t('rates_percent') + '</option>';
                var disp = it.value != null && it.value !== '�' ? formatPrice(it.value) : '�';
                var ph = type === 'percent' ? (LANG === 'en' ? 'e.g. 2 or -1' : '�&ث�ا�9 2 �Rا -1') : type === 'delta_toman' ? (LANG === 'en' ? 'e.g. 500 or -200' : '�&ث�ا�9 500 �Rا -200') : (LANG === 'en' ? 'Fixed price' : '��R�&ت ثابت');
                html += '<tr><td>' + escapeHtml(rateLabel(it.key)) + '</td><td><strong>' + disp + '</strong></td><td><select data-rate-key="' + it.key + '" data-rate-type="type">' + typeOpts + '</select></td><td><input type="number" step="any" data-rate-key="' + it.key + '" data-rate-value="value" value="' + (val !== '' ? escapeHtml(String(val)) : '') + '" placeholder="' + ph + '" style="width:140px; padding:8px;"></td></tr>';
            });
            html += '</tbody></table>';
            el.innerHTML = html;
            el.querySelectorAll('select[data-rate-key]').forEach(function(sel) {
                sel.addEventListener('change', function() {
                    var key = this.getAttribute('data-rate-key');
                    var inp = document.querySelector('input[data-rate-key="' + key + '"]');
                    if (inp) inp.placeholder = this.value === 'percent' ? (LANG === 'en' ? 'e.g. 2 or -1' : '�&ث�ا�9 2 �Rا -1') : this.value === 'delta_toman' ? (LANG === 'en' ? 'e.g. 500 or -200' : '�&ث�ا�9 500 �Rا -200') : (LANG === 'en' ? 'Fixed price' : '��R�&ت ثابت');
                });
            });
        }
        async function saveRatesAdjustments() {
            var table = document.getElementById('ratesAdjustmentsTable');
            if (!table) return;
            var rows = table.querySelectorAll('tbody tr');
            var adjustments = [];
            rows.forEach(function(tr) {
                var typeSel = tr.querySelector('select[data-rate-key]');
                var valInp = tr.querySelector('input[data-rate-key]');
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
        function playInternalChatSound() {
            try {
                var ctx = new (window.AudioContext || window.webkitAudioContext)();
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 880;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.15);
            } catch (e) {}
        }
        function isImageExt(name) { return /\.(png|jpg|jpeg|gif|webp)$/i.test(name || ''); }
        function isPdfExt(name) { return /\.pdf$/i.test(name || ''); }
        function renderInternalAttachment(a) {
            var allowDl = a.allowDownload !== false;
            var name = a.name || t('file');
            var fullUrl = (a.url && a.url.startsWith('/')) ? (window.API || '') + a.url : a.url;
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
            var html = '<div class="msg ' + (isOut ? 'out' : 'in') + '"><div>' + escapeHtml(m.content || '') + '</div>' + att + '<div class="time">' + (m.fromUser && m.fromUser.name ? m.fromUser.name : '') + ' · ' + (m.createdAt ? fmtTZ(m.createdAt, 'time') : '') + '</div></div>';
            list.insertAdjacentHTML('beforeend', html);
            list.scrollTop = list.scrollHeight;
        }
        function startStaffActivityLive() {
            if (staffActivityInterval) clearInterval(staffActivityInterval);
            staffActivityInterval = setInterval(loadStaffActivity, 15000);
        }
        function stopStaffActivityLive() {
            if (staffActivityInterval) { clearInterval(staffActivityInterval); staffActivityInterval = null; }
        }

        function doHeaderSearch() {
            var q = (document.getElementById('headerSearch') && document.getElementById('headerSearch').value) || '';
            if (!q.trim()) return;
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
            var html = '';
            for (var i = 0; i < (count || 5); i++) html += '<div class="loading-skeleton loading-row"></div>';
            list.innerHTML = html;
        }

        async function apiFetch(url, opts) {
            var opt = opts || {};
            var h = opt.auth === false ? { 'Content-Type': 'application/json' } : headers();
            var r = await fetch(API + url, { ...opt, headers: { ...h, ...opt.headers }, body: opt.body });
            var text = await r.text();
            if ((text || '').trim().startsWith('<')) {
                if (token) { token = null; localStorage.removeItem('crm_token'); document.getElementById('loginBox').style.display = 'flex'; document.getElementById('app').classList.remove('show'); }
                return { ok: false, needLogin: true, error: 'سر��ر ب�! جا�R JSON پاسخ داد. از پ��ش�! backend دست��ر node server.js را اجرا ک� �Rد.' };
            }
            var data;
            try { data = JSON.parse(text); } catch (_) {
                if (token) { token = null; localStorage.removeItem('crm_token'); document.getElementById('loginBox').style.display = 'flex'; document.getElementById('app').classList.remove('show'); }
                return { ok: false, needLogin: true, error: 'پاسخ سر��ر � ا�&عتبر است' };
            }
            if (r.status === 401) {
                token = null; localStorage.removeItem('crm_token'); document.getElementById('loginBox').style.display = 'flex'; document.getElementById('app').classList.remove('show');
                return { ok: false, needLogin: true, error: data.error || '�طفا�9 د��بار�! ��ارد ش���Rد' };
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
                btn.setAttribute('title', show ? (LANG === 'fa' ? 'مخفی کردن رمز' : 'Hide password') : (LANG === 'fa' ? 'نمایش رمز' : 'Show password'));
                btn.setAttribute('aria-label', btn.getAttribute('title'));
                var use = btn.querySelector('use');
                if (use) use.setAttribute('href', show ? '#icon-eye-off' : '#icon-eye');
            });
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
                currentUser = data.user || {};
                setUserDisplay(currentUser);
                document.getElementById('loginBox').style.display = 'none';
                document.getElementById('app').classList.add('show');
                applyNavByRole();
                applyHashRoute();
                loadDashboard();
                startRatesInterval();
                startPresenceInterval();
                connectSocket();
                startNavBadgeRefresh();
                showTotpPromptIfNeeded();
            } else {
                document.getElementById('loginErr').textContent = data.error || t('login_err_fail');
            }
        }
        function backToLoginStep1() {
            document.getElementById('loginStepTotp').style.display = 'none';
            document.getElementById('loginStep1').style.display = 'block';
            window._totpTempToken = null;
        }
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
                currentUser = data.user || {};
                setUserDisplay(currentUser);
                document.getElementById('loginBox').style.display = 'none';
                document.getElementById('app').classList.add('show');
                applyNavByRole();
                applyHashRoute();
                loadDashboard();
                startRatesInterval();
                startPresenceInterval();
                connectSocket();
                startNavBadgeRefresh();
                showTotpPromptIfNeeded();
            } else {
                document.getElementById('totpErr').textContent = data.error || t('login_totp_bad');
            }
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
            var usernameTrim = (username || '').trim();
            if (usernameTrim) body.username = usernameTrim;
            if (password) body.password = password;
            var btn = document.getElementById('profileSaveBtn');
            if (btn) { btn.disabled = true; btn.textContent = (LANG === 'fa' ? 'در حال ذخیره...' : 'Saving...'); }
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
            stopStaffActivityLive();
            stopNavBadgeRefresh();
            disconnectSocket();
            token = null;
            currentUser = null;
            localStorage.removeItem('crm_token');
            document.getElementById('loginBox').style.display = 'flex';
            document.getElementById('app').classList.remove('show');
        }

        function escapeHtml(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
        function userDisplay(u) { return (u && (u.username || u.name || u.email)) || ''; }

        async function loadDashboard() {
            var container = document.getElementById('dashboardCards');
            if (!container) return;
            var perms = (currentUser && currentUser.permissions) || {};
            var can = function(section) { return section === 'profile' || perms[section] !== false; };
            container.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var res = await apiFetch('/api/analytics/dashboard');
            if (res.needLogin) return;
            var stats = res.ok && res.data ? res.data : {};
            var n = function(v) { return (v != null && typeof v === 'number') ? v : 0; };
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
                { page: 'staff-activity', section: 'staff_activity', title: t('nav_staff_activity'), icon: 'icon-user-online', stat: null }
            ];
            var html = '';
            cards.forEach(function(c) {
                if (!can(c.section)) return;
                var badge = c.stat ? ('<span class="card-badge' + (c.badgeWarn ? ' warn' : '') + '">' + escapeHtml(c.stat) + '</span>') : '';
                html += '<a href="#' + escapeHtml(c.page) + '" class="dashboard-card" data-page="' + escapeHtml(c.page) + '" onclick="showPage(\'' + c.page.replace(/'/g, "\\'") + '\'); return false;"><div class="card-icon"><svg viewBox="0 0 24 24"><use href="#' + c.icon + '"/></svg></div><div class="card-title">' + escapeHtml(c.title) + '</div>' + (c.stat ? '<p class="card-meta">' + escapeHtml(c.stat) + '</p>' : '') + badge + '</a>';
            });
            container.innerHTML = html || ('<div class="empty">' + (LANG === 'fa' ? 'دسترسی به بخشی وجود ندارد.' : 'No sections available.') + '</div>');
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
                if (general.length === 0) { banner.style.display = 'none'; return; }
                var parts = general.map(function(a) { return (a.title || '') + (a.body ? ': ' + a.body : ''); });
                var full = parts.join('  •  ');
                if (!full.trim()) { banner.style.display = 'none'; return; }
                var inner = banner.querySelector('.announcement-marquee-inner');
                if (inner) { inner.innerHTML = escapeHtml(full) + '  •  •  •  ' + escapeHtml(full); }
                banner.style.display = 'block';
            } catch (e) { banner.style.display = 'none'; }
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
            var unreadEl = document.getElementById('convFilterUnread');
            var searchEl = document.getElementById('convSearch');
            if (statusEl && statusEl.value) q += '&status=' + encodeURIComponent(statusEl.value);
            if (priorityEl && priorityEl.value) q += '&priority=' + encodeURIComponent(priorityEl.value);
            if (branchEl && branchEl.value) q += '&branchId=' + encodeURIComponent(branchEl.value);
            if (deptEl && deptEl.value) q += '&departmentId=' + encodeURIComponent(deptEl.value);
            if (assigneeEl && assigneeEl.value) q += '&assignedTo=' + encodeURIComponent(assigneeEl.value);
            if (unreadEl && unreadEl.checked) q += '&unread=true';
            if (searchEl && searchEl.value.trim()) q += '&search=' + encodeURIComponent(searchEl.value.trim());
            var res = await apiFetch('/api/conversations' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty"><span class="empty-icon">💬</span><br>' + t('loading_err') + ' ' + (res.data && res.data.error ? res.data.error : res.error || '') + '</div>'; return; }
            var data = res.data;
            if (statsEl && data.total != null) {
                var open = (data.data || []).filter(function(c){ return c.status === 'open'; }).length;
                var unread = (data.data || []).reduce(function(s,c){ return s + (c.unreadCount || 0); }, 0);
                statsEl.innerHTML = '<span class="conv-stat"><strong>' + (data.total || 0) + '</strong> ' + (LANG === 'fa' ? 'مکالمه' : 'conv') + '</span><span class="conv-stat"><strong>' + open + '</strong> ' + (LANG === 'fa' ? 'باز' : 'open') + '</span><span class="conv-stat"><strong>' + unread + '</strong> ' + (LANG === 'fa' ? 'خوانده\u200cنشده' : 'unread') + '</span>';
                statsEl.style.display = 'flex';
            }
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
                var assigneeName = userDisplay(c.assignee);
                var statusT = LANG === 'fa' ? { open: 'باز', pending: 'در انتظار', closed: 'بسته', resolved: 'حل\u200cشده' } : { open: 'Open', pending: 'Pending', closed: 'Closed', resolved: 'Resolved' };
                var statusBadge = '<span class="badge ' + (c.status || 'open') + '">' + (statusT[c.status] || c.status) + '</span>';
                var priorityBadge = c.priority && c.priority !== 'normal' ? '<span class="badge ' + c.priority + '">' + (t('priority_' + c.priority) || c.priority) + '</span>' : '';
                var unreadBadge = (c.unreadCount > 0) ? '<span class="badge unread">' + c.unreadCount + '</span>' : '';
                var preview = (c.lastMessagePreview || '').trim();
                var timeStr = c.lastMessageAt ? fmtTZ(c.lastMessageAt, 'time') : '';
                return '<div class="conv-list-item" data-id="' + c.id + '" onclick="openChat(\'' + c.id + '\', \'' + safeName + '\', \'' + safePhone + '\')"><div class="conv-item-avatar">' + initial + '</div><div class="conv-item-body"><div class="conv-item-top"><span class="name">' + unreadBadge + escapeHtml(name) + '</span><span class="conv-item-time">' + timeStr + '</span></div><div class="conv-item-meta">' + escapeHtml(phone) + (assigneeName ? ' · ' + escapeHtml(assigneeName) : '') + '</div>' + (preview ? '<div class="conv-item-preview">' + escapeHtml(preview) + '</div>' : '') + '</div><div class="conv-item-badges">' + priorityBadge + statusBadge + '</div></div>';
            }).join('');
        }

        var currentConvDetail = null;
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
        function openChat(id, name, phone) {
            currentConvId = id;
            currentConvDetail = null;
            var headerEl = document.getElementById('chatHeader');
            var barEl = document.getElementById('convDetailBar');
            var metaEl = document.getElementById('convDetailMeta');
            var actionsEl = document.getElementById('convDetailActions');
            if (headerEl) headerEl.textContent = name || phone || t('customer');
            var chatArea = document.getElementById('chatArea');
            var layout = chatArea && chatArea.closest('.conv-layout');
            if (chatArea) chatArea.classList.add('show');
            if (layout) layout.classList.add('chat-open');
            var backBtn = document.querySelector('.chat-back-btn');
            if (backBtn) backBtn.style.display = window.matchMedia('(max-width: 768px)').matches ? 'flex' : 'none';
            if (barEl) barEl.style.display = 'none';
            apiFetch('/api/conversations/' + id + '/read', { method: 'POST' }).then(function() { loadConversations(); });
            loadMessages(id);
            apiFetch('/api/conversations/' + id).then(function(res) {
                if (!res.ok || !res.data) return;
                currentConvDetail = res.data;
                if (!barEl || !metaEl) return;
                var d = res.data;
                var assigneeName = userDisplay(d.assignee) || (LANG === 'fa' ? 'بدون تخصیص' : 'Unassigned');
                var deptName = (d.department && d.department.name) ? d.department.name : '';
                var statusT = LANG === 'fa' ? { open: 'باز', pending: 'در انتظار', closed: 'بسته', resolved: 'حل\u200cشده' } : { open: 'Open', pending: 'Pending', closed: 'Closed', resolved: 'Resolved' };
                var prioT = LANG === 'fa' ? { low: 'کم', normal: 'عادی', high: 'مهم', urgent: 'فوری' } : { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' };
                metaEl.textContent = (LANG === 'fa' ? 'وضعیت: ' : 'Status: ') + (statusT[d.status] || d.status) + ' | ' + (LANG === 'fa' ? 'اولویت: ' : 'Priority: ') + (prioT[d.priority] || d.priority) + ' | ' + (LANG === 'fa' ? 'مسئول: ' : 'Assignee: ') + assigneeName + (deptName ? ' | ' + deptName : '');
                barEl.style.display = 'block';
                var canManage = (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin' || currentUser.role === 'manager'));
                var isAssignedToMe = d.assignedTo === (currentUser && currentUser.id);
                if (actionsEl) {
                    actionsEl.style.display = 'flex';
                    var assignBtn = document.getElementById('btnAssignToMe');
                    if (assignBtn) assignBtn.style.display = (canManage || !isAssignedToMe) ? '' : 'none';
                    actionsEl.querySelectorAll('select').forEach(function(el){ el.style.display = canManage ? '' : 'none'; });
                    var applyBtn = actionsEl.querySelector('[onclick="updateConvFromDetail()"]');
                    if (applyBtn) applyBtn.style.display = canManage ? '' : 'none';
                }
                if (canManage) {
                    var statusSel = document.getElementById('convDetailStatus');
                    var prioritySel = document.getElementById('convDetailPriority');
                    var assigneeSel = document.getElementById('convDetailAssignee');
                    if (statusSel) statusSel.value = d.status || 'open';
                    if (prioritySel) prioritySel.value = d.priority || 'normal';
                    if (assigneeSel) { assigneeSel.value = d.assignedTo || ''; loadConvAssignees(); }
                }
            });
        }
        async function loadConvAssignees() {
            var selFilter = document.getElementById('convFilterAssignee');
            var selDetail = document.getElementById('convDetailAssignee');
            if (!selFilter && !selDetail) return;
            var res = await apiFetch('/api/users');
            if (!res.ok || !res.data || !res.data.data) return;
            var users = res.data.data;
            var opt = '<option value="">' + (LANG === 'fa' ? 'هر مسئول' : 'Any assignee') + '</option>' + users.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
            if (selFilter) selFilter.innerHTML = opt;
            var optDetail = '<option value="">' + (LANG === 'fa' ? 'بدون تخصیص' : 'Unassigned') + '</option>' + users.map(function(u){ return '<option value="' + u.id + '">' + escapeHtml(u.username || u.name || u.email) + '</option>'; }).join('');
            if (selDetail) selDetail.innerHTML = optDetail;
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
                return '<div class="new-conv-customer-item" onclick="startNewConversation(\'' + c.id + '\', \'' + (name || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\') + '\')"><span class="conv-item-avatar" style="width:36px;height:36px;font-size:0.9rem;">' + ((name && name[0]) ? name[0].toUpperCase() : '?') + '</span><span class="name">' + escapeHtml(name) + '</span><span class="meta">' + escapeHtml(c.phone || '') + '</span></div>';
            }).join('');
        }
        async function startNewConversation(customerId, name) {
            closeNewConvModal();
            var res = await apiFetch('/api/conversations', { method: 'POST', body: JSON.stringify({ customerId: customerId }) });
            if (res.needLogin) return;
            if (!res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); return; }
            var conv = res.data;
            var phone = (conv.customer && conv.customer.phone) || '';
            openChat(conv.id, name || (conv.customer && conv.customer.name) || phone, phone);
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
            var body = {};
            if (statusSel) body.status = statusSel.value;
            if (prioritySel) body.priority = prioritySel.value;
            if (assigneeSel) body.assignedTo = assigneeSel.value || null;
            var res = await apiFetch('/api/conversations/' + currentConvId, { method: 'PATCH', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('btn_save') || 'Saved'); if (currentConvDetail) currentConvDetail = res.data; openChat(currentConvId, document.getElementById('chatHeader').textContent, ''); loadConversations(); } else toast((res.data && res.data.error) || t('err_generic'), true);
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
            el.innerHTML = data.data.map(function(m) {
                var isOut = m.direction === 'outgoing';
                var time = m.timestamp ? fmtTZ(m.timestamp, 'time') : '';
                return '<div class="msg ' + (isOut ? 'out' : 'in') + '"><div>' + escapeHtml(m.content || '') + '</div><div class="time">' + time + '</div></div>';
            }).join('');
            el.scrollTop = el.scrollHeight;
        }

        async function sendMsg() {
            var input = document.getElementById('msgInput');
            var content = (input.value || '').trim();
            if (!content || !currentConvId) return;
            input.value = '';
            var res = await apiFetch('/api/conversations/' + currentConvId + '/send', { method: 'POST', body: JSON.stringify({ content: content }) });
            if (res.needLogin) return;
            if (res.ok) loadMessages(currentConvId);
            else toast((res.data && res.data.error) || (LANG === 'en' ? 'Send failed' : 'خطا در ارسا�'), true);
        }

        async function loadCustomers() {
            var list = document.getElementById('customerList');
            setLoading('customerList', 5);
            var q = '?limit=200';
            var searchEl = document.getElementById('customerSearch');
            var statusEl = document.getElementById('customerFilterStatus');
            if (searchEl && searchEl.value.trim()) q += '&search=' + encodeURIComponent(searchEl.value.trim());
            if (statusEl && statusEl.value) q += '&status=' + encodeURIComponent(statusEl.value);
            var res = await apiFetch('/api/customers' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty"><span class="empty-icon">�a�️</span><br>' + (res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            var data = res.data;
            if (!data.data || data.data.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">�x�</span><br>' + t('empty_customers') + '</div>'; return; }
            list.innerHTML = data.data.map(function(c) {
                var initial = (c.name && c.name[0]) ? c.name[0].toUpperCase() : (c.phone && c.phone[0]) ? c.phone[0] : '?';
                var statusClass = (c.status === 'blocked' ? 'blocked' : c.status === 'inactive' ? 'inactive' : 'active');
                var statusLabel = c.status === 'blocked' ? (LANG === 'fa' ? 'مسدود' : 'Blocked') : c.status === 'inactive' ? (LANG === 'fa' ? 'غیرفعال' : 'Inactive') : (LANG === 'fa' ? 'فعال' : 'Active');
                var lastContact = c.lastContactAt ? fmtTZ(c.lastContactAt, 'date') : '—';
                return '<div class="list-item" onclick="showCustomerHistory(\'' + c.id + '\', \'' + (c.name || c.phone || '').replace(/'/g, "\\'") + '\')"><div class="list-item-avatar">' + initial + '</div><div><span class="name">' + escapeHtml(c.name || c.phone) + '</span><div class="meta">' + escapeHtml(c.phone || '') + (c.email ? ' ⬢ ' + escapeHtml(c.email) : '') + '</div><div class="meta">' + lastContact + ' · ' + (c.totalConversations || 0) + ' ' + (LANG === 'fa' ? 'مکالمه' : 'conv') + '</div></div><span class="badge ' + statusClass + '">' + statusLabel + '</span></div>';
            }).join('');
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
            if (cardEl) cardEl.innerHTML = '<div class="customer-avatar">' + initial + '</div><div class="customer-info"><h3>' + escapeHtml(c.name || c.phone) + '</h3><div class="customer-meta">' + (LANG === 'fa' ? 'تلفن: ' : 'Phone: ') + escapeHtml(c.phone || '—') + '</div>' + (c.email ? '<div class="customer-meta">' + (LANG === 'fa' ? 'ایمیل: ' : 'Email: ') + escapeHtml(c.email) + '</div>' : '') + '<div class="customer-meta">' + (LANG === 'fa' ? 'وضعیت: ' : 'Status: ') + '<span class="badge ' + (c.status || 'active') + '">' + statusLabel + '</span> · ' + (LANG === 'fa' ? 'اولین تماس: ' : 'First: ') + firstContact + ' · ' + (LANG === 'fa' ? 'آخرین تماس: ' : 'Last: ') + lastContact + '</div><div class="customer-meta">' + (c.totalConversations || 0) + ' ' + (LANG === 'fa' ? 'مکالمه' : 'conv') + ' · ' + (c.totalMessages || 0) + ' ' + (LANG === 'fa' ? 'پیام' : 'msgs') + '</div>' + (c.notes ? '<div class="customer-notes">' + escapeHtml(c.notes) + '</div>' : '') + '</div><button type="button" class="btn-secondary" onclick="openCustomerModal(\'' + c.id + '\')" style="align-self:flex-start;">' + (LANG === 'fa' ? 'ویرایش مشتری' : 'Edit') + '</button>';
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
            loadCustomerNotes(custId);
        }
        function initCustomerDetailTabs() {
            document.querySelectorAll('.customer-detail-tab').forEach(function(btn) {
                btn.onclick = function() {
                    var tab = this.getAttribute('data-tab');
                    document.querySelectorAll('.customer-detail-tab').forEach(function(b) { b.classList.remove('active'); });
                    document.querySelectorAll('.customer-detail-panel').forEach(function(p) { p.classList.remove('show'); p.style.display = 'none'; });
                    this.classList.add('active');
                    var pid = tab === 'timeline' ? 'customerTimelinePanel' : tab === 'conversations' ? 'customerConversationsPanel' : 'customerNotesPanel';
                    var panel = document.getElementById(pid);
                    if (panel) { panel.style.display = 'block'; panel.classList.add('show'); }
                    if (tab === 'notes' && currentCustomerId) loadCustomerNotes(currentCustomerId);
                };
            });
        }
        var activityLabels = { message_sent: 'ارسال پیام', conversation_assigned: 'تخصیص مکالمه', customer_note_added: 'ثبت گزارش/یادداشت' };
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
                return '';
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
        var VALID_PAGES = ['dashboard','conversations','customers','departments','users','tickets','tasks','processes','whatsapp','branches','supervision','staff-activity','profile','announcements','internal-chat','rates','services'];
        function applyHashRoute() {
            var hash = (location.hash || '').replace(/^#/, '');
            var page = VALID_PAGES.indexOf(hash) >= 0 ? hash : 'dashboard';
            showPage(page);
        }
        function toggleSidebarMobile() { var s = document.getElementById('sidebar'); var o = document.getElementById('sidebarOverlay'); if (s && s.classList.contains('sidebar-open')) { closeSidebarMobile(); } else { if (s) s.classList.add('sidebar-open'); if (o) { o.classList.add('show'); o.style.display = 'block'; document.body.style.overflow = 'hidden'; } } }
        function closeSidebarMobile() { var s = document.getElementById('sidebar'); var o = document.getElementById('sidebarOverlay'); if (s) s.classList.remove('sidebar-open'); if (o) { o.classList.remove('show'); o.style.display = 'none'; document.body.style.overflow = ''; } }
        function showPage(page) {
            closeSidebarMobile();
            if (qrRefreshInterval && page !== 'whatsapp') { clearInterval(qrRefreshInterval); qrRefreshInterval = null; }
            if (page && window.location.hash !== '#' + page) { var base = (window.location.pathname === '/dashboard.html') ? '/dashboard' : (window.location.pathname || '/dashboard'); try { window.history.replaceState(null, '', base + '#' + page); } catch (e) {} }
            document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); if (l.getAttribute('data-page') === page) l.classList.add('active'); });
            document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('show'); p.style.display = 'none'; });
            var ids = { dashboard: 'pageDashboard', conversations: 'pageConversations', customers: 'pageCustomers', departments: 'pageDepartments', users: 'pageUsers', tickets: 'pageTickets', tasks: 'pageTasks', processes: 'pageProcesses', whatsapp: 'pageWhatsapp', branches: 'pageBranches', supervision: 'pageSupervision', 'staff-activity': 'pageStaffActivity', profile: 'pageProfile', announcements: 'pageAnnouncements', 'internal-chat': 'pageInternalChat', rates: 'pageRates', services: 'pageServices' };
            if (ids[page]) { var el = document.getElementById(ids[page]); if (el) { el.style.display = 'block'; el.classList.add('show'); } }
            if (page === 'dashboard') loadDashboard();
            if (page === 'conversations') { loadConvFiltersInit(); loadConversations(); }
            if (page === 'customers') loadCustomers();
            if (page === 'departments') { loadDepartments(); loadBranchesForSelect(['deptBranch']); }
            if (page === 'users') { document.getElementById('userFormBox').style.display = 'none'; document.getElementById('btnAddUser').style.display = (currentUser && currentUser.permissions && currentUser.permissions.manage_users) ? '' : 'none'; document.getElementById('btnCancelUserForm').style.display = 'none'; loadUsers(); loadDeptsForUser(); loadBranchesForSelect(['userBranch','userEditBranch']); initUserAddPerms(); initUserFilters(); initUserEditTabs(); }
            if (page === 'tickets') { loadTicketFiltersInit(); loadTickets(); }
            if (page === 'tasks') { loadTasksFilters(); loadTasks(); loadTasksSummary(); initTaskSearchDebounce(); }
            if (page === 'processes') { initProcessTabs(); loadProcessTemplates(); loadProcessInstances(); loadProcessTemplateSelect(); }
            if (page === 'whatsapp') loadWhatsappStatus();
            if (page === 'rates') { loadRatesAdjustments(); loadTickerConfig(); }
            if (page === 'services') loadServices();
            if (page === 'branches') { loadBranches(); }
            if (page === 'staff-activity') { loadStaffActivity(); startStaffActivityLive(); } else { stopStaffActivityLive(); }
            if (page === 'profile') loadProfile();
            if (page === 'announcements') { loadAnnouncements(); if (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin' || currentUser.role === 'manager')) { document.getElementById('announcementSendBox').style.display = 'block'; loadAnnouncementTargets(); } else document.getElementById('announcementSendBox').style.display = 'none'; }
            if (page === 'internal-chat') { window.hasNewInternalChat = false; updateNavBadges(); var popupTid = currentInternalThreadId; closeInternalChatPopup(); loadInternalThreads(); loadInternalUsers(); if (popupTid) setTimeout(function(){ openInternalThread(popupTid); }, 150); }
            if (page === 'supervision') { loadBranchesForSelect(['supBranch', 'supActBranch']); loadSupervisionPerformance(); document.querySelectorAll('.sup-tab').forEach(function(b){ b.classList.remove('active'); if(b.getAttribute('data-tab')==='performance') b.classList.add('active'); }); document.querySelectorAll('.sup-panel').forEach(function(p){ p.classList.remove('show'); if(p.id==='supPerformance') p.classList.add('show'); }); }
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
            setLoading('ticketList', 4);
            var q = '?limit=50';
            var s = document.getElementById('ticketFilterStatus'); if (s && s.value) q += '&status=' + encodeURIComponent(s.value);
            var p = document.getElementById('ticketFilterPriority'); if (p && p.value) q += '&priority=' + encodeURIComponent(p.value);
            var a = document.getElementById('ticketFilterAssignee'); if (a && a.value) q += '&assignedTo=' + encodeURIComponent(a.value);
            var d = document.getElementById('ticketFilterDept'); if (d && d.value) q += '&departmentId=' + encodeURIComponent(d.value);
            var search = document.getElementById('ticketSearch'); if (search && search.value.trim()) q += '&search=' + encodeURIComponent(search.value.trim());
            var res = await apiFetch('/api/tickets' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            var data = res.data;
            if (statsEl && data.data) {
                var open = (data.data || []).filter(function(x){ return x.status === 'open'; }).length;
                var inProg = (data.data || []).filter(function(x){ return x.status === 'in_progress'; }).length;
                var resolved = (data.data || []).filter(function(x){ return x.status === 'resolved'; }).length;
                var closed = (data.data || []).filter(function(x){ return x.status === 'closed'; }).length;
                statsEl.innerHTML = '<span class="ticket-stat"><strong>' + (data.total || 0) + '</strong> ' + (LANG === 'fa' ? 'کل' : 'total') + '</span><span class="ticket-stat"><strong>' + open + '</strong> ' + t('status_open') + '</span><span class="ticket-stat"><strong>' + inProg + '</strong> ' + t('status_in_progress') + '</span><span class="ticket-stat"><strong>' + resolved + '</strong> ' + t('status_resolved') + '</span><span class="ticket-stat"><strong>' + closed + '</strong> ' + t('status_closed') + '</span>';
                statsEl.style.display = 'flex';
            }
            if (!data.data || data.data.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">🎫</span><br>' + t('empty_tickets') + '</div>'; return; }
            list.innerHTML = data.data.map(function(t) {
                var statusLabel = t.status === 'open' ? t('status_open') : t.status === 'in_progress' ? t('status_in_progress') : t.status === 'resolved' ? t('status_resolved') : t.status === 'closed' ? t('status_closed') : t.status || '';
                var prioLabel = { low: t('priority_low'), normal: t('priority_normal'), high: t('priority_high'), urgent: t('priority_urgent') }[t.priority] || t.priority || '';
                var assign = userDisplay(t.assignee);
                var dept = (t.department && t.department.name) ? t.department.name : '';
                var meta = [userDisplay(t.creator), assign, dept].filter(Boolean).join(' · ');
                var num = (t.ticketNumber || '').trim();
                var numHtml = num ? '<span class="ticket-number">' + escapeHtml(num) + '</span> ' : '';
                return '<div class="ticket-list-item" onclick="loadTicketDetail(\'' + t.id + '\')"><div class="ticket-item-body">' + numHtml + '<span class="name">' + escapeHtml(t.title) + '</span><div class="meta">' + escapeHtml(meta) + '</div></div><div class="ticket-item-badges"><span class="badge ' + (t.priority || '') + '">' + escapeHtml(prioLabel) + '</span><span class="badge ' + (t.status || '') + '">' + escapeHtml(statusLabel) + '</span></div></div>';
            }).join('');
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
        async function updateTicketFromDetail() {
            if (!currentTicketId) return;
            var statusSel = document.getElementById('ticketDetailStatus');
            var assigneeSel = document.getElementById('ticketDetailAssignee');
            var prioritySel = document.getElementById('ticketDetailPriority');
            var body = {};
            if (statusSel) body.status = statusSel.value;
            if (assigneeSel) body.assignedTo = assigneeSel.value || null;
            if (prioritySel) body.priority = prioritySel.value;
            var res = await apiFetch('/api/tickets/' + currentTicketId, { method: 'PUT', body: JSON.stringify(body) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('btn_save')); loadTicketDetail(currentTicketId); loadTickets(); } else toast((res.data && res.data.error) || t('err_generic'), true);
        }
        async function loadTicketDetail(id) {
            currentTicketId = id;
            document.getElementById('ticketList').style.display = 'none';
            document.getElementById('ticketDetail').style.display = 'block';
            var res = await apiFetch('/api/tickets/' + id);
            if (res.needLogin) return;
            if (!res.ok) { toast((res.data && res.data.error) || t('err_generic'), true); showTicketList(); return; }
            var t = res.data;
            var numEl = document.getElementById('ticketDetailNumber');
            if (numEl) numEl.textContent = (t.ticketNumber || '').trim() || '';
            document.getElementById('ticketDetailTitle').textContent = t.title || '';
            var metaParts = [t('creator_label') + ' ' + userDisplay(t.creator), t('assignee_label') + ' ' + userDisplay(t.assignee), t('th_status') + ': ' + (t.status || ''), t('ticket_priority') + ': ' + (t.priority || '')];
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
            if (statusSel) statusSel.value = t.status || 'open';
            if (assigneeSel) { await loadTicketFormSelects(); assigneeSel.value = t.assignedTo || ''; }
            if (prioritySel) prioritySel.value = t.priority || 'normal';
            var repliesHtml = (t.replies || []).map(function(r) {
                var att = (r.attachments && r.attachments.length) ? r.attachments.map(function(a) { return '<a href="' + escapeHtml(a.url) + '" target="_blank" rel="noopener" style="color:var(--accent); margin-left:8px;">�x} ' + escapeHtml(a.name || t('file')) + '</a>'; }).join('') : '';
                return '<div class="msg ' + (String(r.userId) === String(currentUser && currentUser.id) ? 'out' : 'in') + '" style="margin:8px 0;"><div>' + escapeHtml(r.content || '') + '</div>' + att + '<div class="time">' + userDisplay(r.user) + ' � ' + (r.createdAt ? fmtTZ(r.createdAt, 'datetime') : '') + '</div></div>';
            }).join('');
            document.getElementById('ticketReplies').innerHTML = repliesHtml || '<p class="text-muted" style="color:var(--text-muted);">' + t('no_reply') + '</p>';
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
                var up = await fetch(API + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
                var upData = await up.json();
                if (upData.url) attachments.push({ url: upData.url, name: upData.name || 'فا�R�', size: upData.size });
            }
            if (!content.trim() && attachments.length === 0) { toast(t('reply_or_file_required'), true); return; }
            var res = await apiFetch('/api/tickets/' + currentTicketId + '/replies', { method: 'POST', body: JSON.stringify({ content: content.trim() || '(پ�R��ست)', attachments: attachments }) });
            if (res.needLogin) return;
            if (res.ok) { toast(t('toast_reply_sent')); loadTicketDetail(currentTicketId); fileInput.value = ''; } else { toast((res.data && res.data.error) || t('err_generic'), true); }
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

        async function addDepartment() {
            var name = document.getElementById('deptName').value.trim();
            if (!name) { toast(t('dept_name_required'), true); return; }
            var branchId = document.getElementById('deptBranch').value || null;
            var res = await apiFetch('/api/departments', { method: 'POST', body: JSON.stringify({ name: name, description: document.getElementById('deptDesc').value, keywords: document.getElementById('deptKeywords').value, branchId: branchId }) });
            if (res.needLogin) return;
            if (res.ok) { document.getElementById('deptName').value = ''; document.getElementById('deptDesc').value = ''; document.getElementById('deptKeywords').value = ''; toast(t('toast_dept_added')); loadDepartments(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        var userListData = [];
        function initUserFilters() {
            var searchEl = document.getElementById('userSearchInput');
            var roleEl = document.getElementById('userFilterRole');
            if (searchEl) searchEl.oninput = searchEl.onkeyup = function() { filterAndRenderUsers(); };
            if (roleEl) roleEl.onchange = function() { filterAndRenderUsers(); };
        }
        function initUserEditTabs() {
            document.querySelectorAll('.user-edit-tab').forEach(function(btn) {
                btn.onclick = function() {
                    var tab = this.getAttribute('data-tab');
                    document.querySelectorAll('.user-edit-tab').forEach(function(b) { b.classList.remove('active'); });
                    document.querySelectorAll('.user-edit-tab-panel').forEach(function(p) { p.classList.remove('active'); p.style.display = 'none'; });
                    this.classList.add('active');
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
            var q = search.trim().toLowerCase();
            var filtered = userListData.filter(function(u) {
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
            var roleLabels = { owner: t('role_owner'), admin: t('role_admin'), manager: t('role_manager'), supervisor: t('role_supervisor'), agent: t('role_agent') };
            if (!users || users.length === 0) { list.innerHTML = '<div class="empty" style="grid-column:1/-1;"><span class="empty-icon">👤</span><br>' + t('empty_users') + '</div>'; return; }
            list.innerHTML = users.map(function(u) {
                var initial = userInitial(u) || '?';
                var avatarUrl = (u.avatar && String(u.avatar).trim()) ? ((u.avatar.indexOf('/') === 0 ? (window.location.origin || '') : '') + u.avatar) : '';
                var avatarHtml = avatarUrl ? '<span class="avatar-fallback">' + escapeHtml(initial) + '</span><img src="' + escapeHtml(avatarUrl) + '" alt="" onerror="this.style.display=\'none\'">' : initial;
                var metaParts = [];
                if (u.email) metaParts.push(escapeHtml(u.email));
                metaParts.push(roleLabels[u.role] || u.role);
                if (u.department && u.department.name) metaParts.push(escapeHtml(u.department.name));
                if (u.branch && u.branch.name) metaParts.push(escapeHtml(u.branch.name));
                var inactiveClass = u.isActive === false ? ' inactive' : '';
                var blockedBadge = u.isActive === false ? '<span class="badge cancelled">' + t('blocked') + '</span>' : '';
                var roleBadge = '<span class="badge" style="background:var(--accent-soft);color:var(--accent);">' + escapeHtml(roleLabels[u.role] || u.role) + '</span>';
                var btn = canManage ? '<button type="button" class="btn-secondary btn-sm" onclick="openUserEdit(\'' + u.id + '\')" style="margin:0;padding:6px 12px;font-size:0.8rem;">' + t('edit_access') + '</button>' : '';
                return '<div class="user-card' + inactiveClass + '"><div class="user-card-avatar">' + avatarHtml + '</div><div class="user-card-body"><div class="user-card-name">' + escapeHtml(u.name) + ' ' + blockedBadge + '</div><div class="user-card-meta">' + metaParts.join(' · ') + '</div><div class="user-card-badges">' + roleBadge + '</div></div><div class="user-card-actions">' + btn + '</div></div>';
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
        var sectionLabels = { dashboard: 'page_dashboard', conversations: 'section_conversations', customers: 'section_customers', tickets: 'section_tickets', tasks: 'section_tasks', departments: 'section_departments', users: 'section_users', branches: 'section_branches', supervision: 'section_supervision', staff_activity: 'section_staff_activity', announcements: 'section_announcements', internal_chat: 'section_internal_chat', whatsapp: 'section_whatsapp', rates: 'section_rates', services: 'section_services', processes: 'section_processes', manage_users: 'section_manage_users' };
        function sectionLabel(k) { return t(sectionLabels[k] || k); }
        function closeUserEditModal() { document.getElementById('userEditModal').style.display = 'none'; currentEditUserId = null; }
        async function openUserEdit(userId) {
            var res = await apiFetch('/api/users/' + userId);
            if (res.needLogin || !res.ok) return;
            var u = res.data;
            currentEditUserId = userId;
            document.querySelectorAll('.user-edit-tab').forEach(function(b) { b.classList.remove('active'); if (b.getAttribute('data-tab') === 'info') b.classList.add('active'); });
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
            var perms = u.permissions || {};
            var canGrantManageUsers = (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin'));
            var html = Object.keys(sectionLabels).map(function(k) {
                if (k === 'manage_users' && !canGrantManageUsers) return '';
                var checked = perms[k] !== false ? ' checked' : '';
                return '<label style="display:block; margin:6px 0;"><input type="checkbox" data-perm="' + k + '"' + checked + '> ' + sectionLabel(k) + '</label>';
            }).join('');
            document.getElementById('userEditPerms').innerHTML = html;
            document.getElementById('userEditModal').style.display = 'flex';
        }
        async function saveUserEdit() {
            if (!currentEditUserId) return;
            var perms = {};
            document.querySelectorAll('#userEditPerms input[data-perm]').forEach(function(cb) {
                perms[cb.getAttribute('data-perm')] = cb.checked;
            });
            var payload = {
                name: document.getElementById('userEditName').value.trim(),
                username: document.getElementById('userEditUsername').value.trim() || null,
                email: document.getElementById('userEditEmail').value.trim(),
                role: document.getElementById('userEditRole').value,
                departmentId: document.getElementById('userEditDept').value || null,
                branchId: document.getElementById('userEditBranch').value || null,
                isActive: document.getElementById('userEditActive').checked,
                permissions: perms
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
            var res = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify({ name: name, username: username, email: email, password: password, role: document.getElementById('userRole').value, departmentId: deptId, branchId: branchId, permissions: perms }) });
            if (res.needLogin) return;
            if (res.ok) {
                document.getElementById('userName').value = '';
                if (document.getElementById('userUsernameAdd')) document.getElementById('userUsernameAdd').value = '';
                document.getElementById('userEmailAdd').value = '';
                document.getElementById('userPass').value = '';
                toast(t('toast_user_added')); loadUsers(); toggleUserForm();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        var currentInternalThreadId = null;
        async function loadInternalThreads() {
            var list = document.getElementById('internalThreadList');
            if (!list) return;
            list.innerHTML = t('loading');
            var res = await apiFetch('/api/internal/threads');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('loading_err') + '</div>'; return; }
            var data = (res.data && res.data.data) || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty">' + t('empty_conv_list') + '</div>'; return; }
            list.innerHTML = data.map(function(t) {
                var names = (t.participants || []).map(function(p) { return p.name; }).join('�R ');
                var last = t.lastMessage ? (t.lastMessage.content || '').slice(0, 40) + (t.lastMessage.content && t.lastMessage.content.length > 40 ? '⬦' : '') : '�';
                return '<div class="list-item" onclick="openInternalThread(\'' + t.id + '\')" style="cursor:pointer;"><div><span class="name">' + escapeHtml(names || t('chat')) + '</span><div class="meta">' + escapeHtml(last) + '</div></div></div>';
            }).join('');
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
        async function startInternalChat() {
            var sel = document.getElementById('internalNewChatUser');
            var userId = sel && sel.value;
            if (!userId) { toast(t('select_user_first'), true); return; }
            var res = await apiFetch('/api/internal/threads', { method: 'POST', body: JSON.stringify({ userId: userId }) });
            if (res.needLogin) return;
            if (res.ok) { hideNewChatForm(); openInternalThread(res.data.id); loadInternalThreads(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        async function openInternalThread(threadId) {
            currentInternalThreadId = threadId;
            document.getElementById('internalChatPane').style.display = 'block';
            var partRes = await apiFetch('/api/internal/threads');
            if (partRes.ok && partRes.data && partRes.data.data) {
                var t = partRes.data.data.find(function(x) { return x.id === threadId; });
                document.getElementById('internalChatHeader').textContent = t && t.participants ? t.participants.map(function(p) { return p.name; }).join('�R ') : t('chat');
            }
            loadInternalMessages(threadId);
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
            list.innerHTML = data.length === 0 ? '<div class="empty">' + t('empty_internal_msgs') + '</div>' : data.map(function(m) {
                var isOut = m.fromUserId === me;
                var att = (m.attachments && m.attachments.length) ? m.attachments.map(renderInternalAttachment).join('') : '';
                return '<div class="msg ' + (isOut ? 'out' : 'in') + '"><div>' + escapeHtml(m.content || '') + '</div>' + att + '<div class="time">' + (m.fromUser && m.fromUser.name ? m.fromUser.name : '') + ' � ' + (m.createdAt ? fmtTZ(m.createdAt, 'time') : '') + '</div></div>';
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
                loadInternalMessages(currentInternalThreadId);
                loadInternalThreads();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }
        function showInternalChatPopup(threadId, fromName) {
            currentInternalThreadId = threadId;
            var popup = document.getElementById('internalChatPopup');
            var titleEl = document.getElementById('internalChatPopupTitle');
            if (titleEl) titleEl.textContent = (LANG === 'fa' ? 'پیام از ' : 'Message from ') + (fromName || '');
            if (popup) popup.style.display = 'flex';
            loadInternalMessagesForPopup(threadId);
        }
        function closeInternalChatPopup() {
            var popup = document.getElementById('internalChatPopup');
            if (popup) popup.style.display = 'none';
            currentInternalThreadId = null;
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
            var me = (currentUser && currentUser.id) || '';
            var isOut = m.fromUserId === me;
            var att = (m.attachments && m.attachments.length) ? m.attachments.map(renderInternalAttachment).join('') : '';
            var html = '<div class="msg ' + (isOut ? 'out' : 'in') + '"><div>' + escapeHtml(m.content || '') + '</div>' + att + '<div class="time">' + (m.fromUser && m.fromUser.name ? m.fromUser.name : '') + ' · ' + (m.createdAt ? fmtTZ(m.createdAt, 'time') : '') + '</div></div>';
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
            list.innerHTML = data.length === 0 ? '<div class="empty">' + t('empty_internal_msgs') + '</div>' : data.map(function(m) {
                var isOut = m.fromUserId === me;
                var att = (m.attachments && m.attachments.length) ? m.attachments.map(renderInternalAttachment).join('') : '';
                return '<div class="msg ' + (isOut ? 'out' : 'in') + '"><div>' + escapeHtml(m.content || '') + '</div>' + att + '<div class="time">' + (m.fromUser && m.fromUser.name ? m.fromUser.name : '') + ' · ' + (m.createdAt ? fmtTZ(m.createdAt, 'time') : '') + '</div></div>';
            }).join('');
            list.scrollTop = list.scrollHeight;
        }
        async function sendInternalMessageFromPopup() {
            if (!currentInternalThreadId) return;
            var inp = document.getElementById('internalChatPopupInput');
            var content = (inp && inp.value) ? inp.value.trim() : '';
            if (!content) { toast(t('enter_text_or_file'), true); return; }
            var res = await apiFetch('/api/internal/threads/' + currentInternalThreadId + '/messages', { method: 'POST', body: JSON.stringify({ content: content, attachments: [] }) });
            if (res.needLogin) return;
            if (res.ok) {
                if (inp) inp.value = '';
                loadInternalMessagesForPopup(currentInternalThreadId);
                loadInternalThreads();
            } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        var qrRefreshInterval = null;
        async function loadWhatsappStatus() {
            var st = document.getElementById('gatewayStatus');
            var qrBox = document.getElementById('qrBox');
            var qrImg = document.getElementById('qrImg');
            var btn = document.getElementById('btnStartGateway');
            if (qrRefreshInterval) { clearInterval(qrRefreshInterval); qrRefreshInterval = null; }
            st.className = 'empty';
            st.innerHTML = t('whatsapp_checking');
            btn.style.display = 'none';
            qrBox.style.display = 'none';
            var ping = await apiFetch('/api/ping', { auth: false });
            if (ping.needLogin || (ping.data && !ping.data.ok)) {
                st.className = 'empty';
                st.innerHTML = t('whatsapp_server_err');
                return;
            }
            var res = await apiFetch('/api/gateway/status');
            if (res.needLogin) return;
            var data = res.data;
            if (data && data.error) {
                st.className = 'empty';
                st.textContent = t('whatsapp_gateway_off');
                btn.style.display = 'inline-block';
                return;
            }
            st.className = 'empty';
            st.textContent = t('whatsapp_status') + ' ' + (data && data.whatsapp ? t('whatsapp_connected') : t('whatsapp_disconnected')) + ' | ' + t('redis') + ': ' + (data && data.redis ? t('active') : t('inactive'));
            btn.style.display = 'none';
            if (data && data.whatsapp) { qrBox.style.display = 'none'; return; }
            var qrRes = await apiFetch('/api/gateway/qr');
            if (qrRes.needLogin) return;
            var qrData = qrRes.data;
            if (qrData && qrData.qr) { qrImg.src = qrData.qr; qrBox.style.display = 'block'; qrRefreshInterval = setInterval(loadWhatsappStatus, 5000); } else { qrBox.style.display = 'none'; }
        }

        async function startGateway() {
            var res = await apiFetch('/api/admin/start-gateway', { method: 'POST' });
            if (res.needLogin) return;
            var msg = (res.data && (res.data.message || res.data.error)) || t('done_msg');
            toast(msg);
            if (res.ok) setTimeout(loadWhatsappStatus, 3000);
        }

        async function loadDepartments() {
            var list = document.getElementById('deptList');
            setLoading('deptList', 4);
            var res = await apiFetch('/api/departments');
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            var data = res.data;
            if (!data.data || data.data.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">�x��</span><br>' + t('empty_dept') + '</div>'; return; }
            list.innerHTML = data.data.map(function(d) {
                var branchName = (d.branch && d.branch.name) ? d.branch.name : '';
                return '<div class="list-item"><div><span class="name">' + escapeHtml(d.name || '') + '</span><div class="meta">' + escapeHtml(d.description || '') + (branchName ? ' ⬢ ' + escapeHtml(branchName) : '') + '</div></div></div>';
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
            if (!data.data || data.data.length === 0) { list.innerHTML = '<div class="empty"><span class="empty-icon">�x�:️</span><br>' + t('empty_branches') + '</div>'; return; }
            var role = (currentUser && currentUser.role) || '';
            var canEdit = (role === 'owner' || role === 'admin');
            list.innerHTML = data.data.map(function(b) {
                var loc = [b.city, b.country].filter(Boolean).join('�R ');
                var name = (b.name || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                var city = (b.city || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                var country = (b.country || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                return '<div class="list-item" data-id="' + b.id + '" data-name="' + name + '" data-city="' + city + '" data-country="' + country + '"><div><span class="name">' + escapeHtml(b.name) + '</span><div class="meta">' + escapeHtml(loc || '�') + '</div></div>' + (canEdit ? '<button type="button" class="btn-secondary" style="margin:0; padding:6px 12px;" onclick="var li=this.closest(\'.list-item\'); editBranch(li.getAttribute(\'data-id\'), li.getAttribute(\'data-name\')||\'\', li.getAttribute(\'data-city\')||\'\', li.getAttribute(\'data-country\')||\'\')">' + t('edit') + '</button>' : '') + '</div>';
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
            if (res.ok) { document.getElementById('branchName').value = ''; document.getElementById('branchCity').value = ''; document.getElementById('branchCountry').value = ''; toast(id ? t('toast_branch_updated') : t('toast_branch_added')); loadBranches(); } else { toast((res.data && res.data.error) || t('err_generic'), true); }
        }

        function editBranch(id, name, city, country) {
            document.getElementById('branchName').value = (name || '').replace(/&quot;/g, '"').replace(/&lt;/g, '<');
            document.getElementById('branchCity').value = (city || '').replace(/&quot;/g, '"').replace(/&lt;/g, '<');
            document.getElementById('branchCountry').value = (country || '').replace(/&quot;/g, '"').replace(/&lt;/g, '<');
            window._editingBranchId = id;
            toast(t('edit_branch_hint'), false);
        }

        async function loadSupervisionPerformance() {
            var el = document.getElementById('supPerformanceContent');
            if (!el) return;
            el.innerHTML = t('loading');
            el.className = 'empty';
            var res = await apiFetch('/api/supervision/performance');
            if (res.needLogin) return;
            if (!res.ok) { el.innerHTML = t('err_generic') + ': ' + (res.data && res.data.error ? res.data.error : ''); return; }
            var d = res.data;
            var summary = d.summary || {};
            var html = '<div class="stat-cards"><div class="stat-card"><div class="val">' + (summary.conversationCount || 0) + '</div><div class="label">' + t('total_conversations') + '</div></div><div class="stat-card"><div class="val">' + (summary.messageCount || 0) + '</div><div class="label">' + t('outgoing_messages') + '</div></div></div>';
            if (d.branches && d.branches.length) {
                html += '<h3 style="margin:16px 0 8px; font-size:1rem;">' + t('sup_by_branch') + '</h3><table class="sup-table"><thead><tr><th>' + t('th_branch') + '</th><th>' + t('th_city_country') + '</th><th>' + t('th_conv_count') + '</th></tr></thead><tbody>';
                d.branches.forEach(function(b) { html += '<tr><td>' + escapeHtml(b.name) + '</td><td>' + escapeHtml((b.city || '') + ' ' + (b.country || '')) + '</td><td>' + (b.conversationCount || 0) + '</td></tr>'; });
                html += '</tbody></table>';
            }
            if (d.users && d.users.length) {
                html += '<h3 style="margin:16px 0 8px; font-size:1rem;">' + t('sup_by_user') + '</h3><table class="sup-table"><thead><tr><th>' + t('th_user') + '</th><th>' + t('th_email') + '</th><th>' + t('th_branch') + '</th><th>' + t('outgoing_messages') + '</th></tr></thead><tbody>';
                d.users.forEach(function(u) { html += '<tr><td>' + escapeHtml(u.name) + '</td><td>' + escapeHtml(u.email || '') + '</td><td>' + (u.branch && u.branch.name ? escapeHtml(u.branch.name) : '�') + '</td><td>' + (u.outgoingMessageCount || 0) + '</td></tr>'; });
                html += '</tbody></table>';
            }
            el.className = '';
            el.innerHTML = html || '<div class="empty">' + t('no_data') + '</div>';
        }

        async function loadSupervisionConversations() {
            var list = document.getElementById('supConvList');
            if (!list) return;
            list.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var branchId = document.getElementById('supBranch') && document.getElementById('supBranch').value ? document.getElementById('supBranch').value : '';
            var status = document.getElementById('supStatus') && document.getElementById('supStatus').value ? document.getElementById('supStatus').value : '';
            var q = '?limit=50';
            if (branchId) q += '&branchId=' + encodeURIComponent(branchId);
            if (status) q += '&status=' + encodeURIComponent(status);
            var res = await apiFetch('/api/supervision/conversations' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            var data = res.data.data || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty">' + t('empty_conv') + '</div>'; return; }
            list.innerHTML = '<table class="sup-table"><thead><tr><th>' + t('th_customer') + '</th><th>' + t('th_branch') + '</th><th>' + t('th_dept') + '</th><th>' + t('th_assignee') + '</th><th>' + t('th_status') + '</th></tr></thead><tbody>' + data.map(function(c) {
                var cust = c.customer || {};
                var branch = c.branch ? c.branch.name : '�';
                var dept = c.department ? c.department.name : '�';
                var assignee = userDisplay(c.assignee) || '�';
                return '<tr><td>' + escapeHtml(cust.name || cust.phone || '�') + '</td><td>' + escapeHtml(branch) + '</td><td>' + escapeHtml(dept) + '</td><td>' + escapeHtml(assignee) + '</td><td>' + (c.status || '�') + '</td></tr>';
            }).join('') + '</tbody></table>';
        }

        async function loadStaffActivity() {
            var onlineList = document.getElementById('onlineStaffList');
            var loginsList = document.getElementById('loginsList');
            var countEl = document.getElementById('onlineCount');
            if (onlineList) onlineList.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            if (loginsList) loginsList.innerHTML = '<div class="loading-skeleton loading-row"></div>';
            var onlineRes = await apiFetch('/api/supervision/online');
            if (onlineRes.needLogin) return;
            if (onlineRes.ok && onlineRes.data && onlineRes.data.data) {
                var users = onlineRes.data.data;
                if (countEl) countEl.textContent = users.length;
                if (onlineList) {
                    if (users.length === 0) onlineList.innerHTML = '<div class="empty">' + t('no_staff_online') + '</div>';
                    else onlineList.innerHTML = '<table class="sup-table"><thead><tr><th>' + t('label_name') + '</th><th>' + t('th_email') + '</th><th>' + t('th_branch') + '</th><th>' + t('th_status') + '</th><th>' + t('th_last_login') + '</th></tr></thead><tbody>' + users.map(function(u) {
                        var statusClass = (u.status || 'offline').toLowerCase();
                        var statusLabel = { online: t('status_online'), away: t('status_away'), busy: t('status_busy'), offline: t('status_offline') }[statusClass] || u.status;
                        var lastLogin = u.lastLoginAt ? fmtTZ(u.lastLoginAt, 'datetime') : '�';
                        var branchName = (u.branch && u.branch.name) ? u.branch.name : '�';
                        return '<tr class="staff-row" data-user-id="' + escapeHtml(u.id || '') + '" onclick="var uid=this.getAttribute(\'data-user-id\');if(uid&&event.target.tagName!==\'A\')openStaffDetailModal(uid)" style="cursor:pointer"><td>' + escapeHtml(userDisplay(u)) + '</td><td>' + escapeHtml(u.email || '\u2014') + '</td><td>' + escapeHtml(branchName) + '</td><td><span class="status-dot ' + statusClass + '"></span>' + statusLabel + '</td><td>' + lastLogin + '</td></tr>';
                    }).join('') + '</tbody></table>';
                }
            } else { if (onlineList) onlineList.innerHTML = '<div class="empty">' + t('loading_err') + '</div>'; if (countEl) countEl.textContent = '0'; }
            var loginsRes = await apiFetch('/api/supervision/logins?limit=50');
            if (loginsRes.needLogin) return;
            if (loginsRes.ok && loginsRes.data && loginsRes.data.data) {
                var rows = loginsRes.data.data;
                if (loginsList) {
                    if (rows.length === 0) loginsList.innerHTML = '<div class="empty">' + t('empty_no_logins') + '</div>';
                    else loginsList.innerHTML = '<table class="sup-table"><thead><tr><th>' + t('th_user') + '</th><th>' + t('th_email') + '</th><th>' + t('th_branch') + '</th><th>' + t('th_login_time') + '</th><th>' + t('th_summary') + '</th></tr></thead><tbody>' + rows.map(function(r) {
                        var user = r.user || {};
                        var branch = r.branch ? r.branch.name : '�';
                        var time = r.createdAt ? fmtTZ(r.createdAt, 'datetime') : '';
                        var uid = r.userId || (user && user.id) || '';
                        var rowAttrs = uid ? ' class="staff-row" data-user-id="' + escapeHtml(uid) + '" onclick="openStaffDetailModal(this.getAttribute(\'data-user-id\'))" style="cursor:pointer"' : '';
                        return '<tr' + rowAttrs + '><td>' + escapeHtml(userDisplay(user)) + '</td><td>' + escapeHtml(user.email || '\u2014') + '</td><td>' + escapeHtml(branch) + '</td><td>' + time + '</td><td>' + escapeHtml(r.summary || '') + '</td></tr>';
                    }).join('') + '</tbody></table>';
                }
            } else { if (loginsList) loginsList.innerHTML = '<div class="empty">' + t('login_err_load') + '</div>'; }
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
                if (d.recentActivities && d.recentActivities.length > 0) {
                    html += '<h4 style="font-size:0.95rem;margin:16px 0 8px;">' + (LANG === 'fa' ? 'آخرین فعالیت‌ها' : 'Recent activities') + '</h4>';
                    html += '<table class="sup-table"><thead><tr><th>' + t('th_time') + '</th><th>' + t('th_action') + '</th><th>' + t('th_summary') + '</th></tr></thead><tbody>';
                    d.recentActivities.forEach(function(a) {
                        html += '<tr><td>' + (a.createdAt ? fmtTZ(a.createdAt, 'datetime') : '') + '</td><td>' + escapeHtml(actLabels[a.action] || a.action || '') + '</td><td>' + escapeHtml(a.summary || '') + '</td></tr>';
                    });
                    html += '</tbody></table>';
                }
                if (!d.sessions || d.sessions.length === 0) { if (!d.recentActivities || d.recentActivities.length === 0) html += '<p class="text-muted" style="font-size:0.9rem;">' + (LANG === 'fa' ? 'ورود/خروج ثبت‌شده‌ای یافت نشد. با خروج صحیح از سیستم، ساعات آنلاین دقیق‌تر محاسبه می‌شود.' : 'No login/logout records yet.') + '</p>'; }
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
            var action = document.getElementById('supActAction') && document.getElementById('supActAction').value ? document.getElementById('supActAction').value : '';
            var q = '?limit=100';
            if (branchId) q += '&branchId=' + encodeURIComponent(branchId);
            if (action) q += '&action=' + encodeURIComponent(action);
            var res = await apiFetch('/api/supervision/activity' + q);
            if (res.needLogin) return;
            if (!res.ok) { list.innerHTML = '<div class="empty">' + t('err_generic') + ': ' + (res.data && res.data.error ? res.data.error : '') + '</div>'; return; }
            var data = res.data.data || [];
            if (data.length === 0) { list.innerHTML = '<div class="empty">' + t('no_data') + '</div>'; return; }
            list.innerHTML = '<table class="sup-table"><thead><tr><th>' + t('th_time') + '</th><th>' + t('th_user') + '</th><th>' + t('th_branch') + '</th><th>' + t('th_action') + '</th><th>' + t('th_summary') + '</th></tr></thead><tbody>' + data.map(function(a) {
                var time = a.createdAt ? fmtTZ(a.createdAt, 'datetime') : '';
                var user = userDisplay(a.user) || '�';
                var branch = a.branch ? a.branch.name : '�';
                return '<tr><td>' + time + '</td><td>' + escapeHtml(user) + '</td><td>' + escapeHtml(branch) + '</td><td>' + escapeHtml(a.action || '') + '</td><td>' + escapeHtml(a.summary || '') + '</td></tr>';
            }).join('') + '</tbody></table>';
        }

        document.querySelectorAll('.sup-tab').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var tab = this.getAttribute('data-tab');
                document.querySelectorAll('.sup-tab').forEach(function(b) { b.classList.remove('active'); if (b.getAttribute('data-tab') === tab) b.classList.add('active'); });
                document.querySelectorAll('.sup-panel').forEach(function(p) { p.classList.remove('show'); if ((p.id === 'supPerformance' && tab === 'performance') || (p.id === 'supConversations' && tab === 'conversations') || (p.id === 'supActivity' && tab === 'activity')) p.classList.add('show'); });
                if (tab === 'performance') loadSupervisionPerformance();
                if (tab === 'conversations') loadSupervisionConversations();
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
        (function initFooterYear() {
            var el = document.getElementById('appFooterYear');
            if (el) el.textContent = '\u00A9 ' + new Date().getFullYear();
        })();

        (function initLang() {
            var l = localStorage.getItem('crm_lang') || 'fa';
            setLang(l);
        })();

        if (token) {
            apiFetch('/api/auth/me').then(function(res) {
                if (res.needLogin || !res.ok) { logout(); return; }
                var u = res.data;
                currentUser = u;
                if (u && u.email) {
                    setUserDisplay(u);
                    document.getElementById('loginBox').style.display = 'none';
                    document.getElementById('app').classList.add('show');
                    applyNavByRole();
                    applyHashRoute();
                    loadDashboard();
                    loadGeneralAnnouncementsMarquee();
                    startRatesInterval();
                    startPresenceInterval();
                    connectSocket();
                    startNavBadgeRefresh();
                    showTotpPromptIfNeeded();
                } else { logout(); }
            }).catch(function() { logout(); });
        }