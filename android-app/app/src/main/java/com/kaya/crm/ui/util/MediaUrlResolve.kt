package com.kaya.crm.ui.util

import com.kaya.crm.data.ApiConfig
import java.net.URI
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

object MediaUrlResolve {
    /** هم‌خوان با بک‌اند: فقط CDNهای پروفایل برای `/api/profile-image` */
    private val PROFILE_PROXY_HOST_SUFFIXES = listOf(
        "whatsapp.net",
        "fbcdn.net",
        "facebook.com",
        "instagram.com",
        "cdninstagram.com",
        "googleusercontent.com"
    )

    /** ریشهٔ سرور بدون اسلش انتهایی — مثل `https://host` */
    fun serverRootFromSaved(saved: String?): String {
        val s = saved?.trim()?.trimEnd('/')?.takeIf { it.isNotEmpty() }
        return s ?: ApiConfig.BASE_URL.trim().trimEnd('/')
    }

    /** آدرس کامل برای تصویر/لوگو نسبی یا مطلق (همان منطق پروفایل و ورود) */
    fun absoluteFromApiPath(path: String?, baseApi: String): String? {
        if (path.isNullOrBlank()) return null
        if (path.startsWith("http://", true) || path.startsWith("https://", true)) return path
        val origin = baseApi.trimEnd('/').removeSuffix("/api").removeSuffix("/api/")
        return origin + if (path.startsWith("/")) path else "/$path"
    }

    /**
     * URL نهایی برای Coil: همان‌origin بدون تغییر؛ CDN پروفایل → `/api/profile-image?url=…` (نیاز به توکن در OkHttp).
     */
    fun profilePicDisplayUrl(raw: String?, serverRoot: String): String? {
        if (raw.isNullOrBlank()) return null
        val trimmed = raw.trim()
        if (trimmed.startsWith("data:", ignoreCase = true)) return trimmed
        val root = serverRoot.trim().trimEnd('/')
        val baseApi = "$root/api/"
        val absolute = absoluteFromApiPath(trimmed, baseApi) ?: return null
        if (!absolute.startsWith("http", ignoreCase = true)) return null
        return try {
            val uri = URI(absolute)
            val host = uri.host?.lowercase() ?: return absolute
            val apiHost = URI(root).host?.lowercase() ?: return absolute
            if (host == apiHost) return absolute
            if (hostNeedsProfileProxy(host)) {
                val enc = URLEncoder.encode(absolute, StandardCharsets.UTF_8.name())
                "$root/api/profile-image?url=$enc"
            } else {
                absolute
            }
        } catch (_: Exception) {
            absolute
        }
    }

    private fun hostNeedsProfileProxy(host: String): Boolean {
        val h = host.lowercase()
        return PROFILE_PROXY_HOST_SUFFIXES.any { suf -> h == suf || h.endsWith(".$suf") }
    }

    /** تبدیل مسیر نسبی `/uploads/...` به URL قابل نمایش/باز کردن */
    fun publicFile(pathOrUrl: String): String {
        val t = pathOrUrl.trim()
        if (t.startsWith("http", ignoreCase = true)) return t
        val root = ApiConfig.BASE_URL.trim().trimEnd('/')
        val p = t.removePrefix("/")
        return "$root/$p"
    }

    fun looksLikeImage(url: String, label: String?): Boolean {
        val s = "$url ${label ?: ""}".lowercase()
        return listOf(".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp").any { s.contains(it) }
    }
}
