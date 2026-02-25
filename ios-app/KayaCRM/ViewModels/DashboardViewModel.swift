//
//  DashboardViewModel.swift
//  KayaCRM
//

import Foundation

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var dashboard: DashboardResponse?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let api = ApiService.shared
    
    func load() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                dashboard = try await api.getDashboard()
            } catch ApiError.serverError(let msg) {
                errorMessage = msg
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
