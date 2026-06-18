/**
 * Converts audio files (webm/mp4/wav/etc.) to OGG Opus format
 * required by WhatsApp for voice messages.
 */
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const logger = require('../config/logger');

ffmpeg.setFfmpegPath(ffmpegPath);

/** MIME that WhatsApp Web expects for PTT (voice note) bubbles */
const WHATSAPP_VOICE_MIME = 'audio/ogg; codecs=opus';
const WHATSAPP_VOICE_FILENAME = 'audio.ogg';

/**
 * Convert an audio file to ogg/opus suitable for WhatsApp voice messages.
 * @param {string} inputPath  - absolute path to source file
 * @param {string} outputPath - absolute path for output .ogg file
 * @returns {Promise<string>} outputPath on success
 */
function convertToOggOpus(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        // WhatsApp voice notes (PTT) must be a clean OGG/Opus stream encoded at
        // 48kHz mono. Using a lower sample rate (e.g. 16kHz) produces a file that
        // WhatsApp accepts on send but the recipient's phone cannot decode, so it
        // shows "this voice was deleted" / refuses to play. The voip application
        // profile and metadata stripping match what the WhatsApp client expects.
        ffmpeg(inputPath)
            .noVideo()
            .audioCodec('libopus')
            .audioChannels(1)
            .audioFrequency(48000)
            .audioBitrate('64k')
            .outputOptions([
                '-application', 'voip',
                '-map_metadata', '-1',
                '-avoid_negative_ts', 'make_zero',
                '-vbr', 'on',
                '-compression_level', '10',
                '-y',
            ])
            .format('ogg')
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
}

/**
 * Given a file path and mimetype, if it is an audio file convert it to ogg/opus.
 * Returns { filePath, mimetype, filename } — either converted or original.
 */
async function ensureVoiceFormat(filePath, mimetype, filename) {
    const baseName = path.basename(filePath);

    // Output from a prior ensureVoiceFormat in the same send pipeline — skip re-encode.
    if (baseName.includes('_voice.ogg') && fs.existsSync(filePath)) {
        try {
            const st = await fsPromises.stat(filePath);
            if (st.size >= 512) {
                return {
                    filePath,
                    mimetype: WHATSAPP_VOICE_MIME,
                    filename: WHATSAPP_VOICE_FILENAME,
                };
            }
        } catch (_) { /* fall through to transcode */ }
    }

    // Browser/webm and mis-tagged ogg must be re-encoded — WhatsApp rejects wrong Opus params
    // (bubble appears but recipient sees "this voice was deleted").
    // Relying on the exact mimetype is unreliable (browsers send
    // "audio/webm;codecs=opus", some uploads arrive as octet-stream), so we
    // convert by default and only fall back to the original if ffmpeg fails.
    const outPath = filePath.replace(/\.[^.]+$/, '') + '_voice.ogg';
    try {
        await convertToOggOpus(filePath, outPath);
        const outStat = await fsPromises.stat(outPath);
        if (outStat.size < 512) {
            throw new Error('Converted voice file is too small');
        }
        logger.info('Audio converted to ogg/opus for WhatsApp voice', { from: filePath, to: outPath, bytes: outStat.size });
        return { filePath: outPath, mimetype: WHATSAPP_VOICE_MIME, filename: WHATSAPP_VOICE_FILENAME };
    } catch (err) {
        logger.error('Audio conversion failed — WhatsApp voice requires ogg/opus', {
            error: err.message,
            from: filePath,
        });
        throw new Error('تبدیل فایل صوتی به فرمت واتساپ (ogg/opus) انجام نشد');
    }
}

function isWhatsAppVoiceMime(mimetype) {
    const raw = String(mimetype || '').toLowerCase();
    return raw.includes('ogg') || raw.includes('opus');
}

module.exports = {
    convertToOggOpus,
    ensureVoiceFormat,
    isWhatsAppVoiceMime,
    WHATSAPP_VOICE_MIME,
    WHATSAPP_VOICE_FILENAME,
};
