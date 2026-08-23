/**
 * Kaya CRM — staff app entry
 * @file    android-app/.../MainActivity.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import io.fxguard.kaya.data.api.ApiClient
import io.fxguard.kaya.data.api.ApiException
import io.fxguard.kaya.data.models.AnnouncementRow
import io.fxguard.kaya.data.models.AnnouncementTarget
import io.fxguard.kaya.data.models.Branding
import io.fxguard.kaya.data.models.ChatMessage
import io.fxguard.kaya.data.models.ConversationRow
import io.fxguard.kaya.data.models.CustomerDraft
import io.fxguard.kaya.data.models.CustomerRow
import io.fxguard.kaya.data.models.DashItem
import io.fxguard.kaya.data.models.DashboardStats
import io.fxguard.kaya.data.models.InboxFilter
import io.fxguard.kaya.data.models.OrgUser
import io.fxguard.kaya.data.models.StaffLoginRow
import io.fxguard.kaya.data.models.StaffPresence
import io.fxguard.kaya.data.models.StaffUser
import io.fxguard.kaya.data.models.TaskRow
import io.fxguard.kaya.data.models.TeamColleague
import io.fxguard.kaya.data.models.TeamMessage
import io.fxguard.kaya.data.models.TeamThread
import io.fxguard.kaya.data.models.TicketRow
import io.fxguard.kaya.data.models.TimelineItem
import io.fxguard.kaya.data.preferences.SessionStore
import io.fxguard.kaya.data.realtime.SocketService
import io.fxguard.kaya.push.NotificationHelper
import io.fxguard.kaya.push.PushRegistrar
import io.fxguard.kaya.ui.auth.LoginScreen
import io.fxguard.kaya.ui.auth.TotpScreen
import io.fxguard.kaya.ui.common.InAppPushBanner
import io.fxguard.kaya.ui.home.AnnouncementsScreen
import io.fxguard.kaya.ui.home.DashModuleScreen
import io.fxguard.kaya.ui.home.DashboardScreen
import io.fxguard.kaya.ui.home.MoreMenuScreen
import io.fxguard.kaya.ui.home.StaffActivityScreen
import io.fxguard.kaya.ui.home.UsersScreen
import io.fxguard.kaya.ui.i18n.L10n
import io.fxguard.kaya.ui.inbox.ChatScreen
import io.fxguard.kaya.ui.inbox.InboxScreen
import io.fxguard.kaya.ui.lists.CustomersScreen
import io.fxguard.kaya.ui.lists.CustomerDetailScreen
import io.fxguard.kaya.ui.lists.ProfileScreen
import io.fxguard.kaya.ui.lists.TeamChatScreen
import io.fxguard.kaya.ui.lists.TeamListScreen
import io.fxguard.kaya.ui.lists.WorkScreen
import io.fxguard.kaya.ui.shell.MainShell
import io.fxguard.kaya.ui.shell.MoreDest
import io.fxguard.kaya.ui.shell.StaffTab
import io.fxguard.kaya.ui.theme.KayaColors
import io.fxguard.kaya.ui.theme.KayaTheme
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class MainActivity : ComponentActivity() {
    private var launchIntent by mutableStateOf<Intent?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        launchIntent = intent
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
                    StaffApp(vm, launchIntent) { launchIntent = null }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        launchIntent = intent
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
    var authOk by mutableStateOf(false)
        private set
    var inboxError by mutableStateOf<String?>(null)
        private set
    var customersError by mutableStateOf<String?>(null)
        private set
    var workError by mutableStateOf<String?>(null)
        private set
    var teamError by mutableStateOf<String?>(null)
        private set
    var chatError by mutableStateOf<String?>(null)
        private set
    var teamChatError by mutableStateOf<String?>(null)
        private set
    var totpHint by mutableStateOf<String?>(null)
        private set
    private var tempToken: String? = null
    private var authErrorKey: String? = null

    var tab by mutableStateOf(StaffTab.Dashboard)
    var moreDest by mutableStateOf(MoreDest.Menu)
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
    var customerArchive by mutableStateOf(false)
    var customers by mutableStateOf<List<CustomerRow>>(emptyList())
        private set
    var customersLoading by mutableStateOf(false)
        private set
    var customerProfile by mutableStateOf<CustomerRow?>(null)
        private set
    var customerTimeline by mutableStateOf<List<TimelineItem>>(emptyList())
        private set
    var customerDetailLoading by mutableStateOf(false)
        private set
    var customerSaving by mutableStateOf(false)
        private set
    var tickets by mutableStateOf<List<TicketRow>>(emptyList())
        private set
    var ticketsLoading by mutableStateOf(false)
        private set
    var inboxFilter by mutableStateOf(InboxFilter.All)
    var showTasks by mutableStateOf(false)
    var tasks by mutableStateOf<List<TaskRow>>(emptyList())
        private set
    var tasksLoading by mutableStateOf(false)
        private set
    var teamThreads by mutableStateOf<List<TeamThread>>(emptyList())
        private set
    var teamUsers by mutableStateOf<List<TeamColleague>>(emptyList())
        private set
    var teamUsersLoading by mutableStateOf(false)
        private set
    var teamUserSearch by mutableStateOf("")
    var teamLoading by mutableStateOf(false)
        private set
    var openThread by mutableStateOf<TeamThread?>(null)
        private set
    var teamMessages by mutableStateOf<List<TeamMessage>>(emptyList())
        private set
    var teamDraft by mutableStateOf("")
    var teamSending by mutableStateOf(false)
        private set
    var announcements by mutableStateOf<List<AnnouncementRow>>(emptyList())
        private set
    var announcementUsers by mutableStateOf<List<AnnouncementTarget>>(emptyList())
        private set
    var announcementDepartments by mutableStateOf<List<AnnouncementTarget>>(emptyList())
        private set
    var announcementSending by mutableStateOf(false)
        private set
    var announcementError by mutableStateOf<String?>(null)
        private set
    var dashStats by mutableStateOf(DashboardStats())
        private set
    var dashLoading by mutableStateOf(false)
        private set
    var dashError by mutableStateOf<String?>(null)
        private set
    var dashUpdatedAt by mutableStateOf<String?>(null)
        private set
    var dashInfoKey by mutableStateOf<String?>(null)
        private set
    var staffOnline by mutableStateOf<List<StaffPresence>>(emptyList())
        private set
    var staffLogins by mutableStateOf<List<StaffLoginRow>>(emptyList())
        private set
    var staffLoginsTotal by mutableIntStateOf(0)
        private set
    var staffActivityLoading by mutableStateOf(false)
        private set
    var staffActivityError by mutableStateOf<String?>(null)
        private set
    var orgUsers by mutableStateOf<List<OrgUser>>(emptyList())
        private set
    var orgUsersLoading by mutableStateOf(false)
        private set
    var orgUsersError by mutableStateOf<String?>(null)
        private set
    var dashModuleItems by mutableStateOf<List<DashItem>>(emptyList())
        private set
    var dashModuleLoading by mutableStateOf(false)
        private set
    var dashModuleError by mutableStateOf<String?>(null)
        private set
    var pendingNewConv by mutableStateOf(false)
    var pendingAddCustomer by mutableStateOf(false)
    var chatLoading by mutableStateOf(false)
        private set
    var chatNotice by mutableStateOf<String?>(null)
        private set
    var pendingCallLink by mutableStateOf<String?>(null)
        private set

    private var searchJob: Job? = null
    var inAppPush by mutableStateOf<NotificationHelper.InAppPush?>(null)
        private set
    private var bannerHideJob: Job? = null

    init {
        viewModelScope.launch { bootstrap() }
        viewModelScope.launch {
            NotificationHelper.banners.collect { item ->
                if (gate != Gate.App) return@collect
                inAppPush = item
                bannerHideJob?.cancel()
                bannerHideJob = viewModelScope.launch {
                    delay(6500)
                    if (inAppPush == item) inAppPush = null
                }
            }
        }
        viewModelScope.launch {
            socket.events.collect { ev ->
                if (gate != Gate.App) return@collect
                NotificationHelper.showEventIfAttached(lang, ev)
                when (ev.name) {
                    "new_message", "message_sent", "assigned_message" -> {
                        refreshInbox(silent = true)
                        val openId = openChat?.id
                        if (openId != null && chatError == null &&
                            (ev.conversationId == null || ev.conversationId == openId)
                        ) {
                            loadMessages(openId, silent = true)
                        }
                    }
                    "internal_message", "internal_thread_updated" -> {
                        refreshTeam(silent = true)
                        val tid = openThread?.id
                        if (tid != null && teamChatError == null &&
                            (ev.threadId == null || ev.threadId == tid)
                        ) {
                            loadTeamMessages(tid, silent = true)
                        }
                    }
                    "ticket", "ticket_assigned", "ticket_reply_notification" -> refreshTickets(silent = true)
                    "task_assigned" -> refreshTasks(silent = true)
                    "important_announcement" -> refreshAnnouncements()
                }
            }
        }
        viewModelScope.launch {
            while (true) {
                delay(10_000)
                if (gate != Gate.App) continue
                refreshInbox(silent = true)
                val chat = openChat
                if (chat != null && chatError == null) loadMessages(chat.id, silent = true)
                val thread = openThread
                if (thread != null && teamChatError == null) loadTeamMessages(thread.id, silent = true)
            }
        }
    }

    fun changeLang(code: String) {
        lang = code
        session.language = code
        authErrorKey?.let { authError = L10n.t(lang, it) }
    }

    private fun setAuthI18n(key: String, ok: Boolean = false) {
        authErrorKey = key
        authError = L10n.t(lang, key)
        authOk = ok
    }

    private fun setAuthRaw(message: String?) {
        authErrorKey = null
        authError = message
        authOk = false
    }

    fun selectTab(next: StaffTab) {
        if (openChat != null) closeChat()
        if (customerProfile != null) closeCustomerProfile()
        dashInfoKey = null
        tab = next
        if (next == StaffTab.More) moreDest = MoreDest.Menu
    }

    fun openMore(dest: MoreDest) {
        if (openChat != null) closeChat()
        if (customerProfile != null) closeCustomerProfile()
        dashInfoKey = null
        tab = StaffTab.More
        moreDest = dest
        showTasks = dest == MoreDest.Tasks
        when (dest) {
            MoreDest.Tickets, MoreDest.Tasks -> {
                refreshTickets()
                refreshTasks()
            }
            MoreDest.Team -> refreshTeam()
            else -> Unit
        }
    }

    fun headerTitle(): String {
        if (tab == StaffTab.Dashboard && dashInfoKey != null) {
            return L10n.t(lang, dashPageTitleKey(dashInfoKey))
        }
        return when (tab) {
        StaffTab.Dashboard -> L10n.t(lang, "dashboard")
        StaffTab.Inbox -> L10n.t(lang, "inbox")
        StaffTab.Customers -> L10n.t(lang, "customers")
        StaffTab.Announcements -> L10n.t(lang, "announcements")
        StaffTab.More -> when (moreDest) {
            MoreDest.Menu -> L10n.t(lang, "more")
            MoreDest.Tickets -> L10n.t(lang, "tickets")
            MoreDest.Tasks -> L10n.t(lang, "tasks")
            MoreDest.Team -> L10n.t(lang, "team")
            MoreDest.Profile -> L10n.t(lang, "profile_me")
        }
        }
    }

    fun persistServer() {
        session.baseUrl = serverUrl.trim().trimEnd('/')
        serverUrl = session.baseUrl
    }

    private suspend fun bootstrap() {
        val branded = runCatching { api.branding() }
        branding = branded.getOrNull()
        if (branded.isFailure && !session.isLoggedIn) {
            authError = branded.exceptionOrNull()?.let { L10n.error(it, lang) } ?: L10n.t(lang, "connect_fail")
        }
        if (!session.isLoggedIn) {
            gate = Gate.Login
            return
        }
        try {
            user = api.me()
            session.userJson = user?.toJson()?.toString()
            enterApp()
        } catch (_: Exception) {
            PushRegistrar.onLoggedOut(api)
            session.clearSession()
            gate = Gate.Login
        }
    }

    fun login(identifier: String, password: String) {
        if (identifier.isBlank() || password.isBlank()) {
            setAuthI18n("required")
            return
        }
        persistServer()
        viewModelScope.launch {
            authLoading = true
            setAuthRaw(null)
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
                    setAuthI18n("connect_fail")
                }
            } catch (e: ApiException) {
                setAuthRaw(e.message)
            } catch (_: Exception) {
                setAuthI18n("connect_fail")
            } finally {
                authLoading = false
            }
        }
    }

    fun verifyTotp(code: String) {
        val tmp = tempToken
        if (tmp.isNullOrBlank() || code.length != 6) {
            setAuthI18n("required")
            return
        }
        viewModelScope.launch {
            authLoading = true
            setAuthRaw(null)
            try {
                val res = api.verifyTotp(tmp, code)
                if (!res.token.isNullOrBlank() && res.user != null) {
                    session.saveLogin(res.token, res.user)
                    user = res.user
                    enterApp()
                } else {
                    setAuthI18n("connect_fail")
                }
            } catch (e: ApiException) {
                setAuthRaw(e.message)
            } catch (_: Exception) {
                setAuthI18n("connect_fail")
            } finally {
                authLoading = false
            }
        }
    }

    fun forgot(email: String) {
        if (email.isBlank()) {
            setAuthI18n("required")
            return
        }
        persistServer()
        viewModelScope.launch {
            authLoading = true
            setAuthRaw(null)
            try {
                api.forgotPassword(email)
                setAuthI18n("forgot_ok", ok = true)
            } catch (e: ApiException) {
                setAuthRaw(e.message)
            } catch (_: Exception) {
                setAuthI18n("connect_fail")
            } finally {
                authLoading = false
            }
        }
    }

    fun backToLogin() {
        tempToken = null
        setAuthRaw(null)
        gate = Gate.Login
    }

    private fun enterApp() {
        gate = Gate.App
        socket.connect()
        viewModelScope.launch { runCatching { api.setOnline() } }
        refreshInbox()
        refreshCustomers()
        refreshTickets()
        refreshTasks()
        refreshTeam()
        refreshAnnouncements()
    }

    var pushTestBusy by mutableStateOf(false)
        private set
    var pushTestMsg by mutableStateOf<String?>(null)
        private set

    fun startPush(context: android.content.Context) {
        PushRegistrar.onLoggedIn(context, api)
    }

    fun dismissInAppPush() {
        inAppPush = null
        bannerHideJob?.cancel()
    }

    fun testPush(context: android.content.Context) {
        if (pushTestBusy) return
        pushTestBusy = true
        pushTestMsg = null
        viewModelScope.launch {
            try {
                PushRegistrar.registerFcm(context.applicationContext, api)
                val (ok, reason) = api.testPush()
                pushTestMsg = when {
                    ok -> L10n.t(lang, "push_test_ok")
                    reason == "no_firebase" -> L10n.t(lang, "push_test_no_firebase")
                    reason == "no_token" -> L10n.t(lang, "push_test_no_token")
                    else -> L10n.t(lang, "push_test_fail")
                }
            } catch (_: Exception) {
                pushTestMsg = L10n.t(lang, "push_test_fail")
            } finally {
                pushTestBusy = false
            }
        }
    }

    fun pushStatus(context: android.content.Context): String {
        if (!NotificationHelper.notificationsAllowed(context)) return L10n.t(lang, "push_status_no_perm")
        val err = PushRegistrar.lastError
        if (PushRegistrar.lastToken.isNullOrBlank()) {
            val base = L10n.t(lang, "push_status_no_fcm")
            return if (err.isNullOrBlank()) base else "$base ($err)"
        }
        return L10n.t(lang, "push_status_ok")
    }

    fun openFromPush(type: String?, conversationId: String?, threadId: String?, ticketId: String?) {
        when (type) {
            "message" -> if (!conversationId.isNullOrBlank()) openTimelineConversation(conversationId)
            "internal", "call" -> if (!threadId.isNullOrBlank()) {
                openMore(MoreDest.Team)
                viewModelScope.launch {
                    refreshTeam(silent = true)
                    delay(200)
                    teamThreads.find { it.id == threadId }?.let { openTeamThread(it) }
                }
            }
            "ticket" -> openMore(MoreDest.Tickets)
            "task" -> openMore(MoreDest.Tasks)
            "announcement" -> selectTab(StaffTab.Announcements)
        }
    }

    fun logout() {
        viewModelScope.launch {
            PushRegistrar.onLoggedOut(api)
            socket.disconnect()
            runCatching { api.logout() }
            session.clearSession()
            user = null
            inbox = emptyList()
            tickets = emptyList()
            customers = emptyList()
            customerProfile = null
            customerTimeline = emptyList()
            tasks = emptyList()
            teamThreads = emptyList()
            announcements = emptyList()
            announcementUsers = emptyList()
            announcementDepartments = emptyList()
            announcementError = null
            dashModuleItems = emptyList()
            dashModuleError = null
            openChat = null
            openThread = null
            tab = StaffTab.Dashboard
            moreDest = MoreDest.Menu
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

    fun applyInboxFilter(filter: InboxFilter) {
        inboxFilter = filter
        refreshInbox()
    }

    fun refreshInbox(silent: Boolean = false) {
        viewModelScope.launch {
            if (!silent) inboxLoading = true
            try {
                val (rows, unread) = api.conversations(inboxSearch, filter = inboxFilter, mineUserId = user?.id)
                inbox = rows
                unreadTotal = unread
                inboxError = null
            } catch (e: Exception) {
                if (!silent || inbox.isEmpty()) {
                    inboxError = L10n.error(e, lang)
                }
            } finally {
                inboxLoading = false
            }
        }
    }

    fun openConversation(row: ConversationRow) {
        customerProfile = null
        tab = StaffTab.Inbox
        openChat = row
        NotificationHelper.watchChat(row.id)
        messages = emptyList()
        chatError = null
        chatNotice = null
        chatLoading = true
        loadMessages(row.id, silent = false)
        viewModelScope.launch {
            runCatching { api.conversation(row.id) }.getOrNull()?.let { detail ->
                if (openChat?.id == row.id) openChat = detail
            }
        }
    }

    fun reloadOpenChat() {
        chatLoading = true
        openChat?.let { loadMessages(it.id, silent = false) }
    }

    fun closeChat() {
        openChat = null
        if (openThread != null) NotificationHelper.watchThread(openThread?.id) else NotificationHelper.clearWatch()
        messages = emptyList()
        draft = ""
        chatError = null
        chatNotice = null
        pendingCallLink = null
        chatLoading = false
        refreshInbox()
    }

    private fun loadMessages(id: String, silent: Boolean) {
        viewModelScope.launch {
            try {
                messages = api.messages(id)
                chatError = null
                if (!silent) {
                    runCatching { api.markRead(id) }
                    socket.emitRead(id)
                }
            } catch (e: Exception) {
                if (!silent) {
                    chatError = L10n.error(e, lang)
                }
            } finally {
                if (!silent) chatLoading = false
            }
        }
    }

    fun send() {
        val chat = openChat ?: return
        val text = draft.trim()
        if (text.isEmpty()) return
        viewModelScope.launch {
            sending = true
            chatError = null
            try {
                val sent = api.sendMessage(chat.id, text)
                draft = ""
                messages = messages + sent
            } catch (e: Exception) {
                chatError = L10n.error(e, lang)
            } finally {
                sending = false
            }
        }
    }

    fun sendFile(bytes: ByteArray, filename: String, mime: String) {
        val chat = openChat ?: return
        if (bytes.isEmpty()) return
        viewModelScope.launch {
            sending = true
            chatError = null
            try {
                val up = api.uploadFile(bytes, filename, mime)
                val sent = api.sendMedia(chat.id, draft.trim(), up.url, up.name, mime)
                draft = ""
                messages = messages + sent
            } catch (e: Exception) {
                chatError = L10n.error(e, lang)
            } finally {
                sending = false
            }
        }
    }

    fun sendVoice(file: java.io.File) {
        val chat = openChat ?: return
        viewModelScope.launch {
            sending = true
            chatError = null
            try {
                val bytes = file.readBytes()
                val up = api.uploadFile(bytes, file.name.ifBlank { "voice.m4a" }, "audio/mp4")
                val sent = api.sendMedia(
                    conversationId = chat.id,
                    url = up.url,
                    filename = up.name,
                    mime = "audio/mp4",
                    sendAsVoice = true,
                )
                messages = messages + sent
            } catch (e: Exception) {
                chatError = L10n.error(e, lang)
            } finally {
                sending = false
                file.delete()
            }
        }
    }

    fun sendGif(url: String) {
        val chat = openChat ?: return
        viewModelScope.launch {
            sending = true
            chatError = null
            try {
                val sent = api.sendMedia(chat.id, "", url, "gif.gif", "image/gif")
                messages = messages + sent
            } catch (e: Exception) {
                chatError = L10n.error(e, lang)
            } finally {
                sending = false
            }
        }
    }

    fun startCall(type: String) {
        val chat = openChat ?: return
        viewModelScope.launch {
            chatError = null
            try {
                val result = api.startCall(chat.id, type)
                val group = result.isGroup || chat.isGroup
                chatNotice = when {
                    result.method == "link" && !result.callLink.isNullOrBlank() ->
                        L10n.t(lang, if (group) "wa_call_group_link_sent" else "wa_call_link_sent")
                    else ->
                        L10n.t(lang, if (group) "wa_call_group_started" else "wa_call_started")
                }
                pendingCallLink = result.callLink
                loadMessages(chat.id, silent = true)
                delay(4000)
                if (chatNotice != null) chatNotice = null
            } catch (e: Exception) {
                chatError = L10n.error(e, lang)
            }
        }
    }

    fun showChatNotice(msg: String) {
        chatNotice = msg
        viewModelScope.launch {
            delay(3500)
            if (chatNotice == msg) chatNotice = null
        }
    }

    fun consumeCallLink() {
        pendingCallLink = null
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
            customersError = null
            try {
                customers = api.customers(customerSearch, archive = customerArchive)
            } catch (e: Exception) {
                customersError = L10n.error(e, lang)
            } finally {
                customersLoading = false
            }
        }
    }

    fun refreshTickets(silent: Boolean = false) {
        viewModelScope.launch {
            if (!silent) ticketsLoading = true
            try {
                tickets = api.tickets()
                if (!showTasks) workError = null
            } catch (e: Exception) {
                if (!silent || tickets.isEmpty()) {
                    workError = L10n.error(e, lang)
                }
            } finally {
                ticketsLoading = false
            }
        }
    }

    fun refreshTasks(silent: Boolean = false) {
        viewModelScope.launch {
            if (!silent) tasksLoading = true
            try {
                tasks = api.tasks()
            } catch (e: Exception) {
                if (!silent && workError == null) {
                    workError = L10n.error(e, lang)
                }
            } finally {
                tasksLoading = false
            }
        }
    }

    fun refreshTeam(silent: Boolean = false) {
        viewModelScope.launch {
            if (!silent) teamLoading = true
            try {
                val (rows, _) = api.teamThreads()
                teamThreads = rows
                teamError = null
            } catch (e: Exception) {
                if (!silent || teamThreads.isEmpty()) {
                    teamError = L10n.error(e, lang)
                }
            } finally {
                teamLoading = false
            }
        }
    }

    fun canSendAnnouncements(): Boolean {
        val role = user?.role?.lowercase().orEmpty()
        return role == "owner" || role == "admin" || role == "manager"
    }

    fun refreshAnnouncements() {
        viewModelScope.launch {
            try {
                val rows = api.announcements()
                announcements = rows
                announcementError = null
                val unread = rows.filter { !it.read }
                unread.forEach { runCatching { api.markAnnouncementRead(it.id) } }
                if (unread.isNotEmpty()) {
                    announcements = announcements.map { it.copy(read = true) }
                }
            } catch (e: Exception) {
                announcementError = L10n.error(e, lang)
            }
            if (canSendAnnouncements()) {
                runCatching { api.announcementTargets() }.onSuccess {
                    announcementUsers = it.first
                    announcementDepartments = it.second
                }
            }
        }
    }

    fun sendAnnouncement(title: String, body: String, important: Boolean, targetType: String, targetId: String?) {
        viewModelScope.launch {
            announcementSending = true
            announcementError = null
            try {
                api.sendAnnouncement(title, body, important, targetType, targetId)
                refreshAnnouncements()
            } catch (e: Exception) {
                announcementError = L10n.error(e, lang)
            } finally {
                announcementSending = false
            }
        }
    }

    fun deleteAnnouncement(id: String) {
        viewModelScope.launch {
            try {
                api.deleteAnnouncement(id)
                announcements = announcements.filter { it.id != id }
                announcementError = null
            } catch (e: Exception) {
                announcementError = L10n.error(e, lang)
            }
        }
    }

    fun refreshDashboard() {
        viewModelScope.launch {
            dashLoading = true
            dashError = null
            try {
                dashStats = api.dashboardStats()
                val zone = when (lang) {
                    "fa" -> ZoneId.of("Asia/Tehran")
                    "tr" -> ZoneId.of("Europe/Istanbul")
                    else -> ZoneId.of("Asia/Dubai")
                }
                dashUpdatedAt = DateTimeFormatter.ofPattern("HH:mm").withZone(zone).format(Instant.now())
                unreadTotal = dashStats.unreadConversations.takeIf { it > 0 } ?: unreadTotal
            } catch (e: Exception) {
                dashError = L10n.error(e, lang)
            } finally {
                dashLoading = false
            }
        }
    }

    fun openDashPage(page: String) {
        dashInfoKey = null
        when (page) {
            "conversations" -> selectTab(StaffTab.Inbox)
            "customers" -> selectTab(StaffTab.Customers)
            "tickets" -> openMore(MoreDest.Tickets)
            "tasks" -> openMore(MoreDest.Tasks)
            "announcements" -> selectTab(StaffTab.Announcements)
            "internal-chat" -> openMore(MoreDest.Team)
            "profile" -> openMore(MoreDest.Profile)
            "staff-activity" -> {
                dashInfoKey = "staff-activity"
                refreshStaffActivity()
            }
            "users" -> {
                dashInfoKey = "users"
                refreshOrgUsers()
            }
            else -> {
                dashInfoKey = page
                refreshDashModule()
            }
        }
    }

    fun refreshDashModule() {
        val page = dashInfoKey ?: return
        if (page == "staff-activity" || page == "users") return
        viewModelScope.launch {
            dashModuleLoading = true
            dashModuleError = null
            try {
                dashModuleItems = api.dashModule(page)
            } catch (e: Exception) {
                dashModuleError = L10n.error(e, lang)
            } finally {
                dashModuleLoading = false
            }
        }
    }

    fun refreshStaffActivity() {
        viewModelScope.launch {
            staffActivityLoading = true
            staffActivityError = null
            try {
                staffOnline = api.staffOnline()
                val result = api.staffLogins()
                staffLogins = result.first
                staffLoginsTotal = result.second
            } catch (e: Exception) {
                staffActivityError = L10n.error(e, lang)
            } finally {
                staffActivityLoading = false
            }
        }
    }

    fun refreshOrgUsers() {
        viewModelScope.launch {
            orgUsersLoading = true
            orgUsersError = null
            try {
                orgUsers = api.orgUsers()
            } catch (e: Exception) {
                orgUsersError = L10n.error(e, lang)
            } finally {
                orgUsersLoading = false
            }
        }
    }

    fun messageOrgUser(row: OrgUser) {
        if (row.id == user?.id) return
        startTeamChat(
            TeamColleague(
                id = row.id,
                name = row.name,
                email = row.email,
                avatar = row.avatar,
                status = row.status,
            ),
        )
    }

    fun closeDashInfo() {
        dashInfoKey = null
    }

    fun quickNewConv() {
        pendingNewConv = true
        selectTab(StaffTab.Inbox)
    }

    fun quickNewCustomer() {
        pendingAddCustomer = true
        selectTab(StaffTab.Customers)
    }

    fun applyCustomerArchive(archive: Boolean) {
        customerArchive = archive
        refreshCustomers()
    }

    fun openCustomerProfile(row: CustomerRow) {
        customerProfile = row
        customerTimeline = emptyList()
        viewModelScope.launch {
            customerDetailLoading = true
            customersError = null
            try {
                val fetched = api.customer(row.id)
                customerProfile = fetched.copy(
                    departmentName = fetched.departmentName ?: row.departmentName,
                    assigneeName = fetched.assigneeName ?: row.assigneeName,
                    totalConversations = maxOf(fetched.totalConversations, row.totalConversations),
                    lastContactAt = fetched.lastContactAt ?: row.lastContactAt,
                    firstContactAt = fetched.firstContactAt ?: row.firstContactAt,
                )
                customerTimeline = api.customerTimeline(row.id, lang)
            } catch (e: Exception) {
                customersError = L10n.error(e, lang)
            } finally {
                customerDetailLoading = false
            }
        }
    }

    fun closeCustomerProfile() {
        customerProfile = null
        customerTimeline = emptyList()
        customersError = null
    }

    fun openCustomer(row: CustomerRow) {
        viewModelScope.launch {
            customersError = null
            try {
                val conv = api.startCustomerChat(row.id)
                closeCustomerProfile()
                openConversation(conv.copy(customerName = row.name.ifBlank { conv.customerName }))
            } catch (e: Exception) {
                try {
                    val conv = api.openCustomerConversation(row.id, row.name)
                    if (conv != null) {
                        closeCustomerProfile()
                        openConversation(conv)
                    } else {
                        customersError = L10n.error(e, lang)
                    }
                } catch (e2: Exception) {
                    customersError = L10n.error(e2, lang)
                }
            }
        }
    }

    fun createCustomer(name: String, phone: String) {
        viewModelScope.launch {
            customersError = null
            try {
                api.createCustomer(name.trim(), phone.trim())
                refreshCustomers()
            } catch (e: Exception) {
                customersError = L10n.error(e, lang)
            }
        }
    }

    fun updateCustomer(draft: CustomerDraft) {
        val current = customerProfile ?: return
        viewModelScope.launch {
            customerSaving = true
            customersError = null
            try {
                val updated = api.updateCustomer(current.id, draft)
                customerProfile = updated.copy(
                    departmentName = updated.departmentName ?: current.departmentName,
                    assigneeName = updated.assigneeName ?: current.assigneeName,
                    totalConversations = maxOf(updated.totalConversations, current.totalConversations),
                    lastContactAt = updated.lastContactAt ?: current.lastContactAt,
                    firstContactAt = updated.firstContactAt ?: current.firstContactAt,
                )
                refreshCustomers()
            } catch (e: Exception) {
                customersError = L10n.error(e, lang)
            } finally {
                customerSaving = false
            }
        }
    }

    fun openTimelineConversation(id: String) {
        viewModelScope.launch {
            try {
                val conv = api.conversation(id)
                closeCustomerProfile()
                openConversation(conv)
            } catch (e: Exception) {
                customersError = L10n.error(e, lang)
            }
        }
    }

    fun reloadTeamChat() {
        openThread?.let { loadTeamMessages(it.id, silent = false) }
    }

    fun refreshTeamUsers() {
        viewModelScope.launch {
            teamUsersLoading = true
            try {
                teamUsers = api.teamUsers()
                if (teamError != null && teamUsers.isNotEmpty()) teamError = null
            } catch (e: Exception) {
                teamError = L10n.error(e, lang)
            } finally {
                teamUsersLoading = false
            }
        }
    }

    fun startTeamChat(colleague: TeamColleague) {
        viewModelScope.launch {
            try {
                val thread = api.startTeamThread(listOf(colleague.id))
                teamError = null
                openTeamThread(thread)
            } catch (e: Exception) {
                teamError = L10n.error(e, lang)
            }
        }
    }

    fun openTeamThread(row: TeamThread) {
        openThread = row
        NotificationHelper.watchThread(row.id)
        loadTeamMessages(row.id, silent = false)
    }

    fun closeTeamThread() {
        openThread = null
        if (openChat != null) NotificationHelper.watchChat(openChat?.id) else NotificationHelper.clearWatch()
        teamMessages = emptyList()
        teamDraft = ""
        teamChatError = null
        refreshTeam()
    }

    private fun loadTeamMessages(id: String, silent: Boolean) {
        val me = user?.id ?: return
        viewModelScope.launch {
            try {
                teamMessages = api.teamMessages(id, me)
                teamChatError = null
            } catch (e: Exception) {
                if (!silent) teamChatError = L10n.error(e, lang)
            }
        }
    }

    fun sendTeam() {
        val thread = openThread ?: return
        val text = teamDraft.trim()
        if (text.isEmpty()) return
        viewModelScope.launch {
            teamSending = true
            teamChatError = null
            try {
                val sent = api.sendTeamMessage(thread.id, text)
                teamDraft = ""
                teamMessages = teamMessages + sent
            } catch (e: Exception) {
                teamChatError = L10n.error(e, lang)
            } finally {
                teamSending = false
            }
        }
    }

    fun logoUrl(): String? = api.resolveUrl(branding?.loginLogoUrl ?: branding?.logoUrl)
    fun mediaUrl(path: String?): String? = api.resolveUrl(path)
    fun customerAvatarUrl(id: String?): String? = api.customerAvatarUrl(id)
}

@Composable
private fun StaffApp(vm: StaffViewModel, launchIntent: Intent?, onLaunchConsumed: () -> Unit) {
    val context = LocalContext.current
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { vm.startPush(context) }
    LaunchedEffect(vm.gate) {
        if (vm.gate != Gate.App) return@LaunchedEffect
        if (Build.VERSION.SDK_INT >= 33) {
            val granted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                return@LaunchedEffect
            }
        }
        vm.startPush(context)
    }
    LaunchedEffect(vm.gate, launchIntent) {
        if (vm.gate != Gate.App || launchIntent == null) return@LaunchedEffect
        val type = launchIntent.getStringExtra(NotificationHelper.EXTRA_TYPE)
        if (type.isNullOrBlank()) return@LaunchedEffect
        vm.openFromPush(
            type,
            launchIntent.getStringExtra(NotificationHelper.EXTRA_CONVERSATION_ID),
            launchIntent.getStringExtra(NotificationHelper.EXTRA_THREAD_ID),
            launchIntent.getStringExtra(NotificationHelper.EXTRA_TICKET_ID),
        )
        onLaunchConsumed()
    }
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
            errorOk = vm.authOk,
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
            Box(Modifier.fillMaxSize()) {
            BackHandler(
                enabled = vm.openChat != null ||
                    vm.openThread != null ||
                    vm.customerProfile != null ||
                    vm.dashInfoKey != null ||
                    (vm.tab == StaffTab.More && vm.moreDest != MoreDest.Menu),
            ) {
                when {
                    vm.openChat != null -> vm.closeChat()
                    vm.openThread != null -> vm.closeTeamThread()
                    vm.customerProfile != null -> vm.closeCustomerProfile()
                    vm.dashInfoKey != null -> vm.closeDashInfo()
                    else -> vm.moreDest = MoreDest.Menu
                }
            }
            val thread = vm.openThread
            if (thread != null) {
                TeamChatScreen(
                    lang = vm.lang,
                    title = thread.displayName,
                    messages = vm.teamMessages,
                    draft = vm.teamDraft,
                    onDraft = { vm.teamDraft = it },
                    sending = vm.teamSending,
                    error = vm.teamChatError,
                    onSend = vm::sendTeam,
                    onRetry = vm::reloadTeamChat,
                    onBack = vm::closeTeamThread,
                )
            } else {
                LaunchedEffect(vm.tab, vm.moreDest) {
                    if (vm.openChat != null) return@LaunchedEffect
                    when (vm.tab) {
                        StaffTab.Dashboard -> {
                            vm.refreshInbox(silent = true)
                            vm.refreshAnnouncements()
                            vm.refreshDashboard()
                        }
                        StaffTab.Inbox -> vm.refreshInbox()
                        StaffTab.Customers -> vm.refreshCustomers()
                        StaffTab.Announcements -> vm.refreshAnnouncements()
                        StaffTab.More -> when (vm.moreDest) {
                            MoreDest.Tickets, MoreDest.Tasks -> {
                                vm.refreshTickets()
                                vm.refreshTasks()
                            }
                            MoreDest.Team -> vm.refreshTeam()
                            else -> Unit
                        }
                    }
                }
                MainShell(
                    lang = vm.lang,
                    title = vm.headerTitle(),
                    tab = vm.tab,
                    onTab = vm::selectTab,
                    convBadge = vm.unreadTotal,
                    annBadge = vm.announcements.size,
                    notifyBadge = vm.announcements.size + vm.tickets.size,
                    avatarUrl = vm.mediaUrl(vm.user?.avatar),
                    avatarLetter = vm.user?.name?.firstOrNull()?.toString() ?: "?",
                    onMenu = { vm.selectTab(StaffTab.More) },
                    onNotify = { vm.selectTab(StaffTab.Announcements) },
                    onSearch = { vm.selectTab(StaffTab.Inbox) },
                    onProfile = { vm.openMore(MoreDest.Profile) },
                ) {
                    val chat = vm.openChat
                    val profile = vm.customerProfile
                    if (chat != null) {
                        ChatScreen(
                            lang = vm.lang,
                            chat = chat,
                            messages = vm.messages,
                            loading = vm.chatLoading,
                            draft = vm.draft,
                            onDraft = { vm.draft = it },
                            sending = vm.sending,
                            error = vm.chatError,
                            notice = vm.chatNotice,
                            pendingCallLink = vm.pendingCallLink,
                            onCallLinkConsumed = vm::consumeCallLink,
                            onSend = vm::send,
                            onSendFile = vm::sendFile,
                            onSendVoice = vm::sendVoice,
                            onSendGif = vm::sendGif,
                            onStartCall = vm::startCall,
                            onSettings = { vm.showChatNotice(L10n.t(vm.lang, "chat_settings_soon")) },
                            onNotice = vm::showChatNotice,
                            onRetry = vm::reloadOpenChat,
                            onBack = vm::closeChat,
                            resolveMedia = vm::mediaUrl,
                        )
                    } else if (profile != null) {
                        CustomerDetailScreen(
                            lang = vm.lang,
                            customer = profile,
                            timeline = vm.customerTimeline,
                            loading = vm.customerDetailLoading,
                            saving = vm.customerSaving,
                            error = vm.customersError,
                            onBack = vm::closeCustomerProfile,
                            onChat = { vm.openCustomer(profile) },
                            onRetry = { vm.openCustomerProfile(profile) },
                            onOpenConversation = vm::openTimelineConversation,
                            onSave = vm::updateCustomer,
                            avatarUrl = vm::customerAvatarUrl,
                        )
                    } else when (vm.tab) {
                        StaffTab.Dashboard -> {
                            val info = vm.dashInfoKey
                            if (info == "staff-activity") {
                                StaffActivityScreen(
                                    lang = vm.lang,
                                    loading = vm.staffActivityLoading,
                                    error = vm.staffActivityError,
                                    online = vm.staffOnline,
                                    logins = vm.staffLogins,
                                    loginsTotal = vm.staffLoginsTotal,
                                    onBack = vm::closeDashInfo,
                                    onRefresh = vm::refreshStaffActivity,
                                )
                            } else if (info == "users") {
                                UsersScreen(
                                    lang = vm.lang,
                                    loading = vm.orgUsersLoading,
                                    error = vm.orgUsersError,
                                    rows = vm.orgUsers,
                                    meId = vm.user?.id,
                                    onBack = vm::closeDashInfo,
                                    onRefresh = vm::refreshOrgUsers,
                                    onMessage = vm::messageOrgUser,
                                )
                            } else if (info != null) {
                                DashModuleScreen(
                                    lang = vm.lang,
                                    titleKey = dashPageTitleKey(info),
                                    loading = vm.dashModuleLoading,
                                    error = vm.dashModuleError,
                                    rows = vm.dashModuleItems,
                                    onBack = vm::closeDashInfo,
                                    onRefresh = vm::refreshDashModule,
                                )
                            } else {
                                DashboardScreen(
                                    lang = vm.lang,
                                    stats = vm.dashStats,
                                    loading = vm.dashLoading,
                                    error = vm.dashError,
                                    updatedAt = vm.dashUpdatedAt,
                                    onRefresh = vm::refreshDashboard,
                                    onPage = vm::openDashPage,
                                    onQuickNewConv = vm::quickNewConv,
                                    onQuickNewCustomer = vm::quickNewCustomer,
                                    onQuickNewTicket = { vm.openMore(MoreDest.Tickets) },
                                )
                            }
                        }
                        StaffTab.Inbox -> InboxScreen(
                            lang = vm.lang,
                            search = vm.inboxSearch,
                            onSearch = vm::onInboxSearch,
                            filter = vm.inboxFilter,
                            onFilter = vm::applyInboxFilter,
                            loading = vm.inboxLoading,
                            rows = vm.inbox,
                            unreadTotal = vm.unreadTotal,
                            error = vm.inboxError,
                            onRetry = vm::refreshInbox,
                            onOpen = vm::openConversation,
                            customers = vm.customers,
                            customerSearch = vm.customerSearch,
                            onCustomerSearch = vm::onCustomerSearch,
                            customersLoading = vm.customersLoading,
                            onPickCustomer = vm::openCustomer,
                            wantNew = vm.pendingNewConv,
                            onWantNewConsumed = { vm.pendingNewConv = false },
                            avatarUrl = vm::customerAvatarUrl,
                        )
                        StaffTab.Customers -> CustomersScreen(
                            lang = vm.lang,
                            search = vm.customerSearch,
                            onSearch = vm::onCustomerSearch,
                            archive = vm.customerArchive,
                            onArchive = vm::applyCustomerArchive,
                            loading = vm.customersLoading,
                            rows = vm.customers,
                            error = vm.customersError,
                            onRetry = vm::refreshCustomers,
                            onOpen = vm::openCustomerProfile,
                            onSend = vm::openCustomer,
                            onInbox = { vm.selectTab(StaffTab.Inbox) },
                            onCreate = vm::createCustomer,
                            wantAdd = vm.pendingAddCustomer,
                            onWantAddConsumed = { vm.pendingAddCustomer = false },
                            avatarUrl = vm::customerAvatarUrl,
                        )
                        StaffTab.Announcements -> AnnouncementsScreen(
                            lang = vm.lang,
                            rows = vm.announcements,
                            error = vm.announcementError,
                            sending = vm.announcementSending,
                            canSend = vm.canSendAnnouncements(),
                            isManager = vm.user?.role.equals("manager", ignoreCase = true),
                            users = vm.announcementUsers,
                            departments = vm.announcementDepartments,
                            onRefresh = vm::refreshAnnouncements,
                            onSend = vm::sendAnnouncement,
                            onDelete = vm::deleteAnnouncement,
                        )
                        StaffTab.More -> when (vm.moreDest) {
                            MoreDest.Menu -> MoreMenuScreen(
                                lang = vm.lang,
                                onOpen = vm::openMore,
                                onLogout = vm::logout,
                            )
                            MoreDest.Tickets, MoreDest.Tasks -> WorkScreen(
                                lang = vm.lang,
                                showTasks = vm.showTasks,
                                onShowTasks = {
                                    vm.showTasks = it
                                    vm.moreDest = if (it) MoreDest.Tasks else MoreDest.Tickets
                                },
                                ticketsLoading = vm.ticketsLoading,
                                tickets = vm.tickets,
                                tasksLoading = vm.tasksLoading,
                                tasks = vm.tasks,
                                error = vm.workError,
                                onRetry = {
                                    vm.refreshTickets()
                                    vm.refreshTasks()
                                },
                            )
                            MoreDest.Team -> TeamListScreen(
                                lang = vm.lang,
                                loading = vm.teamLoading,
                                rows = vm.teamThreads,
                                error = vm.teamError,
                                onRetry = vm::refreshTeam,
                                onOpen = vm::openTeamThread,
                                colleagues = vm.teamUsers,
                                colleagueSearch = vm.teamUserSearch,
                                onColleagueSearch = { vm.teamUserSearch = it },
                                colleaguesLoading = vm.teamUsersLoading,
                                onPickColleague = vm::startTeamChat,
                                onLoadColleagues = vm::refreshTeamUsers,
                            )
                            MoreDest.Profile -> ProfileScreen(
                                lang = vm.lang,
                                user = vm.user,
                                avatarUrl = vm.mediaUrl(vm.user?.avatar),
                                serverUrl = vm.serverUrl,
                                onServer = { vm.serverUrl = it },
                                onSaveServer = vm::persistServer,
                                onLang = vm::changeLang,
                                onLogout = vm::logout,
                                pushStatus = vm.pushStatus(context),
                                pushTestBusy = vm.pushTestBusy,
                                pushTestMsg = vm.pushTestMsg,
                                onOpenNotificationSettings = {
                                    val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                                        putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                                    }
                                    runCatching { context.startActivity(intent) }
                                },
                                onTestPush = { vm.testPush(context) },
                            )
                        }
                    }
                }
            }
            val push = vm.inAppPush
            if (push != null) {
                InAppPushBanner(
                    title = push.title,
                    body = push.body,
                    modifier = Modifier.align(Alignment.TopCenter),
                    onClick = {
                        vm.openFromPush(push.type, push.conversationId, push.threadId, push.ticketId)
                        vm.dismissInAppPush()
                    },
                )
            }
            }
        }
    }
}

private fun dashPageTitleKey(page: String?): String = when (page) {
    "whatsapp" -> "dash_page_whatsapp"
    "message-templates" -> "dash_page_templates"
    "processes" -> "dash_page_processes"
    "users" -> "dash_page_users"
    "departments" -> "dash_page_departments"
    "branches" -> "dash_page_branches"
    "rates" -> "dash_page_rates"
    "rates-charts" -> "dash_page_charts"
    "services" -> "dash_page_services"
    "supervision" -> "dash_page_supervision"
    "staff-activity" -> "dash_page_staff"
    "panel-settings" -> "dash_page_appearance"
    "system-status" -> "dash_page_system"
    else -> "dashboard"
}
