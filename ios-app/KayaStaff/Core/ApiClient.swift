/**
 * Kaya CRM — HTTP client (Bearer + dynamic base URL)
 * @file    ios-app/KayaStaff/Core/ApiClient.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
import Foundation

final class ApiClient {
    private let session: SessionStore
    private let urlSession: URLSession

    init(session: SessionStore) {
        self.session = session
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        urlSession = URLSession(configuration: config)
    }

    func resolveUrl(_ path: String?) -> URL? {
        guard let path, !path.isEmpty else { return nil }
        if path.hasPrefix("http://") || path.hasPrefix("https://") { return URL(string: path) }
        return URL(string: session.baseUrl + (path.hasPrefix("/") ? path : "/\(path)"))
    }

    func branding() async throws -> Branding {
        let obj = try await request(path: "/api/panel-settings/public/branding", method: "GET")
        return Branding(
            siteName: obj["siteName"] as? String,
            loginTitle: obj["loginTitle"] as? String,
            logoUrl: obj["logoUrl"] as? String,
            loginLogoUrl: obj["loginLogoUrl"] as? String,
            primaryColor: obj["primaryColor"] as? String
        )
    }

    func login(identifier: String, password: String) async throws -> (needTotp: Bool, tempToken: String?, token: String?, user: StaffUser?, hint: String?) {
        let obj = try await request(
            path: "/api/auth/login",
            method: "POST",
            body: ["email": identifier, "password": password]
        )
        return parseLogin(obj)
    }

    func verifyTotp(tempToken: String, code: String) async throws -> (token: String, user: StaffUser) {
        let obj = try await request(
            path: "/api/auth/totp/verify-login",
            method: "POST",
            body: ["tempToken": tempToken, "code": code]
        )
        let parsed = parseLogin(obj)
        guard let token = parsed.token, let user = parsed.user else {
            throw ApiError(message: "ورود ناموفق بود", status: 401)
        }
        return (token, user)
    }

    func forgotPassword(email: String) async throws {
        _ = try await request(path: "/api/auth/forgot-password", method: "POST", body: ["email": email])
    }

    func me() async throws -> StaffUser {
        let obj = try await request(path: "/api/auth/me", method: "GET")
        return parseUser(obj)
    }

    func logout() async {
        _ = try? await request(path: "/api/auth/logout", method: "POST", body: [:])
        session.clearSession()
    }

    func setOnline() async {
        _ = try? await request(path: "/api/auth/me/presence", method: "PATCH", body: ["status": "online"])
    }

    func conversations(search: String) async throws -> (rows: [ConversationRow], unread: Int) {
        var path = "/api/conversations?page=1&limit=40"
        if !search.isEmpty, let enc = search.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            path += "&search=\(enc)"
        }
        let obj = try await request(path: path, method: "GET")
        let unread = obj["unreadCount"] as? Int ?? 0
        let rows = (obj["data"] as? [[String: Any]] ?? []).map { item -> ConversationRow in
            let customer = item["customer"] as? [String: Any]
            return ConversationRow(
                id: item["id"] as? String ?? "",
                status: item["status"] as? String ?? "",
                unreadCount: item["unreadCount"] as? Int ?? 0,
                lastMessagePreview: item["lastMessagePreview"] as? String,
                customerName: (customer?["name"] as? String)?.nilIfEmpty ?? "—",
                customerPhone: customer?["phone"] as? String
            )
        }
        return (rows, unread)
    }

    func messages(conversationId: String) async throws -> [ChatMessage] {
        let obj = try await request(path: "/api/conversations/\(conversationId)/messages?limit=80", method: "GET")
        return (obj["data"] as? [[String: Any]] ?? []).map { parseMessage($0) }
    }

    func sendMessage(conversationId: String, content: String) async throws -> ChatMessage {
        let obj = try await request(
            path: "/api/conversations/\(conversationId)/send",
            method: "POST",
            body: ["content": content]
        )
        return parseMessage(obj)
    }

    func markRead(conversationId: String) async {
        _ = try? await request(path: "/api/conversations/\(conversationId)/read", method: "POST", body: [:])
    }

    func customers(search: String) async throws -> [CustomerRow] {
        var path = "/api/customers?page=1&limit=50"
        if !search.isEmpty, let enc = search.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            path += "&search=\(enc)"
        }
        let obj = try await request(path: path, method: "GET")
        return (obj["data"] as? [[String: Any]] ?? []).map { item in
            CustomerRow(
                id: item["id"] as? String ?? "",
                name: (item["name"] as? String)?.nilIfEmpty ?? (item["phone"] as? String ?? "—"),
                phone: item["phone"] as? String,
                email: item["email"] as? String,
                status: item["status"] as? String ?? ""
            )
        }
    }

    func tickets() async throws -> [TicketRow] {
        let obj = try await request(path: "/api/tickets?page=1&limit=50", method: "GET")
        return (obj["data"] as? [[String: Any]] ?? []).map { item in
            TicketRow(
                id: item["id"] as? String ?? "",
                title: item["title"] as? String ?? "",
                ticketNumber: item["ticketNumber"] as? String,
                status: item["status"] as? String ?? "",
                priority: item["priority"] as? String ?? ""
            )
        }
    }

    private func parseLogin(_ obj: [String: Any]) -> (needTotp: Bool, tempToken: String?, token: String?, user: StaffUser?, hint: String?) {
        if obj["needTotp"] as? Bool == true {
            return (true, obj["tempToken"] as? String, nil, nil, (obj["email"] as? String) ?? (obj["username"] as? String))
        }
        let token = obj["token"] as? String
        let user = (obj["user"] as? [String: Any]).map(parseUser)
        return (false, nil, token, user, nil)
    }

    private func parseUser(_ obj: [String: Any]) -> StaffUser {
        let first = obj["firstName"] as? String ?? ""
        let last = obj["lastName"] as? String ?? ""
        let composed = [first, last].filter { !$0.isEmpty }.joined(separator: " ")
        return StaffUser(
            id: obj["id"] as? String ?? "",
            name: (obj["name"] as? String)?.nilIfEmpty ?? composed.nilIfEmpty ?? (obj["username"] as? String ?? ""),
            email: obj["email"] as? String ?? "",
            username: obj["username"] as? String ?? "",
            role: obj["role"] as? String ?? "",
            avatar: obj["avatar"] as? String
        )
    }

    private func parseMessage(_ obj: [String: Any]) -> ChatMessage {
        let media = obj["mediaData"] as? [String: Any]
        let url = (media?["url"] as? String) ?? (media?["path"] as? String)
        let user = obj["user"] as? [String: Any]
        return ChatMessage(
            id: obj["id"] as? String ?? UUID().uuidString,
            direction: obj["direction"] as? String ?? "",
            content: obj["content"] as? String ?? "",
            type: obj["type"] as? String ?? "text",
            hasMedia: (obj["hasMedia"] as? Bool ?? false) || (url?.isEmpty == false),
            senderName: user?["name"] as? String
        )
    }

    @discardableResult
    private func request(path: String, method: String, body: [String: Any]? = nil) async throws -> [String: Any] {
        guard let url = URL(string: session.baseUrl + path) else {
            throw ApiError(message: "آدرس سرور نامعتبر است", status: 0)
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token = session.token, !token.isEmpty {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, response) = try await urlSession.data(for: req)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 401 {
            session.clearSession()
            throw ApiError(message: extractError(data) ?? "نشست منقضی شد. دوباره وارد شوید.", status: 401)
        }
        if !(200 ... 299).contains(status) {
            throw ApiError(message: extractError(data) ?? "خطای سرور (\(status))", status: status)
        }
        if data.isEmpty { return [:] }
        let raw = try JSONSerialization.jsonObject(with: data)
        if let obj = raw as? [String: Any] { return obj }
        if let arr = raw as? [Any] { return ["data": arr] }
        return [:]
    }

    private func extractError(_ data: Data) -> String? {
        guard let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return (obj["error"] as? String)?.nilIfEmpty ?? (obj["message"] as? String)
    }
}

private extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
