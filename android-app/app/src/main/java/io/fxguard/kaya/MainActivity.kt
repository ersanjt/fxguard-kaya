/**
 * Kaya CRM — staff app entry
 * @file    android-app/.../MainActivity.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import io.fxguard.kaya.data.api.ApiClient
import io.fxguard.kaya.data.api.ApiException
import io.fxguard.kaya.data.models.Branding
import io.fxguard.kaya.data.models.ChatMessage
import io.fxguard.kaya.data.models.ConversationRow
import io.fxguard.kaya.data.models.CustomerRow
import io.fxguard.kaya.data.models.StaffUser
import io.fxguard.kaya.data.models.TicketRow
import io.fxguard.kaya.data.preferences.SessionStore
import io.fxguard.kaya.data.realtime.SocketService
import io.fxguard.kaya.ui.auth.LoginScreen
import io.fxguard.kaya.ui.auth.TotpScreen
import io.fxguard.kaya.ui.i18n.L10n
import io.fxguard.kaya.ui.inbox.ChatScreen
import io.fxguard.kaya.ui.inbox.InboxScreen
import io.fxguard.kaya.ui.lists.CustomersScreen
import io.fxguard.kaya.ui.lists.ProfileScreen
import io.fxguard.kaya.ui.lists.TicketsScreen
import io.fxguard.kaya.ui.shell.MainShell
import io.fxguard.kaya.ui.shell.StaffTab
import io.fxguard.kaya.ui.theme.KayaColors
import io.fxguard.kaya.ui.theme.KayaTheme
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val graph = (application as KayaCrmApp).graph
        val factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return StaffViewModel(graph.session, graph.api, graph.socket) as T
            }
        }
        setContent {
            val vm: StaffViewModel = viewModel(factory = factory)
            KayaTheme {
                val dir = if (L10n.isRtl(vm.lang)) LayoutDirection.Rtl else LayoutDirection.Ltr
                CompositionLocalProvider(LocalLayoutDirection provides dir) {
                    StaffApp(vm)
                }
            }
        }
    }
}

enum class Gate { Splash, Login, Totp, App }

class StaffViewModel(
    val session: SessionStore,
    private val api: ApiClient,
    private val socket: SocketService,
) : ViewModel() {
    var gate by mutableStateOf(Gate.Splash)
        private set
    var lang by mutableStateOf(session.language)
        private set
    var branding by mutableStateOf<Branding?>(null)
        private set
    var user by mutableStateOf(session.readUser())
        private set
    var serverUrl by mutableStateOf(session.baseUrl)
    var authLoading by mutableStateOf(false)
        private set
    var authError by mutableStateOf<String?>(null)
        private set
    var totpHint by mutableStateOf<String?>(null)
        private set
    private var tempToken: String? = null

    var tab by mutableStateOf(StaffTab.Inbox)
    var inboxSearch by mutableStateOf("")
    var inbox by mutableStateOf<List<ConversationRow>>(emptyList())
        private set
    var inboxLoading by mutableStateOf(false)
        private set
    var unreadTotal by mutableIntStateOf(0)
        private set
    var openChat by mutableStateOf<ConversationRow?>(null)
        private set
    var messages by mutableStateOf<List<ChatMessage>>(emptyList())
        private set
    var draft by mutableStateOf("")
    var sending by mutableStateOf(false)
        private set
    var customerSearch by mutableStateOf("")
    var customers by mutableStateOf<List<CustomerRow>>(emptyList())
        private set
    var customersLoading by mutableStateOf(false)
        private set
    var tickets by mutableStateOf<List<TicketRow>>(emptyList())
        private set
    var ticketsLoading by mutableStateOf(false)
        private set

    private var searchJob: Job? = null

    init {
        viewModelScope.launch { bootstrap() }
        viewModelScope.launch {
            socket.events.collect {
                if (gate == Gate.App) {
                    refreshInbox()
                    openChat?.let { loadMessages(it.id, silent = true) }
                }
            }
        }
    }

    fun changeLang(code: String) {
        lang = code
        session.language = code
    }

    fun persistServer() {
        session.baseUrl = serverUrl.trim().trimEnd('/')
        serverUrl = session.baseUrl
    }

    private suspend fun bootstrap() {
        runCatching { branding = api.branding() }
        if (!session.isLoggedIn) {
            gate = Gate.Login
            return
        }
        try {
            user = api.me()
            session.userJson = user?.toJson()?.toString()
            enterApp()
        } catch (_: Exception) {
            session.clearSession()
            gate = Gate.Login
        }
    }

    fun login(identifier: String, password: String) {
        if (identifier.isBlank() || password.isBlank()) {
            authError = L10n.t(lang, "required")
            return
        }
        persistServer()
        viewModelScope.launch {
            authLoading = true
            authError = null
            try {
                val res = api.login(identifier, password)
                if (res.needTotp && !res.tempToken.isNullOrBlank()) {
                    tempToken = res.tempToken
                    totpHint = res.totpHint
                    gate = Gate.Totp
                } else if (!res.token.isNullOrBlank() && res.user != null) {
                    session.saveLogin(res.token, res.user)
                    user = res.user
                    enterApp()
                } else {
                    authError = L10n.t(lang, "connect_fail")
                }
            } catch (e: ApiException) {
                authError = e.message
            } catch (_: Exception) {
                authError = L10n.t(lang, "connect_fail")
            } finally {
                authLoading = false
            }
        }
    }

    fun verifyTotp(code: String) {
        val tmp = tempToken
        if (tmp.isNullOrBlank() || code.length != 6) {
            authError = L10n.t(lang, "required")
            return
        }
        viewModelScope.launch {
            authLoading = true
            authError = null
            try {
                val res = api.verifyTotp(tmp, code)
                if (!res.token.isNullOrBlank() && res.user != null) {
                    session.saveLogin(res.token, res.user)
                    user = res.user
                    enterApp()
                } else {
                    authError = L10n.t(lang, "connect_fail")
                }
            } catch (e: ApiException) {
                authError = e.message
            } catch (_: Exception) {
                authError = L10n.t(lang, "connect_fail")
            } finally {
                authLoading = false
            }
        }
    }

    fun forgot(email: String) {
        if (email.isBlank()) {
            authError = L10n.t(lang, "required")
            return
        }
        persistServer()
        viewModelScope.launch {
            authLoading = true
            authError = null
            try {
                api.forgotPassword(email)
                authError = L10n.t(lang, "forgot_ok")
            } catch (e: ApiException) {
                authError = e.message
            } catch (_: Exception) {
                authError = L10n.t(lang, "connect_fail")
            } finally {
                authLoading = false
            }
        }
    }

    fun backToLogin() {
        tempToken = null
        authError = null
        gate = Gate.Login
    }

    private fun enterApp() {
        gate = Gate.App
        socket.connect()
        viewModelScope.launch { runCatching { api.setOnline() } }
        refreshInbox()
        refreshCustomers()
        refreshTickets()
    }

    fun logout() {
        viewModelScope.launch {
            socket.disconnect()
            runCatching { api.logout() }
            session.clearSession()
            user = null
            inbox = emptyList()
            tickets = emptyList()
            customers = emptyList()
            openChat = null
            gate = Gate.Login
        }
    }

    fun onInboxSearch(q: String) {
        inboxSearch = q
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(350)
            refreshInbox()
        }
    }

    fun refreshInbox() {
        viewModelScope.launch {
            inboxLoading = true
            try {
                val (rows, unread) = api.conversations(inboxSearch)
                inbox = rows
                unreadTotal = unread
            } catch (_: Exception) {
            } finally {
                inboxLoading = false
            }
        }
    }

    fun openConversation(row: ConversationRow) {
        openChat = row
        loadMessages(row.id, silent = false)
        viewModelScope.launch { api.markRead(row.id) }
        socket.emitRead(row.id)
    }

    fun closeChat() {
        openChat = null
        messages = emptyList()
        draft = ""
        refreshInbox()
    }

    private fun loadMessages(id: String, silent: Boolean) {
        viewModelScope.launch {
            try {
                messages = api.messages(id)
            } catch (_: Exception) {
                if (!silent) messages = emptyList()
            }
        }
    }

    fun send() {
        val chat = openChat ?: return
        val text = draft.trim()
        if (text.isEmpty()) return
        viewModelScope.launch {
            sending = true
            try {
                val sent = api.sendMessage(chat.id, text)
                draft = ""
                messages = messages + sent
            } catch (_: Exception) {
            } finally {
                sending = false
            }
        }
    }

    fun onCustomerSearch(q: String) {
        customerSearch = q
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(350)
            refreshCustomers()
        }
    }

    fun refreshCustomers() {
        viewModelScope.launch {
            customersLoading = true
            try {
                customers = api.customers(customerSearch)
            } catch (_: Exception) {
            } finally {
                customersLoading = false
            }
        }
    }

    fun refreshTickets() {
        viewModelScope.launch {
            ticketsLoading = true
            try {
                tickets = api.tickets()
            } catch (_: Exception) {
            } finally {
                ticketsLoading = false
            }
        }
    }

    fun logoUrl(): String? = api.resolveUrl(branding?.loginLogoUrl ?: branding?.logoUrl)
}

@Composable
private fun StaffApp(vm: StaffViewModel) {
    when (vm.gate) {
        Gate.Splash -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = KayaColors.Accent)
        }
        Gate.Login -> LoginScreen(
            lang = vm.lang,
            branding = vm.branding,
            logoUrl = vm.logoUrl(),
            serverUrl = vm.serverUrl,
            loading = vm.authLoading,
            error = vm.authError,
            onLang = vm::changeLang,
            onServer = { vm.serverUrl = it },
            onSubmit = vm::login,
            onForgot = vm::forgot,
        )
        Gate.Totp -> TotpScreen(
            lang = vm.lang,
            hint = vm.totpHint,
            loading = vm.authLoading,
            error = vm.authError,
            onBack = vm::backToLogin,
            onSubmit = vm::verifyTotp,
        )
        Gate.App -> {
            val chat = vm.openChat
            if (chat != null) {
                ChatScreen(
                    lang = vm.lang,
                    title = chat.customerName,
                    messages = vm.messages,
                    draft = vm.draft,
                    onDraft = { vm.draft = it },
                    sending = vm.sending,
                    onSend = vm::send,
                    onBack = vm::closeChat,
                )
            } else {
                LaunchedEffect(vm.tab) {
                    when (vm.tab) {
                        StaffTab.Inbox -> vm.refreshInbox()
                        StaffTab.Customers -> vm.refreshCustomers()
                        StaffTab.Tickets -> vm.refreshTickets()
                        StaffTab.Profile -> Unit
                    }
                }
                MainShell(lang = vm.lang, tab = vm.tab, onTab = { vm.tab = it }) {
                    when (vm.tab) {
                        StaffTab.Inbox -> InboxScreen(
                            lang = vm.lang,
                            search = vm.inboxSearch,
                            onSearch = vm::onInboxSearch,
                            loading = vm.inboxLoading,
                            rows = vm.inbox,
                            unreadTotal = vm.unreadTotal,
                            onOpen = vm::openConversation,
                        )
                        StaffTab.Customers -> CustomersScreen(
                            lang = vm.lang,
                            search = vm.customerSearch,
                            onSearch = vm::onCustomerSearch,
                            loading = vm.customersLoading,
                            rows = vm.customers,
                        )
                        StaffTab.Tickets -> TicketsScreen(
                            lang = vm.lang,
                            loading = vm.ticketsLoading,
                            rows = vm.tickets,
                        )
                        StaffTab.Profile -> ProfileScreen(
                            lang = vm.lang,
                            user = vm.user,
                            serverUrl = vm.serverUrl,
                            onServer = { vm.serverUrl = it },
                            onSaveServer = vm::persistServer,
                            onLang = vm::changeLang,
                            onLogout = vm::logout,
                        )
                    }
                }
            }
        }
    }
}
