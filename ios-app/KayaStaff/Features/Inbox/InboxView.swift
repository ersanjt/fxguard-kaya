/**
 * Kaya CRM — inbox + chat
 * @file    ios-app/KayaStaff/Features/Inbox/InboxView.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
import SwiftUI
import PhotosUI
import AVFoundation
import UniformTypeIdentifiers
import UIKit

struct InboxView: View {
    @EnvironmentObject var model: StaffAppModel
    @State private var showQuick = true
    @State private var showMore = false
    @State private var showNew = false

    private let chips: [(InboxFilter, String)] = [
        (.all, "filter_all"),
        (.archived, "filter_archived"),
        (.restricted, "filter_restricted"),
        (.unread, "filter_unread"),
        (.unanswered, "filter_unanswered"),
        (.unassigned, "filter_unassigned"),
        (.open, "filter_open"),
        (.mine, "conv_tab_mine"),
        (.groups, "conv_tab_groups"),
    ]

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("\(L10n.t(model.lang, "inbox")) (\(model.inbox.count))")
                        .font(.headline)
                        .foregroundStyle(KayaColor.text)
                    Spacer()
                    Button { model.refreshInbox() } label: {
                        Image(systemName: "arrow.clockwise").foregroundStyle(KayaColor.text2)
                    }
                }
                HStack(spacing: 8) {
                    HStack {
                        Image(systemName: "magnifyingglass").foregroundStyle(KayaColor.text3)
                        TextField(L10n.t(model.lang, "conv_search_ph"), text: Binding(
                            get: { model.inboxSearch },
                            set: { model.onInboxSearch($0) }
                        ))
                        .foregroundStyle(KayaColor.text)
                    }
                    .padding(10)
                    .background(KayaColor.card)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    Button { showMore = true } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "line.3.horizontal.decrease")
                            Text(L10n.t(model.lang, "more_filters")).font(.caption)
                        }
                        .foregroundStyle(KayaColor.text2)
                        .padding(10)
                        .background(KayaColor.card)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                HStack {
                    Text(L10n.t(model.lang, "conv_quick_filters")).font(.caption).foregroundStyle(KayaColor.text3)
                    Spacer()
                    Button {
                        showQuick.toggle()
                    } label: {
                        Text(L10n.t(model.lang, showQuick ? "conv_quick_tabs_hide" : "conv_quick_tabs_show"))
                            .font(.caption)
                            .foregroundStyle(KayaColor.text2)
                    }
                }
                if showQuick {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(chips, id: \.1) { item in
                                let on = model.inboxFilter == item.0
                                Button { model.applyInboxFilter(item.0) } label: {
                                    Text(L10n.t(model.lang, item.1))
                                        .font(.subheadline)
                                        .foregroundStyle(on ? .white : KayaColor.text2)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .background(on ? KayaColor.accent : KayaColor.card)
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }
                }
                if let err = model.inboxError, !err.isEmpty {
                    Text(err).font(.caption).foregroundStyle(KayaColor.danger)
                    Button(L10n.t(model.lang, "retry")) { model.refreshInbox() }
                        .font(.caption)
                        .foregroundStyle(KayaColor.accent)
                }
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
                            conversationRow(row)
                        }
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .padding(12)
            Button { showNew = true } label: {
                Image(systemName: "plus")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.white)
                    .frame(width: 52, height: 52)
                    .background(KayaColor.accent)
                    .clipShape(Circle())
                    .shadow(color: KayaColor.accent.opacity(0.45), radius: 8, y: 4)
            }
            .padding(.trailing, 16)
            .padding(.bottom, 16)
        }
        .background(KayaColor.bg)
        .onAppear { model.refreshInbox() }
        .onChange(of: model.pendingNewConv) { _, v in
            if v {
                showNew = true
                model.pendingNewConv = false
            }
        }
        .sheet(isPresented: $showMore) {
            moreSheet
        }
        .sheet(isPresented: $showNew) {
            newConvSheet
        }
    }

    private func conversationRow(_ row: ConversationRow) -> some View {
        let meta: String = {
            var parts = [row.isGroup ? L10n.t(model.lang, "wa_group") : PhoneDisplay.phoneOrFallback(row.customerPhone, fallback: L10n.t(model.lang, "inbox"))]
            if row.lastOutgoingIsAutoReply {
                parts.append(L10n.t(model.lang, "ai_assistant"))
            } else if let name = row.assigneeName, !name.isEmpty {
                parts.append(name)
            }
            return parts.joined(separator: " · ")
        }()
        return HStack(spacing: 12) {
            ZStack {
                Circle().fill(row.isGroup ? Color(red: 0.36, green: 0.29, blue: 0.54) : KayaColor.accent.opacity(0.15))
                if row.isGroup {
                    Image(systemName: "person.3.fill").foregroundStyle(.white)
                } else {
                    CustomerPhotoView(
                        url: model.customerAvatarUrl(row.customerId),
                        name: row.customerName,
                        token: model.authToken,
                        size: 48,
                        tile: false
                    )
                }
            }
            .frame(width: 48, height: 48)
            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    if row.isGroup {
                        Image(systemName: "person.3.fill").font(.caption2).foregroundStyle(Color(red: 0.65, green: 0.55, blue: 0.98))
                    }
                    Text(PhoneDisplay.customerName(row.customerName, phone: row.customerPhone, fallback: L10n.t(model.lang, "customer"))).foregroundStyle(KayaColor.text).fontWeight(.semibold).lineLimit(1)
                        .ltrIfPhone(row.customerName)
                    Spacer()
                    if let time = row.lastMessageAt, !time.isEmpty {
                        Text(String(time.suffix(5))).font(.caption2).foregroundStyle(KayaColor.text3)
                    }
                }
                Text(row.lastMessagePreview?.isEmpty == false ? row.lastMessagePreview! : meta)
                    .font(.footnote)
                    .foregroundStyle(KayaColor.text2)
                    .lineLimit(1)
                Text(meta).font(.caption2).foregroundStyle(KayaColor.text3).lineLimit(1)
            }
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

    private var moreSheet: some View {
        NavigationStack {
            List(chips, id: \.1) { item in
                Button {
                    model.applyInboxFilter(item.0)
                    showMore = false
                } label: {
                    Text(L10n.t(model.lang, item.1))
                        .foregroundStyle(model.inboxFilter == item.0 ? KayaColor.accent : KayaColor.text)
                }
                .listRowBackground(KayaColor.card)
            }
            .scrollContentBackground(.hidden)
            .background(KayaColor.bg)
            .navigationTitle(L10n.t(model.lang, "more_filters"))
        }
        .presentationDetents([.medium])
    }

    private var newConvSheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 12) {
                TextField(L10n.t(model.lang, "conv_search_ph"), text: Binding(
                    get: { model.customerSearch },
                    set: { model.onCustomerSearch($0) }
                ))
                .padding(10)
                .background(KayaColor.inputBg)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .foregroundStyle(KayaColor.text)
                if model.customers.isEmpty {
                    Text(L10n.t(model.lang, "empty_customers")).foregroundStyle(KayaColor.text2)
                    Spacer()
                } else {
                    List(model.customers) { row in
                        Button {
                            model.openCustomer(row)
                            showNew = false
                        } label: {
                            HStack(spacing: 10) {
                                CustomerPhotoView(
                                    url: model.customerAvatarUrl(row.id),
                                    name: row.name,
                                    token: model.authToken,
                                    size: 40,
                                    tile: false
                                )
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(PhoneDisplay.customerName(row.name, phone: row.phone, fallback: L10n.t(model.lang, "customer"))).foregroundStyle(KayaColor.text)
                                    Text(PhoneDisplay.phoneOrFallback(row.phone, fallback: row.email ?? "")).font(.caption).foregroundStyle(KayaColor.text2)
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
            .navigationTitle(L10n.t(model.lang, "conv_new"))
            .onAppear { model.refreshCustomers() }
        }
        .presentationDetents([.medium, .large])
    }
}

struct ChatView: View {
    @EnvironmentObject var model: StaffAppModel
    @StateObject private var recorder = ChatVoiceRecorder()
    @State private var pickerTab: String?
    @State private var showAttach = false
    @State private var showFiles = false
    @State private var photoItem: PhotosPickerItem?
    @State private var showPhotos = false

    var body: some View {
        VStack(spacing: 0) {
            chatHeader
            if let err = model.chatError ?? model.chatNotice, !err.isEmpty {
                Text(err)
                    .font(.caption)
                    .foregroundStyle(model.chatError == nil ? KayaColor.accent : KayaColor.danger)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
            }
            if model.chatLoading && model.messages.isEmpty {
                ProgressView()
                    .tint(KayaColor.accent)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if model.messages.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "bubble.left.and.bubble.right")
                        .font(.title)
                        .foregroundStyle(KayaColor.text3)
                    Text(L10n.t(model.lang, "empty_messages"))
                        .font(.headline)
                        .foregroundStyle(KayaColor.text)
                        .multilineTextAlignment(.center)
                    Text(L10n.t(model.lang, "empty_messages_hint"))
                        .font(.footnote)
                        .foregroundStyle(KayaColor.text2)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(32)
            } else {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 8) {
                        ForEach(model.messages) { msg in
                            ChatBubbleRow(msg: msg, lang: model.lang, mediaURL: model.mediaURL)
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
            }
            if let tab = pickerTab {
                WaPickerPanel(
                    lang: model.lang,
                    tab: tab,
                    onTab: { pickerTab = $0 },
                    onInsert: {
                        model.draft += $0
                        pickerTab = nil
                    },
                    onGif: {
                        pickerTab = nil
                        model.sendGif($0)
                    },
                    onClose: { pickerTab = nil }
                )
            }
            if recorder.isRecording {
                recordingBar
            } else {
                composer
            }
        }
        .background(KayaColor.bg)
        .onChange(of: model.pendingCallLink) { _, link in
            guard let link, let url = URL(string: link) else { return }
            UIApplication.shared.open(url)
            model.pendingCallLink = nil
        }
        .confirmationDialog(L10n.t(model.lang, "attach"), isPresented: $showAttach) {
            Button(L10n.t(model.lang, "media")) { showPhotos = true }
            Button(L10n.t(model.lang, "file")) { showFiles = true }
            Button(L10n.t(model.lang, "back"), role: .cancel) {}
        }
        .photosPicker(isPresented: $showPhotos, selection: $photoItem, matching: .any(of: [.images, .videos]))
        .onChange(of: photoItem) { _, item in
            guard let item else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self) {
                    let mime = item.supportedContentTypes.first?.preferredMIMEType ?? "application/octet-stream"
                    let name = "attach.\(item.supportedContentTypes.first?.preferredFilenameExtension ?? "bin")"
                    model.sendFile(data: data, filename: name, mime: mime)
                }
                photoItem = nil
            }
        }
        .fileImporter(isPresented: $showFiles, allowedContentTypes: [.item], allowsMultipleSelection: false) { result in
            guard case .success(let urls) = result, let url = urls.first else { return }
            let access = url.startAccessingSecurityScopedResource()
            defer { if access { url.stopAccessingSecurityScopedResource() } }
            if let data = try? Data(contentsOf: url) {
                let mime = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
                model.sendFile(data: data, filename: url.lastPathComponent, mime: mime)
            }
        }
    }

    private var chatHeader: some View {
        let chat = model.openChat
        return VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Button { model.closeChat() } label: {
                    Image(systemName: "chevron.backward").foregroundStyle(KayaColor.text)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(L10n.t(model.lang, "back"))
                ZStack {
                    Circle().fill(chat?.isGroup == true ? Color(red: 0.36, green: 0.29, blue: 0.54) : KayaColor.accent.opacity(0.15))
                    if chat?.isGroup == true {
                        Image(systemName: "person.3.fill").foregroundStyle(.white).font(.caption)
                    } else {
                        CustomerPhotoView(
                            url: model.customerAvatarUrl(chat?.customerId),
                            name: chat?.customerName ?? "?",
                            token: model.authToken,
                            size: 40,
                            tile: false
                        )
                    }
                }
                .frame(width: 40, height: 40)
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        if chat?.isGroup == true {
                            Image(systemName: "person.3.fill")
                                .font(.caption2)
                                .foregroundStyle(Color(red: 0.65, green: 0.55, blue: 0.98))
                        }
                        Text(PhoneDisplay.label(chat?.customerName ?? ""))
                            .ltrIfPhone(chat?.customerName)
                            .font(.headline)
                            .foregroundStyle(KayaColor.text)
                            .lineLimit(1)
                    }
                    Text(L10n.t(model.lang, chat?.isGroup == true ? "group_whatsapp" : "channel_whatsapp"))
                        .font(.caption)
                        .foregroundStyle(KayaColor.text2)
                }
                Spacer()
                Button { model.startCall("video") } label: {
                    Image(systemName: "video").foregroundStyle(KayaColor.text2)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(L10n.t(model.lang, "call_video"))
                Button { model.startCall("voice") } label: {
                    Image(systemName: "phone").foregroundStyle(KayaColor.text2)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(L10n.t(model.lang, "call_voice"))
            }
            .padding(.horizontal, 12)
            .padding(.top, 8)
            .safeAreaPadding(.top)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    chip(statusLabel(chat?.status ?? "open"), Color(red: 16 / 255, green: 185 / 255, blue: 129 / 255))
                    if let dept = chat?.departmentName, !dept.isEmpty {
                        chip(dept, Color(red: 96 / 255, green: 165 / 255, blue: 250 / 255))
                    }
                    if let who = chat?.assigneeName, !who.isEmpty {
                        chip(who, Color(red: 167 / 255, green: 139 / 255, blue: 250 / 255))
                    } else {
                        chip(L10n.t(model.lang, "filter_unassigned"), Color(red: 251 / 255, green: 191 / 255, blue: 36 / 255))
                    }
                }
                .padding(.horizontal, 56)
                .padding(.bottom, 10)
            }
        }
        .background(KayaColor.bg2)
    }

    private func chip(_ text: String, _ color: Color) -> some View {
        Text(text)
            .font(.caption2)
            .foregroundStyle(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(color.opacity(0.16))
            .clipShape(Capsule())
    }

    private func statusLabel(_ status: String) -> String {
        switch status {
        case "closed": return L10n.t(model.lang, "status_closed")
        case "archived": return L10n.t(model.lang, "status_archived")
        default: return L10n.t(model.lang, "status_open")
        }
    }

    private var composer: some View {
        HStack(spacing: 6) {
            Button { showAttach = true } label: {
                Image(systemName: "paperclip").foregroundStyle(KayaColor.text2)
            }
            .disabled(model.sending)
            HStack {
                TextField(L10n.t(model.lang, "message_ph"), text: $model.draft, axis: .vertical)
                    .foregroundStyle(KayaColor.text)
                Button {
                    pickerTab = pickerTab == nil ? "emoji" : nil
                } label: {
                    Image(systemName: "face.smiling").foregroundStyle(KayaColor.text2)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(KayaColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 22))
            if model.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Button {
                    do { try recorder.start() }
                    catch { model.showChatNotice(L10n.t(model.lang, "voice_err_open")) }
                } label: {
                    Image(systemName: "mic").foregroundStyle(KayaColor.text2)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(L10n.t(model.lang, "voice"))
                .disabled(model.sending)
            } else {
                Button { model.send() } label: {
                    Image(systemName: "paperplane.fill").foregroundStyle(KayaColor.accent)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(L10n.t(model.lang, "send"))
                .disabled(model.sending)
            }
        }
        .padding(10)
        .background(KayaColor.bg2)
        .safeAreaPadding(.bottom)
    }

    private var recordingBar: some View {
        let sec = Int(recorder.elapsed)
        return HStack {
            Button {
                recorder.cancel()
            } label: {
                Image(systemName: "xmark").foregroundStyle(KayaColor.danger)
            }
            Circle().fill(KayaColor.danger).frame(width: 10, height: 10)
            Text("\(L10n.t(model.lang, "recording"))  \(sec / 60):\(String(format: "%02d", sec % 60))")
                .foregroundStyle(KayaColor.text)
            Spacer()
            Button {
                let elapsed = recorder.elapsed
                if let url = recorder.stop() {
                    if elapsed < 0.45 {
                        try? FileManager.default.removeItem(at: url)
                        model.showChatNotice(L10n.t(model.lang, "voice_too_short"))
                    } else {
                        model.sendVoice(url: url)
                    }
                }
            } label: {
                Image(systemName: "checkmark").foregroundStyle(KayaColor.accent)
            }
        }
        .padding(10)
        .background(KayaColor.bg2)
    }
}

private struct ChatBubbleRow: View {
    let msg: ChatMessage
    let lang: String
    let mediaURL: (String?) -> URL?

    var body: some View {
        let mine = msg.direction == "outgoing"
        return HStack(alignment: .bottom, spacing: 6) {
            if mine { Spacer(minLength: 36) }
            if !mine {
                ZStack {
                    Circle().fill(KayaColor.accent.opacity(0.15))
                    Text(String((msg.senderName ?? "?").prefix(1)))
                        .font(.caption2.bold())
                        .foregroundStyle(KayaColor.accent)
                }
                .frame(width: 22, height: 22)
            }
            VStack(alignment: mine ? .trailing : .leading, spacing: 4) {
                if !msg.isVoice, let name = msg.senderName, !name.isEmpty {
                    Text(name).font(.caption2).foregroundStyle(mine ? .white.opacity(0.9) : KayaColor.accent)
                }
                if msg.isVoice, let url = mediaURL(msg.mediaUrl) {
                    VoicePlayerView(url: url, mine: mine, lang: lang)
                } else if msg.isImage, let url = mediaURL(msg.mediaUrl) {
                    AsyncImage(url: url) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        ProgressView()
                    }
                    .frame(maxWidth: 240, maxHeight: 160)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                } else if msg.hasMedia, let url = mediaURL(msg.mediaUrl) {
                    Link(destination: url) {
                        Label(msg.mediaName ?? L10n.t(lang, "file"), systemImage: "arrow.down.circle")
                            .foregroundStyle(mine ? .white : KayaColor.text)
                    }
                }
                if !msg.content.isEmpty && !msg.isVoice {
                    Text(msg.content).foregroundStyle(mine ? .white : KayaColor.text)
                }
                if let clock = clockText(msg.timestamp), !clock.isEmpty {
                    Text(clock).font(.caption2).foregroundStyle(mine && !msg.isVoice ? .white.opacity(0.8) : KayaColor.text3)
                }
            }
            .padding(msg.isVoice ? 4 : 10)
            .background(msg.isVoice ? Color.clear : (mine ? KayaColor.accent : KayaColor.bubbleIn))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            if !mine { Spacer(minLength: 36) }
        }
    }

    private func clockText(_ raw: String?) -> String? {
        guard let raw, raw.count >= 5 else { return raw }
        if let t = raw.split(separator: "T").last {
            return String(t.prefix(5))
        }
        return String(raw.suffix(5))
    }
}

private struct VoicePlayerView: View {
    let url: URL
    let mine: Bool
    let lang: String
    @State private var player: AVPlayer?
    @State private var playing = false
    @State private var rate: Float = 1

    var body: some View {
        HStack(spacing: 8) {
            Button {
                if playing {
                    player?.pause()
                    playing = false
                } else {
                    if player == nil { player = AVPlayer(url: url) }
                    player?.rate = rate
                    player?.play()
                    playing = true
                }
            } label: {
                ZStack {
                    Circle().fill(KayaColor.accent)
                    Image(systemName: playing ? "pause.fill" : "play.fill")
                        .foregroundStyle(.white)
                }
                .frame(width: 40, height: 40)
            }
            Capsule().fill(mine ? Color.white.opacity(0.35) : KayaColor.accent.opacity(0.45))
                .frame(height: 4)
            Button {
                rate = rate == 1 ? 1.5 : (rate == 1.5 ? 2 : 1)
                if playing { player?.rate = rate }
            } label: {
                Text(rate == 1 ? "1x" : (rate == 1.5 ? "1.5x" : "2x"))
                    .font(.caption.bold())
                    .foregroundStyle(mine ? .white : KayaColor.text)
            }
            Link(destination: url) {
                Image(systemName: "arrow.down.to.line")
                    .foregroundStyle(mine ? .white.opacity(0.8) : KayaColor.text2)
            }
        }
        .padding(10)
        .background(mine ? KayaColor.accent : Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

private struct WaPickerPanel: View {
    let lang: String
    let tab: String
    let onTab: (String) -> Void
    let onInsert: (String) -> Void
    let onGif: (String) -> Void
    let onClose: () -> Void

    private let emoji = Array("😀😃😄😁😅😂🤣😊😇🙂😉😍🥰😘🥲😋😛🤪😎😢😭😤😡🤬🤔😴🙄👍👎👏🙌🙏🤝💪✌️🤞✋👌🤌💬❤️🧡💛💚💙💔✨🔥⭐🎉💯✅❌❓☕🍕🎂🎁🏠✈️📱💼📎🖼🎵🎶🌙☀️🌟🌈⚽🎮🔔📌")
    private let sticker = Array("❤️😂🔥😍🥰👏😊🎉🤔😭🙏✨🌟💯🎂🍕🐱🐶🌹🥳😎🤗💪👍🙌🤩😇🥺🦄🌸🍀🌻🎈🎀🏆🍉🥑🍓💖💝👻🎃🎄🧸")
    private let gifs: [(String, String)] = [
        ("Funny", "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif"),
        ("Wow", "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif"),
        ("Happy", "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif"),
        ("Love", "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif"),
        ("Thanks", "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif"),
        ("Hi", "https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif"),
    ]

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Text(L10n.t(lang, tab == "sticker" ? "sticker" : (tab == "gif" ? "gif" : "emoji")))
                    .foregroundStyle(KayaColor.text)
                    .fontWeight(.semibold)
                Spacer()
                Button("×", action: onClose).foregroundStyle(KayaColor.text2)
            }
            .padding(.horizontal, 8)
            if tab == "gif" {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    ForEach(gifs, id: \.1) { g in
                        Button { onGif(g.1) } label: {
                            VStack {
                                AsyncImage(url: URL(string: g.1)) { image in
                                    image.resizable().scaledToFill()
                                } placeholder: { Color.white.opacity(0.08) }
                                .frame(height: 64)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                Text(g.0).font(.caption2).foregroundStyle(KayaColor.text2)
                            }
                        }
                    }
                }
            } else {
                let chars = tab == "sticker" ? sticker : emoji
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 8), spacing: 4) {
                    ForEach(Array(chars.enumerated()), id: \.offset) { _, ch in
                        Button { onInsert(String(ch)) } label: {
                            Text(String(ch)).font(.title3)
                        }
                    }
                }
            }
            HStack {
                tabBtn("emoji", "😊")
                tabBtn("gif", "GIF")
                tabBtn("sticker", "◌")
            }
        }
        .padding(8)
        .frame(height: 280)
        .background(KayaColor.bg2)
    }

    private func tabBtn(_ key: String, _ icon: String) -> some View {
        Button { onTab(key) } label: {
            VStack {
                Text(icon)
                Text(L10n.t(lang, key)).font(.caption2)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(tab == key ? KayaColor.accent.opacity(0.15) : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .foregroundStyle(tab == key ? KayaColor.accent : KayaColor.text3)
    }
}

@MainActor
final class ChatVoiceRecorder: ObservableObject {
    @Published var isRecording = false
    @Published var elapsed: TimeInterval = 0
    private var recorder: AVAudioRecorder?
    private var timer: Timer?
    private var fileURL: URL?

    func start() throws {
        cancel()
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
        try session.setActive(true)
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("voice-\(Int(Date().timeIntervalSince1970)).m4a")
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
        ]
        let rec = try AVAudioRecorder(url: url, settings: settings)
        rec.record()
        recorder = rec
        fileURL = url
        isRecording = true
        elapsed = 0
        timer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.elapsed = rec.currentTime
            }
        }
    }

    func stop() -> URL? {
        recorder?.stop()
        timer?.invalidate()
        timer = nil
        isRecording = false
        recorder = nil
        return fileURL
    }

    func cancel() {
        recorder?.stop()
        timer?.invalidate()
        timer = nil
        isRecording = false
        recorder = nil
        if let fileURL { try? FileManager.default.removeItem(at: fileURL) }
        fileURL = nil
    }
}
