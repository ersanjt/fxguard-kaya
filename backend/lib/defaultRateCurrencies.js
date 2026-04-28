/** لیست پیش‌فرض ارزها برای seed و fallback وقتی جدول خالی است */
module.exports = [
    { key: 'usd', label: 'دلار', apiKeys: ['usd_sell', 'usd_buy'], sortOrder: 0 },
    { key: 'eur', label: 'یورو', apiKeys: ['eur', 'mex_eur_sell'], sortOrder: 1 },
    { key: 'gbp', label: 'پوند', apiKeys: ['gbp', 'gbp_hav'], sortOrder: 2 },
    { key: 'chf', label: 'فرانک سوئیس', apiKeys: ['chf', 'chf_sell', 'chf_hav'], sortOrder: 3 },
    { key: 'cad', label: 'دلار کانادا', apiKeys: ['cad', 'cad_sell', 'cad_hav'], sortOrder: 4 },
    { key: 'aud', label: 'دلار استرالیا', apiKeys: ['aud', 'aud_sell', 'aud_hav'], sortOrder: 5 },
    { key: 'jpy', label: 'ین ژاپن', apiKeys: ['jpy', 'jpy_sell', 'jpy_hav'], sortOrder: 6 },
    { key: 'try', label: 'لیر ترکیه', apiKeys: ['try', 'try_hav'], sortOrder: 7 },
    { key: 'aed', label: 'درهم امارات', apiKeys: ['aed_sell', 'dirham_dubai'], sortOrder: 8 },
    { key: 'sar', label: 'ریال عربستان', apiKeys: ['sar', 'sar_sell', 'sar_hav'], sortOrder: 9 },
    { key: 'kwd', label: 'دینار کویت', apiKeys: ['kwd', 'kwd_sell', 'kwd_hav'], sortOrder: 10 },
    { key: 'iqd', label: 'دینار عراق', apiKeys: ['iqd', 'iqd_sell', 'iqd_hav'], sortOrder: 11 },
    { key: 'rub', label: 'روبل روسیه', apiKeys: ['rub'], sortOrder: 12 },
    { key: 'azn', label: 'منات آذربایجان', apiKeys: ['azn'], sortOrder: 13 },
    { key: 'cny', label: 'یوان چین', apiKeys: ['cny', 'cny_hav'], sortOrder: 14 },
    { key: 'inr', label: 'روپیه هند', apiKeys: ['inr', 'inr_sell', 'inr_hav'], sortOrder: 15 },
    { key: 'gold', label: 'طلا (گرم)', apiKeys: ['18ayar'], sortOrder: 16 }
];
