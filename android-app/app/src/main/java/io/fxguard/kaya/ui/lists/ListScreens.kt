/**
 * Kaya CRM — customers, tickets, profile
 * @file    android-app/.../ui/lists/ListScreens.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.ui.lists

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import io.fxguard.kaya.data.models.StaffUser
import io.fxguard.kaya.data.models.TaskRow
import io.fxguard.kaya.data.models.TicketRow
import io.fxguard.kaya.ui.common.AvatarCircle
import io.fxguard.kaya.ui.common.KayaField
import io.fxguard.kaya.ui.common.KayaPrimaryButton
import io.fxguard.kaya.ui.common.StatusLine
import io.fxguard.kaya.ui.i18n.L10n
import io.fxguard.kaya.ui.theme.KayaColors

@Composable
fun TicketsScreen(lang: String, loading: Boolean, rows: List<TicketRow>, error: String?, onRetry: () -> Unit) {
    Column(Modifier.fillMaxSize().background(KayaColors.Bg).statusBarsPadding().padding(16.dp)) {
        Text(L10n.t(lang, "tickets"), color = KayaColors.Text, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
        StatusLine(error, onRetry, L10n.t(lang, "retry"))
        Spacer(Modifier.height(12.dp))
        when {
            loading && rows.isEmpty() -> CenterBusy()
            rows.isEmpty() -> CenterEmpty(L10n.t(lang, "empty_tickets"))
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(rows, key = { it.id }) { row ->
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(KayaColors.Card)
                            .padding(12.dp),
                    ) {
                        Text(row.title, color = KayaColors.Text, fontWeight = FontWeight.Medium)
                        Text(
                            listOfNotNull(row.ticketNumber, row.status, row.priority).joinToString(" · "),
                            color = KayaColors.Text2,
                            fontSize = 12.sp,
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun WorkScreen(
    lang: String,
    showTasks: Boolean,
    onShowTasks: (Boolean) -> Unit,
    ticketsLoading: Boolean,
    tickets: List<TicketRow>,
    tasksLoading: Boolean,
    tasks: List<TaskRow>,
    error: String?,
    onRetry: () -> Unit,
) {
    Column(Modifier.fillMaxSize().background(KayaColors.Bg).padding(16.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(false to "tickets", true to "tasks").forEach { (tasksTab, key) ->
                val on = showTasks == tasksTab
                Text(
                    L10n.t(lang, key),
                    color = if (on) KayaColors.Text else KayaColors.Text3,
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(if (on) KayaColors.AccentSoft else KayaColors.Card)
                        .clickable { onShowTasks(tasksTab) }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                )
            }
        }
        StatusLine(error, onRetry, L10n.t(lang, "retry"))
        Spacer(Modifier.height(12.dp))
        if (showTasks) {
            when {
                tasksLoading && tasks.isEmpty() -> CenterBusy()
                tasks.isEmpty() -> CenterEmpty(L10n.t(lang, "empty_tasks"))
                else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(tasks, key = { it.id }) { row ->
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(KayaColors.Card)
                                .padding(12.dp),
                        ) {
                            Text(row.title, color = KayaColors.Text, fontWeight = FontWeight.Medium)
                            Text(
                                listOfNotNull(row.status, row.priority, row.assigneeName).joinToString(" · "),
                                color = KayaColors.Text2,
                                fontSize = 12.sp,
                            )
                        }
                    }
                }
            }
        } else {
            when {
                ticketsLoading && tickets.isEmpty() -> CenterBusy()
                tickets.isEmpty() -> CenterEmpty(L10n.t(lang, "empty_tickets"))
                else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(tickets, key = { it.id }) { row ->
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(KayaColors.Card)
                                .padding(12.dp),
                        ) {
                            Text(row.title, color = KayaColors.Text, fontWeight = FontWeight.Medium)
                            Text(
                                listOfNotNull(row.ticketNumber, row.status, row.priority).joinToString(" · "),
                                color = KayaColors.Text2,
                                fontSize = 12.sp,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileScreen(
    lang: String,
    user: StaffUser?,
    avatarUrl: String?,
    serverUrl: String,
    onServer: (String) -> Unit,
    onSaveServer: () -> Unit,
    onLang: (String) -> Unit,
    onLogout: () -> Unit,
    pushStatus: String,
    pushTestBusy: Boolean,
    pushTestMsg: String?,
    onOpenNotificationSettings: () -> Unit,
    onTestPush: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxSize()
            .background(KayaColors.Bg)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Text(L10n.t(lang, "profile_intro"), color = KayaColors.Text2, fontSize = 13.sp)
        Spacer(Modifier.height(16.dp))
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(KayaColors.Card)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (!avatarUrl.isNullOrBlank()) {
                AsyncImage(
                    avatarUrl,
                    contentDescription = user?.name,
                    modifier = Modifier.size(72.dp).clip(RoundedCornerShape(999.dp)),
                    contentScale = ContentScale.Crop,
                )
            } else {
                AvatarCircle(user?.name ?: "?", Modifier.size(72.dp))
            }
            Spacer(Modifier.height(10.dp))
            Text(user?.name ?: "—", color = KayaColors.Text, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
            Text(user?.username?.takeIf { it.isNotBlank() }?.let { "@$it" } ?: "", color = KayaColors.Text2, fontSize = 13.sp)
            Text(user?.email ?: "", color = KayaColors.Text2, fontSize = 13.sp)
            Spacer(Modifier.height(8.dp))
            Text(
                user?.role ?: "",
                color = KayaColors.Accent,
                fontSize = 12.sp,
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(KayaColors.AccentSoft)
                    .padding(horizontal = 10.dp, vertical = 4.dp),
            )
        }
        Spacer(Modifier.height(16.dp))
        Text(L10n.t(lang, "profile_readonly"), color = KayaColors.Text, fontWeight = FontWeight.Medium)
        Spacer(Modifier.height(8.dp))
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(KayaColors.Card)
                .padding(14.dp),
        ) {
            Text(L10n.t(lang, "login_email"), color = KayaColors.Text3, fontSize = 12.sp)
            Text(user?.email ?: "—", color = KayaColors.Text, fontSize = 14.sp)
            Spacer(Modifier.height(10.dp))
            Text(L10n.t(lang, "role"), color = KayaColors.Text3, fontSize = 12.sp)
            Text(user?.role ?: "—", color = KayaColors.Text, fontSize = 14.sp)
        }
        Spacer(Modifier.height(18.dp))
        Text(L10n.t(lang, "language"), color = KayaColors.Text2, fontSize = 13.sp)
        Row {
            listOf("fa" to "فارسی", "en" to "EN", "tr" to "TR").forEach { (code, label) ->
                TextButton(onClick = { onLang(code) }) {
                    Text(label, color = if (lang == code) KayaColors.Accent else KayaColors.Text3)
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        KayaField(serverUrl, onServer, L10n.t(lang, "server"))
        Spacer(Modifier.height(10.dp))
        KayaPrimaryButton(L10n.t(lang, "save_server"), false, onClick = onSaveServer)
        Spacer(Modifier.height(18.dp))
        Text(L10n.t(lang, "push_section"), color = KayaColors.Text, fontWeight = FontWeight.Medium)
        Spacer(Modifier.height(8.dp))
        Text(pushStatus, color = KayaColors.Text2, fontSize = 13.sp)
        if (!pushTestMsg.isNullOrBlank()) {
            Spacer(Modifier.height(6.dp))
            Text(pushTestMsg, color = KayaColors.Accent, fontSize = 13.sp)
        }
        Spacer(Modifier.height(10.dp))
        KayaPrimaryButton(L10n.t(lang, "push_open_settings"), false, onClick = onOpenNotificationSettings)
        Spacer(Modifier.height(8.dp))
        KayaPrimaryButton(L10n.t(lang, "push_test"), pushTestBusy, onClick = onTestPush)
        Spacer(Modifier.height(24.dp))
        KayaPrimaryButton(L10n.t(lang, "logout"), false, onClick = onLogout)
    }
}

@Composable
private fun CenterBusy() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = KayaColors.Accent)
    }
}

@Composable
private fun CenterEmpty(text: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(text, color = KayaColors.Text2)
    }
}
