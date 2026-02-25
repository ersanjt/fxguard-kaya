//
//  TasksViewModel.swift
//  KayaCRM
//

import Foundation

@MainActor
final class TasksViewModel: ObservableObject {
    @Published var tasks: [TaskItem] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let api = ApiService.shared
    
    func load() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let response = try await api.getTasks()
                tasks = response.items
            } catch ApiError.serverError(let msg) {
                errorMessage = msg
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
