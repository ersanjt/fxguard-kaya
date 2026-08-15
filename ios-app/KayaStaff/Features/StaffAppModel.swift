/**
 * Kaya CRM — shared app state (mirrors Android StaffViewModel)
 * @file    ios-app/KayaStaff/Features/StaffAppModel.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
import Foundation

enum Gate { case splash, login, totp, app }
enum StaffTab { case inbox, customers, tickets, profile }

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
    @Published var totpHint: String?
    private var tempToken: String?

    @Published var tab: StaffTab = .inbox
    @Published var inboxSearch = ""
    @Published var inbox: [ConversationRow] = []
    @Published var inboxLoading = false
    @Published var unreadTotal = 0
    @Published var openChat: ConversationRow?
    @Published var messages: [ChatMessage] = []
    @Published var draft = ""
    @Published var sending = false
    @Published var customerSearch = ""
    @Published var customers: [CustomerRow] = []
    @Published var customersLoading = false
    @Published var tickets: [TicketRow] = []
    @Published var ticketsLoading = false

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

    func persistServer() {
        let trimmed = serverUrl.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        session.baseUrl = trimmed
        serverUrl = trimmed
    }

    func logoUrl() -> URL? {
        api.resolveUrl(branding?.loginLogoUrl ?? branding?.logoUrl)
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
            authError = L10n.t(lang, "required")
            return
        }
        persistServer()
        Task {
            authLoading = true
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
                authError = error.localizedDescription
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
                authError = error.localizedDescription
            }
        }
    }

    func forgot(_ email: String) {
        if email.isEmpty {
            authError = L10n.t(lang, "required")
            return
        }
        persistServer()
        Task {
            authLoading = true
            authError = nil
            defer { authLoading = false }
            do {
                try await api.forgotPassword(email: email)
                authError = L10n.t(lang, "forgot_ok")
            } catch {
                authError = error.localizedDescription
            }
        }
    }

    func backToLogin() {
        tempToken = nil
        authError = nil
        gate = .login
    }

    private func enterApp() {
        gate = .app
        Task { await api.setOnline() }
        refreshInbox()
        refreshCustomers()
        refreshTickets()
    }

    func logout() {
        Task {
            await api.logout()
            inbox = []
            customers = []
            tickets = []
            openChat = nil
            user = nil
            gate = .login
        }
    }

    func onInboxSearch(_ q: String) {
        inboxSearch = q
        debounce { self.refreshInbox() }
    }

    func refreshInbox() {
        Task {
            inboxLoading = true
            defer { inboxLoading = false }
            if let res = try? await api.conversations(search: inboxSearch) {
                inbox = res.rows
                unreadTotal = res.unread
            }
        }
    }

    func openConversation(_ row: ConversationRow) {
        openChat = row
        Task {
            messages = (try? await api.messages(conversationId: row.id)) ?? []
            await api.markRead(conversationId: row.id)
        }
    }

    func closeChat() {
        openChat = nil
        messages = []
        draft = ""
        refreshInbox()
    }

    func send() {
        guard let chat = openChat else { return }
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        Task {
            sending = true
            defer { sending = false }
            if let sent = try? await api.sendMessage(conversationId: chat.id, content: text) {
                draft = ""
                messages.append(sent)
            }
        }
    }

    func onCustomerSearch(_ q: String) {
        customerSearch = q
        debounce { self.refreshCustomers() }
    }

    func refreshCustomers() {
        Task {
            customersLoading = true
            defer { customersLoading = false }
            customers = (try? await api.customers(search: customerSearch)) ?? customers
        }
    }

    func refreshTickets() {
        Task {
            ticketsLoading = true
            defer { ticketsLoading = false }
            tickets = (try? await api.tickets()) ?? tickets
        }
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
                try? await Task.sleep(nanoseconds: 8_000_000_000)
                if gate == .app {
                    refreshInbox()
                    if let chat = openChat {
                        if let latest = try? await api.messages(conversationId: chat.id) {
                            messages = latest
                        }
                    }
                }
            }
        }
    }
}
