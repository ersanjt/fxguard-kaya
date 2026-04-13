package com.kaya.crm.data.repository

import com.kaya.crm.data.api.ApiService
import com.kaya.crm.data.models.ForgotPasswordRequest
import com.kaya.crm.data.models.LoginRequest
import com.kaya.crm.data.models.LoginResponse
import com.kaya.crm.data.models.TotpRequest
import com.kaya.crm.data.models.UserResponse
import com.kaya.crm.data.preferences.AuthPreferences
import com.kaya.crm.data.util.ApiErrorParser
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class AuthRepository @Inject constructor(
    private val api: ApiService,
    private val prefs: AuthPreferences
) {

    val isLoggedIn: Flow<Boolean> = prefs.token.map { it != null }
    val currentUser: Flow<UserResponse?> = prefs.user.map { it }

    suspend fun login(email: String, password: String): Result<LoginResponse> {
        return try {
            val response = api.login(LoginRequest(email, password))
            if (response.isSuccessful) {
                val body = response.body()
                    ?: return Result.failure(Exception(ApiErrorParser.parseError(null)))
                if (body.needTotp) {
                    Result.success(body)
                } else {
                    body.token?.let { prefs.setToken(it) }
                    body.user?.let { prefs.setUser(it) }
                    Result.success(body)
                }
            } else {
                val msg = ApiErrorParser.parseError(response.errorBody()?.string())
                Result.failure(Exception(msg))
            }
        } catch (e: Exception) {
            Result.failure(Exception(ApiErrorParser.parseException(e)))
        }
    }

    suspend fun forgotPassword(email: String): Result<Unit> {
        return try {
            val response = api.forgotPassword(ForgotPasswordRequest(email))
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val raw = ApiErrorParser.parseError(response.errorBody()?.string())
                val msg = when {
                    raw.contains("could not send", ignoreCase = true) ||
                        raw.contains("password reset email", ignoreCase = true) ->
                        "ارسال ایمیل بازیابی انجام نشد. بعداً دوباره تلاش کنید یا با مدیر سیستم تماس بگیرید."
                    else -> raw
                }
                Result.failure(Exception(msg))
            }
        } catch (e: Exception) {
            Result.failure(Exception(ApiErrorParser.parseException(e)))
        }
    }

    suspend fun verifyTotp(tempToken: String, code: String): Result<LoginResponse> {
        return try {
            val response = api.verifyTotp(TotpRequest(tempToken, code))
            if (response.isSuccessful) {
                val body = response.body()
                    ?: return Result.failure(Exception(ApiErrorParser.parseError(null)))
                body.token?.let { prefs.setToken(it) }
                body.user?.let { prefs.setUser(it) }
                Result.success(body)
            } else {
                val msg = ApiErrorParser.parseError(response.errorBody()?.string())
                Result.failure(Exception(msg))
            }
        } catch (e: Exception) {
            Result.failure(Exception(ApiErrorParser.parseException(e)))
        }
    }

    suspend fun logout() {
        prefs.clear()
    }

    suspend fun cacheUser(user: UserResponse) {
        prefs.setUser(user)
    }

    suspend fun refreshUser(): Result<UserResponse> {
        return try {
            val response = api.getMe()
            if (response.isSuccessful) {
                val user = response.body()
                    ?: return Result.failure(Exception(ApiErrorParser.parseError(null)))
                prefs.setUser(user)
                Result.success(user)
            } else {
                val msg = ApiErrorParser.parseError(response.errorBody()?.string())
                Result.failure(Exception(msg))
            }
        } catch (e: Exception) {
            Result.failure(Exception(ApiErrorParser.parseException(e)))
        }
    }
}
