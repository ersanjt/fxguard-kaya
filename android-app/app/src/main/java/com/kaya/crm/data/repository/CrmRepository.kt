package com.kaya.crm.data.repository

import com.kaya.crm.data.api.ApiService
import com.kaya.crm.data.models.*
import com.kaya.crm.data.util.ApiErrorParser
import com.kaya.crm.data.util.mapNetworkError
import java.io.IOException
import javax.inject.Inject

class CrmRepository @Inject constructor(private val api: ApiService) {

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

    suspend fun sendMessage(conversationId: String, content: String): Result<MessageItem> = runCatching {
        handleResponse(api.sendMessage(conversationId, SendMessageRequest(content)))
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
