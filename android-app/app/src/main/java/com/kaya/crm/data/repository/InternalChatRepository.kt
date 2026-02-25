package com.kaya.crm.data.repository

import com.kaya.crm.data.api.ApiService
import com.kaya.crm.data.models.*
import com.kaya.crm.data.util.ApiErrorParser
import com.kaya.crm.data.util.mapNetworkError
import javax.inject.Inject

class InternalChatRepository @Inject constructor(private val api: ApiService) {

    suspend fun getThreads(): Result<List<InternalThreadBrief>> = runCatching {
        val r = api.getInternalThreads()
        if (r.isSuccessful) r.body()?.data ?: emptyList()
        else throw Exception(ApiErrorParser.parseError(r.errorBody()?.string()))
    }.mapNetworkError()

    suspend fun getMessages(threadId: String): Result<List<InternalMessageItem>> = runCatching {
        val r = api.getInternalMessages(threadId)
        if (r.isSuccessful) r.body()?.data ?: emptyList()
        else throw Exception(ApiErrorParser.parseError(r.errorBody()?.string()))
    }.mapNetworkError()

    suspend fun sendMessage(threadId: String, content: String): Result<InternalMessageItem> = runCatching {
        val r = api.sendInternalMessage(threadId, SendInternalMessageRequest(content))
        if (r.isSuccessful) r.body()!!
        else throw Exception(ApiErrorParser.parseError(r.errorBody()?.string()))
    }.mapNetworkError()

    suspend fun createThread(userIds: List<String>): Result<InternalThread> = runCatching {
        val r = api.createInternalThread(CreateThreadRequest(userIds))
        if (r.isSuccessful) r.body()!!
        else throw Exception(ApiErrorParser.parseError(r.errorBody()?.string()))
    }.mapNetworkError()

    suspend fun getUsers(): Result<List<UserBrief>> = runCatching {
        val r = api.getInternalUsers()
        if (r.isSuccessful) r.body()?.data ?: emptyList()
        else throw Exception(ApiErrorParser.parseError(r.errorBody()?.string()))
    }.mapNetworkError()
}
