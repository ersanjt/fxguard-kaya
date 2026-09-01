/**
 * Kaya CRM — shared app state (mirrors Android StaffViewModel)
 * @file    ios-app/KayaStaff/Features/StaffAppModel.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
import Foundation

enum Gate { case splash, login, totp, app }
enum StaffTab { case dashboard, inbox, customers, announcements, more }
enum MoreDest { case menu, tickets, tasks, team, profile }

@MainActor
final class StaffAppModel: ObservableObject {
    let session: SessionStore
    private let api: ApiClient

    @Published var gate: Gate = .splash
    @Published var branding: Branding?
    @Published var user: StaffUser?
    @Published var serverUrl: String
    @Published var authLoading = false
    @Published var authError: String?
    @Published var authIsSuccess = false
    @Published var totpHint: String?
    private var tempToken: String?

    @Published var tab: StaffTab = .dashboard
    @Published var moreDest: MoreDest = .menu
    @Published var inboxSearch = ""
    @Published var inboxFilter: InboxFilter = .all
    @Published var inbox: [ConversationRow] = []
    @Published var inboxLoading = false
    @Published var inboxError: String?
    @Published var unreadTotal = 0
    @Published var openChat: ConversationRow?
    @Published var messages: [ChatMessage] = []
    @Published var draft = ""
    @Published var sending = false
    @Published var chatLoading = false
    @Published var chatError: String?
    @Published var chatNotice: String?
    @Published var pendingCallLink: String?
    @Published var customerSearch = ""
    @Published var customerArchive = false
    @Published var customers: [CustomerRow] = []
    @Published var customersLoading = false
    @Published var customersError: String?
    @Published var customerProfile: CustomerRow?
    @Published var customerTimeline: [TimelineItem] = []
    @Published var customerDetailLoading = false
    @Published var customerSaving = false
    @Published var tickets: [TicketRow] = []
    @Published var ticketsLoading = false
    @Published var ticketsError: String?
    @Published var tasks: [TaskRow] = []
    @Published var tasksLoading = false
    @Published var tasksError: String?
    @Published var teamThreads: [TeamThread] = []
    @Published var teamLoading = false
    @Published var teamUsers: [TeamColleague] = []
    @Published var teamUsersLoading = false
    @Published var teamUserSearch = ""
    @Published var teamError: String?
    @Published var openThread: TeamThread?
    @Published var teamMessages: [TeamMessage] = []
    @Published var teamDraft = ""
    @Published var teamSending = false
    @Published var announcements: [AnnouncementRow] = []
    @Published var announcementUsers: [AnnouncementTarget] = []
    @Published var announcementDepartments: [AnnouncementTarget] = []
    @Published var announcementSending = false
    @Published var announcementError: String?
    @Published var dashStats = DashboardStats()
    @Published var dashLoading = false
    @Published var dashError: String?
    @Published var dashUpdatedAt: String?
    @Published var dashInfoKey: String?
    @Published var staffOnline: [StaffPresence] = []
    @Published var staffLogins: [StaffLoginRow] = []
    @Published var staffLoginsTotal = 0
    @Published var staffActivityLoading = false
    @Published var staffActivityError: String?
    @Published var orgUsers: [OrgUser] = []
    @Published var orgUsersLoading = false
    @Published var orgUsersError: String?
    @Published var dashModuleItems: [DashItem] = []
    @Published var dashModuleLoading = false
    @Published var dashModuleError: String?
    @Published var pendingNewConv = false
    @Published var pendingAddCustomer = false

    private var searchTask: Task<Void, Never>?

    init(session: SessionStore) {
        self.session = session
        self.api = ApiClient(session: session)
        self.serverUrl = session.baseUrl
        self.user = session.user
        Task { await bootstrap() }
        startPolling()
    }

    var lang: String { session.language }

    func setLang(_ code: String) {
        session.language = code
        objectWillChange.send()
    }

    @discardableResult
    func persistServer() -> Bool {
        guard let normalized = SessionStore.normalizeBaseUrl(serverUrl) else {
            authIsSuccess = false
            authError = L10n.t(lang, "server_https")
            return false
        }
        session.baseUrl = normalized
        serverUrl = normalized
        return true
    }

    func logoUrl() -> URL? {
        api.resolveUrl(branding?.loginLogoUrl ?? branding?.logoUrl)
    }

    var avatarUrl: URL? { api.resolveUrl(user?.avatar) }
    var avatarLetter: String { String((user?.name ?? "?").prefix(1)) }
    var authToken: String? { session.token }

    func customerAvatarUrl(_ id: String?) -> URL? { api.customerAvatarUrl(id) }
    var notifyBadge: Int { announcements.count + tickets.count }

    var headerTitle: String {
        if tab == .dashboard, let key = dashInfoKey {
            return L10n.t(lang, dashPageTitleKey(key))
        }
        switch tab {
        case .dashboard: return L10n.t(lang, "dashboard")
        case .inbox: return L10n.t(lang, "inbox")
        case .customers: return L10n.t(lang, "customers")
        case .announcements: return L10n.t(lang, "announcements")
        case .more:
            switch moreDest {
            case .menu: return L10n.t(lang, "more")
            case .tickets: return L10n.t(lang, "tickets")
            case .tasks: return L10n.t(lang, "tasks")
            case .team: return L10n.t(lang, "team")
            case .profile: return L10n.t(lang, "profile_me")
            }
        }
    }

    func selectTab(_ next: StaffTab) {
        if openChat != nil { closeChat() }
        if openThread != nil { closeTeamThread() }
        if customerProfile != nil { closeCustomerProfile() }
        dashInfoKey = nil
        tab = next
        if next == .more { moreDest = .menu }
    }

    func openMore(_ dest: MoreDest) {
        if openChat != nil { closeChat() }
        if openThread != nil && dest != .team { closeTeamThread() }
        if customerProfile != nil { closeCustomerProfile() }
        dashInfoKey = nil
        tab = .more
        moreDest = dest
        loadMore(dest)
    }

    func load(for tab: StaffTab) {
        switch tab {
        case .dashboard:
            refreshInbox()
            refreshAnnouncements()
            refreshDashboard()
        case .inbox:
            refreshInbox()
        case .customers:
            refreshCustomers()
        case .announcements:
            refreshAnnouncements()
        case .more:
            loadMore(moreDest)
        }
    }

    func loadMore(_ dest: MoreDest) {
        switch dest {
        case .tickets:
            refreshTickets()
        case .tasks:
            refreshTasks()
        case .team:
            refreshTeam()
        default:
            break
        }
    }

    private func bootstrap() async {
        branding = try? await api.branding()
        guard session.isLoggedIn else {
            gate = .login
            return
        }
        do {
            let me = try await api.me()
            user = me
            session.user = me
            enterApp()
        } catch {
            session.clearSession()
            gate = .login
        }
    }

    func login(identifier: String, password: String) {
        if identifier.isEmpty || password.isEmpty {
            authIsSuccess = false
            authError = L10n.t(lang, "required")
            return
        }
        guard persistServer() else { return }
        Task {
            authLoading = true
            authIsSuccess = false
            authError = nil
            defer { authLoading = false }
            do {
                let res = try await api.login(identifier: identifier, password: password)
                if res.needTotp, let tmp = res.tempToken, !tmp.isEmpty {
                    tempToken = tmp
                    totpHint = res.hint
                    gate = .totp
                } else if let token = res.token, let user = res.user {
                    session.saveLogin(token: token, user: user)
                    self.user = user
                    enterApp()
                } else {
                    authError = L10n.t(lang, "connect_fail")
                }
            } catch {
                authError = errMsg(error)
            }
        }
    }

    func verifyTotp(_ code: String) {
        guard let tmp = tempToken, code.count == 6 else {
            authError = L10n.t(lang, "required")
            return
        }
        Task {
            authLoading = true
            authError = nil
            defer { authLoading = false }
            do {
                let res = try await api.verifyTotp(tempToken: tmp, code: code)
                session.saveLogin(token: res.token, user: res.user)
                user = res.user
                enterApp()
            } catch {
                authError = errMsg(error)
            }
        }
    }

    func forgot(_ email: String) {
        if email.isEmpty {
            authError = L10n.t(lang, "required")
            return
        }
        guard persistServer() else { return }
        Task {
            authLoading = true
            authError = nil
            defer { authLoading = false }
            do {
                try await api.forgotPassword(email: email)
                authIsSuccess = true
                authError = L10n.t(lang, "forgot_ok")
            } catch {
                authIsSuccess = false
                authError = errMsg(error)
            }
        }
    }

    func backToLogin() {
        tempToken = nil
        authError = nil
        authIsSuccess = false
        gate = .login
    }

    private func enterApp() {
        gate = .app
        Task { await api.setOnline() }
        refreshInbox()
        refreshCustomers()
        refreshTickets()
        refreshTasks()
        refreshTeam()
        refreshAnnouncements()
    }

    func logout() {
        Task {
            await api.logout()
            inbox = []
            customers = []
            tickets = []
            tasks = []
            teamThreads = []
            announcements = []
            announcementUsers = []
            announcementDepartments = []
            announcementError = nil
            inboxError = nil
            customersError = nil
            ticketsError = nil
            tasksError = nil
            teamError = nil
            dashModuleItems = []
            dashModuleError = nil
            openChat = nil
            customerProfile = nil
            user = nil
            tab = .dashboard
            moreDest = .menu
            gate = .login
        }
    }

    func onInboxSearch(_ q: String) {
        inboxSearch = q
        debounce { self.refreshInbox() }
    }

    func refreshInbox(silent: Bool = false) {
        Task {
            if !silent { inboxLoading = true }
            defer { if !silent { inboxLoading = false } }
            do {
                let res = try await api.conversations(search: inboxSearch, filter: inboxFilter, mineUserId: user?.id)
                inbox = res.rows
                unreadTotal = res.unread
                inboxError = nil
            } catch {
                if !silent || inbox.isEmpty {
                    inboxError = errMsg(error)
                }
            }
        }
    }

    func applyInboxFilter(_ filter: InboxFilter) {
        inboxFilter = filter
        refreshInbox()
    }

    func openCustomer(_ row: CustomerRow) {
        Task {
            do {
                var opened = try await api.startCustomerChat(customerId: row.id)
                closeCustomerProfile()
                if !row.name.isEmpty { opened.customerName = row.name }
                customersError = nil
                openConversation(opened)
            } catch {
                do {
                    let conv = try await api.openCustomerConversation(customerId: row.id, fallbackName: row.name)
                    closeCustomerProfile()
                    customersError = nil
                    openConversation(conv)
                } catch {
                    customersError = errMsg(error)
                }
            }
        }
    }

    func openConversation(_ row: ConversationRow) {
        customerProfile = nil
        tab = .inbox
        openChat = row
        messages = []
        chatError = nil
        chatNotice = nil
        chatLoading = true
        Task {
            do {
                messages = try await api.messages(conversationId: row.id)
                chatError = nil
            } catch {
                chatError = errMsg(error)
            }
            chatLoading = false
            await api.markRead(conversationId: row.id)
        }
    }

    func closeChat() {
        openChat = nil
        messages = []
        draft = ""
        chatError = nil
        chatNotice = nil
        pendingCallLink = nil
        chatLoading = false
        refreshInbox()
    }

    func send() {
        guard let chat = openChat else { return }
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        Task {
            sending = true
            defer { sending = false }
            do {
                var sent = try await api.sendMessage(conversationId: chat.id, content: text)
                if sent.direction.isEmpty { sent.direction = "outgoing" }
                draft = ""
                messages.append(sent)
                chatError = nil
            } catch {
                chatError = errMsg(error)
            }
        }
    }

    func sendFile(data: Data, filename: String, mime: String) {
        guard let chat = openChat, !data.isEmpty else { return }
        Task {
            sending = true
            defer { sending = false }
            do {
                let up = try await api.uploadFile(data: data, filename: filename, mime: mime)
                var sent = try await api.sendMedia(
                    conversationId: chat.id,
                    content: draft.trimmingCharacters(in: .whitespacesAndNewlines),
                    url: up.url,
                    filename: up.name,
                    mime: mime
                )
                if sent.direction.isEmpty { sent.direction = "outgoing" }
                draft = ""
                messages.append(sent)
                chatError = nil
            } catch {
                chatError = errMsg(error)
            }
        }
    }

    func sendVoice(url: URL) {
        guard let chat = openChat else { return }
        Task {
            sending = true
            defer {
                sending = false
                try? FileManager.default.removeItem(at: url)
            }
            do {
                let data = try Data(contentsOf: url)
                let up = try await api.uploadFile(data: data, filename: url.lastPathComponent, mime: "audio/mp4")
                var sent = try await api.sendMedia(
                    conversationId: chat.id,
                    url: up.url,
                    filename: up.name,
                    mime: "audio/mp4",
                    sendAsVoice: true
                )
                if sent.direction.isEmpty { sent.direction = "outgoing" }
                messages.append(sent)
                chatError = nil
            } catch {
                chatError = errMsg(error)
            }
        }
    }

    func sendGif(_ url: String) {
        guard let chat = openChat else { return }
        Task {
            sending = true
            defer { sending = false }
            do {
                var sent = try await api.sendMedia(
                    conversationId: chat.id,
                    url: url,
                    filename: "gif.gif",
                    mime: "image/gif"
                )
                if sent.direction.isEmpty { sent.direction = "outgoing" }
                messages.append(sent)
                chatError = nil
            } catch {
                chatError = errMsg(error)
            }
        }
    }

    func startCall(_ type: String) {
        guard let chat = openChat else { return }
        Task {
            do {
                let result = try await api.startCall(conversationId: chat.id, type: type)
                let group = result.isGroup || chat.isGroup
                if result.method == "link", let link = result.callLink, !link.isEmpty {
                    chatNotice = L10n.t(lang, group ? "wa_call_group_link_sent" : "wa_call_link_sent")
                    pendingCallLink = link
                } else {
                    chatNotice = L10n.t(lang, group ? "wa_call_group_started" : "wa_call_started")
                }
                chatError = nil
                messages = (try? await api.messages(conversationId: chat.id)) ?? messages
            } catch {
                chatError = errMsg(error)
            }
        }
    }

    func showChatNotice(_ msg: String) {
        chatNotice = msg
    }

    func mediaURL(_ path: String?) -> URL? { api.resolveUrl(path) }

    func onCustomerSearch(_ q: String) {
        customerSearch = q
        debounce { self.refreshCustomers() }
    }

    func refreshCustomers() {
        Task {
            customersLoading = true
            defer { customersLoading = false }
            do {
                customers = try await api.customers(search: customerSearch, archive: customerArchive)
                customersError = nil
            } catch {
                customersError = errMsg(error)
            }
        }
    }

    func applyCustomerArchive(_ archive: Bool) {
        customerArchive = archive
        refreshCustomers()
    }

    func openCustomerProfile(_ row: CustomerRow) {
        customerProfile = row
        customerTimeline = []
        Task {
            customerDetailLoading = true
            defer { customerDetailLoading = false }
            do {
                let fetched = try await api.customer(id: row.id)
                var merged = fetched
                merged.departmentName = fetched.departmentName ?? row.departmentName
                merged.assigneeName = fetched.assigneeName ?? row.assigneeName
                merged.totalConversations = max(fetched.totalConversations, row.totalConversations)
                merged.lastContactAt = fetched.lastContactAt ?? row.lastContactAt
                merged.firstContactAt = fetched.firstContactAt ?? row.firstContactAt
                customerProfile = merged
                customerTimeline = (try? await api.customerTimeline(id: row.id, lang: lang)) ?? []
                customersError = nil
            } catch {
                customersError = errMsg(error)
            }
        }
    }

    func closeCustomerProfile() {
        customerProfile = nil
        customerTimeline = []
        customersError = nil
    }

    func createCustomer(name: String, phone: String) {
        Task {
            do {
                _ = try await api.createCustomer(name: name.trimmingCharacters(in: .whitespacesAndNewlines), phone: phone.trimmingCharacters(in: .whitespacesAndNewlines))
                customersError = nil
                refreshCustomers()
            } catch {
                customersError = errMsg(error)
            }
        }
    }

    func updateCustomer(name: String, phone: String, email: String, status: String) {
        guard var current = customerProfile else { return }
        current.name = name
        current.phone = phone.isEmpty ? nil : phone
        current.email = email.isEmpty ? nil : email
        current.status = status
        updateCustomer(current)
    }

    func updateCustomer(_ draft: CustomerRow) {
        guard let current = customerProfile else { return }
        Task {
            customerSaving = true
            defer { customerSaving = false }
            do {
                let updated = try await api.updateCustomer(id: current.id, draft: draft)
                customerProfile = updated
                customersError = nil
                refreshCustomers()
            } catch {
                customersError = errMsg(error)
            }
        }
    }

    func openTimelineConversation(_ id: String) {
        Task {
            do {
                let conv = try await api.conversation(id: id)
                closeCustomerProfile()
                openConversation(conv)
            } catch {
                customersError = errMsg(error)
            }
        }
    }

    func refreshTickets(silent: Bool = false) {
        Task {
            if !silent { ticketsLoading = true }
            defer { ticketsLoading = false }
            do {
                tickets = try await api.tickets()
                ticketsError = nil
            } catch {
                if !silent || tickets.isEmpty {
                    ticketsError = errMsg(error)
                }
            }
        }
    }

    func refreshTasks(silent: Bool = false) {
        Task {
            if !silent { tasksLoading = true }
            defer { tasksLoading = false }
            do {
                tasks = try await api.tasks()
                tasksError = nil
            } catch {
                if !silent || tasks.isEmpty {
                    tasksError = errMsg(error)
                }
            }
        }
    }

    func refreshTeam() {
        Task {
            teamLoading = true
            defer { teamLoading = false }
            do {
                teamThreads = try await api.teamThreads()
                teamError = nil
            } catch {
                teamError = errMsg(error)
            }
        }
    }

    func refreshTeamUsers() {
        Task {
            teamUsersLoading = true
            defer { teamUsersLoading = false }
            do {
                teamUsers = try await api.teamUsers()
                teamError = nil
            } catch {
                teamError = errMsg(error)
            }
        }
    }

    func startTeamChat(_ colleague: TeamColleague) {
        Task {
            do {
                let thread = try await api.startTeamThread(userIds: [colleague.id])
                teamError = nil
                openTeamThread(thread)
            } catch {
                teamError = errMsg(error)
            }
        }
    }

    func openTeamThread(_ row: TeamThread) {
        openThread = row
        teamDraft = ""
        Task {
            let me = user?.id ?? ""
            teamMessages = (try? await api.teamMessages(threadId: row.id, meId: me)) ?? []
        }
    }

    func closeTeamThread() {
        openThread = nil
        teamMessages = []
        teamDraft = ""
        refreshTeam()
    }

    func sendTeam() {
        guard let thread = openThread else { return }
        let text = teamDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        Task {
            teamSending = true
            defer { teamSending = false }
            do {
                let sent = try await api.sendTeamMessage(threadId: thread.id, content: text)
                teamDraft = ""
                teamMessages.append(sent)
                teamError = nil
            } catch {
                teamError = errMsg(error)
            }
        }
    }

    var canSendAnnouncements: Bool {
        let role = (user?.role ?? "").lowercased()
        return role == "owner" || role == "admin" || role == "manager"
    }

    var isAnnouncementManager: Bool {
        (user?.role ?? "").lowercased() == "manager"
    }

    func refreshAnnouncements() {
        Task {
            do {
                let rows = try await api.announcements()
                announcements = rows
                announcementError = nil
                let unread = rows.filter { !$0.read }
                for item in unread {
                    await api.markAnnouncementRead(id: item.id)
                }
                if !unread.isEmpty {
                    announcements = announcements.map { row in
                        var copy = row
                        copy.read = true
                        return copy
                    }
                }
            } catch {
                announcementError = errMsg(error)
            }
            if canSendAnnouncements {
                if let targets = try? await api.announcementTargets() {
                    announcementUsers = targets.users
                    announcementDepartments = targets.departments
                }
            }
        }
    }

    func sendAnnouncement(title: String, body: String, isImportant: Bool, targetType: String, targetId: String?) {
        Task {
            announcementSending = true
            defer { announcementSending = false }
            do {
                _ = try await api.sendAnnouncement(
                    title: title,
                    body: body,
                    isImportant: isImportant,
                    targetType: targetType,
                    targetId: targetId
                )
                announcementError = nil
                refreshAnnouncements()
            } catch {
                announcementError = errMsg(error)
            }
        }
    }

    func deleteAnnouncement(_ id: String) {
        Task {
            do {
                try await api.deleteAnnouncement(id: id)
                announcements.removeAll { $0.id == id }
                announcementError = nil
            } catch {
                announcementError = errMsg(error)
            }
        }
    }

    func refreshDashboard() {
        Task {
            dashLoading = true
            defer { dashLoading = false }
            do {
                dashStats = try await api.dashboardStats()
                let fmt = DateFormatter()
                fmt.dateFormat = "HH:mm"
                fmt.timeZone = lang == "fa" ? TimeZone(identifier: "Asia/Tehran") : (lang == "tr" ? TimeZone(identifier: "Europe/Istanbul") : TimeZone(identifier: "Asia/Dubai"))
                dashUpdatedAt = fmt.string(from: Date())
                if dashStats.unreadConversations > 0 { unreadTotal = dashStats.unreadConversations }
                dashError = nil
            } catch {
                dashError = errMsg(error)
            }
        }
    }

    func openDashPage(_ page: String) {
        dashInfoKey = nil
        switch page {
        case "conversations": selectTab(.inbox)
        case "customers": selectTab(.customers)
        case "tickets": openMore(.tickets)
        case "tasks": openMore(.tasks)
        case "announcements": selectTab(.announcements)
        case "internal-chat": openMore(.team)
        case "profile": openMore(.profile)
        case "staff-activity":
            dashInfoKey = "staff-activity"
            refreshStaffActivity()
        case "users":
            dashInfoKey = "users"
            refreshOrgUsers()
        default:
            dashInfoKey = page
            refreshDashModule()
        }
    }

    func refreshDashModule() {
        guard let page = dashInfoKey, page != "staff-activity", page != "users" else { return }
        Task {
            dashModuleLoading = true
            defer { dashModuleLoading = false }
            dashModuleItems = await api.dashModule(page: page)
            dashModuleError = nil
        }
    }

    func refreshStaffActivity() {
        Task {
            staffActivityLoading = true
            defer { staffActivityLoading = false }
            do {
                staffOnline = try await api.staffOnline()
                let result = try await api.staffLogins()
                staffLogins = result.rows
                staffLoginsTotal = result.total
                staffActivityError = nil
            } catch {
                staffActivityError = errMsg(error)
            }
        }
    }

    func refreshOrgUsers() {
        Task {
            orgUsersLoading = true
            defer { orgUsersLoading = false }
            do {
                orgUsers = try await api.orgUsers()
                orgUsersError = nil
            } catch {
                orgUsersError = errMsg(error)
            }
        }
    }

    func messageOrgUser(_ row: OrgUser) {
        guard row.id != user?.id else { return }
        startTeamChat(TeamColleague(id: row.id, name: row.name, email: row.email, avatar: row.avatar, status: row.status))
    }

    func closeDashInfo() { dashInfoKey = nil }

    func quickNewConv() {
        pendingNewConv = true
        selectTab(.inbox)
    }

    func quickNewCustomer() {
        pendingAddCustomer = true
        selectTab(.customers)
    }

    private func errMsg(_ error: Error) -> String {
        if let api = error as? ApiError {
            if api.isNetwork { return L10n.t(lang, "connect_fail") }
            if Self.isSystemNetwork(api.message) { return L10n.t(lang, "connect_fail") }
            return api.message
        }
        if error is URLError { return L10n.t(lang, "connect_fail") }
        if Self.isSystemNetwork(error.localizedDescription) { return L10n.t(lang, "connect_fail") }
        return L10n.t(lang, "connect_fail")
    }

    private static func isSystemNetwork(_ raw: String) -> Bool {
        let t = raw.lowercased()
        return t.contains("unable to resolve host")
            || t.contains("no address associated")
            || t.contains("failed to connect")
            || t.contains("timed out")
            || t.contains("timeout")
            || t.contains("could not connect")
            || t.contains("network connection was lost")
            || t.contains("not connected to the internet")
            || t.contains("a server with the specified hostname")
    }

    private func debounce(_ work: @escaping () -> Void) {
        searchTask?.cancel()
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 350_000_000)
            if !Task.isCancelled { work() }
        }
    }

    private func startPolling() {
        Task {
            while !Task.isCancelled {
                let interval: UInt64 = (openChat != nil || openThread != nil) ? 3_000_000_000 : 8_000_000_000
                try? await Task.sleep(nanoseconds: interval)
                guard gate == .app else { continue }
                refreshInbox(silent: true)
                if let chat = openChat {
                    if let latest = try? await api.messages(conversationId: chat.id) {
                        messages = latest
                    }
                }
                if let thread = openThread {
                    let me = user?.id ?? ""
                    if let latest = try? await api.teamMessages(threadId: thread.id, meId: me) {
                        teamMessages = latest
                    }
                }
            }
        }
    }
}
