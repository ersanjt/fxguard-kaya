//
//  InternalChatViewModel.swift
//  KayaCRM
//

import Foundation

@MainActor
final class InternalChatViewModel: ObservableObject {
    @Published var threads: [InternalThreadBrief] = []
    @Published var users: [UserBrief] = []
    @Published var messages: [InternalMessageItem] = []
    @Published var selectedThread: InternalThreadBrief?
    @Published var isLoading = false
    @Published var messagesLoading = false
    @Published var isRefreshing = false
    @Published var errorMessage: String?
    
    private let api = ApiService.shared
    
    func loadThreads() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let response = try await api.getInternalThreads()
                threads = response.data ?? []
            } catch ApiError.serverError(let msg) {
                errorMessage = msg
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
    
    func loadUsers() {
        Task {
            do {
                let response = try await api.getInternalUsers()
                users = response.data ?? []
            } catch {
                // ignore
            }
        }
    }
    
    func refresh() {
        isRefreshing = true
        Task {
            do {
                let response = try await api.getInternalThreads()
                threads = response.data ?? []
            } catch {
                errorMessage = error.localizedDescription
            }
            isRefreshing = false
        }
    }
    
    func openThread(_ id: String) {
        if let t = threads.first(where: { $0.id == id }) {
            selectedThread = t
        }
    }
    
    func closeThread() {
        selectedThread = nil
        messages = []
    }
    
    func loadMessages(threadId: String) {
        messagesLoading = true
        messages = []
        
        Task {
            do {
                let response = try await api.getInternalMessages(threadId: threadId)
                messages = response.data ?? []
            } catch {
                errorMessage = error.localizedDescription
            }
            messagesLoading = false
        }
    }
    
    func sendMessage(_ threadId: String, content: String) {
        Task {
            do {
                let newMsg = try await api.sendInternalMessage(threadId: threadId, content: content)
                messages.append(newMsg)
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
    
    func createThread(userIds: [String]) {
        Task {
            do {
                let thread = try await api.createInternalThread(userIds: userIds)
                threads.insert(InternalThreadBrief(
                    id: thread.id,
                    lastMessageAt: nil,
                    lastMessage: nil,
                    participants: thread.participants
                ), at: 0)
                selectedThread = InternalThreadBrief(
                    id: thread.id,
                    lastMessageAt: nil,
                    lastMessage: nil,
                    participants: thread.participants
                )
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
    
    func clearError() {
        errorMessage = nil
    }
}
