/**
 * Kaya CRM — inbox + chat
 * @file    ios-app/KayaStaff/Features/Inbox/InboxView.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
import SwiftUI

struct InboxView: View {
    @EnvironmentObject var model: StaffAppModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(L10n.t(model.lang, "inbox")).font(.title2.weight(.semibold)).foregroundStyle(KayaColor.text)
                if model.unreadTotal > 0 {
                    Text("\(model.unreadTotal) \(L10n.t(model.lang, "unread"))")
                        .font(.caption)
                        .foregroundStyle(KayaColor.accent)
                }
            }
            TextField(L10n.t(model.lang, "search"), text: Binding(
                get: { model.inboxSearch },
                set: { model.onInboxSearch($0) }
            ))
            .padding(10)
            .background(KayaColor.inputBg)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .foregroundStyle(KayaColor.text)
            if model.inboxLoading && model.inbox.isEmpty {
                Spacer()
                ProgressView().tint(KayaColor.accent).frame(maxWidth: .infinity)
                Spacer()
            } else if model.inbox.isEmpty {
                Spacer()
                Text(L10n.t(model.lang, "empty_inbox")).foregroundStyle(KayaColor.text2).frame(maxWidth: .infinity)
                Spacer()
            } else {
                List(model.inbox) { row in
                    Button { model.openConversation(row) } label: {
                        HStack(spacing: 12) {
                            avatar(row.customerName)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(row.customerName).foregroundStyle(KayaColor.text).fontWeight(.medium)
                                Text(row.lastMessagePreview ?? row.customerPhone ?? "")
                                    .font(.footnote)
                                    .foregroundStyle(KayaColor.text2)
                                    .lineLimit(1)
                            }
                            Spacer()
                            if row.unreadCount > 0 {
                                Text("\(row.unreadCount)")
                                    .font(.caption2)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background(KayaColor.accent)
                                    .foregroundStyle(.white)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                    .listRowBackground(KayaColor.card)
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
        .padding(16)
        .background(KayaColor.bg)
        .onAppear { model.refreshInbox() }
    }

    private func avatar(_ name: String) -> some View {
        Text(String(name.prefix(1)))
            .font(.headline)
            .foregroundStyle(KayaColor.accent)
            .frame(width: 46, height: 46)
            .background(KayaColor.accent.opacity(0.15))
            .clipShape(Circle())
    }
}

struct ChatView: View {
    @EnvironmentObject var model: StaffAppModel

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button { model.closeChat() } label: {
                    Image(systemName: "chevron.backward")
                        .foregroundStyle(KayaColor.text)
                }
                Text(model.openChat?.customerName ?? "")
                    .font(.headline)
                    .foregroundStyle(KayaColor.text)
                    .lineLimit(1)
                Spacer()
            }
            .padding()
            .background(KayaColor.bg2)
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 8) {
                        ForEach(model.messages) { msg in
                            let mine = msg.direction == "outgoing"
                            HStack {
                                if mine { Spacer(minLength: 40) }
                                VStack(alignment: mine ? .trailing : .leading, spacing: 4) {
                                    if !mine, let name = msg.senderName, !name.isEmpty {
                                        Text(name).font(.caption2).foregroundStyle(KayaColor.accent)
                                    }
                                    Text(msg.content.isEmpty && msg.hasMedia ? "[media]" : msg.content)
                                        .foregroundStyle(KayaColor.text)
                                }
                                .padding(10)
                                .background(mine ? KayaColor.bubbleOut : KayaColor.bubbleIn)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                                if !mine { Spacer(minLength: 40) }
                            }
                            .id(msg.id)
                        }
                    }
                    .padding(12)
                }
                .onChange(of: model.messages.count) { _, _ in
                    if let last = model.messages.last {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }
            HStack {
                TextField(L10n.t(model.lang, "message_ph"), text: $model.draft, axis: .vertical)
                    .padding(10)
                    .background(KayaColor.inputBg)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .foregroundStyle(KayaColor.text)
                Button {
                    model.send()
                } label: {
                    Image(systemName: "paperplane.fill").foregroundStyle(KayaColor.accent)
                }
                .disabled(model.sending || model.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding(10)
            .background(KayaColor.bg2)
        }
        .background(KayaColor.bg)
    }
}
