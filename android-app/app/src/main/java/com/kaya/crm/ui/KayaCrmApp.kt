package com.kaya.crm.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import com.kaya.crm.data.network.NetworkMonitor
import com.kaya.crm.ui.auth.LoginScreen
import com.kaya.crm.ui.auth.LoginViewModel
import com.kaya.crm.ui.auth.TotpScreen
import com.kaya.crm.ui.components.NetworkBanner
import com.kaya.crm.ui.main.MainScreen
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun KayaCrmApp(
    networkMonitor: NetworkMonitor,
    viewModel: LoginViewModel = hiltViewModel()
) {
    val isLoggedIn by viewModel.isLoggedIn.collectAsState(initial = null)
    val needTotp by viewModel.needTotp.collectAsState(initial = null)
    val isOnline by networkMonitor.isOnline.collectAsState(initial = true)

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
}
