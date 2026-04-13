package com.kaya.crm.ui.main

import android.app.Activity
import android.view.WindowManager
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.kaya.crm.R
import androidx.hilt.navigation.compose.hiltViewModel
import com.kaya.crm.ui.main.conversations.ConversationsScreen
import com.kaya.crm.ui.main.customers.CustomersScreen
import com.kaya.crm.ui.main.dashboard.DashboardScreen
import com.kaya.crm.ui.main.internalchat.InternalChatScreen
import com.kaya.crm.ui.main.permissions.PanelPermissions
import com.kaya.crm.ui.main.profile.ProfileScreen
import com.kaya.crm.ui.main.tickets.TicketsScreen
import com.kaya.crm.update.AppUpdateViewModel

enum class MainTab(val titleRes: Int, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    DASHBOARD(R.string.tab_dashboard, Icons.Default.Dashboard),
    CONVERSATIONS(R.string.tab_conversations, Icons.AutoMirrored.Filled.Chat),
    CUSTOMERS(R.string.tab_customers, Icons.Default.People),
    TEAM(R.string.tab_team, Icons.Default.Forum),
    TICKETS(R.string.tab_tickets, Icons.Default.ConfirmationNumber),
    PROFILE(R.string.tab_profile, Icons.Default.Person)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    onLogout: () -> Unit,
    appUpdateViewModel: AppUpdateViewModel,
    mainViewModel: MainViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val user by mainViewModel.currentUser.collectAsState()
    val hiddenPanelPages by mainViewModel.hiddenPanelPages.collectAsState()
    val organizationTitle by mainViewModel.organizationTitle.collectAsState()
    val visibleTabs = remember(user, hiddenPanelPages) {
        PanelPermissions.visibleTabs(user, hiddenPanelPages)
    }

    /* قبل از لود کاربر: داشبورد امن؛ بعد از ورود: اولویت با مکالمات (هستهٔ اپ) */
    var selectedTab by remember { mutableStateOf(MainTab.DASHBOARD) }
    var pendingOpenConversationId by remember { mutableStateOf<String?>(null) }
    var chatHomeApplied by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(visibleTabs, user, hiddenPanelPages) {
        if (selectedTab !in visibleTabs) {
            selectedTab = visibleTabs.first()
        }
    }

    LaunchedEffect(user?.id, visibleTabs) {
        if (chatHomeApplied) return@LaunchedEffect
        if (user != null && MainTab.CONVERSATIONS in visibleTabs) {
            selectedTab = MainTab.CONVERSATIONS
            chatHomeApplied = true
        }
    }

    /* جلوگیری از اسکرین‌شات/ضبط صفحه در تب‌های چت (مشتریان و چت داخلی) */
    DisposableEffect(selectedTab) {
        val act = context as? Activity
        val flag = WindowManager.LayoutParams.FLAG_SECURE
        if (act != null) {
            if (selectedTab == MainTab.CONVERSATIONS || selectedTab == MainTab.TEAM) {
                act.window.setFlags(flag, flag)
            } else {
                act.window.clearFlags(flag)
            }
            onDispose { act.window.clearFlags(flag) }
        } else {
            onDispose { }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    val tabShort = stringResource(selectedTab.titleRes)
                    val org = organizationTitle?.trim()?.takeIf { it.isNotBlank() }
                    Column {
                        Text(
                            text = org ?: tabShort,
                            style = MaterialTheme.typography.titleLarge,
                            maxLines = 1
                        )
                        if (org != null) {
                            Text(
                                text = tabShort,
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.88f)
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = MaterialTheme.colorScheme.onSurface
            ) {
                visibleTabs.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = {
                            Icon(
                                tab.icon,
                                contentDescription = stringResource(tab.titleRes)
                            )
                        },
                        label = { Text(stringResource(tab.titleRes), maxLines = 1) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.primary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    )
                }
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when (selectedTab) {
                MainTab.DASHBOARD -> DashboardScreen(
                    user = user,
                    hiddenPanelPages = hiddenPanelPages,
                    onNavigateToTab = { target ->
                        if (target in visibleTabs) selectedTab = target
                    }
                )
                MainTab.CONVERSATIONS -> ConversationsScreen(
                    pendingOpenConversationId = pendingOpenConversationId,
                    onPendingOpenConversationConsumed = { pendingOpenConversationId = null }
                )
                MainTab.CUSTOMERS -> CustomersScreen(
                    onOpenConversation = { convId ->
                        if (MainTab.CONVERSATIONS in visibleTabs) {
                            pendingOpenConversationId = convId
                            selectedTab = MainTab.CONVERSATIONS
                        }
                    }
                )
                MainTab.TEAM -> InternalChatScreen()
                MainTab.TICKETS -> TicketsScreen()
                MainTab.PROFILE -> ProfileScreen(
                    hiddenPanelPages = hiddenPanelPages,
                    onLogout = onLogout,
                    appUpdateViewModel = appUpdateViewModel
                )
            }
        }
    }
}
