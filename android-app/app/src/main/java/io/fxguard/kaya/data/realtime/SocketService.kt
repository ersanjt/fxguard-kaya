/**
 * Kaya CRM — Socket.IO staff channel
 * @file    android-app/.../data/realtime/SocketService.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.data.realtime

import io.fxguard.kaya.data.preferences.SessionStore
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import org.json.JSONObject
import java.net.URI

data class SocketEvent(
    val name: String,
    val conversationId: String? = null,
    val threadId: String? = null,
    val ticketId: String? = null,
    val title: String? = null,
    val body: String? = null,
    val silent: Boolean = false,
)

class SocketService(private val session: SessionStore) {
    private var socket: Socket? = null
    private val _events = MutableSharedFlow<SocketEvent>(extraBufferCapacity = 64)
    val events: SharedFlow<SocketEvent> = _events

    @Synchronized
    fun connect() {
        disconnect()
        val token = session.token ?: return
        val opts = IO.Options().apply {
            auth = mapOf("token" to token)
            extraHeaders = mapOf("Authorization" to listOf("Bearer $token"))
            query = "token=$token"
            reconnection = true
            transports = arrayOf("websocket", "polling")
        }
        val s = IO.socket(URI.create(session.baseUrl), opts)
        fun listen(name: String) {
            s.on(name) { args -> _events.tryEmit(parseEvent(name, args)) }
        }
        listen("new_message")
        listen("message_sent")
        listen("assigned_message")
        listen("ticket_assigned")
        listen("ticket_reply_notification")
        listen("task_assigned")
        listen("internal_message")
        listen("internal_thread_updated")
        listen("important_announcement")
        listen("call_invite")
        listen("call_offer")
        runCatching { s.connect() }
        socket = s
    }

    @Synchronized
    fun disconnect() {
        socket?.off()
        socket?.disconnect()
        socket = null
    }

    fun emitRead(conversationId: String) {
        val s = socket ?: return
        runCatching {
            s.emit("join_conversation", JSONObject().put("conversationId", conversationId))
        }
    }

    private fun parseEvent(name: String, args: Array<Any>): SocketEvent {
        val obj = args.firstOrNull() as? JSONObject
        val message = obj?.optJSONObject("message")
        val customer = obj?.optJSONObject("customer")
        val fromUser = obj?.optJSONObject("fromUser") ?: message?.optJSONObject("fromUser")
        val direction = message?.optString("direction").orEmpty()
        val silent = name == "message_sent" || name == "internal_thread_updated" || direction == "outgoing"
        val conversationId = obj?.optString("conversationId")?.ifBlank {
            obj.optJSONObject("conversation")?.optString("id")
        }?.ifBlank { null }
        val threadId = obj?.optString("threadId")?.ifBlank { null }
        val ticketId = obj?.optString("ticketId")?.ifBlank { null }
        val msgType = message?.optString("type").orEmpty()
        val rawBody = listOf(
            message?.optString("content"),
            message?.optString("body"),
        ).firstOrNull { !it.isNullOrBlank() }.orEmpty()
        val mediaBody = when {
            rawBody.isNotBlank() -> rawBody
            msgType == "image" -> "📷"
            msgType == "video" -> "🎬"
            msgType == "audio" || msgType == "ptt" || msgType == "voice" -> "🎤"
            msgType == "sticker" || msgType == "document" -> "📎"
            else -> ""
        }
        val title = when (name) {
            "new_message", "assigned_message" ->
                customer?.optString("name")?.ifBlank { null }
                    ?: obj?.optString("customerName")?.ifBlank { null }
            "internal_message" -> fromUser?.optString("name")?.ifBlank { null }
            "important_announcement" -> obj?.optString("title")?.ifBlank { null }
            "ticket_assigned", "ticket_reply_notification" ->
                obj?.optString("title")?.ifBlank { obj.optString("ticketNumber") }?.ifBlank { null }
            "task_assigned" -> obj?.optString("title")?.ifBlank { null }
            "call_invite", "call_offer" -> obj?.optString("fromUserName")?.ifBlank { null }
            else -> null
        }
        val body = when (name) {
            "new_message", "assigned_message", "internal_message" -> mediaBody.ifBlank { null }
            "important_announcement" -> obj?.optString("body")?.ifBlank { null }
            "ticket_reply_notification" -> obj?.optString("replyContent")?.ifBlank { null }
            "call_invite", "call_offer" ->
                if (obj?.optString("type") == "video") "video" else "voice"
            else -> obj?.optString("title")?.ifBlank { null }
        }
        return SocketEvent(
            name = name,
            conversationId = conversationId,
            threadId = threadId,
            ticketId = ticketId,
            title = title,
            body = body,
            silent = silent,
        )
    }
}
