//
//  ProfileView.swift
//  KayaCRM
//

import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var loginViewModel: LoginViewModel
    @EnvironmentObject var authStorage: AuthStorage
    @State private var showServerConfig = false
    @State private var serverUrl = ""
    @State private var iosAppUrl: String? = nil
    @State private var androidAppUrl: String? = nil
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    Text("پروفایل من")
                        .font(.title2)
                        .fontWeight(.bold)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    
                    if let user = authStorage.user {
                        VStack(alignment: .leading, spacing: 16) {
                            ProfileRow(label: "نام", value: user.name ?? user.email)
                            ProfileRow(label: "ایمیل", value: user.email)
                            ProfileRow(label: "نقش", value: user.role)
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                    
                    Button {
                        serverUrl = authStorage.baseUrl ?? ApiConfig.defaultBaseURL
                        showServerConfig = true
                    } label: {
                        HStack {
                            Image(systemName: "gearshape.fill")
                            VStack(alignment: .leading, spacing: 4) {
                                Text("آدرس سرور")
                                    .font(.subheadline)
                                Text(authStorage.baseUrl ?? ApiConfig.defaultBaseURL)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                            }
                            Spacer()
                            Text("تغییر")
                                .font(.subheadline)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                    .buttonStyle(.plain)

                    if resolveAppLink(iosAppUrl) != nil || resolveAppLink(androidAppUrl) != nil {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("دانلود اپ موبایل")
                                .font(.headline)
                            Text("نسخه‌های قابل نصب مستقیم:")
                                .font(.caption)
                                .foregroundColor(.secondary)

                            if let url = resolveAppLink(iosAppUrl) {
                                Link(destination: url) {
                                    HStack {
                                        Image(systemName: "iphone")
                                        Text("دانلود نسخه iOS")
                                        Spacer()
                                        Image(systemName: "arrow.up.right.square")
                                    }
                                    .padding()
                                    .frame(maxWidth: .infinity)
                                    .background(Color(.systemGray6))
                                    .cornerRadius(12)
                                }
                            }

                            if let url = resolveAppLink(androidAppUrl) {
                                Link(destination: url) {
                                    HStack {
                                        Image(systemName: "arrow.down.app")
                                        Text("دانلود نسخه Android")
                                        Spacer()
                                        Image(systemName: "arrow.up.right.square")
                                    }
                                    .padding()
                                    .frame(maxWidth: .infinity)
                                    .background(Color(.systemGray6))
                                    .cornerRadius(12)
                                }
                            }
                        }
                    }
                    
                    Spacer(minLength: 24)
                    
                    Button {
                        loginViewModel.logout()
                    } label: {
                        HStack {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                            Text("خروج")
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.red)
                }
                .padding(24)
            }
            .navigationTitle("پروفایل")
            .navigationBarTitleDisplayMode(.inline)
            .alert("آدرس سرور", isPresented: $showServerConfig) {
                TextField("مثال: https://kaya.fxguard.io", text: $serverUrl)
                Button("ذخیره") {
                    authStorage.setBaseUrl(serverUrl.trimmingCharacters(in: .whitespaces))
                    showServerConfig = false
                }
                Button("انصراف", role: .cancel) {
                    showServerConfig = false
                }
            } message: {
                Text("برای اعمال تغییرات، اپ را ببندید و دوباره باز کنید.")
            }
            .task {
                await loadMobileAppLinks()
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    /// لینک کامل یا مسیر `/uploads/...` نسبت به آدرس سرور کاربر
    private func resolveAppLink(_ raw: String?) -> URL? {
        guard let s = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty else { return nil }
        let lower = s.lowercased()
        if lower.hasPrefix("http://") || lower.hasPrefix("https://") || lower.hasPrefix("itms-services://") {
            return URL(string: s)
        }
        if s.hasPrefix("/") {
            var base = (authStorage.baseUrl ?? ApiConfig.defaultBaseURL).trimmingCharacters(in: .whitespacesAndNewlines)
            while base.hasSuffix("/") { base.removeLast() }
            return URL(string: base + s)
        }
        return URL(string: s)
    }

    private func loadMobileAppLinks() async {
        do {
            let branding = try await ApiService.shared.getPublicBranding()
            await MainActor.run {
                iosAppUrl = branding.iosAppUrl?.trimmingCharacters(in: .whitespacesAndNewlines)
                androidAppUrl = branding.androidAppUrl?.trimmingCharacters(in: .whitespacesAndNewlines)
            }
        } catch {
            // Public endpoint; ignore errors to keep profile usable.
        }
    }
}

private struct ProfileRow: View {
    let label: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            Text(value)
                .font(.body)
        }
    }
}
