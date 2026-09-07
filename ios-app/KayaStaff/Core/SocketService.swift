/**
 * Kaya CRM — Socket.IO v4 staff channel (websocket + Bearer header, never query)
 * @file    ios-app/KayaStaff/Core/SocketService.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
import Foundation

struct SocketEvent: Sendable {
    var name: String
    var conversationId: String?
    var threadId: String?
    var ticketId: String?
    var title: String?
    var body: String?
    var silent: Bool
}

final class SocketService: NSObject, URLSessionWebSocketDelegate {
    private let session: SessionStore
    private var webSocket: URLSessionWebSocketTask?
    private var urlSession: URLSession?
    private var receiveLoop = false
    private var reconnectWorkItem: DispatchWorkItem?
    private let lock = NSLock()
    private(set) var isConnected = false
    var onEvent: ((SocketEvent) -> Void)?

    init(session: SessionStore) {
        self.session = session
        super.init()
    }

    func connect() {
        disconnect()
        guard let token = session.token, !token.isEmpty else { return }
        guard let ws = websocketURL() else { return }
        var req = URLRequest(url: ws)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.timeoutInterval = 30
        let config = URLSessionConfiguration.default
        config.waitsForConnectivity = true
        let urlSession = URLSession(configuration: config, delegate: self, delegateQueue: nil)
        let task = urlSession.webSocketTask(with: req)
        lock.lock()
        self.urlSession = urlSession
        self.webSocket = task
        self.receiveLoop = true
        lock.unlock()
        task.resume()
        listen()
    }

    func disconnect() {
        reconnectWorkItem?.cancel()
        reconnectWorkItem = nil
        lock.lock()
        receiveLoop = false
        isConnected = false
        webSocket?.cancel(with: .goingAway, reason: nil)
        webSocket = nil
        urlSession?.invalidateAndCancel()
        urlSession = nil
        lock.unlock()
    }

    func emitRead(conversationId: String) {
        let payload: [String: Any] = ["conversationId": conversationId]
        guard JSONSerialization.isValidJSONObject(payload),
              let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8)
        else { return }
        send("42[\"join_conversation\",\(json)]")
    }

    private func websocketURL() -> URL? {
        var raw = session.baseUrl.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        if raw.hasPrefix("https://") {
            raw = "wss://" + raw.dropFirst("https://".count)
        } else if raw.hasPrefix("http://") {
            raw = "ws://" + raw.dropFirst("http://".count)
        } else {
            return nil
        }
        return URL(string: raw + "/socket.io/?EIO=4&transport=websocket")
    }

    private func send(_ text: String) {
        lock.lock()
        let socket = webSocket
        lock.unlock()
        socket?.send(.string(text)) { _ in }
    }

    private func listen() {
        lock.lock()
        let socket = webSocket
        let keep = receiveLoop
        lock.unlock()
        guard keep, let socket else { return }
        socket.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case .failure:
                self.scheduleReconnect()
            case .success(let message):
                let text: String?
                switch message {
                case .string(let s): text = s
                case .data(let d): text = String(data: d, encoding: .utf8)
                @unknown default: text = nil
                }
                if let text { self.handleEngine(text) }
                self.listen()
            }
        }
    }

    private func handleEngine(_ raw: String) {
        guard let type = raw.first else { return }
        let rest = String(raw.dropFirst())
        switch type {
        case "0":
            if let token = session.token, !token.isEmpty,
               let enc = try? JSONSerialization.data(withJSONObject: ["token": token]),
               let json = String(data: enc, encoding: .utf8)
            {
                send("40\(json)")
            } else {
                send("40")
            }
        case "2":
            send("3")
        case "4":
            handleSocketIO(rest)
        default:
            break
        }
    }

    private func handleSocketIO(_ raw: String) {
        guard let sioType = raw.first else { return }
        let rest = String(raw.dropFirst())
        switch sioType {
        case "0":
            lock.lock()
            isConnected = true
            lock.unlock()
        case "1":
            scheduleReconnect()
        case "2":
            parseEventPacket(rest)
        case "4":
            scheduleReconnect()
        default:
            break
        }
    }

    private func parseEventPacket(_ raw: String) {
        var body = raw
        if let comma = body.firstIndex(of: ","), body.hasPrefix("/") {
            body = String(body[body.index(after: comma)...])
        }
        guard let data = body.data(using: .utf8),
              let arr = try? JSONSerialization.jsonObject(with: data) as? [Any],
              let name = arr.first as? String
        else { return }
        let payload = arr.count > 1 ? arr[1] as? [String: Any] : nil
        let event = Self.parseEvent(name: name, obj: payload ?? [:])
        DispatchQueue.main.async { [weak self] in
            self?.onEvent?(event)
        }
    }

    private func scheduleReconnect() {
        lock.lock()
        isConnected = false
        let should = receiveLoop
        lock.unlock()
        guard should, session.isLoggedIn else { return }
        reconnectWorkItem?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.connect() }
        reconnectWorkItem = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5, execute: work)
    }

    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        lock.lock()
        isConnected = true
        lock.unlock()
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if error != nil { scheduleReconnect() }
    }

    private static func parseEvent(name: String, obj: [String: Any]) -> SocketEvent {
        let message = obj["message"] as? [String: Any]
        let customer = obj["customer"] as? [String: Any]
        let fromUser = (obj["fromUser"] as? [String: Any]) ?? (message?["fromUser"] as? [String: Any])
        let direction = (message?["direction"] as? String) ?? ""
        let silent = name == "message_sent" || name == "internal_thread_updated" || direction == "outgoing"
        var conversationId = (obj["conversationId"] as? String)?.nilIfBlank
        if conversationId == nil {
            conversationId = ((obj["conversation"] as? [String: Any])?["id"] as? String)?.nilIfBlank
        }
        let threadId = (obj["threadId"] as? String)?.nilIfBlank
        let ticketId = (obj["ticketId"] as? String)?.nilIfBlank
        let msgType = (message?["type"] as? String) ?? ""
        let rawBody = [(message?["content"] as? String), (message?["body"] as? String)]
            .compactMap { $0?.nilIfBlank }
            .first ?? ""
        let mediaBody: String = {
            if !rawBody.isEmpty { return rawBody }
            switch msgType {
            case "image": return "📷"
            case "video": return "🎬"
            case "audio", "ptt", "voice": return "🎤"
            case "sticker", "document": return "📎"
            default: return ""
            }
        }()
        let title: String? = {
            switch name {
            case "new_message", "assigned_message":
                return (customer?["name"] as? String)?.nilIfBlank ?? (obj["customerName"] as? String)?.nilIfBlank
            case "internal_message":
                return (fromUser?["name"] as? String)?.nilIfBlank
            case "important_announcement":
                return (obj["title"] as? String)?.nilIfBlank
            case "ticket_assigned", "ticket_reply_notification":
                return (obj["title"] as? String)?.nilIfBlank ?? (obj["ticketNumber"] as? String)?.nilIfBlank
            case "task_assigned":
                return (obj["title"] as? String)?.nilIfBlank
            case "call_invite", "call_offer":
                return (obj["fromUserName"] as? String)?.nilIfBlank
            default:
                return nil
            }
        }()
        let body: String? = {
            switch name {
            case "new_message", "assigned_message", "internal_message":
                return mediaBody.nilIfBlank
            case "important_announcement":
                return (obj["body"] as? String)?.nilIfBlank
            case "ticket_reply_notification":
                return (obj["replyContent"] as? String)?.nilIfBlank
            case "call_invite", "call_offer":
                return (obj["type"] as? String) == "video" ? "video" : "voice"
            default:
                return (obj["title"] as? String)?.nilIfBlank
            }
        }()
        return SocketEvent(
            name: name,
            conversationId: conversationId,
            threadId: threadId,
            ticketId: ticketId,
            title: title,
            body: body,
            silent: silent
        )
    }
}

private extension String {
    var nilIfBlank: String? {
        let t = trimmingCharacters(in: .whitespacesAndNewlines)
        return t.isEmpty ? nil : t
    }
}
