package com.kaya.crm.data.util

import com.google.gson.Gson
import com.google.gson.annotations.SerializedName

/**
 * استخراج پیام خطا از پاسخ JSON سرور
 */
object ApiErrorParser {
    private val gson = Gson()

    fun parseError(errorBody: String?): String {
        if (errorBody.isNullOrBlank()) return "خطا در ارتباط با سرور"
        return try {
            val parsed = gson.fromJson(errorBody, ErrorResponse::class.java)
            parsed.displayError ?: "خطا در ارتباط با سرور"
        } catch (_: Exception) {
            "خطا در ارتباط با سرور"
        }
    }

    fun parseException(e: Throwable): String = when {
        e.message?.contains("Unable to resolve host", ignoreCase = true) == true -> "اتصال اینترنت برقرار نیست"
        e.message?.contains("timeout", ignoreCase = true) == true -> "سرور پاسخ نمی‌دهد. دوباره تلاش کنید"
        e.message?.contains("Connection refused", ignoreCase = true) == true -> "سرور در دسترس نیست"
        else -> e.message ?: "خطا در ارتباط با سرور"
    }

    private data class ErrorResponse(
        @SerializedName("error") val error: String? = null,
        @SerializedName("message") val message: String? = null
    ) {
        val displayError: String? get() = error ?: message
    }
}
