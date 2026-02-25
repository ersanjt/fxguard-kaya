package com.kaya.crm.data.network

import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

/**
 * تلاش مجدد خودکار برای درخواست‌های ناموفق به خاطر خطای موقت شبکه
 */
class RetryInterceptor(private val maxRetries: Int = 3) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        var lastException: IOException? = null
        repeat(maxRetries) { attempt ->
            try {
                return chain.proceed(chain.request())
            } catch (e: IOException) {
                lastException = e
                if (attempt == maxRetries - 1) throw e
                if (!e.isRetryable()) throw e
                Thread.sleep(500L * (attempt + 1))
            }
        }
        throw lastException ?: IOException("خطا در ارتباط با سرور")
    }

    private fun IOException.isRetryable(): Boolean = when (this) {
        is SocketTimeoutException,
        is UnknownHostException -> true
        else -> true
    }
}
