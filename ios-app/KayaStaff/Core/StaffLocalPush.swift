/**
 * Kaya CRM — local (in-process) staff banners; APNs is still phase 2
 * @file    ios-app/KayaStaff/Core/StaffLocalPush.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
import Foundation
import UserNotifications

final class StaffLocalPush: NSObject, UNUserNotificationCenterDelegate {
    static let shared = StaffLocalPush()

    /// Opens the matching conversation or internal thread when the banner is tapped.
    var onTap: (@MainActor (String?, String?) -> Void)?

    override private init() {
        super.init()
    }

    func attach() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        center.requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
    }

    func show(title: String, body: String, conversationId: String?, threadId: String?) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        var userInfo: [String: String] = [:]
        if let conversationId { userInfo["conversationId"] = conversationId }
        if let threadId { userInfo["threadId"] = threadId }
        content.userInfo = userInfo
        let id = [conversationId, threadId, title, body, String(Date().timeIntervalSince1970)]
            .compactMap { $0 }
            .joined(separator: "|")
        let req = UNNotificationRequest(identifier: String(id.prefix(180)), content: content, trigger: nil)
        UNUserNotificationCenter.current().add(req)
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .list]
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let info = response.notification.request.content.userInfo
        let conversationId = info["conversationId"] as? String
        let threadId = info["threadId"] as? String
        await MainActor.run {
            onTap?(conversationId, threadId)
        }
    }
}
