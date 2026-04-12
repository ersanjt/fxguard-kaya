package com.kaya.crm.ui.main.internalchat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaya.crm.data.models.InternalMessageItem
import com.kaya.crm.data.models.InternalThreadBrief
import com.kaya.crm.data.models.UserBrief
import com.kaya.crm.data.repository.AuthRepository
import com.kaya.crm.data.repository.InternalChatRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class InternalChatViewModel @Inject constructor(
    private val repo: InternalChatRepository,
    private val authRepo: AuthRepository
) : ViewModel() {

    private val _currentUserId = MutableStateFlow<String?>(null)
    val currentUserId: StateFlow<String?> = _currentUserId.asStateFlow()

    init {
        viewModelScope.launch {
            _currentUserId.value = authRepo.currentUser.first()?.id
        }
    }

    private val _threads = MutableStateFlow<List<InternalThreadBrief>>(emptyList())
    val threads: StateFlow<List<InternalThreadBrief>> = _threads.asStateFlow()

    private val _messages = MutableStateFlow<List<InternalMessageItem>>(emptyList())
    val messages: StateFlow<List<InternalMessageItem>> = _messages.asStateFlow()

    private val _messagesLoading = MutableStateFlow(false)
    val messagesLoading: StateFlow<Boolean> = _messagesLoading.asStateFlow()

    private val _users = MutableStateFlow<List<UserBrief>>(emptyList())
    val users: StateFlow<List<UserBrief>> = _users.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _detailError = MutableStateFlow<String?>(null)
    val detailError: StateFlow<String?> = _detailError.asStateFlow()

    private val _selectedThreadId = MutableStateFlow<String?>(null)
    val selectedThreadId: StateFlow<String?> = _selectedThreadId.asStateFlow()

    private val _sendingMessage = MutableStateFlow(false)
    val sendingMessage: StateFlow<Boolean> = _sendingMessage.asStateFlow()

    private val _inputClearNonce = MutableStateFlow(0)
    val inputClearNonce: StateFlow<Int> = _inputClearNonce.asStateFlow()

    fun loadThreads() {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            repo.getThreads()
                .onSuccess { _threads.value = it }
                .onFailure { _error.value = it.message }
            _loading.value = false
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _refreshing.value = true
            _error.value = null
            repo.getThreads()
                .onSuccess { _threads.value = it }
                .onFailure { _error.value = it.message }
            _refreshing.value = false
        }
    }

    fun loadUsers() {
        viewModelScope.launch {
            repo.getUsers().onSuccess { _users.value = it }
        }
    }

    fun openThread(id: String) {
        _selectedThreadId.value = id
        _messages.value = emptyList()
        _detailError.value = null
        viewModelScope.launch {
            _messagesLoading.value = true
            repo.getMessages(id)
                .onSuccess { _messages.value = it }
                .onFailure { _detailError.value = it.message }
            _messagesLoading.value = false
        }
    }

    fun closeThread() {
        _selectedThreadId.value = null
        _messages.value = emptyList()
        _detailError.value = null
    }

    fun clearDetailError() { _detailError.value = null }

    fun sendMessage(threadId: String, content: String) {
        val trimmed = content.trim()
        if (trimmed.isEmpty() || _sendingMessage.value) return
        viewModelScope.launch {
            _sendingMessage.value = true
            _detailError.value = null
            repo.sendMessage(threadId, trimmed)
                .onSuccess { msg ->
                    _messages.value = _messages.value + msg
                    _inputClearNonce.value = _inputClearNonce.value + 1
                }
                .onFailure { _detailError.value = it.message }
            _sendingMessage.value = false
        }
    }

    fun createThread(userIds: List<String>) {
        viewModelScope.launch {
            repo.createThread(userIds)
                .onSuccess { thread ->
                    repo.getThreads().onSuccess { _threads.value = it }
                    openThread(thread.id)
                }
                .onFailure { _error.value = it.message }
        }
    }

    fun clearError() { _error.value = null }
}
