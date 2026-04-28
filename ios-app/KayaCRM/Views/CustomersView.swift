//
//  CustomersView.swift
//  KayaCRM
//

import SwiftUI

struct CustomersView: View {
    @StateObject private var viewModel = CustomersViewModel()
    
    var body: some View {
        NavigationStack {
            Group {
                if let error = viewModel.errorMessage, viewModel.customers.isEmpty {
                    VStack(spacing: 16) {
                        Text(error)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                        Button("تلاش مجدد") {
                            viewModel.load()
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.isLoading && viewModel.customers.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.customers.isEmpty {
                    Text("مشتری یافت نشد")
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(viewModel.customers, id: \.id) { c in
                        HStack {
                            Image(systemName: "person.circle.fill")
                                .foregroundColor(.blue)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(c.name ?? c.phone ?? "مشتری")
                                    .font(.headline)
                                if let phone = c.phone {
                                    Text(phone)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                }
            }
            .refreshable { viewModel.load() }
            .searchable(text: $viewModel.searchText, prompt: "جستجو")
            .navigationTitle("مشتریان")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear { viewModel.load() }
            .onChange(of: viewModel.searchText) { _, _ in
                viewModel.load()
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}
