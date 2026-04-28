//
//  TotpView.swift
//  KayaCRM
//
//  صفحه تأیید TOTP
//

import SwiftUI

struct TotpView: View {
    @ObservedObject var viewModel: LoginViewModel
    @State private var code = ""
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: "lock.shield.fill")
                .font(.system(size: 50))
                .foregroundColor(.blue)
            
            Text("احراز هویت دو مرحله‌ای")
                .font(.title2)
                .fontWeight(.bold)
            
            Text("کد ۶ رقمی اپلیکیشن احراز هویت را وارد کنید")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            TextField("کد ۶ رقمی", text: $code)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.footnote)
                    .foregroundColor(.red)
            }
            
            Button {
                viewModel.verifyTotp(code: code)
            } label: {
                if viewModel.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                } else {
                    Text("تأیید")
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.isLoading || code.count != 6)
            
            Spacer()
        }
        .padding(24)
    }
}
