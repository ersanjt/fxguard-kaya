package com.kaya.crm.media

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import java.io.File

/**
 * ضبط کوتاه صدا برای ارسال به‌عنوان پیام صوتی (مثل واتساپ).
 * خروجی AAC در cache؛ بک‌اند در صورت نیاز تبدیل می‌کند.
 */
class VoiceRecorder(private val context: Context) {

    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null

    fun start(): Result<File> = runCatching {
        stopQuietly()
        val dir = File(context.cacheDir, "voice").apply { mkdirs() }
        val out = File(dir, "voice_${System.currentTimeMillis()}.m4a")
        val mr = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(context)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }
        mr.setAudioSource(MediaRecorder.AudioSource.MIC)
        mr.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        mr.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        mr.setAudioEncodingBitRate(128_000)
        mr.setAudioSamplingRate(44_100)
        mr.setOutputFile(out.absolutePath)
        mr.prepare()
        mr.start()
        recorder = mr
        outputFile = out
        out
    }

    /** پایان ضبط و برگرداندن فایل؛ در صورت خطا null */
    fun stop(): File? {
        val f = outputFile
        stopQuietly()
        return f?.takeIf { it.exists() && it.length() > 0 }
    }

    fun cancel() {
        val f = outputFile
        stopQuietly()
        f?.delete()
    }

    private fun stopQuietly() {
        try {
            recorder?.apply {
                try {
                    stop()
                } catch (_: Exception) {
                }
                reset()
                release()
            }
        } catch (_: Exception) {
        }
        recorder = null
        outputFile = null
    }
}
