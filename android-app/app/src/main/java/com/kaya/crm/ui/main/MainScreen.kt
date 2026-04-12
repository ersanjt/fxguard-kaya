package com.kaya.crm.ui.main

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.kaya.crm.ui.main.dashboard.DashboardScreen
import com.kaya.crm.ui.main.conversations.ConversationsScreen
import com.kaya.crm.ui.main.customers.CustomersScreen
import com.kaya.crm.ui.main.internalchat.InternalChatScreen
import com.kaya.crm.ui.main.tickets.TicketsScreen
import com.kaya.crm.ui.main.profile.ProfileScreen

enum class MainTab(val title: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    DASHBOARD("داشبورد", Icons.Default.Dashboard),
    CONVERSATIONS("مکالمات", Icons.AutoMirrored.Filled.Chat),
    CUSTOMERS("مشتریان", Icons.Default.People),
    TEAM("تیم", Icons.Default.Forum),
    TICKETS("تیکت‌ها", Icons.Default.ConfirmationNumber),
    PROFILE("پروفایل", Icons.Default.Person)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    onLogout: () -> Unit,
    viewModel: MainViewModel = hiltViewModel()
) {
    var selectedTab by remember { mutableStateOf(MainTab.CONVERSATIONS) }
    var pendingOpenConversationId by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        when (selectedTab) {
                            MainTab.DASHBOARD -> "داشبورد"
                            MainTab.CONVERSATIONS -> "مکالمات"
                            MainTab.CUSTOMERS -> "مشتریان"
                            MainTab.TEAM -> "تیم"
                            MainTab.TICKETS -> "تیکت‌ها"
                            MainTab.PROFILE -> "پروفایل"
                        },
                        style = MaterialTheme.typography.titleLarge
                    )
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
                MainTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = { Icon(tab.icon, contentDescription = tab.title) },
                        label = { Text(tab.title, maxLines = 1) },
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
                    onNavigateToTab = { selectedTab = it }
                )
                MainTab.CONVERSATIONS -> ConversationsScreen(
                    pendingOpenConversationId = pendingOpenConversationId,
                    onPendingOpenConversationConsumed = { pendingOpenConversationId = null }
                )
                MainTab.CUSTOMERS -> CustomersScreen(
                    onOpenConversation = { convId ->
                        pendingOpenConversationId = convId
                        selectedTab = MainTab.CONVERSATIONS
                    }
                )
                MainTab.TEAM -> InternalChatScreen()
                MainTab.TICKETS -> TicketsScreen()
                MainTab.PROFILE -> ProfileScreen(
                    onLogout = {
                        viewModel.logout()
                        onLogout()
                    }
                )
            }
        }
    }
}
