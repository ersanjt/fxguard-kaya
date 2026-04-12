package com.kaya.crm.data.repository

import android.content.Context
import android.net.Uri
import com.kaya.crm.data.api.ApiService
import com.kaya.crm.data.models.PatchProfilePayload
import com.kaya.crm.data.models.TelegramLinkTokenResponse
import com.kaya.crm.data.models.TelegramStatusResponse
import com.kaya.crm.data.models.TotpConfirmBody
import com.kaya.crm.data.models.TotpDisableBody
import com.kaya.crm.data.models.TotpSetupResponse
import com.kaya.crm.data.models.UploadResponse
import com.kaya.crm.data.models.UserResponse
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProfileRepository @Inject constructor(
    @ApplicationContext private val app: Context,
    private val api: ApiService
) {

    suspend fun patchProfile(payload: PatchProfilePayload): Result<UserResponse> = withContext(Dispatchers.IO) {
        try {
            val r = api.patchProfile(payload)
            if (r.isSuccessful) {
                val body = r.body() ?: return@withContext Result.failure(Exception("پاسخ خالی"))
                Result.success(body)
            } else {
                Result.failure(Exception(parseError(r.errorBody()?.string())))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun uploadProfileImage(uri: Uri): Result<String> = withContext(Dispatchers.IO) {
        try {
            val cr = app.contentResolver
            val mime = cr.getType(uri) ?: "image/jpeg"
            val input = cr.openInputStream(uri) ?: return@withContext Result.failure(Exception("فایل باز نشد"))
            val bytes = input.use { it.readBytes() }
            val mediaType = mime.toMediaTypeOrNull()
            val body = bytes.toRequestBody(mediaType)
            val fileName = "avatar-${System.currentTimeMillis()}.jpg"
            val part = MultipartBody.Part.createFormData("file", fileName, body)
            val r = api.uploadFile(part)
            if (r.isSuccessful) {
                val url = r.body()?.url
                if (!url.isNullOrBlank()) Result.success(url)
                else Result.failure(Exception(r.body()?.error ?: "آپلود ناموفق"))
            } else {
                Result.failure(Exception(parseError(r.errorBody()?.string())))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTotpSetup(): Result<TotpSetupResponse> = withContext(Dispatchers.IO) {
        try {
            val r = api.getTotpSetup()
            if (r.isSuccessful) {
                val body = r.body() ?: return@withContext Result.failure(Exception("پاسخ خالی"))
                if (!body.error.isNullOrBlank()) return@withContext Result.failure(Exception(body.error))
                Result.success(body)
            } else {
                Result.failure(Exception(parseError(r.errorBody()?.string())))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun confirmTotp(code: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            val r = api.confirmTotpSetup(TotpConfirmBody(code.replace(Regex("\\s"), "")))
            if (r.isSuccessful) {
                val msg = (r.body()?.get("message") as? String) ?: "احراز دو مرحله‌ای فعال شد"
                Result.success(msg)
            } else {
                Result.failure(Exception(parseError(r.errorBody()?.string())))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun disableTotp(password: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            val r = api.disableTotp(TotpDisableBody(password))
            if (r.isSuccessful) {
                val msg = (r.body()?.get("message") as? String) ?: "غیرفعال شد"
                Result.success(msg)
            } else {
                Result.failure(Exception(parseError(r.errorBody()?.string())))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTelegramStatus(): Result<TelegramStatusResponse> = withContext(Dispatchers.IO) {
        try {
            val r = api.getTelegramStatus()
            if (r.isSuccessful) {
                val body = r.body() ?: return@withContext Result.failure(Exception("پاسخ خالی"))
                Result.success(body)
            } else {
                Result.failure(Exception(parseError(r.errorBody()?.string())))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun requestTelegramLinkToken(): Result<TelegramLinkTokenResponse> = withContext(Dispatchers.IO) {
        try {
            val r = api.requestTelegramLinkToken()
            if (r.isSuccessful) {
                val body = r.body() ?: return@withContext Result.failure(Exception("پاسخ خالی"))
                if (!body.error.isNullOrBlank()) return@withContext Result.failure(Exception(body.error))
                Result.success(body)
            } else {
                Result.failure(Exception(parseError(r.errorBody()?.string())))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun unlinkTelegram(): Result<String> = withContext(Dispatchers.IO) {
        try {
            val r = api.unlinkTelegram()
            if (r.isSuccessful) {
                val msg = (r.body()?.get("message") as? String) ?: "اتصال قطع شد"
                Result.success(msg)
            } else {
                Result.failure(Exception(parseError(r.errorBody()?.string())))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun parseError(raw: String?): String {
        if (raw.isNullOrBlank()) return "خطای ناشناخته"
        return try {
            val obj = com.google.gson.JsonParser.parseString(raw).asJsonObject
            obj.get("error")?.asString ?: raw
        } catch (_: Exception) {
            raw
        }
    }
}
