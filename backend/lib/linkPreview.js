/**
 * FXGuard — پیش‌نمایش لینک واتساپ (عنوان، توضیح، تصویر کوچک) که Gateway از خود پیام می‌فرستد
 * @file    backend/lib/linkPreview.js
 * @layer   backend
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/CODEBASE-MAP.md
 */
'use strict';

const MAX_THUMB_CHARS = 200000;
const THUMB_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

function cleanText(v, max) {
    return String(v == null ? '' : v)
        .replace(/\p{Cc}+/gu, ' ')
        .trim()
        .slice(0, max);
}

/** فقط فیلدهای امن ذخیره می‌شود؛ تصویر کوچک فقط data URL خود پیام است، نه آدرس بیرونی. */
function sanitizeLinkPreview(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const url = cleanText(raw.url, 2000);
    if (!/^https?:\/\/[^\s]+$/i.test(url)) return null;
    const title = cleanText(raw.title, 300);
    const description = cleanText(raw.description, 600);
    const thumb = typeof raw.thumbnail === 'string' ? raw.thumbnail.trim() : '';
    const thumbnail = thumb.length <= MAX_THUMB_CHARS && THUMB_RE.test(thumb) ? thumb : '';
    if (!title && !description && !thumbnail) return null;
    return { url, title, description, thumbnail };
}

module.exports = { sanitizeLinkPreview };
