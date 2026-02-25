//
//  ApiService.swift
//  KayaCRM
//
//  سرویس API
//

import Foundation

enum ApiError: Error {
    case invalidURL
    case noData
    case decodingError
    case serverError(String)
    case unauthorized
}

final class ApiService {
    static let shared = ApiService()
    
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    
    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 30
        session = URLSession(configuration: config)
        decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
    }
    
    private func request<T: Decodable>(
        path: String,
        method: String = "GET",
        body: Encodable? = nil
    ) async throws -> T {
        let base = ApiConfig.apiBase
        guard let url = URL(string: base + path) else { throw ApiError.invalidURL }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = AuthStorage.shared.token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = try encoder.encode(AnyEncodable(body))
        }
        
        let (data, response) = try await session.data(for: request)
        
        if let http = response as? HTTPURLResponse, http.statusCode == 401 {
            AuthStorage.shared.clear()
            throw ApiError.unauthorized
        }
        
        if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
            if let errBody = try? decoder.decode(ApiErrorBody.self, from: data) {
                throw ApiError.serverError(errBody.error ?? "خطای سرور")
            }
            throw ApiError.serverError("خطای سرور: \(http.statusCode)")
        }
        
        return try decoder.decode(T.self, from: data)
    }
    
    // MARK: - Auth
    func login(email: String, password: String) async throws -> LoginResponse {
        try await request(path: "auth/login", method: "POST", body: LoginRequest(email: email, password: password))
    }
    
    func verifyTotp(tempToken: String, code: String) async throws -> LoginResponse {
        try await request(path: "auth/totp/verify-login", method: "POST", body: TotpRequest(tempToken: tempToken, code: code))
    }
    
    func getMe() async throws -> UserResponse {
        try await request(path: "auth/me")
    }
    
    // MARK: - Dashboard
    func getDashboard() async throws -> DashboardResponse {
        try await request(path: "analytics/dashboard")
    }
    
    // MARK: - Conversations
    func getConversations(page: Int = 1, limit: Int = 50, status: String? = nil) async throws -> ConversationsResponse {
        var path = "conversations?page=\(page)&limit=\(limit)"
        if let s = status { path += "&status=\(s)" }
        return try await request(path: path)
    }
    
    func getMessages(conversationId: String, page: Int = 1, limit: Int = 50) async throws -> MessagesResponse {
        try await request(path: "conversations/\(conversationId)/messages?page=\(page)&limit=\(limit)")
    }
    
    func sendMessage(conversationId: String, content: String) async throws -> MessageItem {
        try await request(path: "conversations/\(conversationId)/send", method: "POST", body: SendMessageRequest(content: content))
    }
    
    // MARK: - Customers
    func getCustomers(page: Int = 1, limit: Int = 50, search: String? = nil) async throws -> CustomersResponse {
        var path = "customers?page=\(page)&limit=\(limit)"
        if let s = search, !s.isEmpty { path += "&search=\(s.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? s)" }
        return try await request(path: path)
    }
    
    // MARK: - Tickets
    func getTickets(page: Int = 1, limit: Int = 50) async throws -> TicketsResponse {
        try await request(path: "tickets?page=\(page)&limit=\(limit)")
    }
    
    // MARK: - Tasks
    func getTasks(page: Int = 1, limit: Int = 50, status: String? = nil) async throws -> TasksResponse {
        var path = "tasks?page=\(page)&limit=\(limit)"
        if let s = status { path += "&status=\(s)" }
        return try await request(path: path)
    }
    
    // MARK: - Internal Chat
    func getInternalThreads() async throws -> InternalThreadsResponse {
        try await request(path: "internal/threads")
    }
    
    func getInternalMessages(threadId: String) async throws -> InternalMessagesResponse {
        try await request(path: "internal/threads/\(threadId)/messages")
    }
    
    func sendInternalMessage(threadId: String, content: String) async throws -> InternalMessageItem {
        try await request(path: "internal/threads/\(threadId)/messages", method: "POST", body: SendInternalMessageRequest(content: content))
    }
    
    func createInternalThread(userIds: [String]) async throws -> InternalThread {
        try await request(path: "internal/threads", method: "POST", body: CreateThreadRequest(userIds: userIds))
    }
    
    func getInternalUsers() async throws -> InternalUsersResponse {
        try await request(path: "internal/users")
    }
    
    // MARK: - Gateway
    func getGatewayStatus() async throws -> WhatsAppStatus {
        try await request(path: "gateway/status")
    }
}

// Helper for encoding any Encodable
private struct AnyEncodable: Encodable {
    let value: Encodable
    init(_ value: Encodable) { self.value = value }
    func encode(to encoder: Encoder) throws { try value.encode(to: encoder) }
}
