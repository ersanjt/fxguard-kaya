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
    var lastMessageAt: String?
    var lastMessagePreview: String?
    var customerId: String? = nil
    var customerName: String
    var customerPhone: String?
    var isGroup: Bool = false
    var lastOutgoingIsAutoReply: Bool = false
    var assigneeName: String?
    var departmentName: String? = nil
}

enum InboxFilter { case all, unread, unanswered, unassigned, open, mine, archived, restricted, groups }

struct ChatMessage: Identifiable {
    var id: String
    var direction: String
    var content: String
    var type: String
    var timestamp: String? = nil
    var hasMedia: Bool
    var mediaUrl: String? = nil
    var mediaMime: String? = nil
    var mediaName: String? = nil
    var senderName: String?

    var isVoice: Bool {
        let mime = (mediaMime ?? "").lowercased()
        return type.lowercased() == "ptt" || type.lowercased() == "audio" || mime.hasPrefix("audio/")
    }

    var isImage: Bool {
        if isVoice { return false }
        let mime = (mediaMime ?? "").lowercased()
        return mime.hasPrefix("image/") || type.lowercased() == "image" || type.lowercased() == "sticker" || type.lowercased() == "gif"
    }
}

struct UploadedFile {
    var url: String
    var name: String
}

struct CallStartResult {
    var method: String?
    var callLink: String?
    var isGroup: Bool
    var introText: String?
}

struct CustomerRow: Identifiable {
    var id: String
    var name: String
    var phone: String?
    var email: String?
    var status: String
    var lastContactAt: String? = nil
    var firstContactAt: String? = nil
    var totalConversations: Int = 0
    var departmentName: String? = nil
    var assigneeName: String? = nil
    var notes: String? = nil
    var birthDate: String? = nil
    var nationalId: String? = nil
    var nationality: String? = nil
    var gender: String? = nil
    var occupation: String? = nil
    var companyName: String? = nil
    var address: String? = nil
    var city: String? = nil
    var country: String? = nil
    var postalCode: String? = nil
    var instagram: String? = nil
    var telegram: String? = nil
    var website: String? = nil
}

struct TimelineItem: Identifiable {
    var id: String
    var type: String
    var title: String
    var meta: String
    var conversationId: String? = nil
}

struct DashboardStats {
    var openConversations = 0
    var unreadConversations = 0
    var unansweredConversations = 0
    var unassignedConversations = 0
    var todayMessages = 0
    var ticketsOpen = 0
    var tasksPending = 0
    var totalCustomers = 0
    var staffOnline = 0
    var loginsToday = 0
    var announcementsCount = 0
    var unreadAnnouncements = 0
    var avgRating: Double? = nil
    var ratedConversationsCount = 0
}

struct TicketRow: Identifiable {
    var id: String
    var title: String
    var ticketNumber: String?
    var status: String
    var priority: String
}

struct TaskRow: Identifiable {
    var id: String
    var title: String
    var status: String
    var priority: String
    var assigneeName: String?
}

struct TeamThread: Identifiable {
    var id: String
    var displayName: String
    var lastPreview: String?
    var unreadCount: Int
}

struct TeamColleague: Identifiable {
    var id: String
    var name: String
    var email: String?
    var avatar: String?
    var status: String?
}

struct TeamMessage: Identifiable {
    var id: String
    var content: String
    var fromMe: Bool
    var senderName: String?
}

struct AnnouncementRow: Identifiable {
    var id: String
    var title: String
    var body: String
    var isImportant: Bool = false
    var targetType: String = "all"
    var targetName: String? = nil
    var fromName: String? = nil
    var createdAt: String? = nil
    var read: Bool = false
    var canDelete: Bool = false
}

struct AnnouncementTarget: Identifiable {
    var id: String
    var name: String
    var kind: String
}

struct StaffPresence: Identifiable {
    var id: String
    var name: String
    var email: String?
    var status: String
    var lastLoginAt: String?
    var branchName: String?
    var departmentName: String?
    var lastLoginIp: String?
    var lastLoginCountry: String?
}

struct StaffLoginRow: Identifiable {
    var id: String
    var userName: String
    var email: String?
    var branchName: String?
    var createdAt: String?
    var ip: String?
    var country: String?
    var summary: String?
}

struct OrgUser: Identifiable {
    var id: String
    var name: String
    var email: String?
    var username: String?
    var role: String
    var position: String?
    var status: String
    var isActive: Bool
    var lastLoginAt: String?
    var branchName: String?
    var departmentName: String?
    var avatar: String?
}

struct DashItem: Identifiable {
    var id: String
    var title: String
    var subtitle: String = ""
    var meta: String = ""
}

struct ApiError: LocalizedError {
    var message: String
    var status: Int
    var isNetwork: Bool = false
    var errorDescription: String? { message }
}
