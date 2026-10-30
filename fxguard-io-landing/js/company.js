/**
 * FXGuard storefront — seller identity (single source of truth).
 * Rendered into every [data-company-block] on contact and legal pages.
 * Values come from the tax certificate (vergi levhası) and the Turkish Trade
 * Registry Gazette; keep them identical to those documents. Empty fields are
 * not rendered — fill KEP once the registered e-mail address is issued.
 */
(function () {
    'use strict';

    var COMPANY = {
        legalName: 'ERST IT Solutions Bilişim Teknolojileri Sanayi ve Ticaret Limited Şirketi',
        address: 'Gökevler Mah. 2312. Sk. Burç İstanbul 18 Blok No: 18 J İç Kapı No: 199, Esenyurt / İstanbul, Türkiye',
        taxOffice: 'Esenyurt',
        taxNo: '3700430202',
        mersis: '0370043020200001',
        tradeRegistry: 'İstanbul Ticaret Sicili Müdürlüğü — 129956-5',
        kep: '',
        chamber: 'İstanbul Ticaret Odası (İTO)',
        email: 'support@fxguard.io',
        salesEmail: 'sales@fxguard.io',
        phone: '+90 501 067 6486'
    };

    var LABELS = {
        en: { h: 'Company details', legalName: 'Trade name', address: 'Registered address', taxOffice: 'Tax office', taxNo: 'Tax number', mersis: 'MERSİS number', tradeRegistry: 'Trade registry / number', kep: 'KEP address', chamber: 'Chamber of commerce', email: 'Email', phone: 'Phone / WhatsApp' },
        fa: { h: 'مشخصات شرکت', legalName: 'نام ثبتی شرکت', address: 'نشانی ثبتی', taxOffice: 'اداره مالیات', taxNo: 'شماره مالیاتی', mersis: 'شماره MERSİS', tradeRegistry: 'اداره و شماره ثبت تجاری', kep: 'نشانی KEP', chamber: 'اتاق بازرگانی', email: 'ایمیل', phone: 'تلفن / واتساپ' },
        tr: { h: 'Şirket bilgileri', legalName: 'Ticaret unvanı', address: 'Merkez adresi', taxOffice: 'Vergi dairesi', taxNo: 'Vergi numarası', mersis: 'MERSİS numarası', tradeRegistry: 'Ticaret sicili / sicil no', kep: 'KEP adresi', chamber: 'Kayıtlı olduğu meslek odası', email: 'E-posta', phone: 'Telefon / WhatsApp' },
        ar: { h: 'بيانات الشركة', legalName: 'الاسم التجاري', address: 'العنوان المسجل', taxOffice: 'مكتب الضرائب', taxNo: 'الرقم الضريبي', mersis: 'رقم MERSİS', tradeRegistry: 'السجل التجاري / الرقم', kep: 'عنوان KEP', chamber: 'الغرفة التجارية', email: 'البريد الإلكتروني', phone: 'الهاتف / واتساب' },
        ru: { h: 'Реквизиты компании', legalName: 'Наименование', address: 'Юридический адрес', taxOffice: 'Налоговая инспекция', taxNo: 'Налоговый номер', mersis: 'Номер MERSİS', tradeRegistry: 'Торговый реестр / номер', kep: 'Адрес KEP', chamber: 'Торговая палата', email: 'Эл. почта', phone: 'Телефон / WhatsApp' }
    };

    var ROWS = ['legalName', 'address', 'taxOffice', 'taxNo', 'mersis', 'tradeRegistry', 'kep', 'chamber', 'email', 'phone'];
    var LTR_KEYS = { taxNo: 1, mersis: 1, kep: 1 };

    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function value(key) {
        var v = COMPANY[key];
        if (key === 'email') {
            return '<a href="mailto:' + esc(v) + '">' + esc(v) + '</a> · <a href="mailto:' + esc(COMPANY.salesEmail) + '">' + esc(COMPANY.salesEmail) + '</a>';
        }
        if (key === 'phone') {
            return '<a href="tel:' + esc(v.replace(/\s+/g, '')) + '" dir="ltr">' + esc(v) + '</a>';
        }
        if (LTR_KEYS[key]) return '<span dir="ltr">' + esc(v) + '</span>';
        return esc(v);
    }

    function currentLang() {
        var l = (document.documentElement.getAttribute('lang') || 'en').slice(0, 2).toLowerCase();
        return LABELS[l] ? l : 'en';
    }

    function render() {
        var L = LABELS[currentLang()];
        document.querySelectorAll('[data-company-block]').forEach(function (el) {
            var html = el.hasAttribute('data-company-noheading') ? '' : '<h2>' + esc(L.h) + '</h2>';
            html += '<dl class="company-dl">';
            ROWS.forEach(function (key) {
                if (!COMPANY[key]) return;
                html += '<dt>' + esc(L[key]) + '</dt><dd dir="auto">' + value(key) + '</dd>';
            });
            html += '</dl>';
            el.innerHTML = html;
        });
    }

    window.FXG_COMPANY = COMPANY;

    function init() {
        render();
        new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
