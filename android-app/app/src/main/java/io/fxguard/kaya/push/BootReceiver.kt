/**
 * Kaya CRM — restart push service after reboot if still logged in
 * @file    android-app/.../push/BootReceiver.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.push

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import io.fxguard.kaya.KayaCrmApp

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        if (
            action != Intent.ACTION_BOOT_COMPLETED &&
            action != Intent.ACTION_MY_PACKAGE_REPLACED
        ) return
        val app = context.applicationContext as? KayaCrmApp ?: return
        if (!app.graph.session.isLoggedIn) return
        StaffPushService.start(app)
    }
}
