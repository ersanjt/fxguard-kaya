/**
 * Kaya CRM — debug store screenshots (fictional data only)
 * @file    android-app/.../store/StorePreviewActivity.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/STORE-RELEASE.md
 */
package io.fxguard.kaya.store

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import io.fxguard.kaya.data.models.InboxFilter
import io.fxguard.kaya.ui.auth.LoginScreen
import io.fxguard.kaya.ui.home.AnnouncementsScreen
import io.fxguard.kaya.ui.home.DashboardScreen
import io.fxguard.kaya.ui.i18n.L10n
import io.fxguard.kaya.ui.inbox.InboxScreen
import io.fxguard.kaya.ui.lists.CustomersScreen
import io.fxguard.kaya.ui.shell.MainShell
import io.fxguard.kaya.ui.shell.StaffTab
import io.fxguard.kaya.ui.theme.KayaTheme

class StorePreviewActivity : ComponentActivity() {
    private var screen by mutableStateOf("dashboard")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        screen = intent.getStringExtra(EXTRA_SCREEN) ?: "dashboard"
        setContent {
            val lang = "fa"
            KayaTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    when (screen) {
                        "login" -> LoginScreen(
                            lang = lang,
                            branding = StoreDemoData.branding,
                            logoUrl = null,
                            serverUrl = "https://kaya.fxguard.io",
                            loading = false,
                            error = null,
                            onLang = {},
                            onServer = {},
                            onSubmit = { _, _ -> },
                            onForgot = {},
                        )
                        else -> PreviewShell(lang, screen)
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        screen = intent.getStringExtra(EXTRA_SCREEN) ?: screen
    }

    companion object {
        const val EXTRA_SCREEN = "screen"
    }
}

@Composable
private fun PreviewShell(lang: String, screen: String) {
    val tab = when (screen) {
        "inbox" -> StaffTab.Inbox
        "customers" -> StaffTab.Customers
        "announcements" -> StaffTab.Announcements
        else -> StaffTab.Dashboard
    }
    val title = when (tab) {
        StaffTab.Inbox -> L10n.t(lang, "inbox")
        StaffTab.Customers -> L10n.t(lang, "customers")
        StaffTab.Announcements -> L10n.t(lang, "announcements")
        else -> L10n.t(lang, "dashboard")
    }
    MainShell(
        lang = lang,
        title = title,
        tab = tab,
        onTab = {},
        convBadge = 2,
        annBadge = 1,
        notifyBadge = 1,
        avatarUrl = null,
        avatarLetter = "ک",
        onMenu = {},
        onNotify = {},
        onSearch = {},
        onProfile = {},
    ) {
        when (tab) {
            StaffTab.Inbox -> InboxScreen(
                lang = lang,
                search = "",
                onSearch = {},
                filter = InboxFilter.All,
                onFilter = {},
                loading = false,
                rows = StoreDemoData.conversations,
                unreadTotal = 2,
                error = null,
                onRetry = {},
                onOpen = {},
                customers = StoreDemoData.customers,
                customerSearch = "",
                onCustomerSearch = {},
                customersLoading = false,
                onPickCustomer = {},
                avatarUrl = { null },
            )
            StaffTab.Customers -> CustomersScreen(
                lang = lang,
                search = "",
                onSearch = {},
                archive = false,
                onArchive = {},
                loading = false,
                rows = StoreDemoData.customers,
                error = null,
                onRetry = {},
                onOpen = {},
                onSend = {},
                onInbox = {},
                onCreate = { _, _ -> },
                avatarUrl = { null },
            )
            StaffTab.Announcements -> AnnouncementsScreen(
                lang = lang,
                rows = StoreDemoData.announcements,
                error = null,
                sending = false,
                canSend = true,
                isManager = false,
                users = emptyList(),
                departments = emptyList(),
                onRefresh = {},
                onSend = { _, _, _, _, _ -> },
                onDelete = {},
            )
            else -> DashboardScreen(
                lang = lang,
                stats = StoreDemoData.stats,
                loading = false,
                error = null,
                updatedAt = "10:15",
                onRefresh = {},
                onPage = {},
                onQuickNewConv = {},
                onQuickNewCustomer = {},
                onQuickNewTicket = {},
            )
        }
    }
}
