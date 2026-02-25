//
//  ConversationsView.swift
//  KayaCRM
//
//  مکالمات واتساپ
//

import SwiftUI

struct ConversationsView: View {
    @StateObject private var viewModel = ConversationsViewModel()
    
    var body: some View {
        NavigationStack {
            Group {
                if let error = viewModel.errorMessage, viewModel.conversations.isEmpty {
                    VStack(spacing: 16) {
                        Text(error)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                        Button("تلاش مجدد") {
                            viewModel.clearError()
                            viewModel.load()
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.isLoading && viewModel.conversations.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.conversations.isEmpty {
                    Text("مکالمه‌ای یافت نشد")
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(viewModel.conversations, id: \.id) { conv in
                            ConversationRow(conversation: conv) {
                                viewModel.openConversation(conv.id)
                            }
                        }
                    }
                }
            }
            .refreshable { viewModel.refresh() }
            .navigationTitle("مکالمات")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(item: $viewModel.selectedConversation) { conv in
                ConversationDetailSheet(
                    conversationId: conv.id,
                    onDismiss: { viewModel.closeConversation() },
                    viewModel: viewModel
                )
            }
            .onAppear { viewModel.load() }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}

private struct ConversationRow: View {
    let conversation: Conversation
    let onClick: () -> Void
    
    private var timeStr: String {
        guard let at = conversation.lastMessageAt, at.count >= 16 else { return "" }
        let start = at.index(at.startIndex, offsetBy: 11)
        let end = at.index(start, offsetBy: min(5, at.distance(from: start, to: at.endIndex)))
        return String(at[start..<end])
    }
    
    var body: some View {
        Button(action: onClick) {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(conversation.isGroup ? Color.blue.opacity(0.2) : Color.green.opacity(0.2))
                        .frame(width: 48, height: 48)
                    Text(conversation.isGroup ? "👥" : String(conversation.displayName.prefix(1)).uppercased())
                        .font(.headline)
                }
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text((conversation.isGroup ? "👥 " : "") + conversation.displayName)
                            .font(.headline)
                            .lineLimit(1)
                        Spacer()
                        if !timeStr.isEmpty {
                            Text(timeStr)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                    Text(conversation.lastMessagePreview ?? conversation.department?.name ?? conversation.status)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                if conversation.unreadCountVal > 0 {
                    Text("\(conversation.unreadCountVal)")
                        .font(.caption2)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.red)
                        .cornerRadius(10)
                }
            }
            .padding(.vertical, 8)
        }
    }
}

struct ConversationDetailSheet: View {
    let conversationId: String
    let onDismiss: () -> Void
    @ObservedObject var viewModel: ConversationsViewModel
    @State private var inputText = ""
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if viewModel.messagesLoading && viewModel.messages.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollViewReader { proxy in
                        ScrollView {
                            LazyVStack(spacing: 8) {
                                ForEach(viewModel.messages, id: \.id) { msg in
                                    MessageBubble(message: msg)
                                }
                            }
                            .padding()
                            .onChange(of: viewModel.messages.count) { _ in
                                if let last = viewModel.messages.last {
                                    withAnimation {
                                        proxy.scrollTo(last.id, anchor: .bottom)
                                    }
                                }
                            }
                        }
                    }
                }
                
                HStack(spacing: 8) {
                    TextField("پیام...", text: $inputText)
                        .textFieldStyle(.roundedBorder)
                    Button {
                        if !inputText.isEmpty {
                            viewModel.sendMessage(conversationId, content: inputText)
                            inputText = ""
                        }
                    } label: {
                        Image(systemName: "paperplane.fill")
                    }
                }
                .padding()
            }
            .navigationTitle("مکالمه")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("بستن") { onDismiss() }
                }
            }
            .onAppear {
                viewModel.loadMessages(conversationId: conversationId)
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}

private struct MessageBubble: View {
    let message: MessageItem
    
    var body: some View {
        let isOutgoing = message.direction == "outgoing"
        HStack {
            if isOutgoing { Spacer() }
            VStack(alignment: isOutgoing ? .trailing : .leading, spacing: 2) {
                Text(message.displayContent)
                    .padding(12)
                    .background(isOutgoing ? Color.blue.opacity(0.2) : Color(.systemGray5))
                    .cornerRadius(12)
                if let ts = message.timestamp, !ts.isEmpty {
                    Text(String(ts.prefix(19)).replacingOccurrences(of: "T", with: " "))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            if !isOutgoing { Spacer() }
        }
    }
}

// Make Conversation Identifiable for sheet
extension Conversation: Identifiable {}
