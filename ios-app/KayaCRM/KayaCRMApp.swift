//
//  KayaCRMApp.swift
//  KayaCRM
//
//  اپلیکیشن پورتال CRM کایا
//

import SwiftUI

@main
struct KayaCRMApp: App {
    @StateObject private var authStorage = AuthStorage.shared
    @StateObject private var loginViewModel = LoginViewModel()
    
    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authStorage)
                .environmentObject(loginViewModel)
                .environment(\.layoutDirection, .rightToLeft)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var authStorage: AuthStorage
    @EnvironmentObject var loginViewModel: LoginViewModel
    
    var body: some View {
        Group {
            if authStorage.token != nil {
                MainView()
            } else if loginViewModel.needTotp {
                TotpView(viewModel: loginViewModel)
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut, value: authStorage.token != nil)
    }
}
