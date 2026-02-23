/**
 * نرمال‌سازی شماره تلفن برای واتساپ
 * واتساپ فرمت 989121234567 (کد کشور + شماره بدون صفر اول) می‌خواهد
 */
function normalizePhone(val) {
    if (val == null || val === '') return '';
    let s = String(val).replace(/@c\.us$/i, '').replace(/\D/g, '').trim();
    if (!s) return '';
    // حذف صفر اول برای شماره‌های ایرانی (مثل 09121234567)
    if (s.startsWith('0') && s.length > 10) s = s.slice(1);
    // اگر کد کشور ندارد و طول مناسب است، 98 اضافه کن
    if (s && !s.startsWith('98') && s.length <= 10) s = '98' + s;
    return s;
}

module.exports = { normalizePhone };
