//
//  ConversationsViewModel.swift
//  KayaCRM
//

import Foundation

@MainActor
final class ConversationsViewModel: ObservableObject {
    @Published var conversations: [Conversation] = []
    @Published var messages: [MessageItem] = []
    @Published var selectedConversation: Conversation?
    @Published var isLoading = false
    @Published var messagesLoading = false
    @Published var isRefreshing = false
    @Published var errorMessage: String?
    
    private let api = ApiService.shared
    
    var selectedConversationId: String? { selectedConversation?.id }
    
    func load() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let response = try await api.getConversations()
                conversations = response.data ?? []
            } catch ApiError.serverError(let msg) {
                errorMessage = msg
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
    
    func refresh() {
        isRefreshing = true
        Task {
            do {
                let response = try await api.getConversations()
                conversations = response.data ?? []
            } catch {
                errorMessage = error.localizedDescription
            }
            isRefreshing = false
        }
    }
    
    func openConversation(_ id: String) {
        if let conv = conversations.first(where: { $0.id == id }) {
            selectedConversation = conv
        }
    }
    
    func closeConversation() {
        selectedConversation = nil
        messages = []
    }
    
    func loadMessages(conversationId: String) {
        messagesLoading = true
        messages = []
        
        Task {
            do {
                let response = try await api.getMessages(conversationId: conversationId)
                messages = response.items
            } catch {
                errorMessage = error.localizedDescription
            }
            messagesLoading = false
        }
    }
    
    func sendMessage(_ conversationId: String, content: String) {
        Task {
            do {
                let newMsg = try await api.sendMessage(conversationId: conversationId, content: content)
                messages.append(newMsg)
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
    
    func clearError() {
        errorMessage = nil
    }
}
