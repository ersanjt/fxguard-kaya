package com.kaya.crm.data.repository

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import com.kaya.crm.data.api.ApiService
import com.kaya.crm.data.models.*
import com.kaya.crm.data.util.ApiErrorParser
import com.kaya.crm.data.util.mapNetworkError
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import javax.inject.Inject

class CrmRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: ApiService
) {

    private fun <T> handleResponse(response: retrofit2.Response<T>): T {
        if (response.isSuccessful) {
            return response.body() ?: throw Exception("پاسخ خالی از سرور")
        }
        val errorBody = try { response.errorBody()?.string() } catch (_: IOException) { null }
        throw Exception(ApiErrorParser.parseError(errorBody))
    }

    suspend fun getDashboard(): Result<DashboardResponse> = runCatching {
        handleResponse(api.getDashboard())
    }.mapNetworkError()

    suspend fun getConversations(
        page: Int = 1,
        status: String? = null,
        search: String? = null
    ): Result<ConversationsResponse> = runCatching {
        handleResponse(api.getConversations(page, 50, status, search))
    }.mapNetworkError()

    suspend fun getMessages(
        conversationId: String,
        before: String? = null,
        limit: Int = 100
    ): Result<ConversationMessagesPage> = runCatching {
        val r = api.getMessages(conversationId, limit, before)
        if (r.isSuccessful) {
            val body = r.body()!!
            val list = body.data ?: body.messages ?: emptyList()
            ConversationMessagesPage(
                messages = list,
                hasMore = body.hasMore ?: false,
                oldestId = body.oldestId,
                total = body.total ?: list.size
            )
        } else {
            throw Exception(ApiErrorParser.parseError(r.errorBody()?.string()))
        }
    }.mapNetworkError()

    suspend fun markConversationRead(conversationId: String): Result<Unit> = runCatching {
        val r = api.markConversationRead(conversationId)
        if (!r.isSuccessful) {
            throw Exception(ApiErrorParser.parseError(r.errorBody()?.string()))
        }
    }.mapNetworkError()

    /**
     * ارسال متن و/یا رسانه (مثل وب: یک media در هر درخواست).
     * [replyTo] شناسهٔ واتساپ پیامی است که به آن پاسخ داده می‌شود.
     */
    suspend fun sendMessage(
        conversationId: String,
        content: String,
        mediaUri: Uri? = null,
        replyTo: String? = null
    ): Result<MessageItem> = withContext(Dispatchers.IO) {
        runCatching {
            val trimmed = content.trim()
            val media = mediaUri?.let { uploadChatFile(it).getOrThrow() }
            if (trimmed.isEmpty() && media == null) {
                throw Exception("متن یا فایل لازم است")
            }
            val body = SendMessageRequest(
                content = trimmed,
                type = media?.let { inferMessageType(it.mimetype) },
                media = media,
                replyTo = replyTo?.takeIf { it.isNotBlank() }
            )
            handleResponse(api.sendMessage(conversationId, body))
        }.mapNetworkError()
    }

    private fun inferMessageType(mime: String): String {
        return when {
            mime.startsWith("image/") -> "image"
            mime.startsWith("video/") -> "video"
            mime.startsWith("audio/") -> "audio"
            else -> "document"
        }
    }

    private suspend fun uploadChatFile(uri: Uri): Result<SendMessageMedia> = withContext(Dispatchers.IO) {
        runCatching {
            val cr = context.contentResolver
            val mime = cr.getType(uri) ?: "application/octet-stream"
            val displayName = runCatching {
                cr.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
                    if (c.moveToFirst()) c.getString(0) else null
                }
            }.getOrNull() ?: "file"
            val input = cr.openInputStream(uri) ?: throw Exception("فایل باز نشد")
            val bytes = input.use { it.readBytes() }
            if (bytes.isEmpty()) throw Exception("فایل خالی است")
            val body = bytes.toRequestBody(mime.toMediaTypeOrNull())
            val part = MultipartBody.Part.createFormData("file", displayName, body)
            val r = api.uploadFile(part)
            if (!r.isSuccessful) throw Exception(ApiErrorParser.parseError(r.errorBody()?.string()))
            val up = r.body() ?: throw Exception("پاسخ آپلود خالی است")
            if (!up.error.isNullOrBlank()) throw Exception(up.error)
            val url = up.url ?: throw Exception("آدرس فایل نیامد")
            SendMessageMedia(
                url = url,
                filename = up.name ?: displayName,
                mimetype = mime
            )
        }
    }

    suspend fun patchConversationAssign(conversationId: String, assignedToUserId: String?): Result<Conversation> =
        runCatching {
            handleResponse(
                api.patchConversation(
                    conversationId,
                    PatchConversationBody(assignedTo = assignedToUserId)
                )
            )
        }.mapNetworkError()

    /** برای تخصیص مکالمه — همان لیست «چت داخلی» (کاربران شعبه/سازمان) */
    suspend fun getAssignableUsers(): Result<List<UserBrief>> = runCatching {
        val r = api.getInternalUsers()
        if (r.isSuccessful) r.body()?.data ?: emptyList()
        else throw Exception(ApiErrorParser.parseError(r.errorBody()?.string()))
    }.mapNetworkError()

    suspend fun getCustomers(
        page: Int = 1,
        search: String? = null,
        status: String? = null
    ): Result<CustomersResponse> = runCatching {
        handleResponse(api.getCustomers(page, 50, search, status))
    }.mapNetworkError()

    suspend fun getCustomer(id: String): Result<CustomerDetail> = runCatching {
        handleResponse(api.getCustomer(id))
    }.mapNetworkError()

    suspend fun getTickets(page: Int = 1): Result<TicketsResponse> = runCatching {
        handleResponse(api.getTickets(page, 50))
    }.mapNetworkError()

    suspend fun getTasks(page: Int = 1, status: String? = null): Result<TasksResponse> = runCatching {
        handleResponse(api.getTasks(page, 50, status))
    }.mapNetworkError()

    suspend fun getAnnouncements(): Result<List<Announcement>> = runCatching {
        val r = api.getAnnouncements()
        if (r.isSuccessful) r.body()?.data ?: emptyList()
        else throw Exception(ApiErrorParser.parseError(r.errorBody()?.string()))
    }.mapNetworkError()

    suspend fun getGatewayStatus(): Result<WhatsAppStatus> = runCatching {
        handleResponse(api.getGatewayStatus())
    }.mapNetworkError()
}
