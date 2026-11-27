'use strict';

const PLACEHOLDERS = {
    image: '📷 تصویر',
    video: '🎬 ویدیو',
    ptt: '🎤 پیام صوتی',
    audio: '🎤 پیام صوتی',
    document: '📄 فایل',
    sticker: '🌟 استیکر',
    file: '📎 فایل',
};

function looksLikeEmbeddedMediaPayload(value) {
    const raw = String(value || '').trim();
    if (!raw) return false;
    const compact = raw.replace(/\s+/g, '');
    if (/^data:(image|video|audio|application)\//i.test(compact)) return true;
    if (
        compact.startsWith('/9j/') ||
        compact.startsWith('iVBORw0KGgo') ||
        compact.startsWith('R0lGOD') ||
        compact.startsWith('UklGR') ||
        compact.startsWith('JVBERi0') ||
        compact.startsWith('T2dnUw')
    ) {
        return true;
    }
    return !/\s/.test(raw) && compact.length >= 240 && /^[A-Za-z0-9+/]+=*$/.test(compact);
}

function looksLikeBareMediaFilename(value) {
    const t = String(value || '').trim();
    if (!t) return true;
    if (t === 'file' || t === PLACEHOLDERS.file) return true;
    if (/^(voice|audio|ptt|image|video|sticker|document)(\.[a-z0-9]+)?$/i.test(t)) return true;
    if (/\.(ogg|opus|oga|webm|m4a|mp3|wav)$/i.test(t) && /voice|ptt|audio/i.test(t)) return true;
    return false;
}

function mediaPlaceholder(rawType) {
    const t = String(rawType || '').toLowerCase();
    return PLACEHOLDERS[t] || 'پیام رسانه‌ای';
}

function clipPreview(text) {
    const s = String(text || '').trim();
    if (s.length > 120) return s.slice(0, 120) + '…';
    return s;
}

function inferPreviewType({ rawType, msgType, filename, isVoice }) {
    const name = String(filename || '').toLowerCase();
    const raw = String(rawType || '').toLowerCase();
    const msg = String(msgType || '').toLowerCase();
    if (isVoice || raw === 'ptt' || /voice|ptt/i.test(name) || /\.(ogg|opus|oga)$/i.test(name)) {
        return 'ptt';
    }
    if (raw === 'audio' || msg === 'audio') return 'audio';
    if (raw === 'image' || msg === 'image') return 'image';
    if (raw === 'video' || msg === 'video') return 'video';
    if (raw === 'sticker' || msg === 'sticker') return 'sticker';
    if (raw === 'document' || msg === 'document') return 'document';
    return raw || msg || 'file';
}

function inboxPreviewFromIncoming({
    body,
    filename,
    caption,
    rawType,
    msgType,
    hasMedia,
} = {}) {
    const fromBodyRaw = String(body || '').trim();
    const fromBody = looksLikeEmbeddedMediaPayload(fromBodyRaw) ? '' : fromBodyRaw;
    const fromCaption = looksLikeEmbeddedMediaPayload(caption) ? '' : String(caption || '').trim();
    const fromFile = String(filename || '').trim();
    let previewText = fromBody || fromCaption || fromFile;
    if (!previewText || looksLikeBareMediaFilename(previewText)) {
        if (hasMedia || looksLikeBareMediaFilename(fromFile) || rawType || msgType) {
            previewText = mediaPlaceholder(
                inferPreviewType({ rawType, msgType, filename: fromFile || fromBody })
            );
        }
    }
    return clipPreview(previewText);
}

function inboxPreviewFromOutgoing({ text, hasMedia, isVoice, msgType, filename } = {}) {
    const fromTextRaw = String(text || '').trim();
    const fromText = looksLikeEmbeddedMediaPayload(fromTextRaw) ? '' : fromTextRaw;
    if (fromText && !looksLikeBareMediaFilename(fromText)) {
        return clipPreview(fromText);
    }
    if (hasMedia || isVoice) {
        return mediaPlaceholder(
            inferPreviewType({ msgType, filename: filename || fromText, isVoice })
        );
    }
    return clipPreview(fromText);
}

module.exports = {
    looksLikeBareMediaFilename,
    looksLikeEmbeddedMediaPayload,
    mediaPlaceholder,
    inboxPreviewFromIncoming,
    inboxPreviewFromOutgoing,
};
