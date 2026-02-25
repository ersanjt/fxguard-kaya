package com.kaya.crm.ui.main

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.kaya.crm.ui.main.dashboard.DashboardScreen
import com.kaya.crm.ui.main.conversations.ConversationsScreen
import com.kaya.crm.ui.main.internalchat.InternalChatScreen
import com.kaya.crm.ui.main.customers.CustomersScreen
import com.kaya.crm.ui.main.tickets.TicketsScreen
import com.kaya.crm.ui.main.tasks.TasksScreen
import com.kaya.crm.ui.main.profile.ProfileScreen

enum class MainTab(val title: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    CONVERSATIONS("مکالمات واتساپ", Icons.Default.Chat),
    INTERNAL_CHAT("چت داخلی", Icons.Default.Group),
    DASHBOARD("داشبورد", Icons.Default.Dashboard),
    CUSTOMERS("مشتریان", Icons.Default.People),
    TICKETS("تیکت‌ها", Icons.Default.ConfirmationNumber),
    TASKS("وظایف", Icons.Default.Assignment),
    PROFILE("پروفایل", Icons.Default.Person)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    onLogout: () -> Unit,
    viewModel: MainViewModel = hiltViewModel()
) {
    var selectedTab by remember { mutableStateOf(MainTab.DASHBOARD) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("صرافی کایا", style = MaterialTheme.typography.titleLarge) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        },
        bottomBar = {
            NavigationBar {
                listOf(
                    MainTab.CONVERSATIONS,
                    MainTab.INTERNAL_CHAT,
                    MainTab.DASHBOARD,
                    MainTab.CUSTOMERS,
                    MainTab.TICKETS,
                    MainTab.TASKS,
                    MainTab.PROFILE
                ).forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = { Icon(tab.icon, contentDescription = tab.title) },
                        label = { Text(tab.title, maxLines = 1) }
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
                MainTab.DASHBOARD -> DashboardScreen()
                MainTab.CONVERSATIONS -> ConversationsScreen()
                MainTab.INTERNAL_CHAT -> InternalChatScreen()
                MainTab.CUSTOMERS -> CustomersScreen()
                MainTab.TICKETS -> TicketsScreen()
                MainTab.TASKS -> TasksScreen()
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
