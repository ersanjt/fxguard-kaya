/**
 * Converts audio files (webm/mp4/wav/etc.) to OGG Opus format
 * required by WhatsApp for voice messages.
 */
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const logger = require('../config/logger');

ffmpeg.setFfmpegPath(ffmpegPath);

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
            .audioBitrate('32k')
            .outputOptions(['-application', 'voip', '-map_metadata', '-1', '-y'])
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
    const baseMime = (mimetype || '').split(';')[0].trim().toLowerCase();
    const ext = path.extname(filePath).toLowerCase();

    // Already ogg/opus — no conversion needed.
    if (
        baseMime === 'audio/ogg' ||
        baseMime === 'audio/opus' ||
        ext === '.ogg' ||
        ext === '.oga' ||
        ext === '.opus'
    ) {
        return { filePath, mimetype: 'audio/ogg', filename: filename || path.basename(filePath) };
    }

    // Anything else reaching here is an outbound voice message (the caller only
    // invokes this for audio), so always transcode to the WhatsApp voice format.
    // Relying on the exact mimetype is unreliable (browsers send
    // "audio/webm;codecs=opus", some uploads arrive as octet-stream), so we
    // convert by default and only fall back to the original if ffmpeg fails.
    const outPath = filePath.replace(/\.[^.]+$/, '') + '_voice.ogg';
    try {
        await convertToOggOpus(filePath, outPath);
        logger.info('Audio converted to ogg/opus for WhatsApp voice', { from: filePath, to: outPath });
        return { filePath: outPath, mimetype: 'audio/ogg', filename: (filename || 'voice').replace(/\.[^.]+$/, '') + '.ogg' };
    } catch (err) {
        logger.error('Audio conversion failed — WhatsApp voice requires ogg/opus', {
            error: err.message,
            from: filePath,
        });
        throw new Error('تبدیل فایل صوتی به فرمت واتساپ (ogg/opus) انجام نشد');
    }
}

function isWhatsAppVoiceMime(mimetype) {
    const base = (mimetype || '').split(';')[0].trim().toLowerCase();
    return base === 'audio/ogg' || base === 'audio/opus';
}

module.exports = { convertToOggOpus, ensureVoiceFormat, isWhatsAppVoiceMime };
