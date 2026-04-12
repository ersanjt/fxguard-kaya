package com.kaya.crm.data

import com.kaya.crm.BuildConfig

/**
 * آدرس پایه API.
 * - پیش‌فرض از BuildConfig (debug: امولاتور → میزبان روی 10.0.2.2:3002، release: production).
 * - کاربر می‌تواند در اپ آدرس ذخیره‌شده (DataStore) را از طریق [com.kaya.crm.di.AppModule] جایگزین کند.
 * - روی گوشی واقعی به‌جای امولاتور، از تنظیم آدرس در اپ یا بیلد دستی استفاده کنید (IP شبکه محلی + پورت بک‌اند).
 */
object ApiConfig {
    /** ریشهٔ سرور (بدون مسیر /api) — برای نمایش و لینک در UI */
    val BASE_URL: String
        get() = BuildConfig.API_BASE_URL.trim().trimEnd('/') + "/"

    val API_BASE: String
        get() = BASE_URL.trimEnd('/') + "/api/"
}
