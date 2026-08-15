/**
 * Kaya CRM — customers, tickets, profile
 * @file    ios-app/KayaStaff/Features/Lists/ListViews.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
import SwiftUI

struct CustomersView: View {
    @EnvironmentObject var model: StaffAppModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(L10n.t(model.lang, "customers")).font(.title2.weight(.semibold)).foregroundStyle(KayaColor.text)
            TextField(L10n.t(model.lang, "search"), text: Binding(
                get: { model.customerSearch },
                set: { model.onCustomerSearch($0) }
            ))
            .padding(10)
            .background(KayaColor.inputBg)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .foregroundStyle(KayaColor.text)
            if model.customersLoading && model.customers.isEmpty {
                Spacer()
                ProgressView().tint(KayaColor.accent).frame(maxWidth: .infinity)
                Spacer()
            } else if model.customers.isEmpty {
                Spacer()
                Text(L10n.t(model.lang, "empty_customers")).foregroundStyle(KayaColor.text2).frame(maxWidth: .infinity)
                Spacer()
            } else {
                List(model.customers) { row in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(row.name).foregroundStyle(KayaColor.text).fontWeight(.medium)
                        Text(row.phone ?? row.email ?? row.status).font(.footnote).foregroundStyle(KayaColor.text2)
                    }
                    .listRowBackground(KayaColor.card)
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
        .padding(16)
        .background(KayaColor.bg)
        .onAppear { model.refreshCustomers() }
    }
}

struct TicketsView: View {
    @EnvironmentObject var model: StaffAppModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(L10n.t(model.lang, "tickets")).font(.title2.weight(.semibold)).foregroundStyle(KayaColor.text)
            if model.ticketsLoading && model.tickets.isEmpty {
                Spacer()
                ProgressView().tint(KayaColor.accent).frame(maxWidth: .infinity)
                Spacer()
            } else if model.tickets.isEmpty {
                Spacer()
                Text(L10n.t(model.lang, "empty_tickets")).foregroundStyle(KayaColor.text2).frame(maxWidth: .infinity)
                Spacer()
            } else {
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
        }
        .padding(16)
        .background(KayaColor.bg)
        .onAppear { model.refreshTickets() }
    }
}

struct ProfileView: View {
    @EnvironmentObject var model: StaffAppModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(L10n.t(model.lang, "profile")).font(.title2.weight(.semibold)).foregroundStyle(KayaColor.text)
                VStack(alignment: .leading, spacing: 6) {
                    Text(model.user?.name ?? "—").font(.title3.weight(.semibold)).foregroundStyle(KayaColor.text)
                    Text(model.user?.email ?? "").foregroundStyle(KayaColor.text2)
                    Text("\(L10n.t(model.lang, "role")): \(model.user?.role ?? "")")
                        .font(.caption)
                        .foregroundStyle(KayaColor.text3)
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(KayaColor.card)
                .clipShape(RoundedRectangle(cornerRadius: 16))

                Text(L10n.t(model.lang, "language")).font(.caption).foregroundStyle(KayaColor.text2)
                HStack {
                    ForEach([("fa", "فارسی"), ("en", "EN"), ("tr", "TR")], id: \.0) { item in
                        Button(item.1) { model.setLang(item.0) }
                            .foregroundStyle(model.lang == item.0 ? KayaColor.accent : KayaColor.text3)
                    }
                }
                Text(L10n.t(model.lang, "server")).font(.caption).foregroundStyle(KayaColor.text2)
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
