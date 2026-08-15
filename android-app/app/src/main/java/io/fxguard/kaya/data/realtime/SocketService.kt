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

class SocketService(private val session: SessionStore) {
    private var socket: Socket? = null
    private val _events = MutableSharedFlow<String>(extraBufferCapacity = 32)
    val events: SharedFlow<String> = _events

    @Synchronized
    fun connect() {
        disconnect()
        val token = session.token ?: return
        val opts = IO.Options().apply {
            auth = mapOf("token" to token)
            reconnection = true
            transports = arrayOf("websocket", "polling")
        }
        val s = IO.socket(URI.create(session.baseUrl), opts)
        s.on(Socket.EVENT_CONNECT) { }
        s.on("new_message") { _events.tryEmit("new_message") }
        s.on("message_sent") { _events.tryEmit("message_sent") }
        s.on("assigned_message") { _events.tryEmit("assigned_message") }
        s.on("ticket_assigned") { _events.tryEmit("ticket") }
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
}
