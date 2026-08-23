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
    val customerId: String?,
    val customerName: String,
    val customerPhone: String?,
    val customerAvatar: String?,
    val assigneeName: String?,
    val departmentName: String? = null,
    val priority: String? = null,
    val isGroup: Boolean = false,
    val isHiddenFromStaff: Boolean = false,
    val lastOutgoingIsAutoReply: Boolean = false,
)

enum class InboxFilter { All, Unread, Unanswered, Unassigned, Open, Mine, Archived, Restricted, Groups }

data class ChatMessage(
    val id: String,
    val direction: String,
    val content: String,
    val type: String,
    val timestamp: String?,
    val hasMedia: Boolean,
    val mediaUrl: String?,
    val mediaMime: String? = null,
    val mediaName: String? = null,
    val senderName: String?,
) {
    val isVoice: Boolean
        get() {
            val mime = mediaMime?.lowercase().orEmpty()
            return type.equals("ptt", true) || type.equals("audio", true) || mime.startsWith("audio/")
        }

    val isImage: Boolean
        get() {
            if (isVoice) return false
            val mime = mediaMime?.lowercase().orEmpty()
            val name = mediaName?.lowercase().orEmpty()
            return mime.startsWith("image/") ||
                type.equals("image", true) ||
                type.equals("sticker", true) ||
                type.equals("gif", true) ||
                name.matches(Regex(""".*\.(jpe?g|png|gif|webp|bmp)$"""))
        }
}

data class UploadedFile(
    val url: String,
    val name: String,
)

data class CallStartResult(
    val method: String?,
    val callLink: String?,
    val isGroup: Boolean,
    val introText: String?,
)

data class CustomerRow(
    val id: String,
    val name: String,
    val phone: String?,
    val email: String?,
    val status: String,
    val avatar: String?,
    val lastContactAt: String? = null,
    val firstContactAt: String? = null,
    val totalConversations: Int = 0,
    val departmentName: String? = null,
    val assigneeName: String? = null,
    val isRestricted: Boolean = false,
    val notes: String? = null,
    val birthDate: String? = null,
    val nationalId: String? = null,
    val nationality: String? = null,
    val gender: String? = null,
    val occupation: String? = null,
    val companyName: String? = null,
    val address: String? = null,
    val city: String? = null,
    val country: String? = null,
    val postalCode: String? = null,
    val instagram: String? = null,
    val telegram: String? = null,
    val website: String? = null,
) {
    fun toDraft() = CustomerDraft(
        name = name,
        phone = phone,
        email = email,
        status = status.ifBlank { "active" },
        notes = notes,
        birthDate = birthDate,
        nationalId = nationalId,
        nationality = nationality,
        gender = gender,
        occupation = occupation,
        companyName = companyName,
        address = address,
        city = city,
        country = country,
        postalCode = postalCode,
        instagram = instagram,
        telegram = telegram,
        website = website,
    )
}

data class CustomerDraft(
    val name: String,
    val phone: String?,
    val email: String?,
    val status: String,
    val notes: String? = null,
    val birthDate: String? = null,
    val nationalId: String? = null,
    val nationality: String? = null,
    val gender: String? = null,
    val occupation: String? = null,
    val companyName: String? = null,
    val address: String? = null,
    val city: String? = null,
    val country: String? = null,
    val postalCode: String? = null,
    val instagram: String? = null,
    val telegram: String? = null,
    val website: String? = null,
)

data class TimelineItem(
    val id: String,
    val type: String,
    val title: String,
    val meta: String,
    val conversationId: String? = null,
)

data class DashboardStats(
    val openConversations: Int = 0,
    val unreadConversations: Int = 0,
    val unansweredConversations: Int = 0,
    val unassignedConversations: Int = 0,
    val todayMessages: Int = 0,
    val ticketsOpen: Int = 0,
    val tasksPending: Int = 0,
    val totalCustomers: Int = 0,
    val staffOnline: Int = 0,
    val loginsToday: Int = 0,
    val announcementsCount: Int = 0,
    val unreadAnnouncements: Int = 0,
    val avgRating: Double? = null,
    val ratedConversationsCount: Int = 0,
    val avgResponseTimeMinutes: Double? = null,
)

data class TicketRow(
    val id: String,
    val title: String,
    val ticketNumber: String?,
    val status: String,
    val priority: String,
    val createdAt: String?,
)

data class TaskRow(
    val id: String,
    val title: String,
    val status: String,
    val priority: String,
    val assigneeName: String?,
)

data class TeamThread(
    val id: String,
    val displayName: String,
    val lastPreview: String?,
    val unreadCount: Int,
)

data class TeamColleague(
    val id: String,
    val name: String,
    val email: String?,
    val avatar: String?,
    val status: String?,
)

data class TeamMessage(
    val id: String,
    val content: String,
    val fromMe: Boolean,
    val senderName: String?,
)

data class AnnouncementRow(
    val id: String,
    val title: String,
    val body: String,
    val isImportant: Boolean = false,
    val targetType: String = "all",
    val targetName: String? = null,
    val fromName: String? = null,
    val createdAt: String? = null,
    val read: Boolean = false,
    val canDelete: Boolean = false,
)

data class AnnouncementTarget(
    val id: String,
    val name: String,
    val kind: String,
)

data class StaffPresence(
    val id: String,
    val name: String,
    val email: String?,
    val status: String,
    val lastLoginAt: String?,
    val branchName: String?,
    val departmentName: String?,
    val lastLoginIp: String?,
    val lastLoginCountry: String?,
)

data class StaffLoginRow(
    val id: String,
    val userName: String,
    val email: String?,
    val branchName: String?,
    val createdAt: String?,
    val ip: String?,
    val country: String?,
    val summary: String?,
)

data class OrgUser(
    val id: String,
    val name: String,
    val email: String?,
    val username: String?,
    val role: String,
    val position: String?,
    val status: String,
    val isActive: Boolean,
    val lastLoginAt: String?,
    val branchName: String?,
    val departmentName: String?,
    val avatar: String?,
)

data class DashItem(
    val id: String,
    val title: String,
    val subtitle: String = "",
    val meta: String = "",
)

fun JSONObject.optObj(key: String): JSONObject? {
    if (isNull(key)) return null
    optJSONObject(key)?.let { return it }
    val raw = optString(key).trim()
    if (raw.startsWith("{")) return runCatching { JSONObject(raw) }.getOrNull()
    return null
}

fun JSONObject.optStr(key: String): String? {
    if (!has(key) || isNull(key)) return null
    return optString(key).trim().ifBlank { null }?.takeIf { it != "null" }
}

fun JSONArray.toObjList(): List<JSONObject> =
    (0 until length()).mapNotNull { i -> optJSONObject(i) }
