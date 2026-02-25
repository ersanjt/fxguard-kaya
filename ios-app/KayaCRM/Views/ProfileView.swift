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
        }
        .environment(\.layoutDirection, .rightToLeft)
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
