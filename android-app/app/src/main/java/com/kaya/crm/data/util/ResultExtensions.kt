package com.kaya.crm.data.util

/**
 * تبدیل خطاهای شبکه به پیام فارسی
 */
fun <T> Result<T>.mapNetworkError(): Result<T> = fold(
    onSuccess = { Result.success(it) },
    onFailure = { Result.failure(Exception(ApiErrorParser.parseException(it))) }
)
