package com.kaya.crm.ui.main.internalchat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaya.crm.data.models.InternalMessageItem
import com.kaya.crm.data.models.InternalThreadBrief
import com.kaya.crm.data.models.UserBrief
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
    private val authRepo: com.kaya.crm.data.repository.AuthRepository
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

    private val _selectedThreadId = MutableStateFlow<String?>(null)
    val selectedThreadId: String? get() = _selectedThreadId.value

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
        viewModelScope.launch {
            _messagesLoading.value = true
            repo.getMessages(id)
                .onSuccess { _messages.value = it }
                .onFailure { _error.value = it.message }
            _messagesLoading.value = false
        }
    }

    fun closeThread() {
        _selectedThreadId.value = null
    }

    fun sendMessage(threadId: String, content: String) {
        viewModelScope.launch {
            repo.sendMessage(threadId, content)
                .onSuccess { msg -> _messages.value = _messages.value + msg }
                .onFailure { _error.value = it.message }
        }
    }

    fun createThread(userIds: List<String>) {
        viewModelScope.launch {
            repo.createThread(userIds)
                .onSuccess { thread ->
                    _threads.value = _threads.value + InternalThreadBrief(
                        id = thread.id,
                        lastMessageAt = null,
                        lastMessage = null,
                        participants = thread.participants ?: emptyList()
                    )
                    _selectedThreadId.value = thread.id
                    _messages.value = emptyList()
                }
                .onFailure { _error.value = it.message }
        }
    }

    fun clearError() { _error.value = null }
}
