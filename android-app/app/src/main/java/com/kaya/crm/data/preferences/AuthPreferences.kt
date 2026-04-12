package com.kaya.crm.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.google.gson.Gson
import com.kaya.crm.data.models.UserResponse
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")

class AuthPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val TOKEN = stringPreferencesKey("token")
    private val USER = stringPreferencesKey("user")
    private val BASE_URL = stringPreferencesKey("base_url")
    /** نسخهٔ سروری که کاربر «بعداً» زده — برای آپدیت اختیاری دوباره نپرس تا نسخهٔ جدیدتر بیاید */
    private val SKIPPED_ANDROID_UPDATE_VC = intPreferencesKey("skipped_android_update_vc")

    val token: Flow<String?> = context.dataStore.data.map { it[TOKEN] }
    val user: Flow<UserResponse?> = context.dataStore.data.map { json ->
        json[USER]?.let { Gson().fromJson(it, UserResponse::class.java) }
    }
    val baseUrl: Flow<String?> = context.dataStore.data.map { it[BASE_URL] }

    val skippedAndroidUpdateVersionCode: Flow<Int> =
        context.dataStore.data.map { it[SKIPPED_ANDROID_UPDATE_VC] ?: 0 }

    suspend fun setToken(token: String) {
        context.dataStore.edit { it[TOKEN] = token }
    }

    suspend fun setUser(user: UserResponse) {
        context.dataStore.edit { it[USER] = Gson().toJson(user) }
    }

    suspend fun setBaseUrl(url: String) {
        context.dataStore.edit { it[BASE_URL] = url }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }

    suspend fun getToken(): String? = token.first()

    suspend fun getBaseUrl(): String? = baseUrl.first()

    suspend fun getSkippedAndroidUpdateVersionCode(): Int =
        skippedAndroidUpdateVersionCode.first()

    suspend fun setSkippedAndroidUpdateVersionCode(versionCode: Int) {
        context.dataStore.edit { it[SKIPPED_ANDROID_UPDATE_VC] = versionCode }
    }
}
