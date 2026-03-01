/**
 * Converts audio files (webm/mp4/wav/etc.) to OGG Opus format
 * required by WhatsApp for voice messages.
 */
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const fs = require('fs');
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
        ffmpeg(inputPath)
            .audioCodec('libopus')
            .audioChannels(1)
            .audioFrequency(16000)
            .audioBitrate('16k')
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
    const audioMimes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/x-m4a'];
    const baseMime = (mimetype || '').split(';')[0].trim().toLowerCase();

    // Already ogg/opus — no conversion needed
    if (baseMime === 'audio/ogg' || path.extname(filePath).toLowerCase() === '.ogg') {
        return { filePath, mimetype: 'audio/ogg', filename: filename || path.basename(filePath) };
    }

    if (!audioMimes.some(m => baseMime.startsWith(m.split('/')[0] + '/') && baseMime.includes('audio'))) {
        // Not audio at all
        return { filePath, mimetype, filename };
    }

    const outPath = filePath.replace(/\.[^.]+$/, '') + '_voice.ogg';
    try {
        await convertToOggOpus(filePath, outPath);
        logger.info('Audio converted to ogg/opus for WhatsApp voice', { from: filePath, to: outPath });
        return { filePath: outPath, mimetype: 'audio/ogg', filename: (filename || 'voice').replace(/\.[^.]+$/, '') + '.ogg' };
    } catch (err) {
        logger.warn('Audio conversion failed, sending original', { error: err.message });
        return { filePath, mimetype, filename };
    }
}

module.exports = { convertToOggOpus, ensureVoiceFormat };
