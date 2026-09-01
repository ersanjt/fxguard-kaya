/**
 * Kaya CRM — dashboard, lists, more, profile (web mobile parity)
 * @file    ios-app/KayaStaff/Features/Lists/ListViews.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var model: StaffAppModel

    var body: some View {
        if let key = model.dashInfoKey {
            if key == "staff-activity" {
                StaffActivityView()
            } else if key == "users" {
                UsersDirectoryView()
            } else {
                DashModuleView(page: key)
            }
        } else {
            dashboardHome
        }
    }

    private var dashboardHome: some View {
        let s = model.dashStats
        return ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text(L10n.t(model.lang, "dashboard")).font(.title2.weight(.semibold)).foregroundStyle(KayaColor.text)
                    Spacer()
                    Button { model.refreshDashboard() } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.clockwise")
                            Text(L10n.t(model.lang, "dashboard_refresh")).font(.subheadline)
                        }
                        .foregroundStyle(KayaColor.accent)
                    }
                }
                HStack {
                    Text(L10n.t(model.lang, "dashboard_kpi_title")).fontWeight(.semibold).foregroundStyle(KayaColor.text)
                    Spacer()
                    if let t = model.dashUpdatedAt {
                        Text("\(L10n.t(model.lang, "dashboard_updated_at")) \(t)").font(.caption).foregroundStyle(KayaColor.text3)
                    }
                }
                if model.dashLoading { ProgressView().tint(KayaColor.accent).frame(maxWidth: .infinity) }
                if let err = model.dashError { Text(err).font(.caption).foregroundStyle(KayaColor.danger) }
                HStack(spacing: 8) {
                    kpi(s.openConversations, "dashboard_stat_conversations") { model.openDashPage("conversations") }
                    kpi(s.unreadConversations, "dashboard_stat_unread") { model.openDashPage("conversations") }
                }
                HStack(spacing: 8) {
                    kpi(s.unansweredConversations, "dashboard_stat_unanswered") { model.openDashPage("conversations") }
                    kpi(s.unassignedConversations, "dashboard_stat_unassigned") { model.openDashPage("conversations") }
                }
                HStack(spacing: 8) {
                    kpi(s.todayMessages, "dashboard_stat_messages_today") { model.openDashPage("conversations") }
                    kpi(s.ticketsOpen, "dashboard_stat_tickets") { model.openDashPage("tickets") }
                    kpi(s.tasksPending, "dashboard_stat_tasks") { model.openDashPage("tasks") }
                }
                HStack(spacing: 8) {
                    kpi(s.totalCustomers, "dashboard_stat_customers") { model.openDashPage("customers") }
                    kpi(s.staffOnline, "dashboard_stat_online") { model.openDashPage("staff-activity") }
                    kpi(s.loginsToday, "dashboard_stat_logins_today") { model.openDashPage("staff-activity") }
                }
                if let rating = s.avgRating {
                    kpiLabel("\(fmtNum(rating))/5", "\(L10n.t(model.lang, "dashboard_stat_satisfaction")) (\(s.ratedConversationsCount))") {
                        model.openDashPage("conversations")
                    }
                }
                HStack(spacing: 8) {
                    quick("dashboard_quick_new_conv", "bubble.left") { model.quickNewConv() }
                    quick("dashboard_quick_new_customer", "person.badge.plus") { model.quickNewCustomer() }
                    quick("dashboard_quick_new_ticket", "ticket") { model.openMore(.tickets) }
                }
                Text(L10n.t(model.lang, "dashboard_sections")).fontWeight(.semibold).foregroundStyle(KayaColor.text).padding(.top, 8)
                HStack(alignment: .top, spacing: 8) {
                    VStack(spacing: 8) {
                        groupTitle("dashboard_group_communications")
                        panel("inbox", convMeta, "bubble.left.and.bubble.right") { model.openDashPage("conversations") }
                        panel("customers", "\(s.totalCustomers) \(L10n.t(model.lang, "customers"))", "person.2") { model.openDashPage("customers") }
                        panel("tickets", "\(s.ticketsOpen) \(L10n.t(model.lang, "filter_open"))", "ticket") { model.openDashPage("tickets") }
                        panel("team", nil, "person.3") { model.openDashPage("internal-chat") }
                        panel("dash_page_whatsapp", nil, "phone") { model.openDashPage("whatsapp") }
                        panel("dash_page_templates", nil, "doc.badge.plus") { model.openDashPage("message-templates") }
                    }
                    VStack(spacing: 8) {
                        groupTitle("dashboard_group_organization")
                        panel("tasks", "\(s.tasksPending) \(L10n.t(model.lang, "status_pending"))", "checklist") { model.openDashPage("tasks") }
                        panel("dash_page_processes", nil, "arrow.up.left.and.arrow.down.right") { model.openDashPage("processes") }
                        panel("dash_page_users", nil, "person") { model.openDashPage("users") }
                        panel("dash_page_departments", nil, "building.2") { model.openDashPage("departments") }
                        panel("dash_page_branches", nil, "house") { model.openDashPage("branches") }
                    }
                }
                HStack(alignment: .top, spacing: 8) {
                    VStack(spacing: 8) {
                        groupTitle("dashboard_group_finance")
                        panel("dash_page_rates", nil, "chart.bar") { model.openDashPage("rates") }
                        panel("dash_page_charts", nil, "chart.xyaxis.line") { model.openDashPage("rates-charts") }
                        panel("dash_page_services", nil, "banknote") { model.openDashPage("services") }
                    }
                    VStack(spacing: 8) {
                        groupTitle("dashboard_group_monitoring")
                        panel("dash_page_supervision", nil, "chart.bar") { model.openDashPage("supervision") }
                        panel("dash_page_staff", nil, "person.badge.plus") { model.openDashPage("staff-activity") }
                        panel("dash_page_system", nil, "waveform.path.ecg") { model.openDashPage("system-status") }
                        panel("announcements", "\(s.announcementsCount) \(L10n.t(model.lang, "announcements"))", "megaphone") { model.openDashPage("announcements") }
                    }
                }
                groupTitle("dashboard_group_account")
                HStack(spacing: 8) {
                    panel("profile_me", nil, "person.crop.circle") { model.openDashPage("profile") }
                    panel("dash_page_appearance", nil, "gearshape") { model.openDashPage("panel-settings") }
                }
            }
            .padding(16)
        }
        .background(KayaColor.bg)
        .onAppear { model.refreshDashboard() }
    }

    private var convMeta: String {
        let s = model.dashStats
        if s.unreadConversations > 0 {
            return "\(s.unreadConversations) \(L10n.t(model.lang, "dashboard_stat_unread"))"
        }
        return "\(s.openConversations) \(L10n.t(model.lang, "filter_open"))"
    }

    private func groupTitle(_ key: String) -> some View {
        Text(L10n.t(model.lang, key)).font(.caption).foregroundStyle(KayaColor.text3).frame(maxWidth: .infinity, alignment: .leading)
    }

    private func kpi(_ n: Int, _ key: String, action: @escaping () -> Void) -> some View {
        kpiLabel("\(n)", L10n.t(model.lang, key), action: action)
    }

    private func kpiLabel(_ num: String, _ label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 4) {
                Text(num).font(.title2.weight(.bold)).foregroundStyle(KayaColor.text)
                Text(label).font(.caption).foregroundStyle(KayaColor.text2).lineLimit(2)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(KayaColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func quick(_ key: String, _ icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: icon).font(.caption)
                Text(L10n.t(model.lang, key)).font(.caption).lineLimit(1)
            }
            .foregroundStyle(KayaColor.accent)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity)
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(KayaColor.accent, lineWidth: 1))
        }
    }

    private func panel(_ key: String, _ meta: String?, _ icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 6) {
                Image(systemName: icon).foregroundStyle(KayaColor.accent)
                Text(L10n.t(model.lang, key)).foregroundStyle(KayaColor.text).font(.subheadline.weight(.medium)).lineLimit(2)
                if let meta, !meta.isEmpty {
                    Text(meta)
                        .font(.caption2)
                        .foregroundStyle(KayaColor.accent)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(KayaColor.accentSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(KayaColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func fmtNum(_ n: Double) -> String {
        String(format: n.rounded() == n ? "%.0f" : "%.1f", n)
    }
}

func dashPageTitleKey(_ page: String) -> String {
    switch page {
    case "whatsapp": return "dash_page_whatsapp"
    case "message-templates": return "dash_page_templates"
    case "processes": return "dash_page_processes"
    case "users": return "dash_page_users"
    case "departments": return "dash_page_departments"
    case "branches": return "dash_page_branches"
    case "rates": return "dash_page_rates"
    case "rates-charts": return "dash_page_charts"
    case "services": return "dash_page_services"
    case "supervision": return "dash_page_supervision"
    case "staff-activity": return "dash_page_staff"
    case "panel-settings": return "dash_page_appearance"
    case "system-status": return "dash_page_system"
    default: return "dashboard"
    }
}

struct DashModuleView: View {
    @EnvironmentObject var model: StaffAppModel
    let page: String
    @State private var query = ""

    private var filtered: [DashItem] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        if q.isEmpty { return model.dashModuleItems }
        return model.dashModuleItems.filter {
            $0.title.localizedCaseInsensitiveContains(q)
                || $0.subtitle.localizedCaseInsensitiveContains(q)
                || $0.meta.localizedCaseInsensitiveContains(q)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Button { model.closeDashInfo() } label: {
                    Text(L10n.t(model.lang, "back")).foregroundStyle(KayaColor.accent)
                }
                Spacer()
                Button { model.refreshDashModule() } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.clockwise")
                        Text(L10n.t(model.lang, "dashboard_refresh")).font(.subheadline)
                    }
                    .foregroundStyle(KayaColor.accent)
                }
            }
            Text(L10n.t(model.lang, dashPageTitleKey(page)))
                .font(.title2.weight(.semibold))
                .foregroundStyle(KayaColor.text)
            if let err = model.dashModuleError, !err.isEmpty {
                Text(err).font(.caption).foregroundStyle(KayaColor.danger)
            }
            TextField(L10n.t(model.lang, "search"), text: $query)
                .padding(10)
                .background(KayaColor.card)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            if model.dashModuleLoading && model.dashModuleItems.isEmpty {
                Spacer()
                ProgressView().tint(KayaColor.accent).frame(maxWidth: .infinity)
                Spacer()
            } else if filtered.isEmpty {
                Text(L10n.t(model.lang, "empty_dash_module")).foregroundStyle(KayaColor.text2).padding(.top, 24)
                Spacer()
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(filtered) { row in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(row.title).foregroundStyle(KayaColor.text).fontWeight(.semibold)
                                if !row.subtitle.isEmpty {
                                    Text(row.subtitle).font(.footnote).foregroundStyle(KayaColor.text2)
                                }
                                if !row.meta.isEmpty {
                                    Text(row.meta).font(.caption).foregroundStyle(KayaColor.text3)
                                }
                            }
                            .padding(12)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(KayaColor.card)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                }
            }
        }
        .padding(16)
        .background(KayaColor.bg)
        .onAppear { model.refreshDashModule() }
    }
}

struct StaffActivityView: View {
    @EnvironmentObject var model: StaffAppModel
    @State private var tab = "online"
    @State private var query = ""
    @State private var statusFilter = "all"

    private var filteredOnline: [StaffPresence] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        return model.staffOnline.filter { row in
            let statusOk = statusFilter == "all" || row.status.caseInsensitiveCompare(statusFilter) == .orderedSame
            let hay = [row.name, row.email, row.branchName, row.departmentName].compactMap { $0 }.joined(separator: " ")
            return statusOk && (q.isEmpty || hay.localizedCaseInsensitiveContains(q))
        }
    }

    private var filteredLogins: [StaffLoginRow] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        return model.staffLogins.filter { row in
            let hay = [row.userName, row.email, row.branchName, row.ip, row.country, row.summary].compactMap { $0 }.joined(separator: " ")
            return q.isEmpty || hay.localizedCaseInsensitiveContains(q)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Button { model.closeDashInfo() } label: {
                    Text(L10n.t(model.lang, "back")).foregroundStyle(KayaColor.accent)
                }
                Spacer()
                Button { model.refreshStaffActivity() } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.clockwise")
                        Text(L10n.t(model.lang, "dashboard_refresh")).font(.subheadline)
                    }
                    .foregroundStyle(KayaColor.accent)
                }
            }
            Text(L10n.t(model.lang, "dash_page_staff"))
                .font(.title2.weight(.semibold))
                .foregroundStyle(KayaColor.text)
            if let err = model.staffActivityError {
                Text(err).font(.caption).foregroundStyle(KayaColor.danger)
            }
            HStack(spacing: 4) {
                staffTab(L10n.t(model.lang, "staff_tab_online"), "online")
                staffTab("\(L10n.t(model.lang, "staff_tab_logins")) (\(model.staffLoginsTotal > 0 ? model.staffLoginsTotal : model.staffLogins.count))", "logins")
            }
            .padding(4)
            .background(KayaColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            TextField(L10n.t(model.lang, "staff_search_ph"), text: $query)
                .padding(10)
                .background(KayaColor.card)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .foregroundStyle(KayaColor.text)
            if tab == "online" {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        statusChip("all", L10n.t(model.lang, "filter_all"))
                        statusChip("online", L10n.t(model.lang, "team_online"))
                        statusChip("away", L10n.t(model.lang, "status_away"))
                        statusChip("busy", L10n.t(model.lang, "status_busy"))
                    }
                }
            } else {
                Text(L10n.t(model.lang, "staff_logins_hint")).font(.caption).foregroundStyle(KayaColor.text3)
            }
            if model.staffActivityLoading && model.staffOnline.isEmpty && model.staffLogins.isEmpty {
                Spacer()
                ProgressView().tint(KayaColor.accent).frame(maxWidth: .infinity)
                Spacer()
            } else if tab == "online" {
                if filteredOnline.isEmpty {
                    Text(L10n.t(model.lang, model.staffOnline.isEmpty ? "no_staff_online" : "staff_no_match"))
                        .foregroundStyle(KayaColor.text2)
                        .padding(.top, 16)
                    Spacer()
                } else {
                    ScrollView {
                        VStack(spacing: 8) {
                            ForEach(filteredOnline) { row in
                                onlineCard(row)
                            }
                        }
                    }
                }
            } else if filteredLogins.isEmpty {
                Text(L10n.t(model.lang, model.staffLogins.isEmpty ? "empty_no_logins" : "staff_no_match"))
                    .foregroundStyle(KayaColor.text2)
                    .padding(.top, 16)
                Spacer()
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(filteredLogins) { row in
                            loginCard(row)
                        }
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(KayaColor.bg)
        .onAppear { model.refreshStaffActivity() }
    }

    private func staffTab(_ label: String, _ id: String) -> some View {
        Button { tab = id } label: {
            Text(label)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(tab == id ? Color.white : KayaColor.text2)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(tab == id ? KayaColor.accent : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    private func statusChip(_ id: String, _ label: String) -> some View {
        Button { statusFilter = id } label: {
            Text(label)
                .font(.caption)
                .foregroundStyle(statusFilter == id ? Color.white : KayaColor.text2)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(statusFilter == id ? KayaColor.accent : KayaColor.card)
                .clipShape(Capsule())
        }
    }

    private func onlineCard(_ row: StaffPresence) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Circle().fill(statusColor(row.status)).frame(width: 8, height: 8)
                Text(row.name).foregroundStyle(KayaColor.text).fontWeight(.medium)
                Spacer()
                Text(statusLabel(row.status))
                    .font(.caption2)
                    .foregroundStyle(statusColor(row.status))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(statusColor(row.status).opacity(0.16))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            if let email = row.email, !email.isEmpty {
                Text(email).font(.caption).foregroundStyle(KayaColor.text2).lineLimit(1)
            }
            let meta = [row.branchName, row.departmentName].compactMap { $0 }.filter { !$0.isEmpty }
            if !meta.isEmpty {
                Text(meta.joined(separator: " · ")).font(.caption).foregroundStyle(KayaColor.text3).lineLimit(1)
            }
            let loginBits = [
                (row.lastLoginAt?.isEmpty == false) ? "\(L10n.t(model.lang, "staff_last_login")) \(row.lastLoginAt ?? "")" : nil,
                row.lastLoginCountry
            ].compactMap { $0 }.filter { !$0.isEmpty }
            if !loginBits.isEmpty {
                Text(loginBits.joined(separator: " · ")).font(.caption2).foregroundStyle(KayaColor.text3).lineLimit(1)
            }
            if let ip = row.lastLoginIp, !ip.isEmpty {
                Text("\u{2066}\(ip)\u{2069}").font(.caption2).foregroundStyle(KayaColor.text3).environment(\.layoutDirection, .leftToRight)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(KayaColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func loginCard(_ row: StaffLoginRow) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(row.userName).foregroundStyle(KayaColor.text).fontWeight(.medium)
            let meta = [row.email, row.branchName, row.createdAt].compactMap { $0 }.filter { !$0.isEmpty }
            if !meta.isEmpty {
                Text(meta.joined(separator: " · ")).font(.caption).foregroundStyle(KayaColor.text2).lineLimit(2)
            }
            HStack(spacing: 0) {
                if let ip = row.ip, !ip.isEmpty {
                    Text("\u{2066}\(ip)\u{2069}").font(.caption2).foregroundStyle(KayaColor.text3).environment(\.layoutDirection, .leftToRight)
                }
                if let country = row.country, !country.isEmpty {
                    Text(" · \(country)").font(.caption2).foregroundStyle(KayaColor.text3)
                }
            }
            if let summary = row.summary, !summary.isEmpty {
                Text(summary).font(.caption).foregroundStyle(KayaColor.text3).lineLimit(2)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(KayaColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func statusLabel(_ status: String) -> String {
        switch status.lowercased() {
        case "online": return L10n.t(model.lang, "team_online")
        case "away": return L10n.t(model.lang, "status_away")
        case "busy": return L10n.t(model.lang, "status_busy")
        default: return L10n.t(model.lang, "team_offline")
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "online": return KayaColor.accent
        case "away": return Color.orange
        case "busy": return KayaColor.danger
        default: return KayaColor.text3
        }
    }
}

struct UsersDirectoryView: View {
    @EnvironmentObject var model: StaffAppModel
    @State private var query = ""
    @State private var statusFilter = "all"
    @State private var roleFilter = "all"

    private var roles: [String] {
        Array(Set(model.orgUsers.map(\.role))).sorted()
    }

    private var filtered: [OrgUser] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        return model.orgUsers.filter { row in
            let statusOk: Bool
            switch statusFilter {
            case "active": statusOk = row.isActive
            case "blocked": statusOk = !row.isActive
            default: statusOk = true
            }
            let roleOk = roleFilter == "all" || row.role == roleFilter
            let hay = [row.name, row.email, row.username, row.position, row.branchName, row.departmentName]
                .compactMap { $0 }.joined(separator: " ")
            return statusOk && roleOk && (q.isEmpty || hay.localizedCaseInsensitiveContains(q))
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Button { model.closeDashInfo() } label: {
                    Text(L10n.t(model.lang, "back")).foregroundStyle(KayaColor.accent)
                }
                Spacer()
                Button { model.refreshOrgUsers() } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.clockwise")
                        Text(L10n.t(model.lang, "dashboard_refresh")).font(.subheadline)
                    }
                    .foregroundStyle(KayaColor.accent)
                }
            }
            Text(L10n.t(model.lang, "dash_page_users"))
                .font(.title2.weight(.semibold))
                .foregroundStyle(KayaColor.text)
            if let err = model.orgUsersError {
                Text(err).font(.caption).foregroundStyle(KayaColor.danger)
            }
            TextField(L10n.t(model.lang, "users_search_ph"), text: $query)
                .padding(10)
                .background(KayaColor.card)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .foregroundStyle(KayaColor.text)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    chip("all", L10n.t(model.lang, "filter_all"), current: statusFilter) { statusFilter = "all" }
                    chip("active", L10n.t(model.lang, "users_active"), current: statusFilter) { statusFilter = "active" }
                    chip("blocked", L10n.t(model.lang, "users_blocked"), current: statusFilter) { statusFilter = "blocked" }
                    ForEach(roles, id: \.self) { role in
                        chip(role, roleLabel(role), current: roleFilter) {
                            roleFilter = roleFilter == role ? "all" : role
                        }
                    }
                }
            }
            if model.orgUsersLoading && model.orgUsers.isEmpty {
                Spacer()
                ProgressView().tint(KayaColor.accent).frame(maxWidth: .infinity)
                Spacer()
            } else if filtered.isEmpty {
                Text(L10n.t(model.lang, model.orgUsers.isEmpty ? "empty_users" : "staff_no_match"))
                    .foregroundStyle(KayaColor.text2)
                    .padding(.top, 16)
                Spacer()
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(filtered) { row in
                            userCard(row)
                        }
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(KayaColor.bg)
        .onAppear { model.refreshOrgUsers() }
    }

    private func chip(_ id: String, _ label: String, current: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption)
                .foregroundStyle(current == id ? Color.white : KayaColor.text2)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(current == id ? KayaColor.accent : KayaColor.card)
                .clipShape(Capsule())
        }
    }

    private func userCard(_ row: OrgUser) -> some View {
        let isMe = row.id == model.user?.id
        return VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top, spacing: 10) {
                ZStack(alignment: .bottomTrailing) {
                    Text(String(row.name.prefix(1)))
                        .font(.headline)
                        .foregroundStyle(KayaColor.accent)
                        .frame(width: 40, height: 40)
                        .background(KayaColor.accent.opacity(0.15))
                        .clipShape(Circle())
                    Circle().fill(statusColor(row.status)).frame(width: 10, height: 10)
                }
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(row.name).foregroundStyle(KayaColor.text).fontWeight(.medium).lineLimit(1)
                        if !row.isActive {
                            Text(L10n.t(model.lang, "users_blocked"))
                                .font(.caption2)
                                .foregroundStyle(KayaColor.danger)
                        }
                        if isMe {
                            Text(L10n.t(model.lang, "users_you"))
                                .font(.caption2)
                                .foregroundStyle(KayaColor.accent)
                        }
                    }
                    if let position = row.position, !position.isEmpty {
                        Text(position).font(.caption).foregroundStyle(KayaColor.accent).lineLimit(1)
                    }
                    if let email = row.email, !email.isEmpty {
                        Text(email).font(.caption).foregroundStyle(KayaColor.text2).lineLimit(1)
                    }
                }
                Spacer()
            }
            Text(orgMeta(row)).font(.caption).foregroundStyle(KayaColor.text3).lineLimit(1)
            Text("\(L10n.t(model.lang, "staff_last_login")): \(loginText(row))")
                .font(.caption2)
                .foregroundStyle(KayaColor.text3)
            HStack {
                Text(roleLabel(row.role))
                    .font(.caption2)
                    .foregroundStyle(KayaColor.accent)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(KayaColor.accent.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                Spacer()
                if !isMe {
                    Button { model.messageOrgUser(row) } label: {
                        Text(L10n.t(model.lang, "users_message")).font(.subheadline.weight(.medium)).foregroundStyle(KayaColor.accent)
                    }
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(KayaColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func orgMeta(_ row: OrgUser) -> String {
        [row.departmentName, row.branchName].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")
    }

    private func loginText(_ row: OrgUser) -> String {
        if let t = row.lastLoginAt, !t.isEmpty { return t }
        return L10n.t(model.lang, "staff_never")
    }

    private func roleLabel(_ role: String) -> String {
        switch role.lowercased() {
        case "owner": return L10n.t(model.lang, "role_owner")
        case "admin": return L10n.t(model.lang, "role_admin")
        case "manager": return L10n.t(model.lang, "role_manager")
        case "supervisor": return L10n.t(model.lang, "role_supervisor")
        case "agent": return L10n.t(model.lang, "role_agent")
        default: return role
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "online": return KayaColor.accent
        case "away": return Color.orange
        case "busy": return KayaColor.danger
        default: return KayaColor.text3
        }
    }
}

struct MoreMenuView: View {
    @EnvironmentObject var model: StaffAppModel

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                moreRow(L10n.t(model.lang, "tickets"), "ticket") { model.openMore(.tickets) }
                moreRow(L10n.t(model.lang, "tasks"), "checklist") { model.openMore(.tasks) }
                moreRow(L10n.t(model.lang, "team"), "person.3") { model.openMore(.team) }
                moreRow(L10n.t(model.lang, "profile_me"), "person.crop.circle") { model.openMore(.profile) }
                moreRow(L10n.t(model.lang, "logout"), "rectangle.portrait.and.arrow.right") { model.logout() }
            }
            .padding(16)
        }
        .background(KayaColor.bg)
    }

    private func moreRow(_ title: String, _ icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon).foregroundStyle(KayaColor.accent)
                Text(title).foregroundStyle(KayaColor.text)
                Spacer()
            }
            .padding(14)
            .background(KayaColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}

struct AnnouncementsView: View {
    @EnvironmentObject var model: StaffAppModel
    @State private var formOpen = true
    @State private var title = ""
    @State private var message = ""
    @State private var important = false
    @State private var targetType = "all"
    @State private var targetId = ""
    @State private var formError: String?
    @State private var pendingClear = false
    @State private var query = ""
    @State private var tab = "all"
    @State private var sort = "newest"
    @State private var deleteId: String?

    private var filtered: [AnnouncementRow] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        var list = model.announcements.filter { row in
            let tabOk: Bool
            switch tab {
            case "general": tabOk = row.targetType == "all"
            case "department": tabOk = row.targetType == "department"
            case "personal": tabOk = row.targetType == "user"
            default: tabOk = true
            }
            let hay = [row.title, row.body, row.fromName ?? ""].joined(separator: " ").lowercased()
            return tabOk && (q.isEmpty || hay.contains(q))
        }
        switch sort {
        case "oldest": list.sort { ($0.createdAt ?? "") < ($1.createdAt ?? "") }
        case "important": list.sort {
            if $0.isImportant != $1.isImportant { return $0.isImportant && !$1.isImportant }
            return ($0.createdAt ?? "") > ($1.createdAt ?? "")
        }
        default: list.sort { ($0.createdAt ?? "") > ($1.createdAt ?? "") }
        }
        return list
    }

    private var targetLabel: String {
        if targetType == "department" {
            return model.announcementDepartments.first(where: { $0.id == targetId })?.name ?? L10n.t(model.lang, "ann_one_dept")
        }
        if targetType == "user" {
            return model.announcementUsers.first(where: { $0.id == targetId })?.name ?? L10n.t(model.lang, "ann_one_user")
        }
        return L10n.t(model.lang, "ann_all")
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                if let err = model.announcementError, !err.isEmpty {
                    Text(err).font(.caption).foregroundStyle(KayaColor.danger)
                }
                if model.canSendAnnouncements {
                    sendForm
                }
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        tabChip("all", "ann_tab_all")
                        tabChip("general", "ann_tab_general")
                        tabChip("department", "ann_tab_department")
                        tabChip("personal", "ann_tab_personal")
                    }
                }
                HStack(spacing: 8) {
                    TextField(L10n.t(model.lang, "ann_search_ph"), text: $query)
                        .padding(10)
                        .background(KayaColor.card)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    Menu {
                        Button(L10n.t(model.lang, "ann_sort_newest")) { sort = "newest" }
                        Button(L10n.t(model.lang, "ann_sort_oldest")) { sort = "oldest" }
                        Button(L10n.t(model.lang, "ann_sort_important")) { sort = "important" }
                    } label: {
                        HStack(spacing: 4) {
                            Text(L10n.t(model.lang, sort == "oldest" ? "ann_sort_oldest" : (sort == "important" ? "ann_sort_important" : "ann_sort_newest")))
                                .font(.caption)
                            Image(systemName: "chevron.down").font(.caption2)
                        }
                        .foregroundStyle(KayaColor.text)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(KayaColor.card)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
                if filtered.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "megaphone.fill").font(.largeTitle).foregroundStyle(KayaColor.accent)
                        Text(L10n.t(model.lang, "ann_empty")).foregroundStyle(KayaColor.text)
                        Text(L10n.t(model.lang, "ann_empty_hint")).font(.footnote).foregroundStyle(KayaColor.text3)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 40)
                } else {
                    ForEach(filtered) { row in
                        announcementCard(row)
                    }
                }
            }
            .padding(16)
        }
        .background(KayaColor.bg)
        .onAppear {
            if model.isAnnouncementManager {
                targetType = "department"
                targetId = model.announcementDepartments.first?.id ?? ""
            }
            model.refreshAnnouncements()
        }
        .onChange(of: model.announcementSending) { _, sending in
            if pendingClear && !sending {
                if model.announcementError == nil {
                    title = ""
                    message = ""
                    important = false
                    formError = nil
                }
                pendingClear = false
            }
        }
        .alert(L10n.t(model.lang, "ann_delete_confirm"), isPresented: Binding(
            get: { deleteId != nil },
            set: { if !$0 { deleteId = nil } }
        )) {
            Button(L10n.t(model.lang, "ann_delete"), role: .destructive) {
                if let id = deleteId { model.deleteAnnouncement(id) }
                deleteId = nil
            }
            Button(L10n.t(model.lang, "cancel"), role: .cancel) { deleteId = nil }
        }
    }

    private var sendForm: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(L10n.t(model.lang, "ann_send_title")).fontWeight(.semibold).foregroundStyle(KayaColor.text)
                Spacer()
                Button {
                    formOpen.toggle()
                } label: {
                    HStack(spacing: 4) {
                        Text(L10n.t(model.lang, formOpen ? "ann_collapse" : "ann_expand")).font(.caption)
                        Image(systemName: formOpen ? "chevron.up" : "chevron.down").font(.caption2)
                    }
                    .foregroundStyle(KayaColor.accent)
                }
            }
            if formOpen {
                Text(L10n.t(model.lang, "ann_recipient")).font(.caption).foregroundStyle(KayaColor.text2)
                Menu {
                    if !model.isAnnouncementManager {
                        Button(L10n.t(model.lang, "ann_all")) { targetType = "all"; targetId = "" }
                        ForEach(model.announcementDepartments) { d in
                            Button("\(L10n.t(model.lang, "ann_one_dept")): \(d.name)") { targetType = "department"; targetId = d.id }
                        }
                        ForEach(model.announcementUsers) { u in
                            Button(u.name) { targetType = "user"; targetId = u.id }
                        }
                    } else {
                        ForEach(model.announcementDepartments) { d in
                            Button(d.name) { targetType = "department"; targetId = d.id }
                        }
                    }
                } label: {
                    HStack {
                        Text(targetLabel).foregroundStyle(KayaColor.text)
                        Spacer()
                        Image(systemName: "chevron.down").foregroundStyle(KayaColor.text3)
                    }
                    .padding(10)
                    .background(KayaColor.inputBg)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                TextField(L10n.t(model.lang, "ann_ph_title"), text: $title)
                    .padding(10)
                    .background(KayaColor.inputBg)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                TextField(L10n.t(model.lang, "ann_ph_body"), text: $message, axis: .vertical)
                    .lineLimit(3...6)
                    .padding(10)
                    .background(KayaColor.inputBg)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                Button { important.toggle() } label: {
                    HStack {
                        Image(systemName: important ? "checkmark.square.fill" : "square")
                            .foregroundStyle(important ? KayaColor.accent : KayaColor.text3)
                        Text(L10n.t(model.lang, "ann_important")).foregroundStyle(KayaColor.text).font(.footnote)
                        Spacer()
                    }
                    .padding(10)
                    .background(KayaColor.inputBg)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                if let formError, !formError.isEmpty {
                    Text(formError).font(.caption).foregroundStyle(KayaColor.danger)
                }
                HStack {
                    Button {
                        let t = title.trimmingCharacters(in: .whitespacesAndNewlines)
                        let b = message.trimmingCharacters(in: .whitespacesAndNewlines)
                        if t.isEmpty || b.isEmpty {
                            formError = L10n.t(model.lang, "required")
                            return
                        }
                        if targetType != "all" && targetId.isEmpty {
                            formError = L10n.t(model.lang, "ann_select")
                            return
                        }
                        pendingClear = true
                        model.sendAnnouncement(title: t, body: b, isImportant: important, targetType: targetType, targetId: targetId.isEmpty ? nil : targetId)
                    } label: {
                        Text(L10n.t(model.lang, "send_ann"))
                            .frame(maxWidth: .infinity)
                            .padding(12)
                            .background(KayaColor.accent)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .disabled(model.announcementSending)
                    Button {
                        title = ""
                        message = ""
                        important = false
                        formError = nil
                    } label: {
                        Text(L10n.t(model.lang, "ann_reset")).foregroundStyle(KayaColor.text2).padding(12)
                    }
                }
            }
        }
        .padding(14)
        .background(KayaColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func tabChip(_ id: String, _ key: String) -> some View {
        Button { tab = id } label: {
            Text(L10n.t(model.lang, key))
                .font(.caption)
                .foregroundStyle(tab == id ? Color.white : KayaColor.text2)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(tab == id ? KayaColor.accent : KayaColor.card)
                .clipShape(Capsule())
        }
    }

    private func announcementCard(_ row: AnnouncementRow) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(L10n.t(model.lang, row.isImportant ? "ann_type_important" : "ann_type_info"))
                    .font(.caption2)
                    .foregroundStyle(row.isImportant ? Color.white : KayaColor.text2)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(row.isImportant ? KayaColor.danger : KayaColor.bg)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                Spacer()
                if row.canDelete {
                    Button { deleteId = row.id } label: {
                        Text(L10n.t(model.lang, "ann_delete")).font(.caption).foregroundStyle(KayaColor.danger)
                    }
                }
            }
            Text(row.title).foregroundStyle(KayaColor.text).fontWeight(.semibold)
            if !row.body.isEmpty {
                Text(row.body).font(.footnote).foregroundStyle(KayaColor.text2)
            }
            let target = cardTarget(row)
            let meta = cardMeta(row, target: target)
            if !meta.isEmpty {
                Text(meta).font(.caption2).foregroundStyle(KayaColor.text3)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(KayaColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func cardTarget(_ row: AnnouncementRow) -> String {
        switch row.targetType {
        case "department": return row.targetName ?? L10n.t(model.lang, "ann_one_dept")
        case "user": return row.targetName ?? L10n.t(model.lang, "ann_one_user")
        default: return L10n.t(model.lang, "ann_all")
        }
    }

    private func cardMeta(_ row: AnnouncementRow, target: String) -> String {
        [
            row.fromName.map { "\(L10n.t(model.lang, "ann_from")) \($0)" },
            "\(L10n.t(model.lang, "ann_to")) \(target)",
            row.createdAt.map { "\(L10n.t(model.lang, "ann_sent_at")) \(String($0.prefix(16)).replacingOccurrences(of: "T", with: " "))" },
        ]
        .compactMap { $0 }
        .joined(separator: " · ")
    }
}

struct CustomersView: View {
    @EnvironmentObject var model: StaffAppModel
    @State private var showAdd = false
    @State private var showFilter = false
    @State private var newName = ""
    @State private var newPhone = ""

    var body: some View {
        ZStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    HStack {
                        Image(systemName: "magnifyingglass").foregroundStyle(KayaColor.text3)
                        TextField(L10n.t(model.lang, "customer_search_ph"), text: Binding(
                            get: { model.customerSearch },
                            set: { model.onCustomerSearch($0) }
                        ))
                        .foregroundStyle(KayaColor.text)
                    }
                    .padding(10)
                    .background(KayaColor.card)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    Button { showFilter = true } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "line.3.horizontal.decrease")
                            Text(L10n.t(model.lang, "filter")).font(.caption)
                        }
                        .foregroundStyle(KayaColor.text2)
                        .padding(10)
                        .background(KayaColor.card)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                HStack(spacing: 8) {
                    custTab(L10n.t(model.lang, "customers_tab_active"), on: !model.customerArchive) {
                        model.applyCustomerArchive(false)
                    }
                    custTab(L10n.t(model.lang, "customers_tab_archive"), on: model.customerArchive) {
                        model.applyCustomerArchive(true)
                    }
                }
                if let err = model.customersError, !err.isEmpty {
                    Text(err).font(.caption).foregroundStyle(KayaColor.danger)
                    Button(L10n.t(model.lang, "retry")) { model.refreshCustomers() }
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(KayaColor.accent)
                }
                if model.customersLoading && model.customers.isEmpty {
                    Spacer()
                    ProgressView().tint(KayaColor.accent).frame(maxWidth: .infinity)
                    Spacer()
                } else if model.customers.isEmpty {
                    Spacer()
                    Text(L10n.t(model.lang, model.customerArchive ? "empty_customers_archive" : "empty_customers"))
                        .foregroundStyle(KayaColor.text2)
                        .frame(maxWidth: .infinity)
                    Spacer()
                } else {
                    ScrollView {
                        VStack(spacing: 8) {
                            ForEach(model.customers) { row in
                                customerCard(row)
                            }
                        }
                        .padding(.bottom, 88)
                    }
                }
            }
            .padding(12)
            HStack {
                Button { showAdd = true } label: {
                    Image(systemName: "plus")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(width: 52, height: 52)
                        .background(KayaColor.accent)
                        .clipShape(Circle())
                }
                Spacer()
                Button { model.selectTab(.inbox) } label: {
                    Image(systemName: "bubble.left.fill")
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                        .background(KayaColor.accent)
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
        }
        .background(KayaColor.bg)
        .onAppear { model.refreshCustomers() }
        .onChange(of: model.pendingAddCustomer) { _, v in
            if v {
                showAdd = true
                model.pendingAddCustomer = false
            }
        }
        .sheet(isPresented: $showFilter) {
            NavigationStack {
                List {
                    Button(L10n.t(model.lang, "customers_tab_active")) {
                        model.applyCustomerArchive(false)
                        showFilter = false
                    }
                    .foregroundStyle(!model.customerArchive ? KayaColor.accent : KayaColor.text)
                    .listRowBackground(KayaColor.card)
                    Button(L10n.t(model.lang, "customers_tab_archive")) {
                        model.applyCustomerArchive(true)
                        showFilter = false
                    }
                    .foregroundStyle(model.customerArchive ? KayaColor.accent : KayaColor.text)
                    .listRowBackground(KayaColor.card)
                }
                .scrollContentBackground(.hidden)
                .background(KayaColor.bg)
                .navigationTitle(L10n.t(model.lang, "filter"))
            }
            .presentationDetents([.medium])
        }
        .sheet(isPresented: $showAdd) {
            NavigationStack {
                VStack(alignment: .leading, spacing: 12) {
                    TextField(L10n.t(model.lang, "name"), text: $newName)
                        .padding(10)
                        .background(KayaColor.inputBg)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .foregroundStyle(KayaColor.text)
                    TextField(L10n.t(model.lang, "phone"), text: $newPhone)
                        .padding(10)
                        .background(KayaColor.inputBg)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .foregroundStyle(KayaColor.text)
                        .environment(\.layoutDirection, .leftToRight)
                    Button {
                        model.createCustomer(name: newName, phone: newPhone)
                        newName = ""
                        newPhone = ""
                        showAdd = false
                    } label: {
                        Text(L10n.t(model.lang, "customer_add"))
                            .frame(maxWidth: .infinity)
                            .padding(12)
                            .background(KayaColor.accent)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    Spacer()
                }
                .padding(16)
                .background(KayaColor.bg)
                .navigationTitle(L10n.t(model.lang, "customer_add"))
            }
            .presentationDetents([.medium])
        }
    }

    private func custTab(_ label: String, on: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(on ? .white : KayaColor.text)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(on ? KayaColor.accent : Color.clear)
                .overlay(Capsule().stroke(KayaColor.accent, lineWidth: 1))
                .clipShape(Capsule())
        }
    }

    private func customerCard(_ row: CustomerRow) -> some View {
        HStack(spacing: 10) {
            CustomerPhotoView(
                url: model.customerAvatarUrl(row.id),
                name: row.name,
                token: model.authToken
            )
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(PhoneDisplay.customerName(row.name, phone: row.phone, fallback: L10n.t(model.lang, "customer"))).foregroundStyle(KayaColor.text).fontWeight(.semibold).lineLimit(1)
                        .ltrIfPhone(row.name)
                    Text(statusLabel(row.status))
                        .font(.caption2)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(KayaColor.accent)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                Text(PhoneDisplay.phoneOrFallback(row.phone, fallback: row.email ?? "—")).font(.caption).foregroundStyle(KayaColor.text2).lineLimit(1)
                    .ltrIfPhone(row.phone)
                Text(cardMeta(row)).font(.caption2).foregroundStyle(KayaColor.text3).lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Button {
                model.openCustomer(row)
            } label: {
                Text(L10n.t(model.lang, "btn_send"))
                    .font(.subheadline)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(KayaColor.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .padding(12)
        .background(KayaColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .contentShape(Rectangle())
        .onTapGesture { model.openCustomerProfile(row) }
    }

    private func statusLabel(_ status: String) -> String {
        switch status {
        case "blocked": return L10n.t(model.lang, "status_blocked")
        case "inactive": return L10n.t(model.lang, "status_inactive")
        default: return L10n.t(model.lang, "status_active")
        }
    }

    private func cardMeta(_ row: CustomerRow) -> String {
        [
            shortDate(row.lastContactAt),
            "\(row.totalConversations) \(L10n.t(model.lang, "conv_count"))",
            row.departmentName ?? row.assigneeName,
        ]
        .compactMap { $0 }
        .filter { !$0.isEmpty && $0 != "—" }
        .joined(separator: " · ")
    }
}

struct CustomerDetailView: View {
    @EnvironmentObject var model: StaffAppModel
    @State private var tab = 0
    @State private var showEdit = false
    @State private var editName = ""
    @State private var editPhone = ""
    @State private var editEmail = ""
    @State private var editNotes = ""
    @State private var editBirthDate = ""
    @State private var editNationalId = ""
    @State private var editNationality = ""
    @State private var editGender = ""
    @State private var editOccupation = ""
    @State private var editCompany = ""
    @State private var editAddress = ""
    @State private var editCity = ""
    @State private var editCountry = ""
    @State private var editPostal = ""
    @State private var editInstagram = ""
    @State private var editTelegram = ""
    @State private var editWebsite = ""
    @State private var editStatus = "active"
    @State private var formError: String?
    private let tabs = ["customer_timeline", "customer_history", "customer_transactions", "customer_docs", "customer_notes"]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Button { model.closeCustomerProfile() } label: {
                    Text(L10n.t(model.lang, "back_to_customers")).foregroundStyle(KayaColor.accent)
                }
                if let c = model.customerProfile {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        actionChip(L10n.t(model.lang, "customer_quick_chat"), bg: KayaColor.accent, fg: .white) {
                            model.openCustomer(c)
                        }
                        actionChip(L10n.t(model.lang, "customer_quick_edit"), bg: KayaColor.card, fg: KayaColor.text) {
                            fillEdit(c)
                            showEdit = true
                        }
                        actionChip(L10n.t(model.lang, "transaction_add"), bg: KayaColor.card, fg: KayaColor.text) { tab = 2 }
                    }
                    HStack(spacing: 8) {
                        actionChip(L10n.t(model.lang, "access_grant_btn"), bg: KayaColor.card, fg: KayaColor.text) {}
                        actionChip(L10n.t(model.lang, "customer_delete"), bg: KayaColor.danger, fg: .white) {}
                    }
                    HStack(alignment: .top, spacing: 12) {
                        CustomerPhotoView(
                            url: model.customerAvatarUrl(c.id),
                            name: c.name,
                            token: model.authToken
                        )
                        VStack(alignment: .leading, spacing: 4) {
                            Text(PhoneDisplay.label(c.name)).font(.title3.weight(.semibold)).foregroundStyle(KayaColor.text)
                                .ltrIfPhone(c.name)
                            HStack(spacing: 0) {
                                Text("\(L10n.t(model.lang, "phone")): ").font(.subheadline).foregroundStyle(KayaColor.text2)
                                Text(c.phone ?? "—").font(.subheadline).foregroundStyle(KayaColor.text2)
                                    .environment(\.layoutDirection, .leftToRight)
                            }
                            HStack(spacing: 4) {
                                Text("\(L10n.t(model.lang, "status")):").foregroundStyle(KayaColor.text2)
                                Text(statusLabel(c.status)).foregroundStyle(KayaColor.accent)
                            }
                            .font(.subheadline)
                            Text("\(L10n.t(model.lang, "first_contact")): \(shortDate(c.firstContactAt))")
                                .font(.caption).foregroundStyle(KayaColor.text3)
                            Text("\(L10n.t(model.lang, "last_contact")): \(shortDate(c.lastContactAt))")
                                .font(.caption).foregroundStyle(KayaColor.text3)
                            Text("\(c.totalConversations) \(L10n.t(model.lang, "conv_count"))")
                                .font(.caption).foregroundStyle(KayaColor.text3)
                        }
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(KayaColor.card)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    HStack(spacing: 6) {
                        ForEach(0..<3, id: \.self) { i in
                            detailTab(L10n.t(model.lang, tabs[i]), on: tab == i) { tab = i }
                        }
                    }
                    HStack(spacing: 6) {
                        ForEach(3..<5, id: \.self) { i in
                            detailTab(L10n.t(model.lang, tabs[i]), on: tab == i) { tab = i }
                        }
                    }
                    if let err = model.customersError, !err.isEmpty {
                        Text(err).font(.caption).foregroundStyle(KayaColor.danger)
                    }
                    if model.customerDetailLoading && model.customerTimeline.isEmpty && tab == 0 {
                        ProgressView().tint(KayaColor.accent).frame(maxWidth: .infinity).padding(.vertical, 24)
                    } else if tab == 0 {
                        if model.customerTimeline.isEmpty {
                            Text(L10n.t(model.lang, "empty_timeline")).foregroundStyle(KayaColor.text2)
                        } else {
                            ForEach(model.customerTimeline) { item in
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(item.title).foregroundStyle(KayaColor.text).fontWeight(.medium)
                                    if !item.meta.isEmpty {
                                        Text(item.meta).font(.caption).foregroundStyle(KayaColor.text2)
                                    }
                                }
                                .padding(12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(KayaColor.card)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .onTapGesture {
                                    if let id = item.conversationId { model.openTimelineConversation(id) }
                                }
                            }
                        }
                    } else {
                        Text(L10n.t(model.lang, "empty_timeline")).foregroundStyle(KayaColor.text2)
                    }
                }
            }
            .padding(12)
            .padding(.bottom, 88)
        }
        .background(KayaColor.bg)
        .sheet(isPresented: $showEdit) {
            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(L10n.t(model.lang, "customer_modal_subtitle")).font(.footnote).foregroundStyle(KayaColor.text2)
                        section(L10n.t(model.lang, "customer_contact_info"))
                        editField(L10n.t(model.lang, "name"), text: $editName)
                        editField(L10n.t(model.lang, "phone"), text: $editPhone, ltr: true)
                        editField(L10n.t(model.lang, "email"), text: $editEmail)
                        section(L10n.t(model.lang, "customer_personal"))
                        editField(L10n.t(model.lang, "birth_date"), text: $editBirthDate)
                        editField(L10n.t(model.lang, "national_id"), text: $editNationalId)
                        editField(L10n.t(model.lang, "nationality"), text: $editNationality)
                        HStack(spacing: 6) {
                            genderPick("", "gender_select")
                            genderPick("male", "gender_male")
                            genderPick("female", "gender_female")
                            genderPick("other", "gender_other")
                        }
                        editField(L10n.t(model.lang, "occupation"), text: $editOccupation)
                        editField(L10n.t(model.lang, "company_name"), text: $editCompany)
                        section(L10n.t(model.lang, "customer_address"))
                        editField(L10n.t(model.lang, "address"), text: $editAddress)
                        editField(L10n.t(model.lang, "city"), text: $editCity)
                        editField(L10n.t(model.lang, "country"), text: $editCountry)
                        editField(L10n.t(model.lang, "postal_code"), text: $editPostal)
                        section(L10n.t(model.lang, "customer_social"))
                        editField(L10n.t(model.lang, "instagram"), text: $editInstagram)
                        editField(L10n.t(model.lang, "telegram"), text: $editTelegram)
                        editField(L10n.t(model.lang, "website"), text: $editWebsite, ltr: true)
                        section(L10n.t(model.lang, "status"))
                        HStack(spacing: 6) {
                            statusPick("active")
                            statusPick("inactive")
                            statusPick("blocked")
                        }
                        Text(L10n.t(model.lang, "customer_status_hint")).font(.caption2).foregroundStyle(KayaColor.text3)
                        section(L10n.t(model.lang, "customer_notes_label"))
                        editField(L10n.t(model.lang, "customer_notes_ph"), text: $editNotes)
                        if let formError, !formError.isEmpty {
                            Text(formError).font(.caption).foregroundStyle(KayaColor.danger)
                        }
                        Button {
                            saveEdit()
                        } label: {
                            Text(L10n.t(model.lang, "save"))
                                .frame(maxWidth: .infinity)
                                .padding(12)
                                .background(KayaColor.accent)
                                .foregroundStyle(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                        .disabled(model.customerSaving)
                        Button { showEdit = false } label: {
                            Text(L10n.t(model.lang, "cancel")).frame(maxWidth: .infinity).foregroundStyle(KayaColor.text2)
                        }
                    }
                    .padding(16)
                }
                .background(KayaColor.bg)
                .navigationTitle(L10n.t(model.lang, "customer_quick_edit"))
            }
            .presentationDetents([.large])
        }
    }

    private func fillEdit(_ c: CustomerRow) {
        editName = c.name
        editPhone = c.phone ?? ""
        editEmail = c.email ?? ""
        editNotes = c.notes ?? ""
        editBirthDate = c.birthDate ?? ""
        editNationalId = c.nationalId ?? ""
        editNationality = c.nationality ?? ""
        editGender = c.gender ?? ""
        editOccupation = c.occupation ?? ""
        editCompany = c.companyName ?? ""
        editAddress = c.address ?? ""
        editCity = c.city ?? ""
        editCountry = c.country ?? ""
        editPostal = c.postalCode ?? ""
        editInstagram = c.instagram ?? ""
        editTelegram = c.telegram ?? ""
        editWebsite = c.website ?? ""
        editStatus = c.status.isEmpty ? "active" : c.status
        formError = nil
    }

    private func saveEdit() {
        let name = editName.trimmingCharacters(in: .whitespacesAndNewlines)
        if name.isEmpty {
            formError = L10n.t(model.lang, "required")
            return
        }
        guard var draft = model.customerProfile else { return }
        draft.name = name
        draft.phone = blankToNil(editPhone)
        draft.email = blankToNil(editEmail)
        draft.status = editStatus
        draft.notes = blankToNil(editNotes)
        draft.birthDate = blankToNil(editBirthDate)
        draft.nationalId = blankToNil(editNationalId)
        draft.nationality = blankToNil(editNationality)
        draft.gender = blankToNil(editGender)
        draft.occupation = blankToNil(editOccupation)
        draft.companyName = blankToNil(editCompany)
        draft.address = blankToNil(editAddress)
        draft.city = blankToNil(editCity)
        draft.country = blankToNil(editCountry)
        draft.postalCode = blankToNil(editPostal)
        draft.instagram = blankToNil(editInstagram)
        draft.telegram = blankToNil(editTelegram)
        draft.website = blankToNil(editWebsite)
        model.updateCustomer(draft)
        showEdit = false
    }

    private func section(_ title: String) -> some View {
        Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(KayaColor.text).padding(.top, 6)
    }

    private func editField(_ label: String, text: Binding<String>, ltr: Bool = false) -> some View {
        let field = TextField(label, text: text)
            .padding(10)
            .background(KayaColor.inputBg)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .foregroundStyle(KayaColor.text)
        return Group {
            if ltr {
                field.environment(\.layoutDirection, .leftToRight)
            } else {
                field
            }
        }
    }

    private func genderPick(_ id: String, _ key: String) -> some View {
        Button { editGender = id } label: {
            Text(L10n.t(model.lang, key))
                .font(.caption)
                .foregroundStyle(editGender == id ? Color.white : KayaColor.text2)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(editGender == id ? KayaColor.accent : KayaColor.card)
                .clipShape(Capsule())
        }
    }

    private func statusPick(_ id: String) -> some View {
        Button { editStatus = id } label: {
            Text(statusLabel(id))
                .font(.caption)
                .foregroundStyle(editStatus == id ? Color.white : KayaColor.text2)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(editStatus == id ? KayaColor.accent : KayaColor.card)
                .clipShape(Capsule())
        }
    }

    private func actionChip(_ label: String, bg: Color, fg: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption)
                .foregroundStyle(fg)
                .lineLimit(1)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(bg)
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private func detailTab(_ label: String, on: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Text(label)
                    .font(.caption)
                    .fontWeight(on ? .semibold : .regular)
                    .foregroundStyle(on ? KayaColor.accent : KayaColor.text2)
                    .lineLimit(1)
                Rectangle()
                    .fill(on ? KayaColor.accent : Color.clear)
                    .frame(height: 2)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func statusLabel(_ status: String) -> String {
        switch status {
        case "blocked": return L10n.t(model.lang, "status_blocked")
        case "inactive": return L10n.t(model.lang, "status_inactive")
        default: return L10n.t(model.lang, "status_active")
        }
    }
}

private func shortDate(_ raw: String?) -> String {
    guard let raw, !raw.isEmpty else { return "—" }
    return String(raw.prefix(10))
}

struct TicketsView: View {
    @EnvironmentObject var model: StaffAppModel

    var body: some View {
        listStack(
            lang: model.lang,
            loading: model.ticketsLoading && model.tickets.isEmpty,
            empty: model.tickets.isEmpty,
            emptyKey: "empty_tickets",
            error: model.ticketsError,
            onRetry: { model.refreshTickets() }
        ) {
            List(model.tickets) { row in
                VStack(alignment: .leading, spacing: 4) {
                    Text(row.title).foregroundStyle(KayaColor.text).fontWeight(.medium)
                    Text([row.ticketNumber, row.status, row.priority].compactMap { $0 }.joined(separator: " · "))
                        .font(.caption)
                        .foregroundStyle(KayaColor.text2)
                }
                .listRowBackground(KayaColor.card)
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
        }
        .onAppear { model.refreshTickets() }
    }
}

struct TasksView: View {
    @EnvironmentObject var model: StaffAppModel

    var body: some View {
        listStack(
            lang: model.lang,
            loading: model.tasksLoading && model.tasks.isEmpty,
            empty: model.tasks.isEmpty,
            emptyKey: "empty_tasks",
            error: model.tasksError,
            onRetry: { model.refreshTasks() }
        ) {
            List(model.tasks) { row in
                VStack(alignment: .leading, spacing: 4) {
                    Text(row.title).foregroundStyle(KayaColor.text).fontWeight(.medium)
                    Text([row.status, row.priority, row.assigneeName].compactMap { $0 }.joined(separator: " · "))
                        .font(.caption)
                        .foregroundStyle(KayaColor.text2)
                }
                .listRowBackground(KayaColor.card)
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
        }
        .onAppear { model.refreshTasks() }
    }
}

struct TeamListView: View {
    @EnvironmentObject var model: StaffAppModel
    @State private var showNew = false

    private var filteredUsers: [TeamColleague] {
        let q = model.teamUserSearch.trimmingCharacters(in: .whitespacesAndNewlines)
        if q.isEmpty { return model.teamUsers }
        return model.teamUsers.filter {
            $0.name.localizedCaseInsensitiveContains(q) || ($0.email?.localizedCaseInsensitiveContains(q) == true)
        }
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            listStack(
                lang: model.lang,
                loading: model.teamLoading && model.teamThreads.isEmpty,
                empty: model.teamThreads.isEmpty,
                emptyKey: "team_start_hint"
            ) {
                List(model.teamThreads) { row in
                    Button { model.openTeamThread(row) } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(row.displayName).foregroundStyle(KayaColor.text).fontWeight(.medium)
                                Text(row.lastPreview ?? "").font(.footnote).foregroundStyle(KayaColor.text2).lineLimit(1)
                            }
                            Spacer()
                            if row.unreadCount > 0 {
                                Text("\(row.unreadCount)").font(.caption).foregroundStyle(KayaColor.accent)
                            }
                        }
                    }
                    .listRowBackground(KayaColor.card)
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
            Button { showNew = true } label: {
                Image(systemName: "plus")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(.white)
                    .frame(width: 56, height: 56)
                    .background(KayaColor.accent)
                    .clipShape(Circle())
            }
            .padding(16)
            .accessibilityLabel(L10n.t(model.lang, "team_new"))
        }
        .onAppear { model.refreshTeam() }
        .sheet(isPresented: $showNew) {
            NavigationStack {
                VStack(alignment: .leading, spacing: 10) {
                    Text(L10n.t(model.lang, "team_pick_hint"))
                        .font(.footnote)
                        .foregroundStyle(KayaColor.text2)
                    TextField(L10n.t(model.lang, "team_search_ph"), text: $model.teamUserSearch)
                        .padding(10)
                        .background(KayaColor.inputBg)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .foregroundStyle(KayaColor.text)
                    if model.teamUsersLoading && model.teamUsers.isEmpty {
                        ProgressView().tint(KayaColor.accent).frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if filteredUsers.isEmpty {
                        Text(L10n.t(model.lang, "empty_team_users"))
                            .foregroundStyle(KayaColor.text2)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        List(filteredUsers) { user in
                            Button {
                                showNew = false
                                model.startTeamChat(user)
                            } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(user.name).foregroundStyle(KayaColor.text)
                                        Text(user.email ?? (user.status == "online" ? L10n.t(model.lang, "team_online") : L10n.t(model.lang, "team_offline")))
                                            .font(.caption)
                                            .foregroundStyle(KayaColor.text2)
                                    }
                                    Spacer()
                                    Circle()
                                        .fill(user.status == "online" ? KayaColor.accent : KayaColor.text3)
                                        .frame(width: 8, height: 8)
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
                .navigationTitle(L10n.t(model.lang, "team_new"))
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(L10n.t(model.lang, "back")) { showNew = false }
                    }
                }
            }
            .presentationDetents([.medium, .large])
            .onAppear { model.refreshTeamUsers() }
        }
    }
}

struct TeamChatView: View {
    @EnvironmentObject var model: StaffAppModel

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button { model.closeTeamThread() } label: {
                    Image(systemName: "chevron.backward").foregroundStyle(KayaColor.text)
                }
                Text(model.openThread?.displayName ?? "")
                    .font(.headline)
                    .foregroundStyle(KayaColor.text)
                    .lineLimit(1)
                Spacer()
            }
            .padding()
            .background(KayaColor.bg2)
            if let err = model.teamError, !err.isEmpty {
                Text(err).font(.caption).foregroundStyle(KayaColor.danger).padding(.horizontal, 12)
            }
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 8) {
                        ForEach(model.teamMessages) { msg in
                            HStack {
                                if msg.fromMe { Spacer(minLength: 40) }
                                VStack(alignment: msg.fromMe ? .trailing : .leading, spacing: 4) {
                                    if !msg.fromMe, let name = msg.senderName, !name.isEmpty {
                                        Text(name).font(.caption2).foregroundStyle(KayaColor.accent)
                                    }
                                    Text(msg.content.isEmpty ? L10n.t(model.lang, "media") : msg.content)
                                        .foregroundStyle(KayaColor.text)
                                }
                                .padding(10)
                                .background(msg.fromMe ? KayaColor.bubbleOut : KayaColor.bubbleIn)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                                if !msg.fromMe { Spacer(minLength: 40) }
                            }
                            .id(msg.id)
                        }
                    }
                    .padding(12)
                }
                .onChange(of: model.teamMessages.count) { _, _ in
                    if let last = model.teamMessages.last {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }
            HStack {
                TextField(L10n.t(model.lang, "message_ph"), text: $model.teamDraft, axis: .vertical)
                    .padding(10)
                    .background(KayaColor.inputBg)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .foregroundStyle(KayaColor.text)
                Button { model.sendTeam() } label: {
                    Image(systemName: "paperplane.fill").foregroundStyle(KayaColor.accent)
                }
                .disabled(model.teamSending || model.teamDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding(10)
            .background(KayaColor.bg2)
        }
        .background(KayaColor.bg)
    }
}

struct ProfileView: View {
    @EnvironmentObject var model: StaffAppModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(L10n.t(model.lang, "profile_intro")).font(.footnote).foregroundStyle(KayaColor.text2)
                VStack(spacing: 10) {
                    ZStack {
                        Circle().fill(KayaColor.accent.opacity(0.15)).frame(width: 72, height: 72)
                        if let url = model.avatarUrl {
                            AsyncImage(url: url) { image in
                                image.resizable().scaledToFill()
                            } placeholder: {
                                Text(model.avatarLetter).font(.title).foregroundStyle(KayaColor.accent)
                            }
                            .frame(width: 72, height: 72)
                            .clipShape(Circle())
                        } else {
                            Text(model.avatarLetter).font(.title).foregroundStyle(KayaColor.accent)
                        }
                    }
                    Text(model.user?.name ?? "—").font(.title3.weight(.semibold)).foregroundStyle(KayaColor.text)
                    if let username = model.user?.username, !username.isEmpty {
                        Text("@\(username)").font(.footnote).foregroundStyle(KayaColor.text2)
                    }
                    Text(model.user?.email ?? "").font(.footnote).foregroundStyle(KayaColor.text2)
                    Text(model.user?.role ?? "")
                        .font(.caption)
                        .foregroundStyle(KayaColor.accent)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(KayaColor.accent.opacity(0.15))
                        .clipShape(Capsule())
                }
                .padding(16)
                .frame(maxWidth: .infinity)
                .background(KayaColor.card)
                .clipShape(RoundedRectangle(cornerRadius: 16))

                Text(L10n.t(model.lang, "profile_readonly")).fontWeight(.medium).foregroundStyle(KayaColor.text)
                VStack(alignment: .leading, spacing: 10) {
                    Text(L10n.t(model.lang, "login_email")).font(.caption).foregroundStyle(KayaColor.text3)
                    Text(model.user?.email ?? "—").foregroundStyle(KayaColor.text)
                    Text(L10n.t(model.lang, "role")).font(.caption).foregroundStyle(KayaColor.text3)
                    Text(model.user?.role ?? "—").foregroundStyle(KayaColor.text)
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(KayaColor.card)
                .clipShape(RoundedRectangle(cornerRadius: 14))

                Text(L10n.t(model.lang, "language")).font(.caption).foregroundStyle(KayaColor.text2)
                HStack {
                    ForEach([("fa", "فارسی"), ("en", "EN"), ("tr", "TR")], id: \.0) { item in
                        Button(item.1) { model.setLang(item.0) }
                            .foregroundStyle(model.lang == item.0 ? KayaColor.accent : KayaColor.text3)
                    }
                }
                TextField(L10n.t(model.lang, "server"), text: $model.serverUrl)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .padding(12)
                    .background(KayaColor.inputBg)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .foregroundStyle(KayaColor.text)
                Button(L10n.t(model.lang, "save_server")) { model.persistServer() }
                    .buttonStyle(KayaButtonStyle(loading: false))
                Button(L10n.t(model.lang, "logout")) { model.logout() }
                    .buttonStyle(KayaButtonStyle(loading: false))
            }
            .padding(16)
        }
        .background(KayaColor.bg)
    }
}

@ViewBuilder
private func listStack<Content: View>(
    lang: String,
    loading: Bool,
    empty: Bool,
    emptyKey: String,
    error: String? = nil,
    onRetry: (() -> Void)? = nil,
    @ViewBuilder content: () -> Content
) -> some View {
    VStack(alignment: .leading, spacing: 12) {
        if loading {
            Spacer()
            ProgressView().tint(KayaColor.accent).frame(maxWidth: .infinity)
            Spacer()
        } else {
            if let error, !error.isEmpty {
                Text(error)
                    .foregroundStyle(KayaColor.danger)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                if let onRetry {
                    Button(L10n.t(lang, "retry"), action: onRetry)
                        .buttonStyle(.borderedProminent)
                        .tint(KayaColor.accent)
                        .frame(minHeight: 44)
                }
            }
            if empty {
                if error == nil || error?.isEmpty == true {
                    Spacer()
                    Text(L10n.t(lang, emptyKey)).foregroundStyle(KayaColor.text2).frame(maxWidth: .infinity)
                    Spacer()
                }
            } else {
                content()
            }
        }
    }
    .padding(16)
    .background(KayaColor.bg)
}

private func blankToNil(_ value: String) -> String? {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? nil : trimmed
}
