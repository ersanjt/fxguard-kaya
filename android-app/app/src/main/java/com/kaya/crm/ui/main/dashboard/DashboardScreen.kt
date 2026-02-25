package com.kaya.crm.ui.main.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun DashboardScreen(viewModel: DashboardViewModel = hiltViewModel()) {
    val dashboard by viewModel.dashboard.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()

    LaunchedEffect(Unit) { viewModel.load() }

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
                    Text(error!!, modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.onErrorContainer)
                    Button(onClick = { viewModel.clearError(); viewModel.load() }) { Text("تلاش مجدد") }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
        if (loading && dashboard == null && error == null) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            dashboard?.let { d ->
                Text(
                    "خلاصه آمار",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    StatCard(
                        modifier = Modifier.weight(1f),
                        title = "مکالمات باز",
                        value = d.openConversations.toString(),
                        icon = Icons.Default.Chat
                    )
                    StatCard(
                        modifier = Modifier.weight(1f),
                        title = "خوانده نشده",
                        value = d.unreadConversations.toString(),
                        icon = Icons.Default.MarkEmailUnread
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
                        icon = Icons.Default.People
                    )
                    StatCard(
                        modifier = Modifier.weight(1f),
                        title = "پیام امروز",
                        value = d.todayMessages.toString(),
                        icon = Icons.Default.Send
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
                        icon = Icons.Default.ConfirmationNumber
                    )
                    StatCard(
                        modifier = Modifier.weight(1f),
                        title = "تسک‌ها",
                        value = d.tasksPending.toString(),
                        icon = Icons.Default.Assignment
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
                        icon = Icons.Default.Notifications
                    )
                    StatCard(
                        modifier = Modifier.weight(1f),
                        title = "آنلاین",
                        value = d.staffOnline.toString(),
                        icon = Icons.Default.Person
                    )
                }
            }
        }
    }
}

@Composable
private fun StatCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Spacer(modifier = Modifier.height(8.dp))
            Text(value, style = MaterialTheme.typography.headlineSmall)
            Text(title, style = MaterialTheme.typography.bodySmall)
        }
    }
}
