package com.kaya.crm.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaya.crm.data.models.LoginResponse
import com.kaya.crm.data.preferences.AuthPreferences
import com.kaya.crm.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val authPreferences: AuthPreferences
) : ViewModel() {

    val isLoggedIn: StateFlow<Boolean?> = authRepository.isLoggedIn
        .map { it }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val savedServerUrl: StateFlow<String?> = authPreferences.baseUrl
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    private val _needTotp = MutableStateFlow<LoginResponse?>(null)
    val needTotp: StateFlow<LoginResponse?> = _needTotp.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            authRepository.login(email, password)
                .onSuccess { response ->
                    if (response.needTotp) {
                        _needTotp.value = response
                    } else {
                        // Already saved in repo
                    }
                }
                .onFailure { _error.value = it.message ?: "خطا در ورود" }
            _loading.value = false
        }
    }

    fun verifyTotp(code: String) {
        val resp = _needTotp.value ?: return
        val tempToken = resp.tempToken ?: return
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            authRepository.verifyTotp(tempToken, code)
                .onSuccess { _needTotp.value = null }
                .onFailure { _error.value = it.message ?: "کد نامعتبر است" }
            _loading.value = false
        }
    }

    fun clearError() { _error.value = null }

    fun setServerUrl(url: String) {
        viewModelScope.launch {
            authPreferences.setBaseUrl(url.trim())
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
        }
    }
}
