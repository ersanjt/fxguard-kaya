/**
 * Kaya CRM — HTTP client (Bearer + dynamic base URL)
 * @file    android-app/.../data/api/ApiClient.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.data.api

import io.fxguard.kaya.data.models.AnnouncementRow
import io.fxguard.kaya.data.models.AnnouncementTarget
import io.fxguard.kaya.data.models.Branding
import io.fxguard.kaya.data.models.CallStartResult
import io.fxguard.kaya.data.models.ChatMessage
import io.fxguard.kaya.data.models.ConversationRow
import io.fxguard.kaya.data.models.CustomerDraft
import io.fxguard.kaya.data.models.CustomerRow
import io.fxguard.kaya.data.models.DashItem
import io.fxguard.kaya.data.models.DashboardStats
import io.fxguard.kaya.data.models.InboxFilter
import io.fxguard.kaya.data.models.LoginResult
import io.fxguard.kaya.data.models.OrgUser
import io.fxguard.kaya.data.models.StaffLoginRow
import io.fxguard.kaya.data.models.StaffPresence
import io.fxguard.kaya.data.models.StaffUser
import io.fxguard.kaya.data.models.TaskRow
import io.fxguard.kaya.data.models.TeamColleague
import io.fxguard.kaya.data.models.TeamMessage
import io.fxguard.kaya.data.models.TeamThread
import io.fxguard.kaya.data.models.TicketRow
import io.fxguard.kaya.data.models.TimelineItem
import io.fxguard.kaya.data.models.UploadedFile
import io.fxguard.kaya.data.models.optObj
import io.fxguard.kaya.data.models.optStr
import io.fxguard.kaya.data.models.toObjList
import io.fxguard.kaya.data.preferences.SessionStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class ApiException(
    message: String,
    val status: Int = 0,
    val isNetwork: Boolean = false,
) : Exception(message)

class ApiClient(private val session: SessionStore) {
    private val jsonType = "application/json; charset=utf-8".toMediaType()
    private val http = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    private val uploadHttp = http.newBuilder()
        .readTimeout(90, TimeUnit.SECONDS)
        .writeTimeout(90, TimeUnit.SECONDS)
        .build()

    fun resolveUrl(pathOrUrl: String?): String? {
        if (pathOrUrl.isNullOrBlank()) return null
        if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl
        return session.baseUrl + if (pathOrUrl.startsWith("/")) pathOrUrl else "/$pathOrUrl"
    }

    fun customerAvatarUrl(customerId: String?): String? {
        val id = customerId?.trim().orEmpty()
        if (id.isEmpty()) return null
        return resolveUrl("/api/customers/$id/avatar")
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

    suspend fun registerPushToken(token: String, appVersion: String? = null) {
        val body = JSONObject()
            .put("token", token)
            .put("platform", "android")
        if (!appVersion.isNullOrBlank()) body.put("appVersion", appVersion)
        post("/api/devices/push-token", body) { it }
    }

    suspend fun unregisterPushToken(token: String) {
        val q = java.net.URLEncoder.encode(token, "UTF-8")
        runCatching { delete("/api/devices/push-token?token=$q") { it } }
    }

    suspend fun testPush(): Pair<Boolean, String> {
        val obj = post("/api/devices/push-test", JSONObject()) { it }
        val ok = obj.optBoolean("ok", false)
        val reason = obj.optString("reason")
        return ok to reason
    }

    suspend fun setOnline() {
        runCatching {
            patch("/api/auth/me/presence", JSONObject().put("status", "online")) { it }
        }
    }

    suspend fun conversations(
        search: String = "",
        page: Int = 1,
        filter: InboxFilter = InboxFilter.All,
        mineUserId: String? = null,
    ): Pair<List<ConversationRow>, Int> {
        val q = buildString {
            append("/api/conversations?page=").append(page).append("&limit=40")
            if (search.isNotBlank()) append("&search=").append(java.net.URLEncoder.encode(search, "UTF-8"))
            when (filter) {
                InboxFilter.Unread -> append("&unread=true")
                InboxFilter.Unanswered -> append("&unanswered=true")
                InboxFilter.Unassigned -> append("&unassigned=true")
                InboxFilter.Open -> append("&status=open")
                InboxFilter.Mine -> if (!mineUserId.isNullOrBlank()) append("&assignedTo=").append(mineUserId)
                InboxFilter.Archived -> append("&status=archived")
                InboxFilter.Restricted -> append("&hiddenOnly=true")
                InboxFilter.Groups -> append("&isGroup=true")
                InboxFilter.All -> Unit
            }
        }
        return get(q) { root ->
            val rows = root.optJSONArray("data")?.toObjList().orEmpty().map { parseConversation(it) }
            rows to root.optInt("unreadCount")
        }
    }

    suspend fun conversation(id: String): ConversationRow =
        get("/api/conversations/$id") { parseConversation(it) }

    suspend fun messages(conversationId: String): List<ChatMessage> {
        return get("/api/conversations/$conversationId/messages?limit=80") { root ->
            root.optJSONArray("data")?.toObjList().orEmpty().map { parseMessage(it) }.filter { msg ->
                msg.direction == "outgoing" || msg.content.isNotBlank() || msg.hasMedia
            }
        }
    }

    suspend fun sendMessage(conversationId: String, content: String): ChatMessage {
        val body = JSONObject().put("content", content)
        return post("/api/conversations/$conversationId/send", body) { o ->
            val src = o.optObj("data") ?: o
            parseMessage(src).copy(direction = src.optString("direction").ifBlank { "outgoing" })
        }
    }

    suspend fun sendMedia(
        conversationId: String,
        content: String = "",
        url: String,
        filename: String,
        mime: String,
        sendAsVoice: Boolean = false,
    ): ChatMessage {
        val media = JSONObject()
            .put("url", url)
            .put("filename", filename)
            .put("mimetype", mime)
        if (sendAsVoice) {
            media.put("type", "audio")
            media.put("sendAsVoice", true)
        }
        val body = JSONObject().put("content", content).put("media", media)
        return post("/api/conversations/$conversationId/send", body) { o ->
            val src = o.optObj("data") ?: o
            parseMessage(src).copy(direction = src.optString("direction").ifBlank { "outgoing" })
        }
    }

    suspend fun uploadFile(bytes: ByteArray, filename: String, mime: String): UploadedFile =
        withContext(Dispatchers.IO) {
            val part = bytes.toRequestBody(
                mime.ifBlank { "application/octet-stream" }.toMediaTypeOrNull(),
            )
            val body = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", filename.ifBlank { "file" }, part)
                .build()
            val builder = Request.Builder().url(session.baseUrl + "/api/upload")
            session.token?.let { builder.header("Authorization", "Bearer $it") }
            builder.header("Accept", "application/json")
            builder.header("User-Agent", "KayaStaff-Android/1.0")
            builder.post(body)
            val res = try {
                uploadHttp.newCall(builder.build()).execute()
            } catch (e: java.io.IOException) {
                throw ApiException("اتصال به سرور برقرار نشد.", 0, isNetwork = true)
            }
            res.use {
                val text = it.body?.string().orEmpty()
                if (it.code == 401) {
                    throw ApiException(extractError(text, "نشست منقضی شد. دوباره وارد شوید."), 401)
                }
                if (!it.isSuccessful) {
                    throw ApiException(extractError(text, "خطا در آپلود"), it.code)
                }
                val o = JSONObject(text.trim().ifBlank { "{}" })
                val url = o.optString("url")
                if (url.isBlank()) {
                    throw ApiException(o.optString("error").ifBlank { "خطا در آپلود" })
                }
                UploadedFile(url, o.optString("name").ifBlank { filename })
            }
        }

    suspend fun startCall(conversationId: String, type: String): CallStartResult {
        val body = JSONObject().put("type", if (type == "video") "video" else "voice")
        return post("/api/conversations/$conversationId/call", body) { o ->
            CallStartResult(
                method = o.optStr("method"),
                callLink = o.optStr("callLink"),
                isGroup = o.optBoolean("isGroup"),
                introText = o.optStr("introText"),
            )
        }
    }

    suspend fun markRead(conversationId: String) {
        runCatching { post("/api/conversations/$conversationId/read", JSONObject()) { it } }
    }

    suspend fun customers(search: String = "", archive: Boolean = false): List<CustomerRow> {
        val q = buildString {
            append("/api/customers?page=1&limit=50")
            if (search.isNotBlank()) append("&search=").append(java.net.URLEncoder.encode(search, "UTF-8"))
            if (archive) append("&restrictedOnly=true")
        }
        return get(q) { root ->
            root.optJSONArray("data")?.toObjList().orEmpty().map { parseCustomer(it) }
        }
    }

    suspend fun customer(id: String): CustomerRow = get("/api/customers/$id") { parseCustomer(it) }

    suspend fun customerTimeline(id: String, lang: String): List<TimelineItem> {
        return getOptional("/api/customers/$id/timeline") { root ->
            root.optJSONArray("data")?.toObjList().orEmpty().mapIndexed { i, o ->
                parseTimeline(o, i, lang)
            }
        }
    }

    suspend fun createCustomer(name: String, phone: String): CustomerRow {
        val body = JSONObject().put("name", name).put("phone", phone)
        return post("/api/customers", body) { parseCustomer(it.optObj("data") ?: it) }
    }

    suspend fun updateCustomer(id: String, draft: CustomerDraft): CustomerRow {
        val body = JSONObject()
            .put("name", draft.name)
            .put("status", draft.status)
            .put("email", draft.email.orEmpty())
            .put("notes", draft.notes.orEmpty())
            .put("birthDate", draft.birthDate.orEmpty())
            .put("nationalId", draft.nationalId.orEmpty())
            .put("nationality", draft.nationality.orEmpty())
            .put("gender", draft.gender.orEmpty())
            .put("occupation", draft.occupation.orEmpty())
            .put("companyName", draft.companyName.orEmpty())
            .put("address", draft.address.orEmpty())
            .put("city", draft.city.orEmpty())
            .put("country", draft.country.orEmpty())
            .put("postalCode", draft.postalCode.orEmpty())
            .put("instagram", draft.instagram.orEmpty())
            .put("telegram", draft.telegram.orEmpty())
            .put("website", draft.website.orEmpty())
        if (!draft.phone.isNullOrBlank()) body.put("phone", draft.phone)
        return put("/api/customers/$id", body) { parseCustomer(it.optObj("data") ?: it) }
    }

    suspend fun startCustomerChat(customerId: String): ConversationRow {
        val body = JSONObject().put("customerId", customerId)
        return post("/api/conversations", body) { o ->
            parseConversation(o.optObj("data") ?: o)
        }
    }

    suspend fun tickets(): List<TicketRow> {
        return getOptional("/api/tickets?page=1&limit=50") { root ->
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

    suspend fun tasks(): List<TaskRow> {
        return getOptional("/api/tasks?page=1&limit=50") { root ->
            root.optJSONArray("data")?.toObjList().orEmpty().map { o ->
                TaskRow(
                    id = o.optString("id"),
                    title = o.optString("title"),
                    status = o.optString("status"),
                    priority = o.optString("priority"),
                    assigneeName = o.optObj("assignee")?.optString("name")?.ifBlank { null },
                )
            }
        }
    }

    suspend fun teamThreads(): Pair<List<TeamThread>, Int> {
        return getOptional("/api/internal/threads") { root ->
            val rows = root.optJSONArray("data")?.toObjList().orEmpty().map { parseTeamThread(it) }
            rows to root.optInt("totalUnread")
        }
    }

    suspend fun teamUsers(): List<TeamColleague> {
        return getOptional("/api/internal/users") { root ->
            root.optJSONArray("data")?.toObjList().orEmpty().map { o ->
                TeamColleague(
                    id = o.optString("id"),
                    name = o.optString("name").ifBlank { o.optString("email") }.ifBlank { "—" },
                    email = o.optStr("email"),
                    avatar = o.optStr("avatar"),
                    status = o.optStr("status"),
                )
            }
        }
    }

    suspend fun startTeamThread(userIds: List<String>, name: String? = null): TeamThread {
        val ids = JSONArray()
        userIds.forEach { ids.put(it) }
        val body = JSONObject().put("userIds", ids)
        if (!name.isNullOrBlank()) body.put("name", name).put("type", "group")
        return post("/api/internal/threads", body) { parseTeamThread(it.optObj("data") ?: it) }
    }

    suspend fun teamMessages(threadId: String, meId: String): List<TeamMessage> {
        return getOptional("/api/internal/threads/$threadId/messages?limit=200") { root ->
            root.optJSONArray("data")?.toObjList().orEmpty().map { o ->
                val from = o.optObj("fromUser")
                val fromId = o.optString("fromUserId").ifBlank { from?.optString("id").orEmpty() }
                TeamMessage(
                    id = o.optString("id"),
                    content = o.optString("content"),
                    fromMe = fromId == meId,
                    senderName = from?.optString("name")?.ifBlank { null },
                )
            }
        }
    }

    suspend fun staffOnline(): List<StaffPresence> {
        return get("/api/supervision/online") { root ->
            root.optJSONArray("data")?.toObjList().orEmpty().map { parseStaffPresence(it) }
        }
    }

    suspend fun staffLogins(): Pair<List<StaffLoginRow>, Int> {
        return get("/api/supervision/logins?limit=50") { root ->
            val rows = root.optJSONArray("data")?.toObjList().orEmpty().map { parseStaffLogin(it) }
            rows to root.optInt("total", rows.size)
        }
    }

    suspend fun orgUsers(): List<OrgUser> {
        return get("/api/users") { root ->
            root.optJSONArray("data")?.toObjList().orEmpty().map { parseOrgUser(it) }
        }
    }

    suspend fun sendTeamMessage(threadId: String, content: String): TeamMessage {
        val body = JSONObject().put("content", content)
        return post("/api/internal/threads/$threadId/messages", body) { o ->
            val from = o.optObj("fromUser")
            TeamMessage(
                id = o.optString("id"),
                content = o.optString("content"),
                fromMe = true,
                senderName = from?.optString("name")?.ifBlank { null },
            )
        }
    }

    suspend fun dashboardStats(): DashboardStats {
        return getOptional("/api/analytics/dashboard") { o ->
            val rating = if (o.has("avgRating") && !o.isNull("avgRating")) o.optDouble("avgRating") else null
            val avgMin = if (o.has("avgResponseTimeMinutes") && !o.isNull("avgResponseTimeMinutes")) {
                o.optDouble("avgResponseTimeMinutes")
            } else {
                null
            }
            DashboardStats(
                openConversations = o.optInt("openConversations"),
                unreadConversations = o.optInt("unreadConversations"),
                unansweredConversations = o.optInt("unansweredConversations"),
                unassignedConversations = o.optInt("unassignedConversations"),
                todayMessages = o.optInt("todayMessages"),
                ticketsOpen = o.optInt("ticketsOpen"),
                tasksPending = o.optInt("tasksPending"),
                totalCustomers = o.optInt("totalCustomers"),
                staffOnline = o.optInt("staffOnline"),
                loginsToday = o.optInt("loginsToday"),
                announcementsCount = o.optInt("announcementsCount"),
                unreadAnnouncements = o.optInt("unreadAnnouncements"),
                avgRating = rating,
                ratedConversationsCount = o.optInt("ratedConversationsCount"),
                avgResponseTimeMinutes = avgMin,
            )
        }
    }

    suspend fun announcements(): List<AnnouncementRow> {
        return getOptional("/api/announcements/for-me") { root ->
            val arr = root.optJSONArray("data") ?: root.optJSONArray("announcements")
            arr?.toObjList().orEmpty().map { parseAnnouncement(it) }
        }
    }

    suspend fun announcementTargets(): Pair<List<AnnouncementTarget>, List<AnnouncementTarget>> {
        return getOptional("/api/announcements/targets") { root ->
            val users = root.optJSONArray("users")?.toObjList().orEmpty().map { o ->
                AnnouncementTarget(o.optString("id"), o.optString("name"), "user")
            }
            val departments = root.optJSONArray("departments")?.toObjList().orEmpty().map { o ->
                AnnouncementTarget(o.optString("id"), o.optString("name"), "department")
            }
            users to departments
        }
    }

    suspend fun sendAnnouncement(
        title: String,
        body: String,
        isImportant: Boolean,
        targetType: String,
        targetId: String?,
    ): AnnouncementRow {
        val payload = JSONObject()
            .put("title", title)
            .put("body", body)
            .put("isImportant", isImportant)
            .put("targetType", targetType)
        if (!targetId.isNullOrBlank() && targetType != "all") payload.put("targetId", targetId)
        return post("/api/announcements", payload) { parseAnnouncement(it.optObj("data") ?: it) }
    }

    suspend fun markAnnouncementRead(id: String) {
        post("/api/announcements/$id/read", JSONObject()) { it }
    }

    suspend fun deleteAnnouncement(id: String) {
        delete("/api/announcements/$id") { it }
    }

    suspend fun dashModule(page: String): List<DashItem> = when (page) {
        "departments" -> getOptional("/api/departments") { root ->
            root.optJSONArray("data")?.toObjList().orEmpty().map { o ->
                val users = o.optJSONArray("users")?.length() ?: 0
                DashItem(
                    id = o.optString("id"),
                    title = o.optString("name"),
                    subtitle = o.optObj("branch")?.optStr("name").orEmpty(),
                    meta = "$users",
                )
            }
        }
        "branches" -> getOptional("/api/branches") { root ->
            root.optJSONArray("data")?.toObjList().orEmpty().map { o ->
                val users = o.optJSONArray("users")?.length() ?: 0
                val depts = o.optJSONArray("departments")?.length() ?: 0
                DashItem(
                    id = o.optString("id"),
                    title = o.optString("name"),
                    subtitle = listOfNotNull(o.optStr("city"), o.optStr("country")).joinToString(" · "),
                    meta = "$users / $depts",
                )
            }
        }
        "message-templates" -> getOptional("/api/message-templates") { root ->
            root.optJSONArray("data")?.toObjList().orEmpty().map { o ->
                DashItem(
                    id = o.optString("id"),
                    title = o.optString("name"),
                    subtitle = o.optStr("category").orEmpty(),
                    meta = o.optString("content").replace("\n", " ").take(80),
                )
            }
        }
        "processes" -> getOptional("/api/processes/templates") { root ->
            root.optJSONArray("data")?.toObjList().orEmpty().map { o ->
                DashItem(
                    id = o.optString("id"),
                    title = o.optString("name"),
                    subtitle = o.optStr("description").orEmpty(),
                    meta = o.optInt("instanceCount").toString(),
                )
            }
        }
        "rates", "rates-charts" -> {
            val rates = getOptional("/api/rates") { root ->
                (root.optJSONArray("items") ?: root.optJSONArray("data"))?.toObjList().orEmpty().map { o ->
                    val change = if (o.has("change") && !o.isNull("change")) o.opt("change")?.toString().orEmpty() else ""
                    DashItem(
                        id = o.optString("key").ifBlank { o.optString("id") },
                        title = o.optString("label").ifBlank { o.optString("key") },
                        subtitle = o.opt("value")?.toString().orEmpty(),
                        meta = change,
                    )
                }
            }
            if (page != "rates-charts") rates
            else {
                val hist = getOptional("/api/rates/history?key=usd&days=7") { root ->
                    root.optJSONArray("points")?.toObjList().orEmpty().mapIndexed { i, o ->
                        DashItem(
                            id = "usd-$i",
                            title = o.optString("date").ifBlank { o.optString("jalali") },
                            subtitle = o.opt("value")?.toString().orEmpty(),
                            meta = "USD",
                        )
                    }
                }
                rates + hist
            }
        }
        "services" -> getOptional("/api/services") { root ->
            root.optJSONArray("data")?.toObjList().orEmpty().map { o ->
                DashItem(
                    id = o.optString("id"),
                    title = o.optString("name"),
                    subtitle = listOfNotNull(o.optStr("category"), o.optStr("code")).joinToString(" · "),
                    meta = if (o.optBoolean("isActive", true)) "on" else "off",
                )
            }
        }
        "whatsapp" -> getOptional("/api/whatsapp/overview") { o ->
            val cloud = o.optObj("channels")?.optObj("cloud")
            val gw = o.optObj("channels")?.optObj("gateway")
            listOf(
                DashItem("active", o.optString("activeChannel").ifBlank { "none" }, o.optString("connectionMode"), "channel"),
                DashItem("cloud", "Cloud API", if (cloud?.optBoolean("ready") == true) "ready" else "off", cloud?.optStr("phoneNumberId").orEmpty()),
                DashItem("gateway", "Gateway", if (gw?.optBoolean("connected") == true) "connected" else "off", gw?.optStr("number").orEmpty()),
            )
        }
        "supervision" -> getOptional("/api/supervision/performance") { o ->
            val s = o.optObj("summary") ?: JSONObject()
            val users = o.optJSONArray("users")?.toObjList().orEmpty().take(30).map { u ->
                DashItem(
                    id = u.optString("id"),
                    title = u.optString("name"),
                    subtitle = u.optObj("branch")?.optStr("name").orEmpty(),
                    meta = u.optInt("outgoingMessageCount").toString(),
                )
            }
            listOf(
                DashItem("open", "open", s.optInt("openCount").toString()),
                DashItem("pending", "pending", s.optInt("pendingCount").toString()),
                DashItem("unassigned", "unassigned", s.optInt("unassignedCount").toString()),
                DashItem("today", "today", s.optInt("todayMessageCount").toString()),
            ) + users
        }
        "panel-settings" -> getOptional("/api/panel-settings") { o ->
            listOf("siteName", "loginTitle", "pageTitle", "uiTheme", "primaryColor", "fontFamily", "defaultLanguage")
                .mapNotNull { key ->
                    val v = o.optStr(key) ?: return@mapNotNull null
                    DashItem(key, key, v)
                }
        }
        "system-status" -> getOptional("/api/system-status") { o ->
            val checks = o.optObj("checks") ?: JSONObject()
            val names = listOf("database", "redis", "rabbitmq", "gateway", "whatsapp", "backups")
            val rows = mutableListOf(DashItem("overall", o.optString("status"), o.optString("checkedAt").take(19)))
            names.forEach { key ->
                val c = checks.optObj(key) ?: return@forEach
                rows += DashItem(key, key, c.optString("status"), c.optStr("number") ?: c.opt("latencyMs")?.toString().orEmpty())
            }
            val counts = o.optObj("counts")
            if (counts != null) {
                counts.keys().forEach { k ->
                    rows += DashItem("c-$k", k, counts.opt(k)?.toString().orEmpty())
                }
            }
            rows
        }
        else -> emptyList()
    }

    suspend fun openCustomerConversation(customerId: String, fallbackName: String): ConversationRow? {
        val list = get("/api/customers/$customerId/conversations") { root ->
            root.optJSONArray("data")?.toObjList().orEmpty()
        }
        val o = list.firstOrNull() ?: return null
        val parsed = parseConversation(o)
        return parsed.copy(
            customerId = customerId,
            customerName = fallbackName.ifBlank { parsed.customerName },
        )
    }

    private fun parseCustomer(o: JSONObject): CustomerRow {
        val loc = o.optObj("lastOpenConv")
        val assignee = loc?.optObj("assignee")
        val dept = loc?.optObj("department")
        return CustomerRow(
            id = o.optString("id"),
            name = o.optString("name").ifBlank { "" },
            phone = o.optStr("phone"),
            email = o.optStr("email"),
            status = o.optString("status").ifBlank { "active" },
            avatar = o.optStr("profilePic") ?: o.optStr("avatar"),
            lastContactAt = o.optStr("lastContactAt"),
            firstContactAt = o.optStr("firstContactAt"),
            totalConversations = o.optInt("totalConversations"),
            departmentName = dept?.optStr("name"),
            assigneeName = assignee?.optStr("name"),
            isRestricted = o.optBoolean("isRestrictedFromStaff"),
            notes = o.optStr("notes"),
            birthDate = o.optStr("birthDate"),
            nationalId = o.optStr("nationalId"),
            nationality = o.optStr("nationality"),
            gender = o.optStr("gender"),
            occupation = o.optStr("occupation"),
            companyName = o.optStr("companyName"),
            address = o.optStr("address"),
            city = o.optStr("city"),
            country = o.optStr("country"),
            postalCode = o.optStr("postalCode"),
            instagram = o.optStr("instagram"),
            telegram = o.optStr("telegram"),
            website = o.optStr("website"),
        )
    }

    private fun parseAnnouncement(o: JSONObject): AnnouncementRow {
        val from = o.optObj("fromUser")
        return AnnouncementRow(
            id = o.optString("id"),
            title = o.optString("title").ifBlank { o.optString("subject") },
            body = o.optString("body").ifBlank { o.optString("content") }.ifBlank { o.optString("message") },
            isImportant = o.optBoolean("isImportant"),
            targetType = o.optString("targetType").ifBlank { "all" },
            targetName = o.optStr("targetName"),
            fromName = from?.optStr("name"),
            createdAt = o.optStr("createdAt"),
            read = o.optBoolean("read"),
            canDelete = o.optBoolean("canDelete"),
        )
    }

    private fun parseTimeline(o: JSONObject, index: Int, lang: String): TimelineItem {
        val type = o.optString("type")
        val data = o.optObj("data") ?: JSONObject()
        val date = shortDateTime(o.optStr("date").orEmpty())
        val fa = lang != "en" && lang != "tr"
        return when (type) {
            "conversation" -> {
                val status = data.optString("status")
                val count = data.optInt("messageCount")
                val who = data.optObj("assignee")?.optStr("name")
                TimelineItem(
                    id = data.optString("id").ifBlank { "tl-$index" },
                    type = type,
                    title = if (fa) "مکالمه $status" else "Conversation $status",
                    meta = listOfNotNull(
                        if (count > 0) "$count ${if (fa) "پیام" else "msgs"}" else null,
                        who,
                        date,
                    ).joinToString(" · "),
                    conversationId = data.optStr("id"),
                )
            }
            "activity" -> {
                val action = data.optString("action")
                val label = when (action) {
                    "message_sent" -> if (fa) "ارسال پیام" else "Message sent"
                    "wa_call_started" -> if (fa) "شروع تماس" else "Call started"
                    "wa_call_ended" -> if (fa) "پایان تماس" else "Call ended"
                    else -> action
                }
                val user = data.optObj("user")?.optStr("name")
                    ?: o.optObj("user")?.optStr("name").orEmpty()
                TimelineItem(
                    id = data.optString("id").ifBlank { "tl-$index" },
                    type = type,
                    title = listOf(label, user).filter { it.isNotBlank() }.joinToString(" · "),
                    meta = listOfNotNull(data.optStr("summary"), date).joinToString(" · "),
                )
            }
            "note" -> TimelineItem(
                id = data.optString("id").ifBlank { "tl-$index" },
                type = type,
                title = if (fa) "گزارش/یادداشت" else "Note",
                meta = (data.optStr("content") ?: date).take(120),
            )
            "transaction" -> TimelineItem(
                id = data.optString("id").ifBlank { "tl-$index" },
                type = type,
                title = if (fa) "تراکنش" else "Transaction",
                meta = listOfNotNull(data.optStr("amount"), data.optStr("note"), date)
                    .joinToString(" · "),
            )
            else -> TimelineItem(
                id = "tl-$index",
                type = type.ifBlank { "item" },
                title = type.ifBlank { "—" },
                meta = date,
            )
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

    private fun parseTeamThread(o: JSONObject): TeamThread {
        val last = o.optObj("lastMessage")
        val preview = last?.optString("content")?.ifBlank { null }
        return TeamThread(
            id = o.optString("id"),
            displayName = o.optString("displayName").ifBlank { o.optString("name") }.ifBlank { "Chat" },
            lastPreview = preview,
            unreadCount = o.optInt("unreadCount"),
        )
    }

    private fun parseStaffPresence(o: JSONObject): StaffPresence {
        return StaffPresence(
            id = o.optString("id"),
            name = o.optString("name").ifBlank { o.optString("email") }.ifBlank { "—" },
            email = o.optStr("email"),
            status = o.optString("status").ifBlank { "offline" }.lowercase(),
            lastLoginAt = o.optStr("lastLoginAt")?.let { shortDateTime(it) },
            branchName = o.optObj("branch")?.optStr("name"),
            departmentName = o.optObj("department")?.optStr("name"),
            lastLoginIp = o.optStr("lastLoginIp"),
            lastLoginCountry = o.optStr("lastLoginCountry"),
        )
    }

    private fun parseStaffLogin(o: JSONObject): StaffLoginRow {
        val user = o.optObj("user")
        return StaffLoginRow(
            id = o.optString("id").ifBlank { "login-${o.hashCode()}" },
            userName = user?.optString("name").orEmpty().ifBlank { user?.optString("email").orEmpty() }.ifBlank { "—" },
            email = user?.optStr("email"),
            branchName = o.optObj("branch")?.optStr("name"),
            createdAt = o.optStr("createdAt")?.let { shortDateTime(it) },
            ip = o.optStr("ip"),
            country = o.optStr("country"),
            summary = o.optStr("summary"),
        )
    }

    private fun parseOrgUser(o: JSONObject): OrgUser {
        val first = o.optString("firstName")
        val last = o.optString("lastName")
        val composed = listOf(first, last).filter { it.isNotBlank() }.joinToString(" ")
        val active = !o.has("isActive") || o.isNull("isActive") || o.optBoolean("isActive", true)
        return OrgUser(
            id = o.optString("id"),
            name = o.optString("name").ifBlank { composed }.ifBlank { o.optString("username") }.ifBlank { o.optString("email") }.ifBlank { "—" },
            email = o.optStr("email"),
            username = o.optStr("username"),
            role = o.optString("role").ifBlank { "agent" },
            position = o.optStr("position"),
            status = o.optString("status").ifBlank { "offline" }.lowercase(),
            isActive = active,
            lastLoginAt = o.optStr("lastLoginAt")?.let { shortDateTime(it) },
            branchName = o.optObj("branch")?.optStr("name"),
            departmentName = o.optObj("department")?.optStr("name"),
            avatar = o.optStr("avatar"),
        )
    }

    private fun parseConversation(o: JSONObject): ConversationRow {
        val c = o.optObj("customer")
        val assignee = o.optObj("assignee")
        val meta = o.optObj("metadata")
        val phone = c?.optStr("phone")
        val isGroup = meta?.optBoolean("isGroup") == true || (phone?.contains("@g.us", ignoreCase = true) == true)
        val groupName = meta?.optStr("groupName") ?: meta?.optStr("name")
        val displayName = when {
            isGroup -> groupName ?: c?.optStr("name") ?: "گروه"
            else -> c?.optStr("name")?.ifBlank { null } ?: ""
        }
        return ConversationRow(
            id = o.optString("id"),
            status = o.optStr("status").orEmpty(),
            unreadCount = o.optInt("unreadCount"),
            lastMessageAt = o.optStr("lastMessageAt"),
            lastMessagePreview = o.optStr("lastMessagePreview")
                ?: o.optObj("lastMessage")?.optStr("content"),
            customerId = c?.optStr("id"),
            customerName = displayName,
            customerPhone = phone,
            customerAvatar = c?.optStr("profilePic"),
            assigneeName = assignee?.optStr("name")
                ?: assignee?.optStr("whatsappSenderName")
                ?: assignee?.optStr("username"),
            departmentName = o.optObj("department")?.optStr("name"),
            priority = o.optStr("priority"),
            isGroup = isGroup,
            isHiddenFromStaff = o.optBoolean("isHiddenFromStaff") || c?.optBoolean("isRestrictedFromStaff") == true,
            lastOutgoingIsAutoReply = o.optBoolean("lastOutgoingIsAutoReply"),
        )
    }

    private fun parseMessage(o: JSONObject): ChatMessage {
        val media = o.optObj("mediaData")
        val url = media?.optString("url")?.ifBlank { null }
            ?: media?.optString("path")?.ifBlank { null }
        val user = o.optObj("user")
        val type = o.optString("type").ifBlank { "text" }
        return ChatMessage(
            id = o.optString("id").ifBlank { "tmp-${o.hashCode()}" },
            direction = o.optString("direction").ifBlank { "incoming" },
            content = o.optString("content").ifBlank { o.optString("text") }.ifBlank { o.optString("body") },
            type = type,
            timestamp = o.optString("timestamp").ifBlank { o.optString("createdAt") }.ifBlank { null },
            hasMedia = o.optBoolean("hasMedia") || url != null,
            mediaUrl = url,
            mediaMime = media?.optString("mimetype")?.ifBlank { null }
                ?: media?.optString("mime")?.ifBlank { null },
            mediaName = media?.optString("filename")?.ifBlank { null }
                ?: media?.optString("name")?.ifBlank { null },
            senderName = user?.optString("whatsappSenderName")?.ifBlank { null }
                ?: user?.optString("name")?.ifBlank { null },
        )
    }

    private suspend fun <T> get(path: String, map: (JSONObject) -> T): T = request("GET", path, null, map)

    private suspend fun <T> getOptional(path: String, map: (JSONObject) -> T): T =
        request("GET", path, null, map, optional = true)

    private suspend fun <T> post(path: String, body: JSONObject, map: (JSONObject) -> T): T =
        request("POST", path, body, map)

    private suspend fun <T> patch(path: String, body: JSONObject, map: (JSONObject) -> T): T =
        request("PATCH", path, body, map)

    private suspend fun <T> put(path: String, body: JSONObject, map: (JSONObject) -> T): T =
        request("PUT", path, body, map)

    private suspend fun <T> delete(path: String, map: (JSONObject) -> T): T =
        request("DELETE", path, null, map)

    private suspend fun <T> request(
        method: String,
        path: String,
        body: JSONObject?,
        map: (JSONObject) -> T,
        optional: Boolean = false,
    ): T = withContext(Dispatchers.IO) {
        val url = session.baseUrl + if (path.startsWith("/")) path else "/$path"
        val builder = Request.Builder().url(url)
        session.token?.let { builder.header("Authorization", "Bearer $it") }
        builder.header("Accept", "application/json")
        builder.header("User-Agent", "KayaStaff-Android/1.0")
        val reqBody = body?.toString()?.toRequestBody(jsonType)
        when (method) {
            "POST" -> builder.post(reqBody ?: EMPTY)
            "PATCH" -> builder.patch(reqBody ?: EMPTY)
            "PUT" -> builder.put(reqBody ?: EMPTY)
            "DELETE" -> builder.delete()
            else -> builder.get()
        }
        val res = try {
            http.newCall(builder.build()).execute()
        } catch (e: java.io.IOException) {
            throw ApiException("اتصال به سرور برقرار نشد.", 0, isNetwork = true)
        }
        res.use {
            val text = it.body?.string().orEmpty()
            if (it.code == 401) {
                val authHandshake = path.startsWith("/api/auth/login") ||
                    path.startsWith("/api/auth/forgot-password") ||
                    path.startsWith("/api/auth/totp/")
                val kickSession = !authHandshake &&
                    (path == "/api/auth/me" || path.startsWith("/api/conversations"))
                if (kickSession) session.clearSession()
                throw ApiException(
                    extractError(
                        text,
                        if (authHandshake) "ورود ناموفق بود" else "نشست منقضی شد. دوباره وارد شوید.",
                    ),
                    401,
                )
            }
            if (optional && !it.isSuccessful && it.code != 401) {
                val trimmedSoft = text.trim()
                val soft = if (trimmedSoft.startsWith("{")) JSONObject(trimmedSoft) else JSONObject().put("data", JSONArray())
                return@withContext map(soft)
            }
            if (!it.isSuccessful) {
                throw ApiException(extractError(text, "خطای سرور (${it.code})"), it.code)
            }
            val trimmed = text.trim()
            val root = when {
                trimmed.startsWith("{") -> JSONObject(trimmed)
                trimmed.startsWith("[") -> JSONObject().put("data", JSONArray(trimmed))
                else -> JSONObject()
            }
            try {
                map(root)
            } catch (e: ApiException) {
                throw e
            } catch (e: Exception) {
                throw ApiException(e.message ?: "پاسخ نامعتبر سرور", it.code)
            }
        }
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

private fun shortDateTime(raw: String): String {
    if (raw.isBlank()) return ""
    return raw.replace("T", " ").take(16)
}
