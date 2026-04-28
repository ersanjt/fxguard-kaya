//
//  InternalChatView.swift
//  KayaCRM
//
//  چت داخلی سازمان
//

import SwiftUI

struct InternalChatView: View {
    @StateObject private var viewModel = InternalChatViewModel()
    @State private var showNewChat = false
    
    var body: some View {
        NavigationStack {
            Group {
                if let error = viewModel.errorMessage, viewModel.threads.isEmpty {
                    VStack(spacing: 16) {
                        Text(error)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                        Button("تلاش مجدد") {
                            viewModel.clearError()
                            viewModel.loadThreads()
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.isLoading && viewModel.threads.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        Section {
                            Button {
                                showNewChat = true
                            } label: {
                                Label("گفتگوی جدید", systemImage: "plus.circle.fill")
                            }
                        }
                        
                        if viewModel.threads.isEmpty {
                            Text("هنوز گفتگویی ندارید. برای شروع روی دکمه بالا بزنید.")
                                .foregroundColor(.secondary)
                                .frame(maxWidth: .infinity)
                                .padding()
                        } else {
                            ForEach(viewModel.threads, id: \.id) { thread in
                                InternalThreadRow(thread: thread) {
                                    viewModel.openThread(thread.id)
                                }
                            }
                        }
                    }
                }
            }
            .refreshable { viewModel.refresh() }
            .navigationTitle("چت داخلی")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showNewChat) {
                NewChatSheet(
                    users: viewModel.users,
                    onSelect: { user in
                        viewModel.createThread(userIds: [user.id])
                        showNewChat = false
                    },
                    onDismiss: { showNewChat = false }
                )
            }
            .sheet(item: $viewModel.selectedThread) { thread in
                InternalChatDetailSheet(
                    thread: thread,
                    currentUserId: AuthStorage.shared.user?.id,
                    onDismiss: { viewModel.closeThread() },
                    viewModel: viewModel
                )
            }
            .onAppear {
                viewModel.loadThreads()
                viewModel.loadUsers()
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}

private struct InternalThreadRow: View {
    let thread: InternalThreadBrief
    let onClick: () -> Void
    
    var body: some View {
        Button(action: onClick) {
            HStack {
                Image(systemName: "person.2.fill")
                    .foregroundColor(.blue)
                VStack(alignment: .leading, spacing: 4) {
                    Text(participantNames)
                        .font(.headline)
                    Text(preview)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }
            .padding(.vertical, 4)
        }
    }
    
    private var participantNames: String {
        (thread.participants ?? []).map { $0.name ?? $0.email ?? "—" }.joined(separator: "، ")
    }
    
    private var preview: String {
        thread.lastMessage?.content ?? "بدون پیام"
    }
}

private struct NewChatSheet: View {
    let users: [UserBrief]
    let onSelect: (UserBrief) -> Void
    let onDismiss: () -> Void
    
    var body: some View {
        NavigationStack {
            List {
                if users.isEmpty {
                    Text("کاربری برای چت یافت نشد")
                        .foregroundColor(.secondary)
                } else {
                    ForEach(users, id: \.id) { user in
                        Button {
                            onSelect(user)
                        } label: {
                            HStack {
                                Image(systemName: "person.circle.fill")
                                Text(user.name ?? user.email ?? "—")
                            }
                        }
                    }
                }
            }
            .navigationTitle("شروع گفتگوی جدید")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("انصراف") { onDismiss() }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}

struct InternalChatDetailSheet: View {
    let thread: InternalThreadBrief
    let currentUserId: String?
    let onDismiss: () -> Void
    @ObservedObject var viewModel: InternalChatViewModel
    @State private var inputText = ""
    
    private var participantNames: String {
        (thread.participants ?? []).map { $0.name ?? $0.email ?? "—" }.joined(separator: "، ")
    }
    
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
                                    InternalMessageBubble(msg: msg, currentUserId: currentUserId)
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
                            viewModel.sendMessage(thread.id, content: inputText)
                            inputText = ""
                        }
                    } label: {
                        Image(systemName: "paperplane.fill")
                    }
                }
                .padding()
            }
            .navigationTitle(participantNames)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("بستن") { onDismiss() }
                }
            }
            .onAppear {
                viewModel.loadMessages(threadId: thread.id)
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}

private struct InternalMessageBubble: View {
    let msg: InternalMessageItem
    let currentUserId: String?
    
    var body: some View {
        let isMe = currentUserId != nil && msg.fromUserId == currentUserId
        HStack {
            if isMe { Spacer() }
            VStack(alignment: isMe ? .trailing : .leading, spacing: 2) {
                if !isMe {
                    Text(msg.fromUser?.name ?? "کاربر")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                Text(msg.content)
                    .padding(12)
                    .background(isMe ? Color.blue.opacity(0.2) : Color(.systemGray5))
                    .cornerRadius(12)
                if let ts = msg.createdAt, !ts.isEmpty {
                    Text(String(ts.prefix(19)).replacingOccurrences(of: "T", with: " "))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            if !isMe { Spacer() }
        }
    }
}

extension InternalThreadBrief: Identifiable {}
