package com.kaya.crm.ui.main.profile

import android.content.Context
import android.net.Uri
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaya.crm.R
import com.kaya.crm.data.api.ApiService
import com.kaya.crm.data.models.PatchProfilePayload
import com.kaya.crm.data.models.PublicBrandingResponse
import com.kaya.crm.data.models.TelegramLinkTokenResponse
import com.kaya.crm.data.models.TelegramStatusResponse
import com.kaya.crm.data.models.TotpSetupResponse
import com.kaya.crm.data.models.UserResponse
import com.kaya.crm.data.models.WhatsAppStatus
import com.kaya.crm.data.preferences.AuthPreferences
import com.kaya.crm.data.repository.AuthRepository
import com.kaya.crm.data.repository.CrmRepository
import com.kaya.crm.data.repository.ProfileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    @ApplicationContext private val app: Context,
    private val apiService: ApiService,
    private val authRepository: AuthRepository,
    private val authPreferences: AuthPreferences,
    private val crmRepository: CrmRepository,
    private val profileRepository: ProfileRepository
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

    private val _saveMessage = MutableStateFlow<String?>(null)
    val saveMessage: StateFlow<String?> = _saveMessage.asStateFlow()

    private val _saving = MutableStateFlow(false)
    val saving: StateFlow<Boolean> = _saving.asStateFlow()

    private val _uploadingAvatar = MutableStateFlow(false)
    val uploadingAvatar: StateFlow<Boolean> = _uploadingAvatar.asStateFlow()

    private val _totpSetup = MutableStateFlow<TotpSetupResponse?>(null)
    val totpSetup: StateFlow<TotpSetupResponse?> = _totpSetup.asStateFlow()

    private val _totpBusy = MutableStateFlow(false)
    val totpBusy: StateFlow<Boolean> = _totpBusy.asStateFlow()

    private val _telegramStatus = MutableStateFlow<TelegramStatusResponse?>(null)
    val telegramStatus: StateFlow<TelegramStatusResponse?> = _telegramStatus.asStateFlow()

    private val _telegramToken = MutableStateFlow<TelegramLinkTokenResponse?>(null)
    val telegramToken: StateFlow<TelegramLinkTokenResponse?> = _telegramToken.asStateFlow()

    private val _telegramBusy = MutableStateFlow(false)
    val telegramBusy: StateFlow<Boolean> = _telegramBusy.asStateFlow()

    private val _presenceBusy = MutableStateFlow(false)
    val presenceBusy: StateFlow<Boolean> = _presenceBusy.asStateFlow()

    val savedServerUrl: StateFlow<String?> = authPreferences.baseUrl
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    init {
        refreshAll(initial = true)
    }

    fun clearProfileError() { _profileError.value = null }
    fun clearSaveMessage() { _saveMessage.value = null }
    fun clearTotpSetup() { _totpSetup.value = null }
    fun clearTelegramToken() { _telegramToken.value = null }

    /** بارگذاری مجدد پروفایل، برندینگ، واتساپ، وضعیت تلگرام — درخواست‌ها موازی برای سرعت بیشتر */
    fun refreshAll(initial: Boolean = false) {
        viewModelScope.launch {
            if (initial) _loading.value = true else _refreshing.value = true
            _profileError.value = null
            _gatewayError.value = null
            _user.value = authRepository.currentUser.first()
            coroutineScope {
                val userJob = async {
                    authRepository.refreshUser()
                        .onSuccess { _user.value = it }
                        .onFailure { e -> _profileError.value = e.message }
                }
                val brandJob = async {
                    runCatching { apiService.getPublicBranding() }
                        .onSuccess { response ->
                            if (response.isSuccessful) _publicBranding.value = response.body()
                        }
                }
                val gwJob = async {
                    crmRepository.getGatewayStatus()
                        .onSuccess { _gatewayStatus.value = it }
                        .onFailure { e -> _gatewayError.value = e.message }
                }
                val tgJob = async {
                    profileRepository.getTelegramStatus()
                        .onSuccess { _telegramStatus.value = it }
                }
                listOf(userJob, brandJob, gwJob, tgJob).awaitAll()
            }
            _loading.value = false
            _refreshing.value = false
        }
    }

    /** وضعیت آنلاین در پنل (همان API وب: online / away / busy / offline) */
    fun setPresenceStatus(status: String) {
        viewModelScope.launch {
            _presenceBusy.value = true
            profileRepository.patchPresence(status)
                .onSuccess {
                    authRepository.refreshUser().onSuccess { u -> _user.value = u }
                    _saveMessage.value = presenceMessage(it)
                }
                .onFailure { e ->
                    _saveMessage.value = e.message ?: app.getString(R.string.profile_presence_update_failed)
                }
            _presenceBusy.value = false
        }
    }

    private fun presenceMessage(apiStatus: String): String {
        val label = when (apiStatus.lowercase()) {
            "online" -> app.getString(R.string.presence_online)
            "away" -> app.getString(R.string.presence_away)
            "busy" -> app.getString(R.string.presence_busy)
            "offline" -> app.getString(R.string.presence_offline)
            else -> apiStatus
        }
        return app.getString(R.string.profile_presence_updated_panel, label)
    }

    fun setServerUrl(url: String) {
        viewModelScope.launch {
            authPreferences.setBaseUrl(url.trim())
        }
    }

    fun saveProfile(
        username: String,
        firstName: String,
        lastName: String,
        dateOfBirth: String,
        phone: String,
        avatarUrl: String,
        newPassword: String,
        adminEmail: String?
    ) {
        viewModelScope.launch {
            _saving.value = true
            _saveMessage.value = null
            val u = _user.value
            val canManageUsers = u?.permissions?.get("manage_users") == true
            val payload = PatchProfilePayload(
                username = username.trim().ifBlank { null },
                firstName = firstName.trim().ifBlank { null },
                lastName = lastName.trim().ifBlank { null },
                dateOfBirth = dateOfBirth.trim().ifBlank { null },
                phone = phone.trim().ifBlank { null },
                avatar = avatarUrl.trim().ifBlank { null },
                password = newPassword.trim().ifBlank { null },
                email = if (canManageUsers) adminEmail?.trim()?.takeIf { it.isNotEmpty() } else null
            )
            profileRepository.patchProfile(payload)
                .onSuccess { updated ->
                    authRepository.cacheUser(updated)
                    _user.value = updated
                    _saveMessage.value = app.getString(R.string.profile_saved)
                }
                .onFailure { _saveMessage.value = it.message ?: app.getString(R.string.profile_save_error) }
            _saving.value = false
        }
    }

    fun uploadAvatar(uri: Uri) {
        viewModelScope.launch {
            _uploadingAvatar.value = true
            _saveMessage.value = null
            profileRepository.uploadProfileImage(uri)
                .onSuccess { relUrl ->
                    profileRepository.patchProfile(PatchProfilePayload(avatar = relUrl))
                        .onSuccess { updated ->
                            authRepository.cacheUser(updated)
                            _user.value = updated
                            _saveMessage.value = app.getString(R.string.profile_avatar_updated)
                        }
                        .onFailure {
                            _saveMessage.value = it.message ?: app.getString(R.string.profile_avatar_url_save_error)
                        }
                }
                .onFailure { _saveMessage.value = it.message ?: app.getString(R.string.profile_upload_error) }
            _uploadingAvatar.value = false
        }
    }

    fun startTotpSetup() {
        viewModelScope.launch {
            _totpBusy.value = true
            profileRepository.getTotpSetup()
                .onSuccess { _totpSetup.value = it }
                .onFailure { _saveMessage.value = it.message }
            _totpBusy.value = false
        }
    }

    fun confirmTotp(code: String) {
        viewModelScope.launch {
            _totpBusy.value = true
            profileRepository.confirmTotp(code)
                .onSuccess { msg ->
                    _saveMessage.value = msg
                    _totpSetup.value = null
                    authRepository.refreshUser().onSuccess { _user.value = it }
                }
                .onFailure { _saveMessage.value = it.message }
            _totpBusy.value = false
        }
    }

    fun disableTotp(password: String) {
        viewModelScope.launch {
            _totpBusy.value = true
            profileRepository.disableTotp(password)
                .onSuccess { msg ->
                    _saveMessage.value = msg
                    authRepository.refreshUser().onSuccess { _user.value = it }
                }
                .onFailure { _saveMessage.value = it.message }
            _totpBusy.value = false
        }
    }

    fun generateTelegramToken() {
        viewModelScope.launch {
            _telegramBusy.value = true
            profileRepository.requestTelegramLinkToken()
                .onSuccess { _telegramToken.value = it }
                .onFailure { _saveMessage.value = it.message }
            _telegramBusy.value = false
        }
    }

    fun refreshTelegramStatus() {
        viewModelScope.launch {
            profileRepository.getTelegramStatus()
                .onSuccess { _telegramStatus.value = it }
        }
    }

    fun unlinkTelegram() {
        viewModelScope.launch {
            _telegramBusy.value = true
            profileRepository.unlinkTelegram()
                .onSuccess { msg ->
                    _saveMessage.value = msg
                    _telegramToken.value = null
                    refreshTelegramStatus()
                }
                .onFailure { _saveMessage.value = it.message }
            _telegramBusy.value = false
        }
    }
}
