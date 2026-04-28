package com.kaya.crm.data.repository

import android.content.Context
import com.kaya.crm.BuildConfig
import com.kaya.crm.data.api.ApiService
import com.kaya.crm.data.models.AndroidAppUpdateDto
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject
import javax.inject.Named
import javax.inject.Singleton

@Singleton
class AppUpdateRepository @Inject constructor(
    private val apiService: ApiService,
    @Named("updateDownloader") private val downloadClient: OkHttpClient,
    @ApplicationContext private val appContext: Context
) {

    /**
     * @param skippedVersionCode آخرین نسخهٔ اختیاری که کاربر «بعداً» زده؛ برای اجباری نادیده گرفته می‌شود.
     */
    suspend fun fetchAvailableUpdate(skippedVersionCode: Int = 0): Result<AndroidAppUpdateDto?> =
        withContext(Dispatchers.IO) {
            runCatching {
                val response = apiService.getPublicConfig()
                if (!response.isSuccessful) {
                    error("config HTTP ${response.code()}")
                }
                val body = response.body() ?: error("empty config")
                val info = body.androidAppUpdate ?: return@runCatching null
                if (info.versionCode <= BuildConfig.VERSION_CODE) return@runCatching null
                if (info.apkUrl.isBlank() || !info.apkUrl.startsWith("https://", ignoreCase = true)) {
                    error("invalid apkUrl")
                }
                if (!info.mandatory && info.versionCode <= skippedVersionCode) return@runCatching null
                info
            }
        }

    /**
     * دانلود APK به حافظهٔ داخلی اپ؛ [onProgress] درصدی ۰…۱۰۰ (در صورت دانستن Content-Length).
     */
    suspend fun downloadApk(
        apkUrl: String,
        onProgress: (Int) -> Unit
    ): Result<File> = withContext(Dispatchers.IO) {
        runCatching {
            if (apkUrl.isBlank() || !apkUrl.startsWith("https://", ignoreCase = true)) {
                error("invalid apkUrl")
            }
            val dir = File(appContext.filesDir, "updates").apply { mkdirs() }
            val outFile = File(dir, "kaya-crm-update.apk")
            val request = Request.Builder().url(apkUrl).get().build()
            downloadClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) error("دانلود ناموفق: ${response.code}")
                val body = response.body ?: error("بدون بدنه")
                val total = body.contentLength()
                body.byteStream().use { input ->
                    FileOutputStream(outFile).use { output ->
                        val buf = ByteArray(8192)
                        var read: Int
                        var done = 0L
                        while (input.read(buf).also { read = it } != -1) {
                            output.write(buf, 0, read)
                            done += read
                            if (total > 0) {
                                onProgress(((done * 100L) / total).toInt().coerceIn(0, 100))
                            }
                        }
                    }
                }
            }
            if (outFile.length() < 64 * 1024) error("فایل دریافتی خیلی کوچک است")
            outFile
        }
    }
}
