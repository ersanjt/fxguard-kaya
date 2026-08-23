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

    func customerAvatarUrl(_ customerId: String?) -> URL? {
        guard let customerId, !customerId.isEmpty else { return nil }
        return resolveUrl("/api/customers/\(customerId)/avatar")
    }

    var authToken: String? { session.token }

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

    func conversations(search: String, filter: InboxFilter = .all, mineUserId: String? = nil) async throws -> (rows: [ConversationRow], unread: Int) {
        var path = "/api/conversations?page=1&limit=40"
        if !search.isEmpty, let enc = search.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            path += "&search=\(enc)"
        }
        switch filter {
        case .unread: path += "&unread=true"
        case .unanswered: path += "&unanswered=true"
        case .unassigned: path += "&unassigned=true"
        case .open: path += "&status=open"
        case .mine:
            if let id = mineUserId, !id.isEmpty { path += "&assignedTo=\(id)" }
        case .archived: path += "&status=archived"
        case .restricted: path += "&hiddenOnly=true"
        case .groups: path += "&isGroup=true"
        case .all: break
        }
        let obj = try await request(path: path, method: "GET")
        let unread = obj["unreadCount"] as? Int ?? 0
        let rows = (obj["data"] as? [[String: Any]] ?? []).map { item -> ConversationRow in
            let customer = item["customer"] as? [String: Any]
            let meta = item["metadata"] as? [String: Any]
            let phone = customer?["phone"] as? String
            let isGroup = (meta?["isGroup"] as? Bool ?? false) || (phone?.localizedCaseInsensitiveContains("@g.us") == true)
            let groupName = (meta?["groupName"] as? String)?.nilIfEmpty ?? (meta?["name"] as? String)?.nilIfEmpty
            let assignee = item["assignee"] as? [String: Any]
            return ConversationRow(
                id: item["id"] as? String ?? "",
                status: item["status"] as? String ?? "",
                unreadCount: item["unreadCount"] as? Int ?? 0,
                lastMessageAt: item["lastMessageAt"] as? String,
                lastMessagePreview: item["lastMessagePreview"] as? String,
                customerId: customer?["id"] as? String,
                customerName: isGroup
                    ? (groupName ?? (customer?["name"] as? String)?.nilIfEmpty ?? "گروه")
                    : ((customer?["name"] as? String)?.nilIfEmpty ?? "مشتری"),
                customerPhone: phone,
                isGroup: isGroup,
                lastOutgoingIsAutoReply: item["lastOutgoingIsAutoReply"] as? Bool ?? false,
                assigneeName: (assignee?["name"] as? String)?.nilIfEmpty
                    ?? (assignee?["whatsappSenderName"] as? String)?.nilIfEmpty,
                departmentName: (item["department"] as? [String: Any])?["name"] as? String
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

    func sendMedia(
        conversationId: String,
        content: String = "",
        url: String,
        filename: String,
        mime: String,
        sendAsVoice: Bool = false
    ) async throws -> ChatMessage {
        var media: [String: Any] = [
            "url": url,
            "filename": filename,
            "mimetype": mime,
        ]
        if sendAsVoice {
            media["type"] = "audio"
            media["sendAsVoice"] = true
        }
        let obj = try await request(
            path: "/api/conversations/\(conversationId)/send",
            method: "POST",
            body: ["content": content, "media": media]
        )
        return parseMessage(obj)
    }

    func uploadFile(data: Data, filename: String, mime: String) async throws -> UploadedFile {
        guard let url = URL(string: session.baseUrl + "/api/upload") else {
            throw ApiError(message: "آدرس سرور نامعتبر است", status: 0)
        }
        let boundary = UUID().uuidString
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 90
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        if let token = session.token, !token.isEmpty {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mime.isEmpty ? "application/octet-stream" : mime)\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body
        let respData: Data
        let response: URLResponse
        do {
            (respData, response) = try await urlSession.data(for: req)
        } catch {
            throw ApiError(message: "اتصال به سرور برقرار نشد.", status: 0, isNetwork: true)
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 401 {
            throw ApiError(message: extractError(respData) ?? "نشست منقضی شد. دوباره وارد شوید.", status: 401)
        }
        if !(200 ... 299).contains(status) {
            throw ApiError(message: extractError(respData) ?? "خطا در آپلود", status: status)
        }
        let obj = (try JSONSerialization.jsonObject(with: respData) as? [String: Any]) ?? [:]
        guard let fileUrl = (obj["url"] as? String)?.nilIfEmpty else {
            throw ApiError(message: (obj["error"] as? String) ?? "خطا در آپلود", status: status)
        }
        return UploadedFile(url: fileUrl, name: (obj["name"] as? String)?.nilIfEmpty ?? filename)
    }

    func startCall(conversationId: String, type: String) async throws -> CallStartResult {
        let obj = try await request(
            path: "/api/conversations/\(conversationId)/call",
            method: "POST",
            body: ["type": type == "video" ? "video" : "voice"]
        )
        return CallStartResult(
            method: obj["method"] as? String,
            callLink: obj["callLink"] as? String,
            isGroup: obj["isGroup"] as? Bool ?? false,
            introText: obj["introText"] as? String
        )
    }

    func markRead(conversationId: String) async {
        _ = try? await request(path: "/api/conversations/\(conversationId)/read", method: "POST", body: [:])
    }

    func customers(search: String, archive: Bool = false) async throws -> [CustomerRow] {
        var path = "/api/customers?page=1&limit=50"
        if !search.isEmpty, let enc = search.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            path += "&search=\(enc)"
        }
        if archive { path += "&restrictedOnly=true" }
        let obj = try await request(path: path, method: "GET")
        return (obj["data"] as? [[String: Any]] ?? []).map { parseCustomer($0) }
    }

    func customer(id: String) async throws -> CustomerRow {
        let obj = try await request(path: "/api/customers/\(id)", method: "GET")
        return parseCustomer((obj["data"] as? [String: Any]) ?? obj)
    }

    func customerTimeline(id: String, lang: String) async throws -> [TimelineItem] {
        let obj = (try? await request(path: "/api/customers/\(id)/timeline", method: "GET")) ?? [:]
        return (obj["data"] as? [[String: Any]] ?? []).enumerated().map { parseTimeline($0.element, index: $0.offset, lang: lang) }
    }

    func createCustomer(name: String, phone: String) async throws -> CustomerRow {
        let obj = try await request(path: "/api/customers", method: "POST", body: ["name": name, "phone": phone])
        return parseCustomer((obj["data"] as? [String: Any]) ?? obj)
    }

    func updateCustomer(id: String, draft: CustomerRow) async throws -> CustomerRow {
        var body: [String: Any] = [
            "name": draft.name,
            "status": draft.status,
            "email": draft.email ?? "",
            "notes": draft.notes ?? "",
            "birthDate": draft.birthDate ?? "",
            "nationalId": draft.nationalId ?? "",
            "nationality": draft.nationality ?? "",
            "gender": draft.gender ?? "",
            "occupation": draft.occupation ?? "",
            "companyName": draft.companyName ?? "",
            "address": draft.address ?? "",
            "city": draft.city ?? "",
            "country": draft.country ?? "",
            "postalCode": draft.postalCode ?? "",
            "instagram": draft.instagram ?? "",
            "telegram": draft.telegram ?? "",
            "website": draft.website ?? ""
        ]
        if let phone = draft.phone, !phone.isEmpty { body["phone"] = phone }
        let obj = try await request(path: "/api/customers/\(id)", method: "PUT", body: body)
        return parseCustomer((obj["data"] as? [String: Any]) ?? obj)
    }

    func startCustomerChat(customerId: String) async throws -> ConversationRow {
        let obj = try await request(path: "/api/conversations", method: "POST", body: ["customerId": customerId])
        return parseConversation((obj["data"] as? [String: Any]) ?? obj)
    }

    func conversation(id: String) async throws -> ConversationRow {
        let obj = try await request(path: "/api/conversations/\(id)", method: "GET")
        return parseConversation((obj["data"] as? [String: Any]) ?? obj)
    }

    func openCustomerConversation(customerId: String, fallbackName: String) async throws -> ConversationRow? {
        let obj = try await request(path: "/api/customers/\(customerId)/conversations", method: "GET")
        let first = (obj["data"] as? [[String: Any]])?.first
        guard let item = first else { return nil }
        let customer = item["customer"] as? [String: Any]
        return ConversationRow(
            id: item["id"] as? String ?? "",
            status: item["status"] as? String ?? "",
            unreadCount: item["unreadCount"] as? Int ?? 0,
            lastMessageAt: item["lastMessageAt"] as? String,
            lastMessagePreview: item["lastMessagePreview"] as? String,
            customerId: customer?["id"] as? String ?? customerId,
            customerName: fallbackName.nilIfEmpty ?? (customer?["name"] as? String ?? "—"),
            customerPhone: customer?["phone"] as? String
        )
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

    func tasks() async throws -> [TaskRow] {
        let obj = (try? await request(path: "/api/tasks?page=1&limit=50", method: "GET")) ?? [:]
        return (obj["data"] as? [[String: Any]] ?? []).map { item in
            let assignee = item["assignee"] as? [String: Any]
            return TaskRow(
                id: item["id"] as? String ?? "",
                title: item["title"] as? String ?? "",
                status: item["status"] as? String ?? "",
                priority: item["priority"] as? String ?? "",
                assigneeName: assignee?["name"] as? String
            )
        }
    }

    func teamThreads() async throws -> [TeamThread] {
        let obj = (try? await request(path: "/api/internal/threads", method: "GET")) ?? [:]
        return (obj["data"] as? [[String: Any]] ?? []).map { parseTeamThread($0) }
    }

    func teamUsers() async throws -> [TeamColleague] {
        let obj = (try? await request(path: "/api/internal/users", method: "GET")) ?? [:]
        return (obj["data"] as? [[String: Any]] ?? []).map { item in
            TeamColleague(
                id: item["id"] as? String ?? "",
                name: (item["name"] as? String)?.nilIfEmpty ?? (item["email"] as? String ?? "—"),
                email: item["email"] as? String,
                avatar: item["avatar"] as? String,
                status: item["status"] as? String
            )
        }
    }

    func startTeamThread(userIds: [String], name: String? = nil) async throws -> TeamThread {
        var body: [String: Any] = ["userIds": userIds]
        if let name, !name.isEmpty {
            body["name"] = name
            body["type"] = "group"
        }
        let obj = try await request(path: "/api/internal/threads", method: "POST", body: body)
        return parseTeamThread((obj["data"] as? [String: Any]) ?? obj)
    }

    func teamMessages(threadId: String, meId: String) async throws -> [TeamMessage] {
        let obj = (try? await request(path: "/api/internal/threads/\(threadId)/messages?limit=200", method: "GET")) ?? [:]
        return (obj["data"] as? [[String: Any]] ?? []).map { item in
            let from = item["fromUser"] as? [String: Any]
            let fromId = (item["fromUserId"] as? String) ?? (from?["id"] as? String ?? "")
            return TeamMessage(
                id: item["id"] as? String ?? UUID().uuidString,
                content: item["content"] as? String ?? "",
                fromMe: fromId == meId,
                senderName: from?["name"] as? String
            )
        }
    }

    func sendTeamMessage(threadId: String, content: String) async throws -> TeamMessage {
        let obj = try await request(
            path: "/api/internal/threads/\(threadId)/messages",
            method: "POST",
            body: ["content": content]
        )
        let from = obj["fromUser"] as? [String: Any]
        return TeamMessage(
            id: obj["id"] as? String ?? UUID().uuidString,
            content: obj["content"] as? String ?? content,
            fromMe: true,
            senderName: from?["name"] as? String
        )
    }

    func staffOnline() async throws -> [StaffPresence] {
        let obj = try await request(path: "/api/supervision/online", method: "GET")
        return (obj["data"] as? [[String: Any]] ?? []).map { item in
            let branch = item["branch"] as? [String: Any]
            let dept = item["department"] as? [String: Any]
            return StaffPresence(
                id: item["id"] as? String ?? UUID().uuidString,
                name: (item["name"] as? String)?.nilIfEmpty ?? (item["email"] as? String ?? "—"),
                email: item["email"] as? String,
                status: ((item["status"] as? String) ?? "offline").lowercased(),
                lastLoginAt: shortDateTime(item["lastLoginAt"] as? String ?? ""),
                branchName: branch?["name"] as? String,
                departmentName: dept?["name"] as? String,
                lastLoginIp: item["lastLoginIp"] as? String,
                lastLoginCountry: item["lastLoginCountry"] as? String
            )
        }
    }

    func staffLogins() async throws -> (rows: [StaffLoginRow], total: Int) {
        let obj = try await request(path: "/api/supervision/logins?limit=50", method: "GET")
        let rows = (obj["data"] as? [[String: Any]] ?? []).map { item -> StaffLoginRow in
            let user = item["user"] as? [String: Any]
            let branch = item["branch"] as? [String: Any]
            return StaffLoginRow(
                id: (item["id"] as? String)?.nilIfEmpty ?? UUID().uuidString,
                userName: (user?["name"] as? String)?.nilIfEmpty ?? (user?["email"] as? String ?? "—"),
                email: user?["email"] as? String,
                branchName: branch?["name"] as? String,
                createdAt: shortDateTime(item["createdAt"] as? String ?? ""),
                ip: item["ip"] as? String,
                country: item["country"] as? String,
                summary: item["summary"] as? String
            )
        }
        return (rows, intValue(obj["total"]))
    }

    func orgUsers() async throws -> [OrgUser] {
        let obj = try await request(path: "/api/users", method: "GET")
        return (obj["data"] as? [[String: Any]] ?? []).map { item in
            let first = item["firstName"] as? String ?? ""
            let last = item["lastName"] as? String ?? ""
            let composed = [first, last].filter { !$0.isEmpty }.joined(separator: " ")
            let branch = item["branch"] as? [String: Any]
            let dept = item["department"] as? [String: Any]
            let active: Bool
            if let b = item["isActive"] as? Bool { active = b }
            else { active = true }
            return OrgUser(
                id: item["id"] as? String ?? UUID().uuidString,
                name: (item["name"] as? String)?.nilIfEmpty ?? composed.nilIfEmpty ?? (item["username"] as? String)?.nilIfEmpty ?? (item["email"] as? String ?? "—"),
                email: item["email"] as? String,
                username: item["username"] as? String,
                role: (item["role"] as? String)?.nilIfEmpty ?? "agent",
                position: item["position"] as? String,
                status: ((item["status"] as? String) ?? "offline").lowercased(),
                isActive: active,
                lastLoginAt: shortDateTime(item["lastLoginAt"] as? String ?? ""),
                branchName: branch?["name"] as? String,
                departmentName: dept?["name"] as? String,
                avatar: item["avatar"] as? String
            )
        }
    }

    func dashboardStats() async throws -> DashboardStats {
        let obj = (try? await request(path: "/api/analytics/dashboard", method: "GET")) ?? [:]
        return DashboardStats(
            openConversations: intValue(obj["openConversations"]),
            unreadConversations: intValue(obj["unreadConversations"]),
            unansweredConversations: intValue(obj["unansweredConversations"]),
            unassignedConversations: intValue(obj["unassignedConversations"]),
            todayMessages: intValue(obj["todayMessages"]),
            ticketsOpen: intValue(obj["ticketsOpen"]),
            tasksPending: intValue(obj["tasksPending"]),
            totalCustomers: intValue(obj["totalCustomers"]),
            staffOnline: intValue(obj["staffOnline"]),
            loginsToday: intValue(obj["loginsToday"]),
            announcementsCount: intValue(obj["announcementsCount"]),
            unreadAnnouncements: intValue(obj["unreadAnnouncements"]),
            avgRating: obj["avgRating"] as? Double ?? (obj["avgRating"] as? NSNumber)?.doubleValue,
            ratedConversationsCount: intValue(obj["ratedConversationsCount"])
        )
    }

    func announcements() async throws -> [AnnouncementRow] {
        let obj = (try? await request(path: "/api/announcements/for-me", method: "GET")) ?? [:]
        let rows = (obj["data"] as? [[String: Any]]) ?? (obj["announcements"] as? [[String: Any]]) ?? []
        return rows.map { parseAnnouncement($0) }
    }

    func announcementTargets() async throws -> (users: [AnnouncementTarget], departments: [AnnouncementTarget]) {
        let obj = (try? await request(path: "/api/announcements/targets", method: "GET")) ?? [:]
        let users = (obj["users"] as? [[String: Any]] ?? []).map {
            AnnouncementTarget(id: $0["id"] as? String ?? "", name: $0["name"] as? String ?? "", kind: "user")
        }
        let departments = (obj["departments"] as? [[String: Any]] ?? []).map {
            AnnouncementTarget(id: $0["id"] as? String ?? "", name: $0["name"] as? String ?? "", kind: "department")
        }
        return (users, departments)
    }

    func sendAnnouncement(title: String, body: String, isImportant: Bool, targetType: String, targetId: String?) async throws -> AnnouncementRow {
        var payload: [String: Any] = [
            "title": title,
            "body": body,
            "isImportant": isImportant,
            "targetType": targetType
        ]
        if let targetId, !targetId.isEmpty, targetType != "all" { payload["targetId"] = targetId }
        let obj = try await request(path: "/api/announcements", method: "POST", body: payload)
        return parseAnnouncement((obj["data"] as? [String: Any]) ?? obj)
    }

    func markAnnouncementRead(id: String) async {
        _ = try? await request(path: "/api/announcements/\(id)/read", method: "POST", body: [:])
    }

    func deleteAnnouncement(id: String) async throws {
        _ = try await request(path: "/api/announcements/\(id)", method: "DELETE")
    }

    func dashModule(page: String) async -> [DashItem] {
        switch page {
        case "departments":
            return listItems(await getSoft("/api/departments")) { o in
                let users = (o["users"] as? [Any])?.count ?? 0
                let branch = o["branch"] as? [String: Any]
                return DashItem(id: o["id"] as? String ?? "", title: o["name"] as? String ?? "", subtitle: branch?["name"] as? String ?? "", meta: "\(users)")
            }
        case "branches":
            return listItems(await getSoft("/api/branches")) { o in
                let users = (o["users"] as? [Any])?.count ?? 0
                let depts = (o["departments"] as? [Any])?.count ?? 0
                let loc = [o["city"] as? String, o["country"] as? String].compactMap { $0 }.joined(separator: " · ")
                return DashItem(id: o["id"] as? String ?? "", title: o["name"] as? String ?? "", subtitle: loc, meta: "\(users) / \(depts)")
            }
        case "message-templates":
            return listItems(await getSoft("/api/message-templates")) { o in
                let content = ((o["content"] as? String) ?? "").replacingOccurrences(of: "\n", with: " ")
                return DashItem(id: o["id"] as? String ?? "", title: o["name"] as? String ?? "", subtitle: o["category"] as? String ?? "", meta: String(content.prefix(80)))
            }
        case "processes":
            return listItems(await getSoft("/api/processes/templates")) { o in
                return DashItem(id: o["id"] as? String ?? "", title: o["name"] as? String ?? "", subtitle: o["description"] as? String ?? "", meta: "\(intValue(o["instanceCount"]))")
            }
        case "rates", "rates-charts":
            let root = await getSoft("/api/rates")
            let arr = (root["items"] as? [[String: Any]]) ?? (root["data"] as? [[String: Any]]) ?? []
            let rates = arr.map { o in
                DashItem(
                    id: o["key"] as? String ?? "",
                    title: (o["label"] as? String) ?? (o["key"] as? String ?? ""),
                    subtitle: "\(o["value"] ?? "")",
                    meta: o["change"] != nil ? "\(o["change"]!)" : ""
                )
            }
            guard page == "rates-charts" else { return rates }
            let hist = await getSoft("/api/rates/history?key=usd&days=7")
            let points = (hist["points"] as? [[String: Any]] ?? []).enumerated().map { i, o in
                DashItem(id: "usd-\(i)", title: (o["date"] as? String) ?? (o["jalali"] as? String ?? ""), subtitle: "\(o["value"] ?? "")", meta: "USD")
            }
            return rates + points
        case "services":
            return listItems(await getSoft("/api/services")) { o in
                let sub = [o["category"] as? String, o["code"] as? String].compactMap { $0 }.joined(separator: " · ")
                let on = (o["isActive"] as? Bool) ?? true
                return DashItem(id: o["id"] as? String ?? "", title: o["name"] as? String ?? "", subtitle: sub, meta: on ? "on" : "off")
            }
        case "whatsapp":
            let o = await getSoft("/api/whatsapp/overview")
            let channels = o["channels"] as? [String: Any] ?? [:]
            let cloud = channels["cloud"] as? [String: Any] ?? [:]
            let gw = channels["gateway"] as? [String: Any] ?? [:]
            return [
                DashItem(id: "active", title: o["activeChannel"] as? String ?? "none", subtitle: o["connectionMode"] as? String ?? "", meta: "channel"),
                DashItem(id: "cloud", title: "Cloud API", subtitle: (cloud["ready"] as? Bool == true) ? "ready" : "off", meta: cloud["phoneNumberId"] as? String ?? ""),
                DashItem(id: "gateway", title: "Gateway", subtitle: (gw["connected"] as? Bool == true) ? "connected" : "off", meta: gw["number"] as? String ?? "")
            ]
        case "supervision":
            let o = await getSoft("/api/supervision/performance")
            let s = o["summary"] as? [String: Any] ?? [:]
            let users = (o["users"] as? [[String: Any]] ?? []).prefix(30).map { u -> DashItem in
                let branch = u["branch"] as? [String: Any]
                return DashItem(id: u["id"] as? String ?? "", title: u["name"] as? String ?? "", subtitle: branch?["name"] as? String ?? "", meta: "\(intValue(u["outgoingMessageCount"]))")
            }
            return [
                DashItem(id: "open", title: "open", subtitle: "\(intValue(s["openCount"]))"),
                DashItem(id: "pending", title: "pending", subtitle: "\(intValue(s["pendingCount"]))"),
                DashItem(id: "unassigned", title: "unassigned", subtitle: "\(intValue(s["unassignedCount"]))"),
                DashItem(id: "today", title: "today", subtitle: "\(intValue(s["todayMessageCount"]))")
            ] + users
        case "panel-settings":
            let o = await getSoft("/api/panel-settings")
            return ["siteName", "loginTitle", "pageTitle", "uiTheme", "primaryColor", "fontFamily", "defaultLanguage"].compactMap { key in
                guard let v = o[key] as? String, !v.isEmpty else { return nil }
                return DashItem(id: key, title: key, subtitle: v)
            }
        case "system-status":
            let o = await getSoft("/api/system-status")
            let checks = o["checks"] as? [String: Any] ?? [:]
            var rows = [DashItem(id: "overall", title: o["status"] as? String ?? "", subtitle: (o["checkedAt"] as? String ?? "").prefix(19).description)]
            for key in ["database", "redis", "rabbitmq", "gateway", "whatsapp", "backups"] {
                guard let c = checks[key] as? [String: Any] else { continue }
                rows.append(DashItem(id: key, title: key, subtitle: c["status"] as? String ?? "", meta: "\(c["number"] ?? c["latencyMs"] ?? "")"))
            }
            if let counts = o["counts"] as? [String: Any] {
                for (k, v) in counts {
                    rows.append(DashItem(id: "c-\(k)", title: k, subtitle: "\(v)"))
                }
            }
            return rows
        default:
            return []
        }
    }

    private func getSoft(_ path: String) async -> [String: Any] {
        (try? await request(path: path, method: "GET", body: nil, soft: true)) ?? [:]
    }

    private func listItems(_ root: [String: Any], map: ([String: Any]) -> DashItem) -> [DashItem] {
        ((root["data"] as? [[String: Any]]) ?? []).map(map)
    }

    private func parseAnnouncement(_ item: [String: Any]) -> AnnouncementRow {
        let from = item["fromUser"] as? [String: Any]
        return AnnouncementRow(
            id: item["id"] as? String ?? "",
            title: (item["title"] as? String)?.nilIfEmpty ?? (item["subject"] as? String ?? ""),
            body: (item["body"] as? String)?.nilIfEmpty
                ?? (item["content"] as? String)?.nilIfEmpty
                ?? (item["message"] as? String ?? ""),
            isImportant: item["isImportant"] as? Bool ?? false,
            targetType: (item["targetType"] as? String)?.nilIfEmpty ?? "all",
            targetName: item["targetName"] as? String,
            fromName: from?["name"] as? String,
            createdAt: item["createdAt"] as? String,
            read: item["read"] as? Bool ?? false,
            canDelete: item["canDelete"] as? Bool ?? false
        )
    }

    private func parseTeamThread(_ item: [String: Any]) -> TeamThread {
        let last = item["lastMessage"] as? [String: Any]
        return TeamThread(
            id: item["id"] as? String ?? "",
            displayName: (item["displayName"] as? String)?.nilIfEmpty
                ?? (item["name"] as? String)?.nilIfEmpty
                ?? "Chat",
            lastPreview: last?["content"] as? String,
            unreadCount: intValue(item["unreadCount"])
        )
    }

    private func parseConversation(_ item: [String: Any]) -> ConversationRow {
        let customer = item["customer"] as? [String: Any]
        let meta = item["metadata"] as? [String: Any]
        let phone = customer?["phone"] as? String
        let isGroup = (meta?["isGroup"] as? Bool ?? false) || (phone?.localizedCaseInsensitiveContains("@g.us") == true)
        let groupName = (meta?["groupName"] as? String)?.nilIfEmpty ?? (meta?["name"] as? String)?.nilIfEmpty
        let assignee = item["assignee"] as? [String: Any]
        return ConversationRow(
            id: item["id"] as? String ?? "",
            status: item["status"] as? String ?? "",
            unreadCount: intValue(item["unreadCount"]),
            lastMessageAt: item["lastMessageAt"] as? String,
            lastMessagePreview: item["lastMessagePreview"] as? String,
            customerId: customer?["id"] as? String,
            customerName: isGroup
                ? (groupName ?? (customer?["name"] as? String)?.nilIfEmpty ?? "گروه")
                : ((customer?["name"] as? String)?.nilIfEmpty ?? "مشتری"),
            customerPhone: phone,
            isGroup: isGroup,
            lastOutgoingIsAutoReply: item["lastOutgoingIsAutoReply"] as? Bool ?? false,
            assigneeName: (assignee?["name"] as? String)?.nilIfEmpty
                ?? (assignee?["whatsappSenderName"] as? String)?.nilIfEmpty,
            departmentName: (item["department"] as? [String: Any])?["name"] as? String
        )
    }

    private func parseCustomer(_ item: [String: Any]) -> CustomerRow {
        let loc = item["lastOpenConv"] as? [String: Any]
        let dept = loc?["department"] as? [String: Any]
        let assignee = loc?["assignee"] as? [String: Any]
        return CustomerRow(
            id: item["id"] as? String ?? "",
            name: (item["name"] as? String)?.nilIfEmpty ?? "مشتری",
            phone: item["phone"] as? String,
            email: item["email"] as? String,
            status: item["status"] as? String ?? "active",
            lastContactAt: item["lastContactAt"] as? String,
            firstContactAt: item["firstContactAt"] as? String,
            totalConversations: intValue(item["totalConversations"]),
            departmentName: dept?["name"] as? String,
            assigneeName: assignee?["name"] as? String,
            notes: item["notes"] as? String,
            birthDate: item["birthDate"] as? String,
            nationalId: item["nationalId"] as? String,
            nationality: item["nationality"] as? String,
            gender: item["gender"] as? String,
            occupation: item["occupation"] as? String,
            companyName: item["companyName"] as? String,
            address: item["address"] as? String,
            city: item["city"] as? String,
            country: item["country"] as? String,
            postalCode: item["postalCode"] as? String,
            instagram: item["instagram"] as? String,
            telegram: item["telegram"] as? String,
            website: item["website"] as? String
        )
    }

    private func parseTimeline(_ item: [String: Any], index: Int, lang: String) -> TimelineItem {
        let type = item["type"] as? String ?? ""
        let data = item["data"] as? [String: Any] ?? [:]
        let date = shortDateTime(item["date"] as? String ?? "")
        let fa = lang != "en" && lang != "tr"
        switch type {
        case "conversation":
            let status = data["status"] as? String ?? ""
            let count = intValue(data["messageCount"])
            let who = (data["assignee"] as? [String: Any])?["name"] as? String
            return TimelineItem(
                id: (data["id"] as? String)?.nilIfEmpty ?? "tl-\(index)",
                type: type,
                title: fa ? "مکالمه \(status)" : "Conversation \(status)",
                meta: [count > 0 ? "\(count) \(fa ? "پیام" : "msgs")" : nil, who, date]
                    .compactMap { $0 }.joined(separator: " · "),
                conversationId: data["id"] as? String
            )
        case "activity":
            let action = data["action"] as? String ?? ""
            let label = action == "message_sent" ? (fa ? "ارسال پیام" : "Message sent")
                : action == "wa_call_started" ? (fa ? "شروع تماس" : "Call started")
                : action == "wa_call_ended" ? (fa ? "پایان تماس" : "Call ended")
                : action
            let user = ((data["user"] as? [String: Any])?["name"] as? String)
                ?? ((item["user"] as? [String: Any])?["name"] as? String)
                ?? ""
            return TimelineItem(
                id: (data["id"] as? String)?.nilIfEmpty ?? "tl-\(index)",
                type: type,
                title: [label, user].filter { !$0.isEmpty }.joined(separator: " · "),
                meta: [(data["summary"] as? String), date].compactMap { $0 }.joined(separator: " · ")
            )
        case "note":
            return TimelineItem(
                id: (data["id"] as? String)?.nilIfEmpty ?? "tl-\(index)",
                type: type,
                title: fa ? "گزارش/یادداشت" : "Note",
                meta: String((data["content"] as? String ?? date).prefix(120))
            )
        case "transaction":
            return TimelineItem(
                id: (data["id"] as? String)?.nilIfEmpty ?? "tl-\(index)",
                type: type,
                title: fa ? "تراکنش" : "Transaction",
                meta: [(data["amount"] as? String), (data["note"] as? String), date]
                    .compactMap { $0 }.joined(separator: " · ")
            )
        default:
            return TimelineItem(id: "tl-\(index)", type: type.isEmpty ? "item" : type, title: type.isEmpty ? "—" : type, meta: date)
        }
    }

    private func intValue(_ raw: Any?) -> Int {
        if let n = raw as? Int { return n }
        if let n = raw as? NSNumber { return n.intValue }
        if let s = raw as? String { return Int(s) ?? 0 }
        return 0
    }

    private func shortDateTime(_ raw: String) -> String {
        if raw.isEmpty { return "" }
        return String(raw.replacingOccurrences(of: "T", with: " ").prefix(16))
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
            direction: (obj["direction"] as? String)?.nilIfEmpty ?? "incoming",
            content: (obj["content"] as? String)
                ?? (obj["text"] as? String)
                ?? (obj["body"] as? String)
                ?? "",
            type: (obj["type"] as? String)?.nilIfEmpty ?? "text",
            timestamp: (obj["timestamp"] as? String) ?? (obj["createdAt"] as? String),
            hasMedia: (obj["hasMedia"] as? Bool ?? false) || (url?.isEmpty == false),
            mediaUrl: url,
            mediaMime: (media?["mimetype"] as? String) ?? (media?["mime"] as? String),
            mediaName: (media?["filename"] as? String) ?? (media?["name"] as? String),
            senderName: (user?["whatsappSenderName"] as? String)?.nilIfEmpty ?? (user?["name"] as? String)
        )
    }

    @discardableResult
    private func request(path: String, method: String, body: [String: Any]? = nil, soft: Bool = false) async throws -> [String: Any] {
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
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await urlSession.data(for: req)
        } catch {
            throw ApiError(message: "اتصال به سرور برقرار نشد.", status: 0, isNetwork: true)
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 401 {
            let handshake = path.hasPrefix("/api/auth/login")
                || path.hasPrefix("/api/auth/forgot-password")
                || path.hasPrefix("/api/auth/totp/")
            if !handshake { session.clearSession() }
            throw ApiError(
                message: extractError(data) ?? (handshake ? "ورود ناموفق بود" : "نشست منقضی شد. دوباره وارد شوید."),
                status: 401
            )
        }
        if !(200 ... 299).contains(status) {
            if soft, data.isEmpty { return [:] }
            if soft {
                let raw = try? JSONSerialization.jsonObject(with: data)
                if let obj = raw as? [String: Any] { return obj }
                if let arr = raw as? [Any] { return ["data": arr] }
                return [:]
            }
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
