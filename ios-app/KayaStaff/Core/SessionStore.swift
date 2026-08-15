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
        baseUrl = UserDefaults.standard.string(forKey: "kaya.base") ?? SessionStore.defaultURL
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
