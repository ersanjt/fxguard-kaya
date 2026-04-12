package com.kaya.crm.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.kaya.crm.data.network.NetworkMonitor
import com.kaya.crm.ui.auth.LoginScreen
import com.kaya.crm.ui.auth.LoginViewModel
import com.kaya.crm.ui.auth.TotpScreen
import com.kaya.crm.ui.components.NetworkBanner
import com.kaya.crm.ui.main.MainScreen
import com.kaya.crm.update.AppUpdateDialogHost
import com.kaya.crm.update.AppUpdateViewModel
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun KayaCrmApp(
    networkMonitor: NetworkMonitor,
    viewModel: LoginViewModel = hiltViewModel(),
    appUpdateViewModel: AppUpdateViewModel = hiltViewModel()
) {
    val isLoggedIn by viewModel.isLoggedIn.collectAsState(initial = null)
    val needTotp by viewModel.needTotp.collectAsState(initial = null)
    val isOnline by networkMonitor.isOnline.collectAsState(initial = true)
    val updateUi by appUpdateViewModel.ui.collectAsState()

    LaunchedEffect(Unit) {
        appUpdateViewModel.checkOnLaunch()
    }
    /* بعد از دیپلوی روی سرور، با برگشت به اپ از پس‌زمینه دوباره /api/config را می‌زند (با فاصلهٔ حداقلی) */
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        appUpdateViewModel.checkSilentlyOnResume()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            NetworkBanner(isOnline = isOnline)
            Box(modifier = Modifier.weight(1f).fillMaxSize()) {
                when {
                    isLoggedIn == true -> MainScreen(onLogout = { viewModel.logout() })
                    needTotp != null -> TotpScreen(onVerified = { })
                    else -> LoginScreen(
                        onLoginSuccess = { },
                        onNeedTotp = { }
                    )
                }
            }
        }
        AppUpdateDialogHost(
            ui = updateUi,
            onDownload = { appUpdateViewModel.startDownload() },
            onDismissOptional = { appUpdateViewModel.dismissOptional() },
            onDismissError = { appUpdateViewModel.clearError() }
        )
    }
}
