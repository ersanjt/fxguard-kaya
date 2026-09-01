/**
 * Kaya CRM — Keychain JWT + UserDefaults
 * @file    ios-app/KayaStaff/Core/SessionStore.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
import Foundation
import Security

final class SessionStore: ObservableObject {
    static let defaultURL = "https://kaya.fxguard.io"
    private let tokenKey = "kaya.staff.jwt"

    @Published var language: String {
        didSet { UserDefaults.standard.set(language, forKey: "kaya.lang") }
    }

    @Published var baseUrl: String {
        didSet { UserDefaults.standard.set(baseUrl, forKey: "kaya.base") }
    }

    var token: String? {
        get { Keychain.get(tokenKey) }
        set {
            if let newValue, !newValue.isEmpty {
                Keychain.set(tokenKey, newValue)
            } else {
                Keychain.delete(tokenKey)
            }
        }
    }

    var user: StaffUser? {
        get {
            guard let data = UserDefaults.standard.data(forKey: "kaya.user") else { return nil }
            return try? JSONDecoder().decode(StaffUser.self, from: data)
        }
        set {
            if let newValue, let data = try? JSONEncoder().encode(newValue) {
                UserDefaults.standard.set(data, forKey: "kaya.user")
            } else {
                UserDefaults.standard.removeObject(forKey: "kaya.user")
            }
        }
    }

    var isLoggedIn: Bool { !(token ?? "").isEmpty }

    init() {
        language = UserDefaults.standard.string(forKey: "kaya.lang") ?? "fa"
        let stored = UserDefaults.standard.string(forKey: "kaya.base") ?? SessionStore.defaultURL
        baseUrl = SessionStore.normalizeBaseUrl(stored) ?? SessionStore.defaultURL
    }

    /// HTTPS only, except loopback HTTP for local debug.
    static func normalizeBaseUrl(_ raw: String) -> String? {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        while s.hasSuffix("/") { s.removeLast() }
        if s.isEmpty { return nil }
        let lower = s.lowercased()
        if lower.hasPrefix("javascript:") || lower.hasPrefix("data:") || lower.hasPrefix("file:") {
            return nil
        }
        if !s.contains("://") {
            s = "https://" + s
        }
        guard let url = URL(string: s),
              let scheme = url.scheme?.lowercased(),
              let host = url.host?.lowercased(),
              !host.isEmpty
        else { return nil }
        let loopback = host == "localhost" || host == "127.0.0.1" || host == "::1" || host == "10.0.2.2"
        if scheme == "http" { return loopback ? s : nil }
        if scheme == "https" { return s }
        return nil
    }

    func saveLogin(token: String, user: StaffUser) {
        self.token = token
        self.user = user
    }

    func clearSession() {
        token = nil
        user = nil
    }
}

enum Keychain {
    static func set(_ key: String, _ value: String) {
        let data = Data(value.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
        var add = query
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(add as CFDictionary, nil)
    }

    static func get(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var out: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &out)
        guard status == errSecSuccess, let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete(_ key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
