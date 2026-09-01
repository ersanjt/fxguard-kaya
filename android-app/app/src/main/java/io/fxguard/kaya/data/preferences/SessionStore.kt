/**
 * Kaya CRM — secure session + server URL
 * @file    android-app/.../data/preferences/SessionStore.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.data.preferences

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import io.fxguard.kaya.data.models.StaffUser
import org.json.JSONObject

class SessionStore(context: Context) {
    private val prefs: SharedPreferences
    private val secure: SharedPreferences

    init {
        prefs = context.getSharedPreferences("kaya_staff", Context.MODE_PRIVATE)
        secure = try {
            val master = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context,
                "kaya_staff_secure",
                master,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
            )
        } catch (_: Exception) {
            context.getSharedPreferences("kaya_staff_secure_fallback", Context.MODE_PRIVATE)
        }
    }

    var baseUrl: String
        get() {
            val raw = (prefs.getString(KEY_URL, DEFAULT_URL) ?: DEFAULT_URL).trimEnd('/')
            return normalizeBaseUrl(raw) ?: DEFAULT_URL
        }
        set(value) {
            val normalized = normalizeBaseUrl(value) ?: DEFAULT_URL
            prefs.edit().putString(KEY_URL, normalized).apply()
        }

    var language: String
        get() = prefs.getString(KEY_LANG, "fa") ?: "fa"
        set(value) {
            prefs.edit().putString(KEY_LANG, value).apply()
        }

    var token: String?
        get() = secure.getString(KEY_TOKEN, null)
        set(value) {
            val editor = secure.edit()
            if (value.isNullOrBlank()) editor.remove(KEY_TOKEN) else editor.putString(KEY_TOKEN, value)
            editor.apply()
        }

    var userJson: String?
        get() = prefs.getString(KEY_USER, null)
        set(value) {
            val editor = prefs.edit()
            if (value.isNullOrBlank()) editor.remove(KEY_USER) else editor.putString(KEY_USER, value)
            editor.apply()
        }

    val isLoggedIn: Boolean get() = !token.isNullOrBlank()

    fun saveLogin(token: String, user: StaffUser) {
        this.token = token
        userJson = user.toJson().toString()
    }

    fun readUser(): StaffUser? {
        val raw = userJson ?: return null
        return try {
            StaffUser.fromJson(JSONObject(raw))
        } catch (_: Exception) {
            null
        }
    }

    fun clearSession() {
        token = null
        userJson = null
    }

    companion object {
        const val DEFAULT_URL = "https://kaya.fxguard.io"
        private const val KEY_URL = "base_url"
        private const val KEY_LANG = "lang"
        private const val KEY_TOKEN = "jwt"
        private const val KEY_USER = "user"

        fun normalizeBaseUrl(raw: String): String? {
            var s = raw.trim().trimEnd('/')
            if (s.isEmpty()) return null
            val lower = s.lowercase()
            if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("file:")) {
                return null
            }
            if (!s.contains("://")) s = "https://$s"
            val uri = try {
                java.net.URI(s)
            } catch (_: Exception) {
                return null
            }
            val scheme = uri.scheme?.lowercase() ?: return null
            val host = uri.host?.lowercase() ?: return null
            if (host.isBlank()) return null
            val loopback = host == "localhost" || host == "127.0.0.1" || host == "::1" || host == "10.0.2.2"
            return when (scheme) {
                "http" -> if (loopback) s else null
                "https" -> s
                else -> null
            }
        }
    }
}
