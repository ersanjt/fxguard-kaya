/**
 * Kaya CRM — API models
 * @file    ios-app/KayaStaff/Data/Models.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
import Foundation

struct Branding: Decodable {
    var siteName: String?
    var loginTitle: String?
    var logoUrl: String?
    var loginLogoUrl: String?
    var primaryColor: String?

    var displayTitle: String {
        let title = (loginTitle ?? "").trimmingCharacters(in: .whitespaces)
        if !title.isEmpty { return title }
        let site = (siteName ?? "").trimmingCharacters(in: .whitespaces)
        return site.isEmpty ? "KAYA" : site
    }
}

struct StaffUser: Codable, Identifiable {
    var id: String
    var name: String
    var email: String
    var username: String
    var role: String
    var avatar: String?
}

struct ConversationRow: Identifiable {
    var id: String
    var status: String
    var unreadCount: Int
    var lastMessagePreview: String?
    var customerName: String
    var customerPhone: String?
}

struct ChatMessage: Identifiable {
    var id: String
    var direction: String
    var content: String
    var type: String
    var hasMedia: Bool
    var senderName: String?
}

struct CustomerRow: Identifiable {
    var id: String
    var name: String
    var phone: String?
    var email: String?
    var status: String
}

struct TicketRow: Identifiable {
    var id: String
    var title: String
    var ticketNumber: String?
    var status: String
    var priority: String
}

struct ApiError: LocalizedError {
    var message: String
    var status: Int
    var errorDescription: String? { message }
}
