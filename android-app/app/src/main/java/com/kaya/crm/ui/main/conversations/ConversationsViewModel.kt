package com.kaya.crm.ui.main.conversations

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaya.crm.data.models.Conversation
import com.kaya.crm.data.models.MessageItem
import com.kaya.crm.data.repository.CrmRepository
import dagger.hilt.android.lifecycle.HiltViewModel
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

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _selectedConversationId = MutableStateFlow<String?>(null)
    val selectedConversationId: String? get() = _selectedConversationId.value

    fun load() {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            repo.getConversations()
                .onSuccess { _conversations.value = it.data ?: emptyList() }
                .onFailure { _error.value = it.message }
            _loading.value = false
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _refreshing.value = true
            _error.value = null
            repo.getConversations()
                .onSuccess { _conversations.value = it.data ?: emptyList() }
                .onFailure { _error.value = it.message }
            _refreshing.value = false
        }
    }

    fun clearError() { _error.value = null }

    fun openConversation(id: String) {
        _selectedConversationId.value = id
        _messages.value = emptyList()
        viewModelScope.launch {
            _messagesLoading.value = true
            repo.getMessages(id)
                .onSuccess { _messages.value = it }
                .onFailure { _error.value = it.message }
            _messagesLoading.value = false
        }
    }

    fun closeConversation() {
        _selectedConversationId.value = null
    }

    fun sendMessage(conversationId: String, content: String) {
        viewModelScope.launch {
            repo.sendMessage(conversationId, content)
                .onSuccess { msg -> _messages.value = _messages.value + msg }
                .onFailure { _error.value = it.message }
        }
    }
}
