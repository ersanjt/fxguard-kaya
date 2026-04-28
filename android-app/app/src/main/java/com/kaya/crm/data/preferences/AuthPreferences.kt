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
    /** زبان رابط کاربری: `en` (پیش‌فرض) یا `fa` — با AppCompatDelegate هم‌خوان */
    private val APP_LOCALE = stringPreferencesKey("app_locale")

    val token: Flow<String?> = context.dataStore.data.map { it[TOKEN] }
    val user: Flow<UserResponse?> = context.dataStore.data.map { json ->
        json[USER]?.let { raw ->
            runCatching { Gson().fromJson(raw, UserResponse::class.java) }.getOrNull()
        }
    }
    val baseUrl: Flow<String?> = context.dataStore.data.map { it[BASE_URL] }

    val skippedAndroidUpdateVersionCode: Flow<Int> =
        context.dataStore.data.map { it[SKIPPED_ANDROID_UPDATE_VC] ?: 0 }

    val appLocale: Flow<String> = context.dataStore.data.map { prefs ->
        when (prefs[APP_LOCALE]) {
            "fa" -> "fa"
            else -> "en"
        }
    }

    suspend fun setAppLocale(tag: String) {
        val t = if (tag == "fa") "fa" else "en"
        context.dataStore.edit { it[APP_LOCALE] = t }
    }

    suspend fun getAppLocale(): String = appLocale.first()

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
        context.dataStore.edit { prefs ->
            val locale = prefs[APP_LOCALE]
            val skipped = prefs[SKIPPED_ANDROID_UPDATE_VC]
            prefs.clear()
            locale?.let { prefs[APP_LOCALE] = it }
            skipped?.let { prefs[SKIPPED_ANDROID_UPDATE_VC] = it }
        }
    }

    suspend fun getToken(): String? = token.first()

    suspend fun getBaseUrl(): String? = baseUrl.first()

    suspend fun getSkippedAndroidUpdateVersionCode(): Int =
        skippedAndroidUpdateVersionCode.first()

    suspend fun setSkippedAndroidUpdateVersionCode(versionCode: Int) {
        context.dataStore.edit { it[SKIPPED_ANDROID_UPDATE_VC] = versionCode }
    }
}
