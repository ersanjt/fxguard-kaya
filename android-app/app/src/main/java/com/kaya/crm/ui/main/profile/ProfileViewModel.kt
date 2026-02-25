package com.kaya.crm.ui.main.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaya.crm.data.models.UserResponse
import com.kaya.crm.data.preferences.AuthPreferences
import com.kaya.crm.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    private val _user = MutableStateFlow<UserResponse?>(null)
    val user: StateFlow<UserResponse?> = _user.asStateFlow()

    val savedServerUrl: StateFlow<String?> = authPreferences.baseUrl
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    init {
        viewModelScope.launch {
            _user.value = authRepository.currentUser.first()
            authRepository.refreshUser().onSuccess { _user.value = it }
        }
    }

    fun setServerUrl(url: String) {
        viewModelScope.launch {
            authPreferences.setBaseUrl(url.trim())
        }
    }
}
