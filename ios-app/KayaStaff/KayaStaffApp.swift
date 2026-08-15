/**
 * Kaya CRM — iOS staff app
 * @file    ios-app/KayaStaff/KayaStaffApp.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
import SwiftUI

@main
struct KayaStaffApp: App {
    @StateObject private var appModel: StaffAppModel

    init() {
        _appModel = StateObject(wrappedValue: StaffAppModel(session: SessionStore()))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appModel)
                .preferredColorScheme(.dark)
                .environment(\.layoutDirection, L10n.isRtl(appModel.session.language) ? .rightToLeft : .leftToRight)
        }
    }
}
