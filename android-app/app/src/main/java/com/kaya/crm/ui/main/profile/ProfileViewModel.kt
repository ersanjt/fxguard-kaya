package com.kaya.crm.ui.main.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaya.crm.data.api.ApiService
import com.kaya.crm.data.models.PublicBrandingResponse
import com.kaya.crm.data.models.UserResponse
import com.kaya.crm.data.models.WhatsAppStatus
import com.kaya.crm.data.preferences.AuthPreferences
import com.kaya.crm.data.repository.AuthRepository
import com.kaya.crm.data.repository.CrmRepository
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
    private val apiService: ApiService,
    private val authRepository: AuthRepository,
    private val authPreferences: AuthPreferences,
    private val crmRepository: CrmRepository
) : ViewModel() {

    private val _user = MutableStateFlow<UserResponse?>(null)
    val user: StateFlow<UserResponse?> = _user.asStateFlow()

    private val _publicBranding = MutableStateFlow<PublicBrandingResponse?>(null)
    val publicBranding: StateFlow<PublicBrandingResponse?> = _publicBranding.asStateFlow()

    private val _gatewayStatus = MutableStateFlow<WhatsAppStatus?>(null)
    val gatewayStatus: StateFlow<WhatsAppStatus?> = _gatewayStatus.asStateFlow()

    private val _gatewayError = MutableStateFlow<String?>(null)
    val gatewayError: StateFlow<String?> = _gatewayError.asStateFlow()

    private val _loading = MutableStateFlow(true)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()

    private val _profileError = MutableStateFlow<String?>(null)
    val profileError: StateFlow<String?> = _profileError.asStateFlow()

    val savedServerUrl: StateFlow<String?> = authPreferences.baseUrl
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    init {
        refreshAll(initial = true)
    }

    /** بارگذاری مجدد پروفایل، برندینگ و وضعیت واتساپ/گیت‌وی */
    fun refreshAll(initial: Boolean = false) {
        viewModelScope.launch {
            if (initial) _loading.value = true else _refreshing.value = true
            _profileError.value = null
            _gatewayError.value = null
            _user.value = authRepository.currentUser.first()
            authRepository.refreshUser()
                .onSuccess { _user.value = it }
                .onFailure { _profileError.value = it.message }
            runCatching { apiService.getPublicBranding() }
                .onSuccess { response ->
                    if (response.isSuccessful) {
                        _publicBranding.value = response.body()
                    }
                }
            crmRepository.getGatewayStatus()
                .onSuccess { _gatewayStatus.value = it }
                .onFailure { _gatewayError.value = it.message }
            _loading.value = false
            _refreshing.value = false
        }
    }

    fun clearProfileError() { _profileError.value = null }

    fun setServerUrl(url: String) {
        viewModelScope.launch {
            authPreferences.setBaseUrl(url.trim())
        }
    }
}
