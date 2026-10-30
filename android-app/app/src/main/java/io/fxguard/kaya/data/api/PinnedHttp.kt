/**
 * Kaya CRM — Certificate pinning برای هاست‌های تولید FXGuard
 * @file    android-app/.../data/api/PinnedHttp.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 *
 * فقط `*.fxguard.io` پین می‌شود؛ سرورهای self-hosted مشتری با اعتماد پیش‌فرض سیستم کار می‌کنند.
 * پین‌ها روی SPKI ریشه‌های Let's Encrypt (ISRG Root X1 + X2) هستند، نه برگ/میانی —
 * چرخش ۹۰روزهٔ گواهی و تغییر CA میانی اپ را نمی‌شکند. اگر CA میزبانی عوض شد، این لیست باید به‌روز شود.
 *
 * محاسبهٔ پین: openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64
 */
package io.fxguard.kaya.data.api

import okhttp3.CertificatePinner
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

object PinnedHttp {
    /** الگوهای OkHttp: `**.` یعنی هر عمقی از زیردامنه (kaya., app., tenant.) */
    private val PINNED_HOST_PATTERNS = listOf("fxguard.io", "**.fxguard.io")

    /** SPKI SHA-256 — ISRG Root X1 (RSA) و ISRG Root X2 (ECDSA) */
    private val PINS = listOf(
        "sha256/C5+lpZ7tcVwmwQIMcRtPbsQtWLABXhQzejna0wHFr8M=",
        "sha256/diGVwiVYbubAI3RW4hB9xU8e/CH2GnkuvVFZE8zmgzI=",
    )

    val certificatePinner: CertificatePinner by lazy {
        val b = CertificatePinner.Builder()
        for (pattern in PINNED_HOST_PATTERNS) {
            for (pin in PINS) b.add(pattern, pin)
        }
        b.build()
    }

    /** کلاینت پایه با پین — همهٔ کلاینت‌های اپ (API، سوکت، تصاویر) از این مشتق می‌شوند */
    fun baseClient(): OkHttpClient = OkHttpClient.Builder()
        .certificatePinner(certificatePinner)
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
}
