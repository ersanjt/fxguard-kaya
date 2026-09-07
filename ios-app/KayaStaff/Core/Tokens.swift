/**
 * Kaya CRM — design tokens (login.css parity)
 * @file    ios-app/KayaStaff/Core/Tokens.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     mobile-shared/design-tokens.json
 */
import SwiftUI
import UIKit

enum KayaColor {
    static let bg = Color(red: 8 / 255, green: 13 / 255, blue: 26 / 255)
    static let bg2 = Color(red: 13 / 255, green: 21 / 255, blue: 37 / 255)
    static let card = Color(red: 16 / 255, green: 24 / 255, blue: 44 / 255).opacity(0.85)
    static let border = Color.white.opacity(0.08)
    static var accent = Color(red: 16 / 255, green: 185 / 255, blue: 129 / 255)
    static var accentHover = Color(red: 5 / 255, green: 150 / 255, blue: 105 / 255)
    static var accentSoft = Color(red: 16 / 255, green: 185 / 255, blue: 129 / 255).opacity(0.15)
    static let danger = Color(red: 239 / 255, green: 68 / 255, blue: 68 / 255)
    static let chrome = Color(red: 22 / 255, green: 31 / 255, blue: 56 / 255).opacity(0.85)
    static let chromeTab = Color(red: 15 / 255, green: 23 / 255, blue: 42 / 255).opacity(0.92)
    static let text = Color(red: 240 / 255, green: 244 / 255, blue: 252 / 255)
    static let text2 = Color(red: 139 / 255, green: 157 / 255, blue: 195 / 255)
    static let text3 = Color(red: 139 / 255, green: 157 / 255, blue: 195 / 255)
    static let inputBg = Color.white.opacity(0.04)
    static let bubbleIn = Color(red: 22 / 255, green: 32 / 255, blue: 51 / 255)
    static let bubbleOut = Color(red: 15 / 255, green: 61 / 255, blue: 50 / 255)

    static func applyBrandColor(_ hex: String?) {
        guard let parsed = parseHex(hex) else {
            accent = Color(red: 16 / 255, green: 185 / 255, blue: 129 / 255)
            accentHover = Color(red: 5 / 255, green: 150 / 255, blue: 105 / 255)
            accentSoft = Color(red: 16 / 255, green: 185 / 255, blue: 129 / 255).opacity(0.15)
            return
        }
        accent = parsed
        accentHover = parsed.opacity(0.85)
        accentSoft = parsed.opacity(0.15)
    }

    private static func parseHex(_ hex: String?) -> Color? {
        let h = (hex ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard h.count == 7, h.hasPrefix("#") else { return nil }
        let hex = String(h.dropFirst())
        var value: UInt64 = 0
        guard Scanner(string: hex).scanHexInt64(&value) else { return nil }
        let r = Double((value >> 16) & 0xFF) / 255
        let g = Double((value >> 8) & 0xFF) / 255
        let b = Double(value & 0xFF) / 255
        return Color(red: r, green: g, blue: b)
    }
}

enum PhoneDisplay {
    static func isolated(_ raw: String?) -> String {
        let t = (raw ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty { return "" }
        return "\u{2066}\(t)\u{2069}"
    }

    static func looksLikePhone(_ raw: String?) -> Bool {
        let t = (raw ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty || t.contains("@") { return false }
        let digits = t.filter(\.isNumber).count
        if digits < 8 { return false }
        return t.allSatisfy { $0.isNumber || $0 == "+" || $0 == "-" || $0 == " " || $0 == "(" || $0 == ")" || $0 == "." }
    }

    static func label(_ raw: String) -> String {
        looksLikePhone(raw) ? isolated(raw) : raw
    }

    static func customerName(_ name: String?, phone: String?, fallback: String) -> String {
        let n = (name ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if !n.isEmpty {
            if looksLikePhone(n) && (phone ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return fallback
            }
            return n
        }
        return fallback
    }

    static func phoneOrFallback(_ phone: String?, fallback: String) -> String {
        let p = (phone ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return p.isEmpty ? fallback : isolated(p)
    }
}

extension View {
    func ltrIfPhone(_ raw: String?) -> some View {
        Group {
            if PhoneDisplay.looksLikePhone(raw) {
                self.environment(\.layoutDirection, .leftToRight)
            } else {
                self
            }
        }
    }
}

/// Same source as web: GET /api/customers/:id/avatar with Bearer only for the API host.
struct CustomerPhotoView: View {
    let url: URL?
    let name: String
    var token: String?
    var apiHost: String?
    var size: CGFloat = 44
    var tile: Bool = true

    @State private var image: UIImage?

    var body: some View {
        ZStack {
            if tile {
                RoundedRectangle(cornerRadius: 10).fill(KayaColor.accent)
            } else {
                Circle().fill(KayaColor.accent.opacity(0.15))
            }
            Text(String(name.prefix(1)))
                .font(tile ? .title3.weight(.bold) : .body.weight(.semibold))
                .foregroundStyle(tile ? Color.white : KayaColor.accent)
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: tile ? 10 : size / 2))
        .task(id: url?.absoluteString ?? "") { await load() }
    }

    private func load() async {
        image = nil
        guard let url else { return }
        image = await StaffMediaLoader.image(url: url, token: token, apiHost: apiHost)
    }
}

struct AuthRemoteImage: View {
    let url: URL?
    var token: String?
    var apiHost: String?
    var maxWidth: CGFloat = 240
    var maxHeight: CGFloat = 160

    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                ProgressView()
            }
        }
        .frame(maxWidth: maxWidth, maxHeight: maxHeight)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .task(id: url?.absoluteString ?? "") {
            image = await StaffMediaLoader.image(url: url, token: token, apiHost: apiHost)
        }
    }
}

enum StaffMediaLoader {
    static func image(url: URL?, token: String?, apiHost: String?) async -> UIImage? {
        guard let url, let req = request(url: url, token: token, apiHost: apiHost) else { return nil }
        guard let (data, resp) = try? await URLSession.shared.data(for: req),
              let http = resp as? HTTPURLResponse,
              (200 ..< 300).contains(http.statusCode),
              let img = UIImage(data: data)
        else { return nil }
        return img
    }

    static func data(url: URL, token: String?, apiHost: String?) async -> Data? {
        guard let req = request(url: url, token: token, apiHost: apiHost) else { return nil }
        guard let (data, resp) = try? await URLSession.shared.data(for: req),
              let http = resp as? HTTPURLResponse,
              (200 ..< 300).contains(http.statusCode)
        else { return nil }
        return data
    }

    static func request(url: URL, token: String?, apiHost: String?) -> URLRequest? {
        let scheme = url.scheme?.lowercased() ?? ""
        let host = url.host?.lowercased() ?? ""
        if host.isEmpty { return nil }
        let loopback = host == "localhost" || host == "127.0.0.1" || host == "::1" || host == "10.0.2.2"
        if scheme == "http", !loopback { return nil }
        if scheme != "http", scheme != "https" { return nil }
        var req = URLRequest(url: url)
        let sameHost = !(apiHost ?? "").isEmpty && host == apiHost?.lowercased()
        if sameHost, let token, !token.isEmpty {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return req
    }
}
