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
        // splash قبل از super؛ تزریق Hilt معمولاً در زنجیرهٔ super.onCreate انجام می‌شود — قبل از آن به lateinit دست نزنید
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val localeTag = runCatching {
            runBlocking(Dispatchers.IO) { authPreferences.getAppLocale() }
        }.getOrDefault("en").let { if (it == "fa") "fa" else "en" }
        runCatching {
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(localeTag))
        }
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
