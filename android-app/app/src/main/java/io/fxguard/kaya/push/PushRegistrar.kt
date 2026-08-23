/**
 * Kaya CRM — FCM token register / start realtime service
 * @file    android-app/.../push/PushRegistrar.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.push

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import io.fxguard.kaya.BuildConfig
import io.fxguard.kaya.data.api.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

object PushRegistrar {
    @Volatile
    var lastToken: String? = null
        private set

    @Volatile
    var firebaseReady: Boolean = false
        private set

    @Volatile
    var lastError: String? = null
        private set

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @Volatile
    private var appContext: Context? = null

    fun onLoggedIn(context: Context, api: ApiClient) {
        appContext = context.applicationContext
        NotificationHelper.attach(context)
        StaffPushService.start(context)
        scope.launch { registerFcm(context.applicationContext, api) }
    }

    fun onLoggedOut(api: ApiClient) {
        val token = lastToken
        lastToken = null
        firebaseReady = false
        NotificationHelper.cancelAlerts()
        appContext?.let { StaffPushService.stop(it) }
        if (!token.isNullOrBlank()) {
            scope.launch { runCatching { api.unregisterPushToken(token) } }
        }
    }

    suspend fun registerFcm(context: Context, api: ApiClient) {
        if (!ensureFirebase(context)) {
            lastError = "no_firebase_app"
            return
        }
        var token: String? = null
        repeat(8) { attempt ->
            token = runCatching { FirebaseMessaging.getInstance().token.await() }.getOrNull()
            if (!token.isNullOrBlank()) return@repeat
            kotlinx.coroutines.delay(700L * (attempt + 1))
        }
        if (token.isNullOrBlank()) {
            lastError = "no_fcm_token"
            return
        }
        lastToken = token
        firebaseReady = true
        runCatching { api.registerPushToken(token!!, BuildConfig.VERSION_NAME) }
            .onSuccess { lastError = null }
            .onFailure { lastError = it.message ?: "register_failed" }
    }

    fun onNewToken(context: Context, api: ApiClient, token: String) {
        lastToken = token
        firebaseReady = true
        scope.launch { runCatching { api.registerPushToken(token, BuildConfig.VERSION_NAME) } }
    }

    fun ensureFirebase(context: Context): Boolean {
        return try {
            if (FirebaseApp.getApps(context).isEmpty()) {
                firebaseReady = FirebaseApp.initializeApp(context) != null
            } else {
                firebaseReady = true
            }
            firebaseReady
        } catch (err: Exception) {
            lastError = err.message
            firebaseReady = false
            false
        }
    }
}
