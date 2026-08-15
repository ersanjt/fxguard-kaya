/**
 * Kaya CRM — API models
 * @file    android-app/.../data/models/Models.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.data.models

import org.json.JSONArray
import org.json.JSONObject

data class Branding(
    val siteName: String,
    val loginTitle: String,
    val logoUrl: String?,
    val loginLogoUrl: String?,
    val primaryColor: String?,
) {
    val displayTitle: String
        get() = loginTitle.ifBlank { siteName }.ifBlank { "KAYA" }

    companion object {
        fun fromJson(o: JSONObject) = Branding(
            siteName = o.optString("siteName"),
            loginTitle = o.optString("loginTitle"),
            logoUrl = o.optString("logoUrl").ifBlank { null },
            loginLogoUrl = o.optString("loginLogoUrl").ifBlank { null },
            primaryColor = o.optString("primaryColor").ifBlank { null },
        )
    }
}

data class StaffUser(
    val id: String,
    val name: String,
    val email: String,
    val username: String,
    val role: String,
    val avatar: String?,
    val permissions: List<String>,
) {
    fun toJson(): JSONObject = JSONObject()
        .put("id", id)
        .put("name", name)
        .put("email", email)
        .put("username", username)
        .put("role", role)
        .put("avatar", avatar)
        .put("permissions", JSONArray(permissions))

    companion object {
        fun fromJson(o: JSONObject): StaffUser {
            val perms = mutableListOf<String>()
            val p = o.optJSONArray("permissions")
            if (p != null) {
                for (i in 0 until p.length()) perms += p.optString(i)
            } else {
                val obj = o.optJSONObject("permissions")
                obj?.keys()?.forEach { key ->
                    if (obj.optBoolean(key, false)) perms += key
                }
            }
            val first = o.optString("firstName")
            val last = o.optString("lastName")
            val composed = listOf(first, last).filter { it.isNotBlank() }.joinToString(" ")
            return StaffUser(
                id = o.optString("id"),
                name = o.optString("name").ifBlank { composed }.ifBlank { o.optString("username") },
                email = o.optString("email"),
                username = o.optString("username"),
                role = o.optString("role"),
                avatar = o.optString("avatar").ifBlank { null },
                permissions = perms,
            )
        }
    }
}

data class LoginResult(
    val needTotp: Boolean,
    val tempToken: String?,
    val token: String?,
    val user: StaffUser?,
    val totpHint: String?,
)

data class ConversationRow(
    val id: String,
    val status: String,
    val unreadCount: Int,
    val lastMessageAt: String?,
    val lastMessagePreview: String?,
    val customerName: String,
    val customerPhone: String?,
    val customerAvatar: String?,
    val assigneeName: String?,
)

data class ChatMessage(
    val id: String,
    val direction: String,
    val content: String,
    val type: String,
    val timestamp: String?,
    val hasMedia: Boolean,
    val mediaUrl: String?,
    val senderName: String?,
)

data class CustomerRow(
    val id: String,
    val name: String,
    val phone: String?,
    val email: String?,
    val status: String,
    val avatar: String?,
)

data class TicketRow(
    val id: String,
    val title: String,
    val ticketNumber: String?,
    val status: String,
    val priority: String,
    val createdAt: String?,
)

fun JSONObject.optObj(key: String): JSONObject? = if (isNull(key)) null else optJSONObject(key)

fun JSONArray.toObjList(): List<JSONObject> =
    (0 until length()).mapNotNull { i -> optJSONObject(i) }
