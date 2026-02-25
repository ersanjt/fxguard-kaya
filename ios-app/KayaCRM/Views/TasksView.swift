//
//  TasksView.swift
//  KayaCRM
//

import SwiftUI

struct TasksView: View {
    @StateObject private var viewModel = TasksViewModel()
    
    var body: some View {
        NavigationStack {
            Group {
                if let error = viewModel.errorMessage, viewModel.tasks.isEmpty {
                    VStack(spacing: 16) {
                        Text(error)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                        Button("تلاش مجدد") {
                            viewModel.load()
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.isLoading && viewModel.tasks.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.tasks.isEmpty {
                    Text("وظیفه‌ای یافت نشد")
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(viewModel.tasks, id: \.id) { t in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(t.title ?? "وظیفه")
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
            .navigationTitle("وظایف")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear { viewModel.load() }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}
