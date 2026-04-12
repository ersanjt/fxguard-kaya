package com.kaya.crm.ui.main.conversations

import android.content.Context
import android.net.Uri
import androidx.core.content.FileProvider
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaya.crm.data.models.Conversation
import com.kaya.crm.data.models.MessageItem
import com.kaya.crm.data.models.UserBrief
import com.kaya.crm.data.repository.AuthRepository
import com.kaya.crm.data.repository.CrmRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.io.File
import javax.inject.Inject

data class ReplyDraft(
    val whatsappId: String,
    val preview: String
)

@HiltViewModel
class ConversationsViewModel @Inject constructor(
    private val repo: CrmRepository,
    private val authRepo: AuthRepository,
    @ApplicationContext private val app: Context
) : ViewModel() {

    private val _conversations = MutableStateFlow<List<Conversation>>(emptyList())
    val conversations: StateFlow<List<Conversation>> = _conversations.asStateFlow()

    private val _messages = MutableStateFlow<List<MessageItem>>(emptyList())
    val messages: StateFlow<List<MessageItem>> = _messages.asStateFlow()

    private val _messagesLoading = MutableStateFlow(false)
    val messagesLoading: StateFlow<Boolean> = _messagesLoading.asStateFlow()

    private val _loadingOlderMessages = MutableStateFlow(false)
    val loadingOlderMessages: StateFlow<Boolean> = _loadingOlderMessages.asStateFlow()

    private val _hasMoreMessages = MutableStateFlow(false)
    val hasMoreMessages: StateFlow<Boolean> = _hasMoreMessages.asStateFlow()

    private val _oldestMessageId = MutableStateFlow<String?>(null)
    val oldestMessageId: StateFlow<String?> = _oldestMessageId.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _detailError = MutableStateFlow<String?>(null)
    val detailError: StateFlow<String?> = _detailError.asStateFlow()

    private val _sendingMessage = MutableStateFlow(false)
    val sendingMessage: StateFlow<Boolean> = _sendingMessage.asStateFlow()

    private val _inputClearNonce = MutableStateFlow(0)
    val inputClearNonce: StateFlow<Int> = _inputClearNonce.asStateFlow()

    private val _selectedConversationId = MutableStateFlow<String?>(null)
    val selectedConversationId: StateFlow<String?> = _selectedConversationId.asStateFlow()

    private val _searchText = MutableStateFlow("")
    val searchText: StateFlow<String> = _searchText.asStateFlow()

    private val _statusFilter = MutableStateFlow<String?>(null)
    val statusFilter: StateFlow<String?> = _statusFilter.asStateFlow()

    private val _replyTo = MutableStateFlow<ReplyDraft?>(null)
    val replyTo: StateFlow<ReplyDraft?> = _replyTo.asStateFlow()

    private val _assignableUsers = MutableStateFlow<List<UserBrief>>(emptyList())
    val assignableUsers: StateFlow<List<UserBrief>> = _assignableUsers.asStateFlow()

    private val _assignListLoading = MutableStateFlow(false)
    val assignListLoading: StateFlow<Boolean> = _assignListLoading.asStateFlow()

    private var searchDebounceJob: Job? = null

    fun setReplyTo(whatsappId: String?, preview: String = "") {
        if (whatsappId.isNullOrBlank()) {
            _replyTo.value = null
        } else {
            _replyTo.value = ReplyDraft(whatsappId, preview.take(160))
        }
    }

    fun clearReplyTo() {
        _replyTo.value = null
    }

    fun loadAssignableUsers() {
        viewModelScope.launch {
            _assignListLoading.value = true
            repo.getAssignableUsers()
                .onSuccess { _assignableUsers.value = it }
                .onFailure { _detailError.value = it.message }
            _assignListLoading.value = false
        }
    }

    fun assignConversation(conversationId: String, assignedToUserId: String?) {
        viewModelScope.launch {
            _detailError.value = null
            repo.patchConversationAssign(conversationId, assignedToUserId)
                .onSuccess { updated ->
                    _conversations.value = _conversations.value.map { c ->
                        if (c.id == conversationId) updated else c
                    }
                }
                .onFailure { _detailError.value = it.message }
        }
    }

    suspend fun currentUserId(): String? = authRepo.currentUser.first()?.id

    fun setSearchText(text: String) {
        _searchText.value = text
        searchDebounceJob?.cancel()
        searchDebounceJob = viewModelScope.launch {
            delay(350)
            fetchConversationList()
        }
    }

    fun load() {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            fetchConversationList()
            _loading.value = false
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _refreshing.value = true
            _error.value = null
            fetchConversationList()
            _refreshing.value = false
        }
    }

    fun setStatusFilter(status: String?) {
        _statusFilter.value = status
        viewModelScope.launch {
            fetchConversationList()
        }
    }

    private suspend fun fetchConversationList() {
        val q = _searchText.value.trim().takeIf { it.isNotEmpty() }
        val st = _statusFilter.value
        repo.getConversations(page = 1, status = st, search = q)
            .onSuccess { _conversations.value = it.data ?: emptyList() }
            .onFailure { _error.value = it.message }
    }

    fun clearError() { _error.value = null }

    fun clearDetailError() { _detailError.value = null }

    fun openConversation(id: String) {
        _selectedConversationId.value = id
        _messages.value = emptyList()
        _detailError.value = null
        _hasMoreMessages.value = false
        _oldestMessageId.value = null
        _replyTo.value = null
        viewModelScope.launch {
            _messagesLoading.value = true
            repo.markConversationRead(id).onSuccess {
                _conversations.value = _conversations.value.map { c ->
                    if (c.id == id) c.copy(unreadCount = 0) else c
                }
            }
            repo.getMessages(id)
                .onSuccess { page ->
                    _messages.value = page.messages
                    _hasMoreMessages.value = page.hasMore
                    _oldestMessageId.value = page.oldestId
                }
                .onFailure { _detailError.value = it.message }
            _messagesLoading.value = false
        }
    }

    fun loadOlderMessages() {
        val id = _selectedConversationId.value ?: return
        val before = _oldestMessageId.value ?: return
        if (_loadingOlderMessages.value || !_hasMoreMessages.value) return
        viewModelScope.launch {
            _loadingOlderMessages.value = true
            repo.getMessages(id, before = before)
                .onSuccess { page ->
                    _messages.value = page.messages + _messages.value
                    _hasMoreMessages.value = page.hasMore
                    _oldestMessageId.value = page.oldestId
                }
                .onFailure { _detailError.value = it.message }
            _loadingOlderMessages.value = false
        }
    }

    fun closeConversation() {
        _selectedConversationId.value = null
        _messages.value = emptyList()
        _detailError.value = null
        _hasMoreMessages.value = false
        _oldestMessageId.value = null
        _replyTo.value = null
    }

    private fun fileProviderUri(file: File): Uri =
        FileProvider.getUriForFile(app, "${app.packageName}.fileprovider", file)

    /**
     * [attachmentUris] چند فایل = چند درخواست پشت‌سرهم (هر رسانه یک پیام واتساپ).
     * [voiceFile] اگر باشد، با اولویت همان ارسال می‌شود (متن اختیاری).
     */
    fun sendMessage(
        conversationId: String,
        content: String,
        attachmentUris: List<Uri> = emptyList(),
        voiceFile: File? = null
    ) {
        if (_sendingMessage.value) return
        val trimmed = content.trim()
        if (trimmed.isEmpty() && attachmentUris.isEmpty() && voiceFile == null) return

        viewModelScope.launch {
            _sendingMessage.value = true
            _detailError.value = null
            val replyId = _replyTo.value?.whatsappId

            try {
                if (voiceFile != null) {
                    val uri = fileProviderUri(voiceFile)
                    repo.sendMessage(conversationId, trimmed, uri, replyId)
                        .onSuccess { msg ->
                            _messages.value = _messages.value + msg
                            _inputClearNonce.value = _inputClearNonce.value + 1
                            clearReplyTo()
                        }
                        .onFailure { _detailError.value = it.message }
                    voiceFile.delete()
                } else if (attachmentUris.isEmpty()) {
                    repo.sendMessage(conversationId, trimmed, null, replyId)
                        .onSuccess { msg ->
                            _messages.value = _messages.value + msg
                            _inputClearNonce.value = _inputClearNonce.value + 1
                            clearReplyTo()
                        }
                        .onFailure { _detailError.value = it.message }
                } else {
                    attachmentUris.forEachIndexed { index, uri ->
                        val textPart = if (index == 0) trimmed else ""
                        val replyPart = if (index == 0) replyId else null
                        val result = repo.sendMessage(conversationId, textPart, uri, replyPart)
                        result.onSuccess { msg ->
                            _messages.value = _messages.value + msg
                        }.onFailure {
                            _detailError.value = it.message
                            return@launch
                        }
                    }
                    _inputClearNonce.value = _inputClearNonce.value + 1
                    clearReplyTo()
                }
            } finally {
                _sendingMessage.value = false
            }
        }
    }
}
