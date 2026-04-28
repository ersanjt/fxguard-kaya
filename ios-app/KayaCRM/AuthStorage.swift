//
//  AuthStorage.swift
//  KayaCRM
//
//  ذخیره توکن و تنظیمات
//

import Foundation

final class AuthStorage: ObservableObject {
    static let shared = AuthStorage()
    
    private let defaults = UserDefaults.standard
    private let tokenKey = "auth_token"
    private let userKey = "auth_user"
    private let baseUrlKey = "base_url"
    
    @Published private(set) var token: String?
    @Published private(set) var user: UserResponse?
    @Published var baseUrl: String?
    
    var isLoggedIn: Bool { token != nil }
    
    private init() {
        token = defaults.string(forKey: tokenKey)
        baseUrl = defaults.string(forKey: baseUrlKey)
        if let data = defaults.data(forKey: userKey) {
            user = try? JSONDecoder().decode(UserResponse.self, from: data)
        } else {
            user = nil
        }
    }
    
    func setToken(_ t: String) {
        token = t
        defaults.set(t, forKey: tokenKey)
    }
    
    func setUser(_ u: UserResponse) {
        user = u
        if let data = try? JSONEncoder().encode(u) {
            defaults.set(data, forKey: userKey)
        }
    }
    
    func setBaseUrl(_ url: String) {
        baseUrl = url
        defaults.set(url, forKey: baseUrlKey)
    }
    
    func clear() {
        token = nil
        user = nil
        defaults.removeObject(forKey: tokenKey)
        defaults.removeObject(forKey: userKey)
    }
}
