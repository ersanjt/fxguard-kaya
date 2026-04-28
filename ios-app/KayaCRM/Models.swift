//
//  Models.swift
//  KayaCRM
//
//  مدل‌های API
//

import Foundation

// MARK: - Auth
struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct TotpRequest: Encodable {
    let tempToken: String
    let code: String
}

struct LoginResponse: Decodable {
    let token: String?
    let user: UserResponse?
    let needTotp: Bool?
    let tempToken: String?
    let error: String?
}

struct UserResponse: Codable {
    let id: String
    let name: String?
    let email: String
    let role: String
    let status: String?
    let departmentId: String?
    let branchId: String?
    let permissions: [String: Bool]?
}

// MARK: - Dashboard
struct DashboardResponse: Decodable {
    let totalConversations: Int?
    let openConversations: Int?
    let unreadConversations: Int?
    let todayMessages: Int?
    let totalCustomers: Int?
    let ticketsOpen: Int?
    let tasksPending: Int?
    let announcementsCount: Int?
    let unreadAnnouncements: Int?
    let staffOnline: Int?
    let loginsToday: Int?
    
    var openConversationsVal: Int { openConversations ?? 0 }
    var unreadConversationsVal: Int { unreadConversations ?? 0 }
    var totalCustomersVal: Int { totalCustomers ?? 0 }
    var todayMessagesVal: Int { todayMessages ?? 0 }
    var ticketsOpenVal: Int { ticketsOpen ?? 0 }
    var tasksPendingVal: Int { tasksPending ?? 0 }
    var unreadAnnouncementsVal: Int { unreadAnnouncements ?? 0 }
    var staffOnlineVal: Int { staffOnline ?? 0 }
}

// MARK: - Conversations
struct ConversationsResponse: Decodable {
    let data: [Conversation]?
    let total: Int?
}

struct Conversation: Decodable {
    let id: String
    let status: String
    let priority: String?
    let unreadCount: Int?
    let lastMessageAt: String?
    let lastMessagePreview: String?
    let customer: CustomerBrief?
    let assignee: UserBrief?
    let department: DepartmentBrief?
    let metadata: ConversationMetadata?
    
    var unreadCountVal: Int { unreadCount ?? 0 }
    var isGroup: Bool { metadata?.isGroup == true }
    var groupName: String? { metadata?.groupName }
    var displayName: String {
        if isGroup, let name = groupName, !name.isEmpty { return name }
        if let name = customer?.name, !name.isEmpty { return name }
        if let phone = customer?.phone, !phone.isEmpty { return phone }
        return "مشتری"
    }
}

struct ConversationMetadata: Decodable {
    let isGroup: Bool?
    let groupName: String?
}

struct CustomerBrief: Decodable {
    let id: String
    let name: String?
    let phone: String?
    let profilePic: String?
}

struct UserBrief: Decodable {
    let id: String
    let name: String?
    let email: String?
    let username: String?
    let avatar: String?
}

struct DepartmentBrief: Decodable {
    let id: String
    let name: String?
    let color: String?
}

// MARK: - Messages
struct MessagesResponse: Decodable {
    let data: [MessageItem]?
    let messages: [MessageItem]?
    
    var items: [MessageItem] { data ?? messages ?? [] }
}

struct MessageItem: Decodable {
    let id: String
    let body: String?
    let content: String?
    let direction: String
    let timestamp: String?
    let userId: String?
    let user: UserBrief?
    let mediaUrl: String?
    let mediaType: String?
    
    var displayContent: String { body ?? content ?? "" }
}

struct SendMessageRequest: Encodable {
    let content: String
    let type: String?
    let media: [String: String]?
    
    init(content: String, type: String? = "text", media: [String: String]? = nil) {
        self.content = content
        self.type = type
        self.media = media
    }
}

// MARK: - Customers
struct CustomersResponse: Decodable {
    let data: [CustomerItem]?
    let total: Int?
}

struct CustomerItem: Decodable {
    let id: String
    let name: String?
    let phone: String?
    let email: String?
    let status: String?
    let lastContactAt: String?
}

struct CustomerDetail: Decodable {
    let id: String
    let name: String?
    let phone: String?
    let email: String?
    let status: String?
}

// MARK: - Tickets
struct TicketsResponse: Decodable {
    let data: [TicketItem]?
    let tickets: [TicketItem]?
    let total: Int?
    
    var items: [TicketItem] { data ?? tickets ?? [] }
}

struct TicketItem: Decodable {
    let id: String
    let title: String?
    let subject: String?
    let status: String
    let priority: String?
    let createdAt: String?
    
    var displayTitle: String { title ?? subject ?? "تیکت" }
}

// MARK: - Tasks
struct TasksResponse: Decodable {
    let data: [TaskItem]?
    let tasks: [TaskItem]?
    let total: Int?
    
    var items: [TaskItem] { data ?? tasks ?? [] }
}

struct TaskItem: Decodable {
    let id: String
    let title: String?
    let description: String?
    let status: String
    let priority: String?
    let dueAt: String?
    let dueDate: String?
}

// MARK: - Internal Chat
struct InternalThreadsResponse: Decodable {
    let data: [InternalThreadBrief]?
}

struct InternalThreadBrief: Decodable {
    let id: String
    let lastMessageAt: String?
    let lastMessage: InternalLastMessage?
    let participants: [UserBrief]?
}

struct InternalLastMessage: Decodable {
    let content: String?
    let fromUser: UserBrief?
}

struct InternalMessagesResponse: Decodable {
    let data: [InternalMessageItem]?
}

struct InternalMessageItem: Decodable {
    let id: String
    let content: String
    let fromUserId: String
    let fromUser: UserBrief?
    let createdAt: String?
}

struct SendInternalMessageRequest: Encodable {
    let content: String
}

struct CreateThreadRequest: Encodable {
    let userIds: [String]
}

struct InternalThread: Decodable {
    let id: String
    let participants: [UserBrief]?
}

struct InternalUsersResponse: Decodable {
    let data: [UserBrief]?
}

// MARK: - Gateway
struct WhatsAppStatus: Decodable {
    let whatsapp: Bool?
    let connected: Bool?
    let status: String?
    let phone: String?
    
    var isConnected: Bool {
        connected == true || whatsapp == true || status == "connected"
    }
}

// MARK: - Error
struct ApiErrorBody: Decodable {
    let error: String?
}

// MARK: - Panel Settings (public)
struct PublicBrandingResponse: Decodable {
    let iosAppUrl: String?
    let androidAppUrl: String?
}
