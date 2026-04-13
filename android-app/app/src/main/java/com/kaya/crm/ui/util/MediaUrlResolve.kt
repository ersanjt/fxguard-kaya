package com.kaya.crm.ui.util

import com.kaya.crm.data.ApiConfig

object MediaUrlResolve {
    /** آدرس کامل برای تصویر/لوگو نسبی یا مطلق (همان منطق پروفایل و ورود) */
    fun absoluteFromApiPath(path: String?, baseApi: String): String? {
        if (path.isNullOrBlank()) return null
        if (path.startsWith("http://", true) || path.startsWith("https://", true)) return path
        val origin = baseApi.trimEnd('/').removeSuffix("/api").removeSuffix("/api/")
        return origin + if (path.startsWith("/")) path else "/$path"
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
