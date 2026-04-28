//
//  TicketsViewModel.swift
//  KayaCRM
//

import Foundation

@MainActor
final class TicketsViewModel: ObservableObject {
    @Published var tickets: [TicketItem] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let api = ApiService.shared
    
    func load() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let response = try await api.getTickets()
                tickets = response.items
            } catch ApiError.serverError(let msg) {
                errorMessage = msg
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
