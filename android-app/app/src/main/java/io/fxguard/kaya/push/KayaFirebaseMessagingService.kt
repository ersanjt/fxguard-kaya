/**
 * Kaya CRM — Firebase Cloud Messaging receiver
 * @file    android-app/.../push/KayaFirebaseMessagingService.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.push

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import io.fxguard.kaya.KayaCrmApp

class KayaFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        val app = application as? KayaCrmApp ?: return
        if (!app.graph.session.isLoggedIn) return
        PushRegistrar.onNewToken(this, app.graph.api, token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        val type = data["type"].orEmpty().ifBlank { "message" }
        val title = message.notification?.title
            ?: data["title"]
            ?: getString(io.fxguard.kaya.R.string.app_name)
        val body = message.notification?.body ?: data["body"].orEmpty()
        NotificationHelper.show(
            context = this,
            type = type,
            title = title,
            body = body,
            conversationId = data["conversationId"],
            threadId = data["threadId"],
            ticketId = data["ticketId"],
        )
    }
}
