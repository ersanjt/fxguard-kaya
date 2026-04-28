//
//  MainView.swift
//  KayaCRM
//
//  صفحه اصلی با تب‌ها
//

import SwiftUI

enum MainTab: String, CaseIterable {
    case conversations = "مکالمات واتساپ"
    case internalChat = "چت داخلی"
    case dashboard = "داشبورد"
    case customers = "مشتریان"
    case tickets = "تیکت‌ها"
    case tasks = "وظایف"
    case profile = "پروفایل"
    
    var icon: String {
        switch self {
        case .conversations: return "bubble.left.and.bubble.right.fill"
        case .internalChat: return "person.2.fill"
        case .dashboard: return "chart.bar.fill"
        case .customers: return "person.2.fill"
        case .tickets: return "ticket.fill"
        case .tasks: return "checklist"
        case .profile: return "person.fill"
        }
    }
}

struct MainView: View {
    @State private var selectedTab: MainTab = .dashboard
    
    var body: some View {
        TabView(selection: $selectedTab) {
            ConversationsView()
                .tabItem { Label(MainTab.conversations.rawValue, systemImage: MainTab.conversations.icon) }
                .tag(MainTab.conversations)
            
            InternalChatView()
                .tabItem { Label(MainTab.internalChat.rawValue, systemImage: MainTab.internalChat.icon) }
                .tag(MainTab.internalChat)
            
            DashboardView()
                .tabItem { Label(MainTab.dashboard.rawValue, systemImage: MainTab.dashboard.icon) }
                .tag(MainTab.dashboard)
            
            CustomersView()
                .tabItem { Label(MainTab.customers.rawValue, systemImage: MainTab.customers.icon) }
                .tag(MainTab.customers)
            
            TicketsView()
                .tabItem { Label(MainTab.tickets.rawValue, systemImage: MainTab.tickets.icon) }
                .tag(MainTab.tickets)
            
            TasksView()
                .tabItem { Label(MainTab.tasks.rawValue, systemImage: MainTab.tasks.icon) }
                .tag(MainTab.tasks)
            
            ProfileView()
                .tabItem { Label(MainTab.profile.rawValue, systemImage: MainTab.profile.icon) }
                .tag(MainTab.profile)
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}
