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
import javax.inject.Inject

class InternalChatRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: ApiService
) {

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

    suspend fun sendMessage(
        threadId: String,
        content: String,
        attachmentUris: List<Uri> = emptyList()
    ): Result<InternalMessageItem> = withContext(Dispatchers.IO) {
        runCatching {
            val uploaded = attachmentUris.map { uploadOne(it) }
            val trimmed = content.trim()
            val bodyContent = when {
                trimmed.isNotEmpty() -> trimmed
                uploaded.isNotEmpty() -> "(پیوست)"
                else -> throw Exception("متن یا حداقل یک فایل لازم است")
            }
            val r = api.sendInternalMessage(
                threadId,
                SendInternalMessageRequest(
                    content = bodyContent,
                    attachments = uploaded.takeIf { it.isNotEmpty() }
                )
            )
            if (r.isSuccessful) r.body()!!
            else throw Exception(ApiErrorParser.parseError(r.errorBody()?.string()))
        }.mapNetworkError()
    }

    private suspend fun uploadOne(uri: Uri): InternalAttachmentItem = withContext(Dispatchers.IO) {
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
        val mediaType = mime.toMediaTypeOrNull()
        val body = bytes.toRequestBody(mediaType)
        val part = MultipartBody.Part.createFormData("file", displayName, body)
        val r = api.uploadFile(part)
        if (!r.isSuccessful) {
            throw Exception(ApiErrorParser.parseError(r.errorBody()?.string()))
        }
        val up = r.body() ?: throw Exception("پاسخ آپلود خالی است")
        val err = up.error
        if (!err.isNullOrBlank()) throw Exception(err)
        val url = up.url ?: throw Exception("آدرس فایل نیامد")
        InternalAttachmentItem(
            name = up.name ?: displayName,
            url = url,
            size = up.size ?: bytes.size.toLong(),
            allowDownload = true
        )
    }

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
