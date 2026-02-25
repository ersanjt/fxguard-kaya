//
//  LoginView.swift
//  KayaCRM
//
//  صفحه ورود
//

import SwiftUI

struct LoginView: View {
    @EnvironmentObject var viewModel: LoginViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var showServerConfig = false
    @State private var serverUrl = ""
    
    var body: some View {
        ZStack(alignment: .topTrailing) {
            ScrollView {
                VStack(spacing: 24) {
                    Spacer().frame(height: 48)
                    
                    Image(systemName: "building.2.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.blue)
                        .frame(width: 80, height: 80)
                        .background(Color.blue.opacity(0.2))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                    
                    Text("پورتال کارکنان کایا")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                    
                    Text("ورود به پورتال از سراسر دنیا")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    Spacer().frame(height: 32)
                    
                    TextField("ایمیل", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                    
                    SecureField("رمز عبور", text: $password)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.password)
                    
                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(.footnote)
                            .foregroundColor(.red)
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                    }
                    
                    Button {
                        viewModel.login(email: email, password: password)
                    } label: {
                        if viewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                        } else {
                            Text("ورود")
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(viewModel.isLoading || email.isEmpty || password.isEmpty)
                    
                    Spacer()
                }
                .padding(24)
            }
            
            Button {
                serverUrl = AuthStorage.shared.baseUrl ?? ApiConfig.defaultBaseURL
                showServerConfig = true
            } label: {
                Image(systemName: "gearshape.fill")
                    .font(.title2)
                    .foregroundColor(.primary)
            }
            .padding()
        }
        .alert("آدرس سرور", isPresented: $showServerConfig) {
            TextField("مثال: https://kaya.fxguard.io", text: $serverUrl)
            Button("ذخیره") {
                AuthStorage.shared.setBaseUrl(serverUrl.trimmingCharacters(in: .whitespaces))
                showServerConfig = false
            }
            Button("انصراف", role: .cancel) {
                showServerConfig = false
            }
        } message: {
            Text("آدرس پایه API سرور را وارد کنید. برای اعمال تغییرات، اپ را ببندید و دوباره باز کنید.")
        }
    }
}
