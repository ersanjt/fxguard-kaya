//
//  ApiConfig.swift
//  KayaCRM
//
//  آدرس پایه API سرور
//

import Foundation

enum ApiConfig {
    static let defaultBaseURL = "https://kaya.fxguard.io"
    
    static var apiBase: String {
        let saved = AuthStorage.shared.baseUrl?.trimmingCharacters(in: .whitespaces)
        let base = (saved?.isEmpty == false) ? saved! : defaultBaseURL
        let clean = base.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        return clean.hasSuffix("/api") ? "\(clean)/" : "\(clean)/api/"
    }
}
