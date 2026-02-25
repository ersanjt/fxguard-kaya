//
//  TicketsView.swift
//  KayaCRM
//

import SwiftUI

struct TicketsView: View {
    @StateObject private var viewModel = TicketsViewModel()
    
    var body: some View {
        NavigationStack {
            Group {
                if let error = viewModel.errorMessage, viewModel.tickets.isEmpty {
                    VStack(spacing: 16) {
                        Text(error)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                        Button("تلاش مجدد") {
                            viewModel.load()
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.isLoading && viewModel.tickets.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.tickets.isEmpty {
                    Text("تیکتی یافت نشد")
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(viewModel.tickets, id: \.id) { t in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(t.displayTitle)
                                .font(.headline)
                            Text(t.status)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .refreshable { viewModel.load() }
            .navigationTitle("تیکت‌ها")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear { viewModel.load() }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}
