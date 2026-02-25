//
//  LoginViewModel.swift
//  KayaCRM
//
//  ViewModel ورود
//

import Foundation
import Combine

@MainActor
final class LoginViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var needTotp: Bool = false
    @Published var tempToken: String?
    @Published var isLoggedIn = false
    
    private let api = ApiService.shared
    private let storage = AuthStorage.shared
    
    var savedServerUrl: String? { storage.baseUrl }
    
    func login(email: String, password: String) {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let response = try await api.login(email: email, password: password)
                if response.needTotp == true, let token = response.tempToken {
                    needTotp = true
                    tempToken = token
                } else if let token = response.token {
                    storage.setToken(token)
                    response.user.map { storage.setUser($0) }
                    isLoggedIn = true
                } else if let err = response.error {
                    errorMessage = err
                } else {
                    errorMessage = "خطا در ورود"
                }
            } catch ApiError.serverError(let msg) {
                errorMessage = msg
            } catch ApiError.unauthorized {
                errorMessage = "نام کاربری یا رمز عبور اشتباه است"
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
    
    func verifyTotp(code: String) {
        guard let token = tempToken else { return }
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let response = try await api.verifyTotp(tempToken: token, code: code)
                if let t = response.token {
                    storage.setToken(t)
                    response.user.map { storage.setUser($0) }
                    isLoggedIn = true
                } else if let err = response.error {
                    errorMessage = err
                } else {
                    errorMessage = "کد نامعتبر است"
                }
            } catch ApiError.serverError(let msg) {
                errorMessage = msg
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
    
    func setServerUrl(_ url: String) {
        storage.setBaseUrl(url)
    }
    
    func logout() {
        storage.clear()
        isLoggedIn = false
        needTotp = false
        tempToken = nil
        errorMessage = nil
    }
}
