package com.kaya.crm.ui.main.dashboard

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.kaya.crm.ui.main.MainTab

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel = hiltViewModel(),
    onNavigateToTab: (MainTab) -> Unit = {}
) {
    val dashboard by viewModel.dashboard.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val refreshing by viewModel.refreshing.collectAsState()
    val error by viewModel.error.collectAsState()
    val lastUpdated by viewModel.lastUpdatedLabel.collectAsState()

    LaunchedEffect(Unit) { viewModel.load() }

    val pullRefreshState = rememberPullRefreshState(refreshing, { viewModel.refresh() })

    Box(
        modifier = Modifier
            .fillMaxSize()
            .pullRefresh(pullRefreshState)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            if (error != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            error!!,
                            modifier = Modifier.weight(1f),
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                        Button(onClick = { viewModel.clearError(); viewModel.load() }) { Text("تلاش مجدد") }
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }
            if (loading && dashboard == null && error == null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                dashboard?.let { d ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "خلاصه آمار",
                            style = MaterialTheme.typography.titleLarge
                        )
                        lastUpdated?.let { t ->
                            Text(
                                t,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    Text(
                        "برای رفتن به بخش مربوط، روی هر کارت بزنید (در صورت وجود مسیر).",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp, bottom = 12.dp)
                    )
                    Row(modifier = Modifier.fillMaxWidth()) {
                        StatCard(
                            modifier = Modifier.weight(1f),
                            title = "چت داخلی",
                            value = "گفتگو با تیم",
                            icon = Icons.Default.Forum,
                            onClick = { onNavigateToTab(MainTab.TEAM) }
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        StatCard(
                            modifier = Modifier.weight(1f),
                            title = "مکالمات باز",
                            value = d.openConversations.toString(),
                            icon = Icons.AutoMirrored.Filled.Chat,
                            onClick = { onNavigateToTab(MainTab.CONVERSATIONS) }
                        )
                        StatCard(
                            modifier = Modifier.weight(1f),
                            title = "خوانده نشده",
                            value = d.unreadConversations.toString(),
                            icon = Icons.Default.MarkEmailUnread,
                            onClick = { onNavigateToTab(MainTab.CONVERSATIONS) }
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        StatCard(
                            modifier = Modifier.weight(1f),
                            title = "مشتریان",
                            value = d.totalCustomers.toString(),
                            icon = Icons.Default.People,
                            onClick = { onNavigateToTab(MainTab.CUSTOMERS) }
                        )
                        StatCard(
                            modifier = Modifier.weight(1f),
                            title = "پیام امروز",
                            value = d.todayMessages.toString(),
                            icon = Icons.AutoMirrored.Filled.Send,
                            onClick = { onNavigateToTab(MainTab.CONVERSATIONS) }
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        StatCard(
                            modifier = Modifier.weight(1f),
                            title = "تیکت‌ها",
                            value = d.ticketsOpen.toString(),
                            icon = Icons.Default.ConfirmationNumber,
                            onClick = { onNavigateToTab(MainTab.TICKETS) }
                        )
                        StatCard(
                            modifier = Modifier.weight(1f),
                            title = "تسک‌ها",
                            value = d.tasksPending.toString(),
                            icon = Icons.AutoMirrored.Filled.Assignment,
                            onClick = null
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        StatCard(
                            modifier = Modifier.weight(1f),
                            title = "اعلان‌ها",
                            value = d.unreadAnnouncements.toString(),
                            icon = Icons.Default.Notifications,
                            onClick = null
                        )
                        StatCard(
                            modifier = Modifier.weight(1f),
                            title = "آنلاین",
                            value = d.staffOnline.toString(),
                            icon = Icons.Default.Person,
                            onClick = null
                        )
                    }
                }
            }
        }
        PullRefreshIndicator(
            refreshing = refreshing,
            state = pullRefreshState,
            modifier = Modifier.align(Alignment.TopCenter)
        )
    }
}

@Composable
private fun StatCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    icon: ImageVector,
    onClick: (() -> Unit)? = null
) {
    Card(
        modifier = modifier
            .then(
                if (onClick != null) Modifier.clickable(onClick = onClick)
                else Modifier
            ),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Spacer(modifier = Modifier.height(8.dp))
            Text(value, style = MaterialTheme.typography.headlineSmall)
            Text(title, style = MaterialTheme.typography.bodySmall)
        }
    }
}
