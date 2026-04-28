package com.kaya.crm.ui.auth

import android.content.Context
import android.util.Patterns
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaya.crm.R
import com.kaya.crm.data.api.ApiService
import com.kaya.crm.data.models.LoginResponse
import com.kaya.crm.data.models.PublicBrandingResponse
import com.kaya.crm.data.preferences.AuthPreferences
import com.kaya.crm.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
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
    @ApplicationContext private val app: Context,
    private val authRepository: AuthRepository,
    private val authPreferences: AuthPreferences,
    private val api: ApiService
) : ViewModel() {

    val appLocale: StateFlow<String> = authPreferences.appLocale
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "en")

    fun setAppLocale(tag: String) {
        viewModelScope.launch {
            authPreferences.setAppLocale(tag)
            val t = if (tag == "fa") "fa" else "en"
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(t))
        }
    }

    private val _publicBranding = MutableStateFlow<PublicBrandingResponse?>(null)
    val publicBranding: StateFlow<PublicBrandingResponse?> = _publicBranding.asStateFlow()

    private val _brandingLoading = MutableStateFlow(false)
    val brandingLoading: StateFlow<Boolean> = _brandingLoading.asStateFlow()

    init {
        refreshPublicBranding()
    }

    /** نام سایت، لوگوی ورود و … از همان API عمومی «ظاهر پنل» وب (بدون توکن) */
    private suspend fun fetchPublicBrandingInternal() {
        _brandingLoading.value = true
        try {
            val r = api.getPublicBranding()
            if (r.isSuccessful) _publicBranding.value = r.body()
        } catch (_: Exception) {
            /* شبکه یا آدرس نادرست — عنوان پیش‌فرض رشته‌ها */
        } finally {
            _brandingLoading.value = false
        }
    }

    fun refreshPublicBranding() {
        viewModelScope.launch { fetchPublicBrandingInternal() }
    }

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

    data class ForgotPasswordUi(
        val inProgress: Boolean = false,
        val error: String? = null,
        val success: Boolean = false
    )

    private val _forgotPassword = MutableStateFlow(ForgotPasswordUi())
    val forgotPassword: StateFlow<ForgotPasswordUi> = _forgotPassword.asStateFlow()

    fun resetForgotPassword() {
        _forgotPassword.value = ForgotPasswordUi()
    }

    fun requestForgotPassword(email: String) {
        val trimmed = email.trim().lowercase()
        if (trimmed.isBlank()) {
            _forgotPassword.value = ForgotPasswordUi(error = app.getString(R.string.error_email_required))
            return
        }
        viewModelScope.launch {
            _forgotPassword.value = ForgotPasswordUi(inProgress = true)
            authRepository.forgotPassword(trimmed)
                .onSuccess {
                    _forgotPassword.value = ForgotPasswordUi(success = true)
                }
                .onFailure { e ->
                    _forgotPassword.value = ForgotPasswordUi(
                        error = e.message ?: app.getString(R.string.error_forgot_send_failed)
                    )
                }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            val trimmedEmail = email.trim()
            if (!Patterns.EMAIL_ADDRESS.matcher(trimmedEmail).matches()) {
                _error.value = app.getString(R.string.error_invalid_email)
                _loading.value = false
                return@launch
            }
            authRepository.login(trimmedEmail, password)
                .onSuccess { response ->
                    if (response.needTotp) {
                        _needTotp.value = response
                    } else {
                        // Already saved in repo
                    }
                }
                .onFailure { e ->
                    _error.value = e.message?.takeIf { it.isNotBlank() } ?: app.getString(R.string.error_login_failed)
                }
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
                .onFailure { e ->
                    _error.value = e.message?.takeIf { it.isNotBlank() } ?: app.getString(R.string.error_totp_invalid)
                }
            _loading.value = false
        }
    }

    fun clearError() { _error.value = null }

    /** بازگشت به صفحهٔ ورود بدون تکمیل TOTP (tempToken پاک نمی‌شود سمت سرور؛ فقط حالت محلی) */
    fun cancelTotpChallenge() {
        _needTotp.value = null
        _error.value = null
    }

    fun setServerUrl(url: String) {
        viewModelScope.launch {
            authPreferences.setBaseUrl(url.trim())
            fetchPublicBrandingInternal()
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
        }
    }
}
