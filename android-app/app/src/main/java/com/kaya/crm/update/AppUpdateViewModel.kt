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
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.kaya.crm.R
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
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

    private val fetchMutex = Mutex()
    private var coldStartCheckDone = false
    private var lastFetchElapsedMs: Long = 0L
    private var resumeCheckJob: Job? = null

    /** یک‌بار بعد از باز شدن اپ (با نشان کوتاه Checking) */
    fun checkOnLaunch() {
        if (coldStartCheckDone) return
        coldStartCheckDone = true
        viewModelScope.launch {
            runFetch(showChecking = true)
        }
    }

    /**
     * وقتی کاربر به اپ برمی‌گردد (مثلاً بعد از دیپلوی روی سرور) — بدون دیالوگ Checking؛
     * حداقل [minIntervalMs] بین دو درخواست رعایت می‌شود.
     */
    fun checkSilentlyOnResume(minIntervalMs: Long = 30 * 60 * 1000L) {
        resumeCheckJob?.cancel()
        resumeCheckJob = viewModelScope.launch {
            val now = android.os.SystemClock.elapsedRealtime()
            if (now - lastFetchElapsedMs < minIntervalMs) return@launch
            if (_ui.value is AppUpdateUi.Downloading) return@launch
            runFetch(showChecking = false)
        }
    }

    fun checkManual() {
        viewModelScope.launch {
            runFetch(showChecking = true, forceManual = true)
        }
    }

    private suspend fun runFetch(showChecking: Boolean, forceManual: Boolean = false) {
        fetchMutex.withLock {
            if (_ui.value is AppUpdateUi.Downloading) return@withLock
            val skipped = authPreferences.getSkippedAndroidUpdateVersionCode()
            if (showChecking) _ui.value = AppUpdateUi.Checking
            val result = repository.fetchAvailableUpdate(skipped)
            lastFetchElapsedMs = android.os.SystemClock.elapsedRealtime()
            if (result.isSuccess) {
                val info = result.getOrNull()
                _ui.value = when {
                    info != null -> AppUpdateUi.Available(info)
                    forceManual -> AppUpdateUi.Error(
                        appContext.getString(R.string.update_up_to_date, BuildConfig.VERSION_NAME)
                    )
                    else -> AppUpdateUi.Idle
                }
            } else {
                _ui.value = if (forceManual) {
                    AppUpdateUi.Error(
                        result.exceptionOrNull()?.message
                            ?: appContext.getString(R.string.update_fetch_error)
                    )
                } else {
                    AppUpdateUi.Idle
                }
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
                _ui.value = AppUpdateUi.Error(
                    e.message ?: appContext.getString(R.string.update_download_error)
                )
            }
        }
    }
}
