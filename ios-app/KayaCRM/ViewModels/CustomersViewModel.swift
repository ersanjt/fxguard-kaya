//
//  CustomersViewModel.swift
//  KayaCRM
//

import Foundation

@MainActor
final class CustomersViewModel: ObservableObject {
    @Published var customers: [CustomerItem] = []
    @Published var searchText = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let api = ApiService.shared
    
    func load() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let search = searchText.trimmingCharacters(in: .whitespaces)
                let response = try await api.getCustomers(search: search.isEmpty ? nil : search)
                customers = response.data ?? []
            } catch ApiError.serverError(let msg) {
                errorMessage = msg
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
