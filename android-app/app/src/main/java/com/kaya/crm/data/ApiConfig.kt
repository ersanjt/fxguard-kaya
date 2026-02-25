package com.kaya.crm.data

/**
 * آدرس پایه API سرور.
 * برای تست لوکال: "http://192.168.1.X:3002" (IP کامپیوترتان)
 * برای production: "https://kaya.fxguard.io"
 */
object ApiConfig {
    const val BASE_URL = "https://kaya.fxguard.io/"
    
    val API_BASE: String get() = BASE_URL.trimEnd('/') + "/api/"
}
