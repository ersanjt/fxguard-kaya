/**
 * Kaya CRM — WhatsApp-style heads-up notifications
 * @file    android-app/.../push/NotificationHelper.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.push

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person
import io.fxguard.kaya.MainActivity
import io.fxguard.kaya.R
import io.fxguard.kaya.data.realtime.SocketEvent
import io.fxguard.kaya.ui.i18n.L10n
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

object NotificationHelper {
    const val EXTRA_TYPE = "kaya_push_type"
    const val EXTRA_CONVERSATION_ID = "kaya_push_conversation"
    const val EXTRA_THREAD_ID = "kaya_push_thread"
    const val EXTRA_TICKET_ID = "kaya_push_ticket"

    data class InAppPush(
        val type: String,
        val title: String,
        val body: String,
        val conversationId: String? = null,
        val threadId: String? = null,
        val ticketId: String? = null,
    )

    private val _banners = MutableSharedFlow<InAppPush>(extraBufferCapacity = 16)
    val banners: SharedFlow<InAppPush> = _banners.asSharedFlow()

    const val CHANNEL_STATUS = "kaya_status_v2"
    const val CHANNEL_MESSAGES = "kaya_messages_v2"
    const val CHANNEL_INTERNAL = "kaya_internal_v2"
    const val CHANNEL_WORK = "kaya_work_v2"
    const val CHANNEL_ANNOUNCEMENTS = "kaya_announcements_v2"
    const val CHANNEL_CALLS = "kaya_calls_v2"

    const val STATUS_NOTIFICATION_ID = 1001

    private val recent = LinkedHashMap<String, Long>()
    private val threadLines = LinkedHashMap<String, MutableList<Pair<String, String>>>()
    private val shownIds = mutableSetOf<Int>()

    @Volatile private var appCtx: Context? = null
    @Volatile private var watchingType: String? = null
    @Volatile private var watchingId: String? = null

    fun attach(context: Context) {
        appCtx = context.applicationContext
        ensureChannels(context)
    }

    fun watchChat(conversationId: String?) {
        watchingType = "message"
        watchingId = conversationId
        if (!conversationId.isNullOrBlank()) cancelFor("message", conversationId, null, null)
    }

    fun watchThread(threadId: String?) {
        watchingType = "internal"
        watchingId = threadId
        if (!threadId.isNullOrBlank()) cancelFor("internal", null, threadId, null)
    }

    fun clearWatch() {
        watchingType = null
        watchingId = null
    }

    fun ensureChannels(context: Context) {
        appCtx = context.applicationContext
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val lang = language()
        val mgr = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        listOf("kaya_status", "kaya_messages", "kaya_internal", "kaya_work", "kaya_announcements", "kaya_calls").forEach {
            runCatching { mgr.deleteNotificationChannel(it) }
        }
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        val sound = Settings.System.DEFAULT_NOTIFICATION_URI
        val vibe = longArrayOf(0, 220, 160, 220)
        fun alertChannel(id: String, nameKey: String, importance: Int): NotificationChannel {
            return NotificationChannel(id, L10n.t(lang, nameKey), importance).apply {
                enableVibration(true)
                vibrationPattern = vibe
                enableLights(true)
                setSound(sound, attrs)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setShowBadge(true)
                setBypassDnd(id == CHANNEL_CALLS)
            }
        }
        mgr.createNotificationChannel(
            NotificationChannel(CHANNEL_STATUS, L10n.t(lang, "push_ch_status"), NotificationManager.IMPORTANCE_MIN).apply {
                setShowBadge(false)
                setSound(null, null)
                enableVibration(false)
                description = L10n.t(lang, "push_ch_status_desc")
            },
        )
        mgr.createNotificationChannel(alertChannel(CHANNEL_MESSAGES, "push_ch_messages", NotificationManager.IMPORTANCE_HIGH))
        mgr.createNotificationChannel(alertChannel(CHANNEL_INTERNAL, "push_ch_internal", NotificationManager.IMPORTANCE_HIGH))
        mgr.createNotificationChannel(alertChannel(CHANNEL_WORK, "push_ch_work", NotificationManager.IMPORTANCE_HIGH))
        mgr.createNotificationChannel(alertChannel(CHANNEL_ANNOUNCEMENTS, "push_ch_announcements", NotificationManager.IMPORTANCE_HIGH))
        mgr.createNotificationChannel(alertChannel(CHANNEL_CALLS, "push_ch_calls", NotificationManager.IMPORTANCE_MAX))
    }

    fun statusNotification(context: Context, lang: String): Notification {
        ensureChannels(context)
        val open = pendingIntent(context, "status", null, null, null)
        return NotificationCompat.Builder(context, CHANNEL_STATUS)
            .setSmallIcon(R.drawable.ic_stat_kaya)
            .setContentTitle(context.getString(R.string.app_name))
            .setContentText(L10n.t(lang, "push_connected"))
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setContentIntent(open)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }

    fun showEventIfAttached(lang: String, event: SocketEvent) {
        val ctx = appCtx ?: return
        showEvent(ctx, lang, event)
    }

    fun notificationsAllowed(context: Context): Boolean {
        return NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    fun showEvent(context: Context, lang: String, event: SocketEvent) {
        if (event.silent) return
        val type = typeOf(event.name)
        if (isWatching(type, event.conversationId, event.threadId) && type != "call") return
        val title = event.title?.ifBlank { null } ?: fallbackTitle(lang, event.name)
        val body = event.body?.ifBlank { null } ?: L10n.t(lang, "push_new")
        show(
            context = context,
            type = type,
            title = title,
            body = body,
            conversationId = event.conversationId,
            threadId = event.threadId,
            ticketId = event.ticketId,
        )
    }

    fun show(
        context: Context,
        type: String,
        title: String,
        body: String,
        conversationId: String? = null,
        threadId: String? = null,
        ticketId: String? = null,
    ) {
        ensureChannels(context)
        if (isWatching(type, conversationId, threadId) && type != "call") return
        val key = listOf(type, conversationId, threadId, ticketId, title, body).joinToString("|")
        val now = System.currentTimeMillis()
        synchronized(recent) {
            recent.entries.removeIf { now - it.value > 8_000 }
            if (recent.containsKey(key)) return
            recent[key] = now
        }
        val channel = when (type) {
            "call" -> CHANNEL_CALLS
            "internal" -> CHANNEL_INTERNAL
            "ticket", "task" -> CHANNEL_WORK
            "announcement" -> CHANNEL_ANNOUNCEMENTS
            else -> CHANNEL_MESSAGES
        }
        val id = notifyId(type, conversationId, threadId, ticketId)
        val tap = pendingIntent(context, type, conversationId, threadId, ticketId)
        val builder = NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_stat_kaya)
            .setContentTitle(title)
            .setContentText(body)
            .setTicker("$title: $body")
            .setAutoCancel(true)
            .setOnlyAlertOnce(false)
            .setDefaults(Notification.DEFAULT_ALL)
            .setSound(Settings.System.DEFAULT_NOTIFICATION_URI)
            .setVibrate(longArrayOf(0, 220, 160, 220))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(if (type == "call") NotificationCompat.CATEGORY_CALL else NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setNumber(1)
            .setContentIntent(tap)
            .setWhen(now)
            .setShowWhen(true)
        if (type == "message" || type == "internal") {
            val threadKey = "${type}|${conversationId ?: threadId ?: title}"
            val lines = synchronized(threadLines) {
                val list = threadLines.getOrPut(threadKey) { mutableListOf() }
                list.add(title to body)
                if (list.size > 8) list.subList(0, list.size - 8).clear()
                list.toList()
            }
            val me = Person.Builder().setName(context.getString(R.string.app_name)).setKey("staff").build()
            val style = NotificationCompat.MessagingStyle(me).setGroupConversation(false)
            lines.forEach { (who, text) ->
                val person = Person.Builder().setName(who).setKey(who).build()
                style.addMessage(text, now, person)
            }
            builder.setStyle(style)
            builder.setNumber(lines.size)
        } else {
            builder.setStyle(NotificationCompat.BigTextStyle().bigText(body))
        }
        if (type == "call") {
            builder.setFullScreenIntent(tap, true)
            builder.setOngoing(true)
        }
        shownIds.add(id)
        _banners.tryEmit(
            InAppPush(
                type = type,
                title = title,
                body = body,
                conversationId = conversationId,
                threadId = threadId,
                ticketId = ticketId,
            ),
        )
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return
        runCatching { NotificationManagerCompat.from(context).notify(id, builder.build()) }
    }

    fun cancelFor(type: String, conversationId: String?, threadId: String?, ticketId: String?) {
        val ctx = appCtx ?: return
        val id = notifyId(type, conversationId, threadId, ticketId)
        NotificationManagerCompat.from(ctx).cancel(id)
        shownIds.remove(id)
        val threadKey = "${type}|${conversationId ?: threadId ?: ""}"
        synchronized(threadLines) { threadLines.remove(threadKey) }
    }

    fun cancelAlerts() {
        val ctx = appCtx ?: return
        val mgr = NotificationManagerCompat.from(ctx)
        shownIds.toList().forEach { mgr.cancel(it) }
        shownIds.clear()
        synchronized(threadLines) { threadLines.clear() }
        clearWatch()
    }

    private fun isWatching(type: String, conversationId: String?, threadId: String?): Boolean {
        val id = watchingId ?: return false
        return when (watchingType) {
            "message" -> type == "message" && conversationId == id
            "internal" -> (type == "internal" || type == "call") && threadId == id
            else -> false
        }
    }

    private fun notifyId(type: String, conversationId: String?, threadId: String?, ticketId: String?): Int {
        return ((type + (conversationId ?: "") + (threadId ?: "") + (ticketId ?: "")).hashCode() and 0x7fffffff) + 2000
    }

    private fun pendingIntent(
        context: Context,
        type: String,
        conversationId: String?,
        threadId: String?,
        ticketId: String?,
    ): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
            putExtra(EXTRA_TYPE, type)
            if (!conversationId.isNullOrBlank()) putExtra(EXTRA_CONVERSATION_ID, conversationId)
            if (!threadId.isNullOrBlank()) putExtra(EXTRA_THREAD_ID, threadId)
            if (!ticketId.isNullOrBlank()) putExtra(EXTRA_TICKET_ID, ticketId)
        }
        return PendingIntent.getActivity(
            context,
            notifyId(type, conversationId, threadId, ticketId),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun typeOf(name: String): String = when (name) {
        "internal_message" -> "internal"
        "ticket", "ticket_assigned", "ticket_reply_notification" -> "ticket"
        "task_assigned" -> "task"
        "important_announcement" -> "announcement"
        "call_invite", "call_offer" -> "call"
        else -> "message"
    }

    private fun fallbackTitle(lang: String, name: String): String = when (typeOf(name)) {
        "internal" -> L10n.t(lang, "team")
        "ticket" -> L10n.t(lang, "tickets")
        "task" -> L10n.t(lang, "tasks")
        "announcement" -> L10n.t(lang, "announcements")
        "call" -> L10n.t(lang, "push_call")
        else -> L10n.t(lang, "push_wa_fallback")
    }

    private fun language(): String {
        return try {
            (appCtx as? io.fxguard.kaya.KayaCrmApp)?.graph?.session?.language ?: "fa"
        } catch (_: Exception) {
            "fa"
        }
    }
}
