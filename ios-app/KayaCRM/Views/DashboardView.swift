//
//  DashboardView.swift
//  KayaCRM
//
//  داشبورد
//

import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    
    var body: some View {
        NavigationStack {
            ScrollView {
                if let error = viewModel.errorMessage, viewModel.dashboard == nil {
                    VStack(spacing: 16) {
                        Text(error)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                        Button("تلاش مجدد") {
                            viewModel.load()
                        }
                    }
                    .padding()
                } else if viewModel.isLoading && viewModel.dashboard == nil {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .padding(.top, 100)
                } else if let d = viewModel.dashboard {
                    LazyVStack(spacing: 12) {
                        Text("خلاصه آمار")
                            .font(.title2)
                            .fontWeight(.bold)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            StatCard(title: "مکالمات باز", value: "\(d.openConversationsVal)", icon: "bubble.left.fill")
                            StatCard(title: "خوانده نشده", value: "\(d.unreadConversationsVal)", icon: "envelope.badge.fill")
                            StatCard(title: "مشتریان", value: "\(d.totalCustomersVal)", icon: "person.2.fill")
                            StatCard(title: "پیام امروز", value: "\(d.todayMessagesVal)", icon: "paperplane.fill")
                            StatCard(title: "تیکت‌ها", value: "\(d.ticketsOpenVal)", icon: "ticket.fill")
                            StatCard(title: "تسک‌ها", value: "\(d.tasksPendingVal)", icon: "checklist")
                            StatCard(title: "اعلان‌ها", value: "\(d.unreadAnnouncementsVal)", icon: "bell.fill")
                            StatCard(title: "آنلاین", value: "\(d.staffOnlineVal)", icon: "person.fill")
                        }
                    }
                    .padding()
                }
            }
            .refreshable { viewModel.load() }
            .navigationTitle("صرافی کایا")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear { viewModel.load() }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}

private struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.blue)
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}
