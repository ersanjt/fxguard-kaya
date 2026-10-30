/**
 * Kaya CRM — Certificate pinning برای هاست‌های تولید FXGuard
 * @file    ios-app/KayaStaff/Core/CertificatePinning.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 *
 * فقط `fxguard.io` و زیردامنه‌هایش پین می‌شوند؛ سرورهای self-hosted با اعتماد پیش‌فرض iOS کار می‌کنند.
 * پین‌ها SPKI SHA-256 ریشه‌های Let's Encrypt (ISRG Root X1 + X2) هستند — چرخش برگ/میانی اپ را نمی‌شکند.
 * همان مقادیر در android-app/.../data/api/PinnedHttp.kt؛ هر دو را هم‌زمان به‌روز کنید.
 */
import CryptoKit
import Foundation
import Security

enum CertificatePinning {
    private static let pinnedApexHost = "fxguard.io"

    /// SPKI SHA-256 (base64) — ISRG Root X1 (RSA 4096) و ISRG Root X2 (EC P-384)
    private static let pins: Set<String> = [
        "C5+lpZ7tcVwmwQIMcRtPbsQtWLABXhQzejna0wHFr8M=",
        "diGVwiVYbubAI3RW4hB9xU8e/CH2GnkuvVFZE8zmgzI=",
    ]

    /// هدر ASN.1 SubjectPublicKeyInfo برای انواع کلید — SecKeyCopyExternalRepresentation فقط کلید خام می‌دهد
    private static let rsa2048Header: [UInt8] = [
        0x30, 0x82, 0x01, 0x22, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01,
        0x01, 0x05, 0x00, 0x03, 0x82, 0x01, 0x0f, 0x00,
    ]
    private static let rsa4096Header: [UInt8] = [
        0x30, 0x82, 0x02, 0x22, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01,
        0x01, 0x05, 0x00, 0x03, 0x82, 0x02, 0x0f, 0x00,
    ]
    private static let ecP256Header: [UInt8] = [
        0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a,
        0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00,
    ]
    private static let ecP384Header: [UInt8] = [
        0x30, 0x76, 0x30, 0x10, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x05, 0x2b,
        0x81, 0x04, 0x00, 0x22, 0x03, 0x62, 0x00,
    ]

    static func isPinnedHost(_ host: String?) -> Bool {
        guard let h = host?.lowercased(), !h.isEmpty else { return false }
        return h == pinnedApexHost || h.hasSuffix("." + pinnedApexHost)
    }

    /// اعتبارسنجی چالش TLS: اول اعتماد سیستم، بعد برای هاست‌های پین‌شده حداقل یک SPKI باید در لیست باشد.
    static func disposition(for challenge: URLAuthenticationChallenge) -> (URLSession.AuthChallengeDisposition, URLCredential?) {
        let space = challenge.protectionSpace
        guard space.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let trust = space.serverTrust
        else { return (.performDefaultHandling, nil) }

        guard isPinnedHost(space.host) else { return (.performDefaultHandling, nil) }

        var error: CFError?
        guard SecTrustEvaluateWithError(trust, &error) else { return (.cancelAuthenticationChallenge, nil) }

        for cert in certificateChain(trust) {
            if let pin = spkiPin(of: cert), pins.contains(pin) {
                return (.useCredential, URLCredential(trust: trust))
            }
        }
        return (.cancelAuthenticationChallenge, nil)
    }

    private static func certificateChain(_ trust: SecTrust) -> [SecCertificate] {
        (SecTrustCopyCertificateChain(trust) as? [SecCertificate]) ?? []
    }

    private static func spkiPin(of cert: SecCertificate) -> String? {
        guard let key = SecCertificateCopyKey(cert),
              let raw = SecKeyCopyExternalRepresentation(key, nil) as Data?,
              let attrs = SecKeyCopyAttributes(key) as? [CFString: Any],
              let type = attrs[kSecAttrKeyType] as? String,
              let bits = attrs[kSecAttrKeySizeInBits] as? Int
        else { return nil }

        let header: [UInt8]
        if type == (kSecAttrKeyTypeRSA as String) {
            switch bits {
            case 2048: header = rsa2048Header
            case 4096: header = rsa4096Header
            default: return nil
            }
        } else if type == (kSecAttrKeyTypeECSECPrimeRandom as String) {
            switch bits {
            case 256: header = ecP256Header
            case 384: header = ecP384Header
            default: return nil
            }
        } else {
            return nil
        }

        var spki = Data(header)
        spki.append(raw)
        return Data(SHA256.hash(data: spki)).base64EncodedString()
    }
}

/// Delegate مشترک برای URLSessionهای HTTP اپ (API و بارگذاری تصویر)
final class PinnedSessionDelegate: NSObject, URLSessionDelegate {
    static let shared = PinnedSessionDelegate()

    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        let (disposition, credential) = CertificatePinning.disposition(for: challenge)
        completionHandler(disposition, credential)
    }
}

extension URLSession {
    /// نشست پین‌شده برای دانلود تصاویر/رسانه (به‌جای URLSession.shared)
    static let pinned: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        return URLSession(configuration: config, delegate: PinnedSessionDelegate.shared, delegateQueue: nil)
    }()
}
