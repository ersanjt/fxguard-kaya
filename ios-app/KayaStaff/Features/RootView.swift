/**
 * Kaya CRM — root navigation
 * @file    ios-app/KayaStaff/Features/RootView.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
import SwiftUI

struct RootView: View {
    @EnvironmentObject var model: StaffAppModel
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack {
            KayaColor.bg.ignoresSafeArea()
            switch model.gate {
            case .splash:
                ProgressView().tint(KayaColor.accent)
            case .login:
                LoginView()
            case .totp:
                TotpView()
            case .app:
                MainShellView()
            }
        }
        .environment(\.layoutDirection, L10n.isRtl(model.session.language) ? .rightToLeft : .leftToRight)
        .id(model.branding?.primaryColor ?? "accent-default")
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { model.resumeRealtime() }
        }
    }
}
