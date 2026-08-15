/**
 * Kaya CRM — tab shell
 * @file    ios-app/KayaStaff/Features/Shell/MainShellView.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
import SwiftUI

struct MainShellView: View {
    @EnvironmentObject var model: StaffAppModel

    var body: some View {
        TabView(selection: $model.tab) {
            InboxView()
                .tabItem { Label(L10n.t(model.lang, "inbox"), systemImage: "bubble.left.and.bubble.right") }
                .tag(StaffTab.inbox)
            CustomersView()
                .tabItem { Label(L10n.t(model.lang, "customers"), systemImage: "person.2") }
                .tag(StaffTab.customers)
            TicketsView()
                .tabItem { Label(L10n.t(model.lang, "tickets"), systemImage: "ticket") }
                .tag(StaffTab.tickets)
            ProfileView()
                .tabItem { Label(L10n.t(model.lang, "profile"), systemImage: "person.crop.circle") }
                .tag(StaffTab.profile)
        }
        .tint(KayaColor.accent)
        .onChange(of: model.tab) { _, tab in
            switch tab {
            case .inbox: model.refreshInbox()
            case .customers: model.refreshCustomers()
            case .tickets: model.refreshTickets()
            case .profile: break
            }
        }
    }
}
