package com.kaya.crm

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.os.LocaleListCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.kaya.crm.data.network.NetworkMonitor
import com.kaya.crm.data.preferences.AuthPreferences
import com.kaya.crm.ui.KayaCrmApp
import com.kaya.crm.ui.theme.KayaCrmTheme
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    @Inject lateinit var networkMonitor: NetworkMonitor
    @Inject lateinit var authPreferences: AuthPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        val localeTag = runBlocking(Dispatchers.IO) { authPreferences.getAppLocale() }
        AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(localeTag))
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            KayaCrmTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    KayaCrmApp(networkMonitor = networkMonitor)
                }
            }
        }
    }
}
