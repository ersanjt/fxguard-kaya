package com.kaya.crm.update

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaya.crm.BuildConfig
import com.kaya.crm.data.models.AndroidAppUpdateDto
import com.kaya.crm.data.preferences.AuthPreferences
import com.kaya.crm.data.repository.AppUpdateRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface AppUpdateUi {
    data object Idle : AppUpdateUi
    data object Checking : AppUpdateUi
    data class Available(val info: AndroidAppUpdateDto) : AppUpdateUi
    data class Downloading(val percent: Int) : AppUpdateUi
    data class Error(val message: String) : AppUpdateUi
}

@HiltViewModel
class AppUpdateViewModel @Inject constructor(
    private val repository: AppUpdateRepository,
    private val authPreferences: AuthPreferences,
    @ApplicationContext private val appContext: Context
) : ViewModel() {

    private val _ui = MutableStateFlow<AppUpdateUi>(AppUpdateUi.Idle)
    val ui: StateFlow<AppUpdateUi> = _ui.asStateFlow()

    private var launchCheckStarted = false

    /** یک‌بار بعد از باز شدن اپ — برای اجباری و اختیاری */
    fun checkOnLaunch() {
        if (launchCheckStarted) return
        launchCheckStarted = true
        viewModelScope.launch {
            if (_ui.value is AppUpdateUi.Downloading) return@launch
            _ui.value = AppUpdateUi.Checking
            val skipped = authPreferences.getSkippedAndroidUpdateVersionCode()
            val result = repository.fetchAvailableUpdate(skipped)
            if (result.isSuccess) {
                val info = result.getOrNull()
                _ui.value = if (info != null) AppUpdateUi.Available(info) else AppUpdateUi.Idle
            } else {
                _ui.value = AppUpdateUi.Idle
            }
        }
    }

    fun checkManual() {
        viewModelScope.launch {
            _ui.value = AppUpdateUi.Checking
            val skipped = authPreferences.getSkippedAndroidUpdateVersionCode()
            val result = repository.fetchAvailableUpdate(skipped)
            if (result.isSuccess) {
                val info = result.getOrNull()
                _ui.value = if (info != null) {
                    AppUpdateUi.Available(info)
                } else {
                    AppUpdateUi.Error("نسخهٔ شما به‌روز است (${BuildConfig.VERSION_NAME})")
                }
            } else {
                _ui.value = AppUpdateUi.Error(result.exceptionOrNull()?.message ?: "خطا در دریافت اطلاعات")
            }
        }
    }

    fun dismissOptional() {
        val cur = _ui.value as? AppUpdateUi.Available ?: return
        if (cur.info.mandatory) return
        viewModelScope.launch {
            authPreferences.setSkippedAndroidUpdateVersionCode(cur.info.versionCode)
            _ui.value = AppUpdateUi.Idle
        }
    }

    fun clearError() {
        if (_ui.value is AppUpdateUi.Error) _ui.value = AppUpdateUi.Idle
    }

    fun startDownload() {
        val cur = _ui.value as? AppUpdateUi.Available ?: return
        val url = cur.info.apkUrl
        viewModelScope.launch {
            _ui.value = AppUpdateUi.Downloading(0)
            repository.downloadApk(url) { p ->
                _ui.value = AppUpdateUi.Downloading(p)
            }.onSuccess { file ->
                _ui.value = AppUpdateUi.Idle
                AppUpdateInstaller.install(appContext, file)
            }.onFailure { e ->
                _ui.value = AppUpdateUi.Error(e.message ?: "خطا در دانلود")
            }
        }
    }
}
