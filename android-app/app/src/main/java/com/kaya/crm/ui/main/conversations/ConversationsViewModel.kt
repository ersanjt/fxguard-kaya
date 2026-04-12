package com.kaya.crm.ui.main.conversations

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaya.crm.data.models.Conversation
import com.kaya.crm.data.models.MessageItem
import com.kaya.crm.data.repository.CrmRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ConversationsViewModel @Inject constructor(
    private val repo: CrmRepository
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

    /** null = همه؛ مقدار مستقیم برای API (مثلاً open، pending) */
    private val _statusFilter = MutableStateFlow<String?>(null)
    val statusFilter: StateFlow<String?> = _statusFilter.asStateFlow()

    private var searchDebounceJob: Job? = null

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
    }

    fun sendMessage(conversationId: String, content: String) {
        val trimmed = content.trim()
        if (trimmed.isEmpty() || _sendingMessage.value) return
        viewModelScope.launch {
            _sendingMessage.value = true
            _detailError.value = null
            repo.sendMessage(conversationId, trimmed)
                .onSuccess { msg ->
                    _messages.value = _messages.value + msg
                    _inputClearNonce.value = _inputClearNonce.value + 1
                }
                .onFailure { _detailError.value = it.message }
            _sendingMessage.value = false
        }
    }
}
