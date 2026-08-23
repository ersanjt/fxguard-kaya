/**
 * Kaya CRM — keep Socket.IO alive and show local notifications
 * @file    android-app/.../push/StaffPushService.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.push

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import io.fxguard.kaya.KayaCrmApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class StaffPushService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var collecting = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        NotificationHelper.ensureChannels(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val app = application as? KayaCrmApp
        val lang = app?.graph?.session?.language ?: "fa"
        val status = NotificationHelper.statusNotification(this, lang)
        val type = if (Build.VERSION.SDK_INT >= 29) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
        } else {
            0
        }
        val started = runCatching {
            ServiceCompat.startForeground(this, NotificationHelper.STATUS_NOTIFICATION_ID, status, type)
        }.isSuccess
        if (!started) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (app == null || !app.graph.session.isLoggedIn) {
            stopSelf()
            return START_NOT_STICKY
        }
        app.graph.socket.connect()
        if (!collecting) {
            collecting = true
            scope.launch {
                app.graph.socket.events.collect { event ->
                    NotificationHelper.showEvent(
                        this@StaffPushService,
                        app.graph.session.language,
                        event,
                    )
                }
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        fun start(context: Context) {
            val app = context.applicationContext as? KayaCrmApp
            if (app?.graph?.session?.isLoggedIn != true) return
            runCatching {
                ContextCompat.startForegroundService(context, Intent(context, StaffPushService::class.java))
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, StaffPushService::class.java))
        }
    }
}
