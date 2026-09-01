/**
 * Kaya CRM — web-mobile header + tab bar
 * @file    ios-app/KayaStaff/Features/Shell/MainShellView.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
import SwiftUI

struct MainShellView: View {
    @EnvironmentObject var model: StaffAppModel

    var body: some View {
        let immersive = model.openChat != nil || model.openThread != nil
        return VStack(spacing: 0) {
            if !immersive {
                mobileHeader
            }
            Group {
                if model.openChat != nil {
                    ChatView()
                } else if model.openThread != nil {
                    TeamChatView()
                } else if model.customerProfile != nil {
                    CustomerDetailView()
                } else {
                    switch model.tab {
                case .dashboard:
                    DashboardView()
                case .inbox:
                    InboxView()
                case .customers:
                    CustomersView()
                case .announcements:
                    AnnouncementsView()
                case .more:
                    switch model.moreDest {
                    case .menu:
                        MoreMenuView()
                    case .tickets:
                        TicketsView()
                    case .tasks:
                        TasksView()
                    case .team:
                        TeamListView()
                    case .profile:
                        ProfileView()
                    }
                }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            if !immersive {
                mobileTabBar
            }
        }
        .background(KayaColor.bg)
        .onChange(of: model.tab) { _, tab in
            model.load(for: tab)
        }
        .onChange(of: model.moreDest) { _, dest in
            if model.tab == .more { model.loadMore(dest) }
        }
        .onAppear { model.load(for: model.tab) }
    }

    private var mobileHeader: some View {
        HStack(spacing: 4) {
            Button { model.selectTab(.more) } label: {
                Image(systemName: "line.3.horizontal")
                    .font(.title3)
                    .foregroundStyle(KayaColor.text)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel(L10n.t(model.lang, "menu"))
            Text(model.headerTitle)
                .font(.headline.weight(.bold))
                .foregroundStyle(KayaColor.text)
                .lineLimit(1)
                .frame(maxWidth: .infinity)
            Button { model.selectTab(.announcements) } label: {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: "bell")
                        .foregroundStyle(KayaColor.text2)
                        .frame(width: 44, height: 44)
                    if model.notifyBadge > 0 {
                        Text(model.notifyBadge > 99 ? "99+" : "\(model.notifyBadge)")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 4)
                            .background(KayaColor.danger)
                            .clipShape(Capsule())
                    }
                }
            }
            .accessibilityLabel(L10n.t(model.lang, "notify"))
            Button { model.selectTab(.inbox) } label: {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(KayaColor.text2)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel(L10n.t(model.lang, "search"))
            Button { model.openMore(.profile) } label: {
                ZStack {
                    Circle().fill(KayaColor.accent.opacity(0.15))
                    if let url = model.avatarUrl {
                        AsyncImage(url: url) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            Text(model.avatarLetter).foregroundStyle(KayaColor.accent)
                        }
                    } else {
                        Text(model.avatarLetter).foregroundStyle(KayaColor.accent)
                    }
                }
                .frame(width: 44, height: 44)
                .clipShape(Circle())
            }
            .accessibilityLabel(L10n.t(model.lang, "profile"))
            .padding(.trailing, 6)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 8)
        .background(KayaColor.chrome)
        .safeAreaPadding(.top)
    }

    private var mobileTabBar: some View {
        HStack(spacing: 0) {
            tabItem(.dashboard, "chart.bar", "dashboard", 0)
            tabItem(.inbox, "bubble.left.and.bubble.right", "inbox", model.unreadTotal)
            tabItem(.customers, "person.2", "customers", 0)
            tabItem(.announcements, "megaphone", "announcements", model.announcements.count)
            tabItem(.more, "ellipsis", "more", 0)
        }
        .padding(.top, 6)
        .padding(.bottom, 8)
        .background(KayaColor.chromeTab)
        .safeAreaPadding(.bottom)
    }

    private func tabItem(_ tab: StaffTab, _ icon: String, _ key: String, _ badge: Int) -> some View {
        let on = model.tab == tab
        return Button { model.selectTab(tab) } label: {
            VStack(spacing: 2) {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: icon)
                        .font(.system(size: 18))
                    if badge > 0 {
                        Text(badge > 99 ? "99+" : "\(badge)")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 3)
                            .background(KayaColor.danger)
                            .clipShape(Capsule())
                            .offset(x: 8, y: -6)
                    }
                }
                Text(L10n.t(model.lang, key))
                    .font(.system(size: 10, weight: on ? .semibold : .medium))
                    .lineLimit(1)
            }
            .foregroundStyle(on ? KayaColor.accent : KayaColor.text3)
            .frame(maxWidth: .infinity, minHeight: 44)
            .padding(.vertical, 4)
        }
    }
}
