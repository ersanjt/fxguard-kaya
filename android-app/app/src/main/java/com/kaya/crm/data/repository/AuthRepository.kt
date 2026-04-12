package com.kaya.crm.data.repository

import com.kaya.crm.data.api.ApiService
import com.kaya.crm.data.models.LoginRequest
import com.kaya.crm.data.models.LoginResponse
import com.kaya.crm.data.models.TotpRequest
import com.kaya.crm.data.models.UserResponse
import com.kaya.crm.data.preferences.AuthPreferences
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
                val body = response.body()!!
                if (body.needTotp) {
                    Result.success(body)
                } else {
                    body.token?.let { prefs.setToken(it) }
                    body.user?.let { prefs.setUser(it) }
                    Result.success(body)
                }
            } else {
                val errorBodyStr = response.errorBody()?.string()
                val error = if (errorBodyStr != null) {
                    try {
                        com.google.gson.Gson().fromJson(errorBodyStr, ErrorBody::class.java)?.error
                    } catch (_: Exception) { null }
                } else null
                Result.failure(Exception(error ?: "خطا در ورود"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun verifyTotp(tempToken: String, code: String): Result<LoginResponse> {
        return try {
            val response = api.verifyTotp(TotpRequest(tempToken, code))
            if (response.isSuccessful) {
                val body = response.body()!!
                body.token?.let { prefs.setToken(it) }
                body.user?.let { prefs.setUser(it) }
                Result.success(body)
            } else {
                val errorBodyStr = response.errorBody()?.string()
                val error = if (errorBodyStr != null) {
                    try {
                        com.google.gson.Gson().fromJson(errorBodyStr, ErrorBody::class.java)?.error
                    } catch (_: Exception) { null }
                } else null
                Result.failure(Exception(error ?: "کد نامعتبر است"))
            }
        } catch (e: Exception) {
            Result.failure(e)
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
                response.body()?.let {
                    prefs.setUser(it)
                    Result.success(it)
                } ?: Result.failure(Exception("پاسخ خالی"))
            } else {
                Result.failure(Exception("خطا در بارگذاری پروفایل"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

private data class ErrorBody(val error: String?)
