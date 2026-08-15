/**
 * Kaya CRM — HTTP client (Bearer + dynamic base URL)
 * @file    android-app/.../data/api/ApiClient.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.data.api

import io.fxguard.kaya.data.models.Branding
import io.fxguard.kaya.data.models.ChatMessage
import io.fxguard.kaya.data.models.ConversationRow
import io.fxguard.kaya.data.models.CustomerRow
import io.fxguard.kaya.data.models.LoginResult
import io.fxguard.kaya.data.models.StaffUser
import io.fxguard.kaya.data.models.TicketRow
import io.fxguard.kaya.data.models.optObj
import io.fxguard.kaya.data.models.toObjList
import io.fxguard.kaya.data.preferences.SessionStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class ApiException(message: String, val status: Int = 0) : Exception(message)

class ApiClient(private val session: SessionStore) {
    private val jsonType = "application/json; charset=utf-8".toMediaType()
    private val http = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    fun resolveUrl(pathOrUrl: String?): String? {
        if (pathOrUrl.isNullOrBlank()) return null
        if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl
        return session.baseUrl + if (pathOrUrl.startsWith("/")) pathOrUrl else "/$pathOrUrl"
    }

    suspend fun branding(): Branding = get("/api/panel-settings/public/branding") { Branding.fromJson(it) }

    suspend fun login(identifier: String, password: String): LoginResult {
        val body = JSONObject().put("email", identifier).put("password", password)
        return post("/api/auth/login", body) { parseLogin(it) }
    }

    suspend fun verifyTotp(tempToken: String, code: String): LoginResult {
        val body = JSONObject().put("tempToken", tempToken).put("code", code)
        return post("/api/auth/totp/verify-login", body) { parseLogin(it) }
    }

    suspend fun forgotPassword(email: String): String {
        val body = JSONObject().put("email", email)
        return post("/api/auth/forgot-password", body) {
            it.optString("message").ifBlank { "ok" }
        }
    }

    suspend fun me(): StaffUser = get("/api/auth/me") { StaffUser.fromJson(it) }

    suspend fun logout() {
        runCatching { post("/api/auth/logout", JSONObject()) { it } }
        session.clearSession()
    }

    suspend fun setOnline() {
        runCatching {
            patch("/api/auth/me/presence", JSONObject().put("status", "online")) { it }
        }
    }

    suspend fun conversations(search: String = "", page: Int = 1): Pair<List<ConversationRow>, Int> {
        val q = buildString {
            append("/api/conversations?page=").append(page).append("&limit=40")
            if (search.isNotBlank()) append("&search=").append(java.net.URLEncoder.encode(search, "UTF-8"))
        }
        return get(q) { root ->
            val rows = root.optJSONArray("data")?.toObjList().orEmpty().map { o ->
                val c = o.optObj("customer")
                ConversationRow(
                    id = o.optString("id"),
                    status = o.optString("status"),
                    unreadCount = o.optInt("unreadCount"),
                    lastMessageAt = o.optString("lastMessageAt").ifBlank { null },
                    lastMessagePreview = o.optString("lastMessagePreview").ifBlank { null },
                    customerName = c?.optString("name").orEmpty().ifBlank { "—" },
                    customerPhone = c?.optString("phone")?.ifBlank { null },
                    customerAvatar = c?.optString("profilePic")?.ifBlank { null },
                    assigneeName = o.optObj("assignee")?.optString("name")?.ifBlank { null },
                )
            }
            rows to root.optInt("unreadCount")
        }
    }

    suspend fun messages(conversationId: String): List<ChatMessage> {
        return get("/api/conversations/$conversationId/messages?limit=80") { root ->
            root.optJSONArray("data")?.toObjList().orEmpty().map { parseMessage(it) }
        }
    }

    suspend fun sendMessage(conversationId: String, content: String): ChatMessage {
        val body = JSONObject().put("content", content)
        return post("/api/conversations/$conversationId/send", body) { parseMessage(it) }
    }

    suspend fun markRead(conversationId: String) {
        runCatching { post("/api/conversations/$conversationId/read", JSONObject()) { it } }
    }

    suspend fun customers(search: String = ""): List<CustomerRow> {
        val q = buildString {
            append("/api/customers?page=1&limit=50")
            if (search.isNotBlank()) append("&search=").append(java.net.URLEncoder.encode(search, "UTF-8"))
        }
        return get(q) { root ->
            root.optJSONArray("data")?.toObjList().orEmpty().map { o ->
                CustomerRow(
                    id = o.optString("id"),
                    name = o.optString("name").ifBlank { o.optString("phone") },
                    phone = o.optString("phone").ifBlank { null },
                    email = o.optString("email").ifBlank { null },
                    status = o.optString("status"),
                    avatar = o.optString("profilePic").ifBlank { o.optString("avatar") }.ifBlank { null },
                )
            }
        }
    }

    suspend fun tickets(): List<TicketRow> {
        return get("/api/tickets?page=1&limit=50") { root ->
            root.optJSONArray("data")?.toObjList().orEmpty().map { o ->
                TicketRow(
                    id = o.optString("id"),
                    title = o.optString("title"),
                    ticketNumber = o.optString("ticketNumber").ifBlank { null },
                    status = o.optString("status"),
                    priority = o.optString("priority"),
                    createdAt = o.optString("createdAt").ifBlank { null },
                )
            }
        }
    }

    private fun parseLogin(o: JSONObject): LoginResult {
        if (o.optBoolean("needTotp")) {
            return LoginResult(
                needTotp = true,
                tempToken = o.optString("tempToken").ifBlank { null },
                token = null,
                user = null,
                totpHint = o.optString("email").ifBlank { o.optString("username") },
            )
        }
        val user = o.optObj("user")?.let { StaffUser.fromJson(it) }
        return LoginResult(
            needTotp = false,
            tempToken = null,
            token = o.optString("token").ifBlank { null },
            user = user,
            totpHint = null,
        )
    }

    private fun parseMessage(o: JSONObject): ChatMessage {
        val media = o.optObj("mediaData")
        val url = media?.optString("url")?.ifBlank { null }
            ?: media?.optString("path")?.ifBlank { null }
        val user = o.optObj("user")
        return ChatMessage(
            id = o.optString("id"),
            direction = o.optString("direction"),
            content = o.optString("content"),
            type = o.optString("type").ifBlank { "text" },
            timestamp = o.optString("timestamp").ifBlank { o.optString("createdAt") }.ifBlank { null },
            hasMedia = o.optBoolean("hasMedia") || url != null,
            mediaUrl = url,
            senderName = user?.optString("name")?.ifBlank { null },
        )
    }

    private suspend fun <T> get(path: String, map: (JSONObject) -> T): T = request("GET", path, null, map)

    private suspend fun <T> post(path: String, body: JSONObject, map: (JSONObject) -> T): T =
        request("POST", path, body, map)

    private suspend fun <T> patch(path: String, body: JSONObject, map: (JSONObject) -> T): T =
        request("PATCH", path, body, map)

    private suspend fun <T> request(
        method: String,
        path: String,
        body: JSONObject?,
        map: (JSONObject) -> T,
    ): T = withContext(Dispatchers.IO) {
        val url = session.baseUrl + if (path.startsWith("/")) path else "/$path"
        val builder = Request.Builder().url(url)
        session.token?.let { builder.header("Authorization", "Bearer $it") }
        builder.header("Accept", "application/json")
        val reqBody = body?.toString()?.toRequestBody(jsonType)
        when (method) {
            "POST" -> builder.post(reqBody ?: EMPTY)
            "PATCH" -> builder.patch(reqBody ?: EMPTY)
            else -> builder.get()
        }
        val res = http.newCall(builder.build()).execute()
        val text = res.body?.string().orEmpty()
        if (res.code == 401) {
            session.clearSession()
            throw ApiException(extractError(text, "نشست منقضی شد. دوباره وارد شوید."), 401)
        }
        if (!res.isSuccessful) {
            throw ApiException(extractError(text, "خطای سرور (${res.code})"), res.code)
        }
        val trimmed = text.trim()
        val root = when {
            trimmed.startsWith("{") -> JSONObject(trimmed)
            trimmed.startsWith("[") -> JSONObject().put("data", JSONArray(trimmed))
            else -> JSONObject()
        }
        map(root)
    }

    private fun extractError(text: String, fallback: String): String {
        return try {
            JSONObject(text).optString("error").ifBlank {
                JSONObject(text).optString("message").ifBlank { fallback }
            }
        } catch (_: Exception) {
            fallback
        }
    }

    companion object {
        private val EMPTY = ByteArray(0).toRequestBody(null)
    }
}
