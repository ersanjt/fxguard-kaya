/**
 * Kaya CRM — login / forgot (web login parity)
 * @file    ios-app/KayaStaff/Features/Auth/LoginView.swift
 * @layer   ios
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     backend/public/login.html
 */
import SwiftUI

struct LoginView: View {
    @EnvironmentObject var model: StaffAppModel
    @State private var email = ""
    @State private var password = ""
    @State private var showPass = false
    @State private var showServer = false
    @State private var forgot = false

    var body: some View {
        let t = { L10n.t(model.lang, $0) }
        ScrollView {
            VStack(spacing: 16) {
                if let url = model.logoUrl() {
                    AsyncImage(url: url) { img in
                        img.resizable().scaledToFit()
                    } placeholder: {
                        logoFallback
                    }
                    .frame(width: 88, height: 88)
                } else {
                    logoFallback
                }
                Text(model.branding?.displayTitle ?? "KAYA")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(KayaColor.text)
                Text(t("login_sub"))
                    .font(.footnote)
                    .foregroundStyle(KayaColor.text2)
                    .multilineTextAlignment(.center)
                langSwitch
                if forgot {
                    field(t("login_email"), text: $email)
                    errorLine
                    Button(t("forgot_send")) { model.forgot(email.trimmingCharacters(in: .whitespaces)) }
                        .buttonStyle(KayaButtonStyle(loading: model.authLoading))
                    Button(t("back")) { forgot = false }.foregroundStyle(KayaColor.text2)
                } else {
                    Text(t("login_title")).font(.headline).foregroundStyle(KayaColor.text)
                    field(t("login_email"), text: $email)
                    HStack {
                        Group {
                            if showPass {
                                TextField(t("login_pass"), text: $password)
                            } else {
                                SecureField(t("login_pass"), text: $password)
                            }
                        }
                        Button {
                            showPass.toggle()
                        } label: {
                            Image(systemName: showPass ? "eye.slash" : "eye")
                                .foregroundStyle(KayaColor.text2)
                        }
                    }
                    .padding(12)
                    .background(KayaColor.inputBg)
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(KayaColor.border))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    errorLine
                    Button(model.authLoading ? t("login_loading") : t("login_btn")) {
                        model.login(identifier: email.trimmingCharacters(in: .whitespaces), password: password)
                    }
                    .buttonStyle(KayaButtonStyle(loading: model.authLoading))
                    Button(t("forgot")) { forgot = true }.foregroundStyle(KayaColor.accent)
                    Button(t("server")) { showServer.toggle() }.font(.caption).foregroundStyle(KayaColor.text3)
                    if showServer {
                        field(t("server"), text: $model.serverUrl)
                    }
                }
            }
            .padding(22)
            .background(KayaColor.card)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .padding(20)
        }
    }

    private var logoFallback: some View {
        Text("K")
            .font(.title.bold())
            .foregroundStyle(KayaColor.accent)
            .frame(width: 72, height: 72)
            .background(KayaColor.accent.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private var langSwitch: some View {
        HStack(spacing: 4) {
            ForEach([("fa", "فارسی"), ("en", "English"), ("tr", "Türkçe")], id: \.0) { item in
                let active = model.lang == item.0
                Text(item.1)
                    .font(.caption)
                    .foregroundStyle(active ? KayaColor.text : KayaColor.text3)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(active ? KayaColor.accent.opacity(0.15) : Color.clear)
                    .clipShape(Capsule())
                    .onTapGesture { model.setLang(item.0) }
            }
        }
        .padding(4)
        .background(KayaColor.inputBg)
        .clipShape(Capsule())
    }

    private var errorLine: some View {
        Group {
            if let err = model.authError, !err.isEmpty {
                Text(err).font(.footnote).foregroundStyle(KayaColor.danger)
            }
        }
    }

    private func field(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.caption).foregroundStyle(KayaColor.text2)
            TextField(label, text: text)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .padding(12)
                .background(KayaColor.inputBg)
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(KayaColor.border))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .foregroundStyle(KayaColor.text)
        }
    }
}

struct TotpView: View {
    @EnvironmentObject var model: StaffAppModel
    @State private var code = ""

    var body: some View {
        let t = { L10n.t(model.lang, $0) }
        VStack(alignment: .leading, spacing: 14) {
            Text(t("totp_title")).font(.title3.weight(.semibold)).foregroundStyle(KayaColor.text)
            Text(t("totp_sub")).font(.footnote).foregroundStyle(KayaColor.text2)
            if let hint = model.totpHint {
                Text(hint).font(.caption).foregroundStyle(KayaColor.text3)
            }
            TextField("TOTP", text: $code)
                .keyboardType(.numberPad)
                .padding(12)
                .background(KayaColor.inputBg)
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(KayaColor.border))
                .onChange(of: code) { _, v in
                    code = String(v.filter(\.isNumber).prefix(6))
                }
            if let err = model.authError { Text(err).foregroundStyle(KayaColor.danger).font(.footnote) }
            Button(t("totp_btn")) { model.verifyTotp(code) }
                .buttonStyle(KayaButtonStyle(loading: model.authLoading))
            Button(t("back")) { model.backToLogin() }.foregroundStyle(KayaColor.text2)
        }
        .padding(22)
        .background(KayaColor.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .padding(20)
    }
}

struct KayaButtonStyle: ButtonStyle {
    var loading: Bool
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(KayaColor.accent.opacity(loading ? 0.7 : 1))
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}
