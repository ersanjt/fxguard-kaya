/**
 * Kaya CRM — dashboard / more / announcements (web mobile parity)
 * @file    android-app/.../ui/home/WebHomeScreens.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Assignment
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.Apartment
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Campaign
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.Forum
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.NoteAdd
import androidx.compose.material.icons.outlined.OpenInFull
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.PersonAdd
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.ShowChart
import androidx.compose.material.icons.outlined.Speed
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.KeyboardArrowUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.fxguard.kaya.data.models.AnnouncementRow
import io.fxguard.kaya.data.models.AnnouncementTarget
import io.fxguard.kaya.data.models.DashboardStats
import io.fxguard.kaya.data.models.DashItem
import io.fxguard.kaya.data.models.OrgUser
import io.fxguard.kaya.data.models.StaffLoginRow
import io.fxguard.kaya.data.models.StaffPresence
import io.fxguard.kaya.ui.common.AvatarCircle
import io.fxguard.kaya.ui.common.KayaField
import io.fxguard.kaya.ui.common.KayaPrimaryButton
import io.fxguard.kaya.ui.common.RtlSafeText
import io.fxguard.kaya.ui.common.StatusLine
import io.fxguard.kaya.ui.i18n.L10n
import io.fxguard.kaya.ui.shell.MoreDest
import io.fxguard.kaya.ui.theme.KayaColors

@Composable
fun DashboardScreen(
    lang: String,
    stats: DashboardStats,
    loading: Boolean,
    error: String?,
    updatedAt: String?,
    onRefresh: () -> Unit,
    onPage: (String) -> Unit,
    onQuickNewConv: () -> Unit,
    onQuickNewCustomer: () -> Unit,
    onQuickNewTicket: () -> Unit,
) {
    val n = { v: Int -> dashDigits(lang, v) }
    Column(
        Modifier
            .fillMaxSize()
            .background(KayaColors.Bg)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(L10n.t(lang, "dashboard"), color = KayaColors.Text, fontSize = 22.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
            Row(
                Modifier
                    .clip(RoundedCornerShape(10.dp))
                    .clickable(onClick = onRefresh)
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.Refresh, contentDescription = null, tint = KayaColors.Accent, modifier = Modifier.size(16.dp))
                Text(L10n.t(lang, "dashboard_refresh"), color = KayaColors.Accent, fontSize = 13.sp, modifier = Modifier.padding(start = 6.dp))
            }
        }
        StatusLine(error, onRefresh, L10n.t(lang, "retry"))
        Spacer(Modifier.height(14.dp))
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(L10n.t(lang, "dashboard_kpi_title"), color = KayaColors.Text, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, modifier = Modifier.weight(1f))
            if (!updatedAt.isNullOrBlank()) {
                Text("${L10n.t(lang, "dashboard_updated_at")} $updatedAt", color = KayaColors.Text3, fontSize = 11.sp)
            }
        }
        if (loading) {
            Box(Modifier.fillMaxWidth().height(80.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KayaColors.Accent, modifier = Modifier.size(28.dp))
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KpiBox(n(stats.openConversations), L10n.t(lang, "dashboard_stat_conversations"), Modifier.weight(1f)) { onPage("conversations") }
            KpiBox(n(stats.unreadConversations), L10n.t(lang, "dashboard_stat_unread"), Modifier.weight(1f), warn = stats.unreadConversations > 0) { onPage("conversations") }
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KpiBox(n(stats.unansweredConversations), L10n.t(lang, "dashboard_stat_unanswered"), Modifier.weight(1f), warn = stats.unansweredConversations > 0) { onPage("conversations") }
            KpiBox(n(stats.unassignedConversations), L10n.t(lang, "dashboard_stat_unassigned"), Modifier.weight(1f), warn = stats.unassignedConversations > 0) { onPage("conversations") }
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KpiBox(n(stats.todayMessages), L10n.t(lang, "dashboard_stat_messages_today"), Modifier.weight(1f)) { onPage("conversations") }
            KpiBox(n(stats.ticketsOpen), L10n.t(lang, "dashboard_stat_tickets"), Modifier.weight(1f)) { onPage("tickets") }
            KpiBox(n(stats.tasksPending), L10n.t(lang, "dashboard_stat_tasks"), Modifier.weight(1f), warn = stats.tasksPending > 0) { onPage("tasks") }
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KpiBox(n(stats.totalCustomers), L10n.t(lang, "dashboard_stat_customers"), Modifier.weight(1f)) { onPage("customers") }
            KpiBox(n(stats.staffOnline), L10n.t(lang, "dashboard_stat_online"), Modifier.weight(1f)) { onPage("staff-activity") }
            KpiBox(n(stats.loginsToday), L10n.t(lang, "dashboard_stat_logins_today"), Modifier.weight(1f)) { onPage("staff-activity") }
        }
        stats.avgRating?.let { rating ->
            Spacer(Modifier.height(8.dp))
            val label = buildString {
                append(L10n.t(lang, "dashboard_stat_satisfaction"))
                if (stats.ratedConversationsCount > 0) append(" (${n(stats.ratedConversationsCount)})")
            }
            KpiBox("${dashDigits(lang, String.format("%.1f", rating).trimEnd('0').trimEnd('.'))}/${dashDigits(lang, 5)}", label, Modifier.fillMaxWidth()) { onPage("conversations") }
        }
        Spacer(Modifier.height(14.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            QuickBtn(L10n.t(lang, "dashboard_quick_new_conv"), Icons.AutoMirrored.Outlined.Chat, Modifier.weight(1f), onQuickNewConv)
            QuickBtn(L10n.t(lang, "dashboard_quick_new_customer"), Icons.Outlined.PersonAdd, Modifier.weight(1f), onQuickNewCustomer)
            QuickBtn(L10n.t(lang, "dashboard_quick_new_ticket"), Icons.Outlined.ConfirmationNumber, Modifier.weight(1f), onQuickNewTicket)
        }
        Spacer(Modifier.height(18.dp))
        Text(L10n.t(lang, "dashboard_sections"), color = KayaColors.Text, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
        Spacer(Modifier.height(10.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                GroupTitle(L10n.t(lang, "dashboard_group_communications"))
                PanelCard(lang, "inbox", convMeta(lang, stats), Icons.AutoMirrored.Outlined.Chat) { onPage("conversations") }
                PanelCard(lang, "customers", "${n(stats.totalCustomers)} ${L10n.t(lang, "customers")}", Icons.Outlined.People) { onPage("customers") }
                PanelCard(lang, "tickets", "${n(stats.ticketsOpen)} ${L10n.t(lang, "filter_open")}", Icons.Outlined.ConfirmationNumber) { onPage("tickets") }
                PanelCard(lang, "team", null, Icons.Outlined.Forum) { onPage("internal-chat") }
                PanelCard(lang, "dash_page_whatsapp", null, Icons.Outlined.Phone) { onPage("whatsapp") }
                PanelCard(lang, "dash_page_templates", null, Icons.Outlined.NoteAdd) { onPage("message-templates") }
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                GroupTitle(L10n.t(lang, "dashboard_group_organization"))
                PanelCard(lang, "tasks", "${n(stats.tasksPending)} ${L10n.t(lang, "status_pending")}", Icons.AutoMirrored.Outlined.Assignment) { onPage("tasks") }
                PanelCard(lang, "dash_page_processes", null, Icons.Outlined.OpenInFull) { onPage("processes") }
                PanelCard(lang, "dash_page_users", null, Icons.Outlined.Person) { onPage("users") }
                PanelCard(lang, "dash_page_departments", null, Icons.Outlined.Apartment) { onPage("departments") }
                PanelCard(lang, "dash_page_branches", null, Icons.Outlined.Home) { onPage("branches") }
            }
        }
        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                GroupTitle(L10n.t(lang, "dashboard_group_finance"))
                PanelCard(lang, "dash_page_rates", null, Icons.Outlined.BarChart) { onPage("rates") }
                PanelCard(lang, "dash_page_charts", null, Icons.Outlined.ShowChart) { onPage("rates-charts") }
                PanelCard(lang, "dash_page_services", null, Icons.Outlined.AccountBalance) { onPage("services") }
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                GroupTitle(L10n.t(lang, "dashboard_group_monitoring"))
                PanelCard(lang, "dash_page_supervision", null, Icons.Outlined.BarChart) { onPage("supervision") }
                PanelCard(lang, "dash_page_staff", null, Icons.Outlined.PersonAdd) { onPage("staff-activity") }
                PanelCard(lang, "dash_page_system", null, Icons.Outlined.Speed) { onPage("system-status") }
                PanelCard(lang, "announcements", "${n(stats.announcementsCount)} ${L10n.t(lang, "announcements")}", Icons.Outlined.Campaign) { onPage("announcements") }
            }
        }
        Spacer(Modifier.height(12.dp))
        GroupTitle(L10n.t(lang, "dashboard_group_account"))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(Modifier.weight(1f)) { PanelCard(lang, "profile_me", null, Icons.Outlined.Person) { onPage("profile") } }
            Box(Modifier.weight(1f)) { PanelCard(lang, "dash_page_appearance", null, Icons.Outlined.Settings) { onPage("panel-settings") } }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
fun DashModuleScreen(
    lang: String,
    titleKey: String,
    loading: Boolean,
    error: String?,
    rows: List<DashItem>,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
) {
    var query by remember { mutableStateOf("") }
    LaunchedEffect(titleKey) { onRefresh() }
    val q = query.trim()
    val filtered = rows.filter { row ->
        q.isBlank() || listOf(row.title, row.subtitle, row.meta).any { it.contains(q, ignoreCase = true) }
    }
    Column(Modifier.fillMaxSize().background(KayaColors.Bg).padding(horizontal = 16.dp, vertical = 12.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(L10n.t(lang, "back"), color = KayaColors.Accent, modifier = Modifier.clickable(onClick = onBack).padding(vertical = 8.dp))
            Spacer(Modifier.weight(1f))
            Row(
                Modifier.clip(RoundedCornerShape(10.dp)).clickable(onClick = onRefresh).padding(horizontal = 10.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.Refresh, contentDescription = null, tint = KayaColors.Accent, modifier = Modifier.size(16.dp))
                Text(L10n.t(lang, "dashboard_refresh"), color = KayaColors.Accent, fontSize = 13.sp, modifier = Modifier.padding(start = 6.dp))
            }
        }
        Text(L10n.t(lang, titleKey), color = KayaColors.Text, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
        StatusLine(error, onRefresh, L10n.t(lang, "retry"))
        Spacer(Modifier.height(10.dp))
        BasicTextField(
            value = query,
            onValueChange = { query = it },
            singleLine = true,
            textStyle = TextStyle(color = KayaColors.Text, fontSize = 14.sp),
            cursorBrush = SolidColor(KayaColors.Accent),
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(KayaColors.Card).padding(12.dp),
            decorationBox = { inner ->
                Box {
                    if (query.isBlank()) Text(L10n.t(lang, "search"), color = KayaColors.Text3, fontSize = 13.sp)
                    inner()
                }
            },
        )
        Spacer(Modifier.height(10.dp))
        when {
            loading && rows.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KayaColors.Accent, modifier = Modifier.size(28.dp))
            }
            filtered.isEmpty() -> Text(L10n.t(lang, "empty_dash_module"), color = KayaColors.Text2, modifier = Modifier.padding(top = 24.dp))
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
                items(filtered, key = { it.id }) { row ->
                    Column(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(KayaColors.Card).padding(12.dp),
                    ) {
                        Text(row.title, color = KayaColors.Text, fontWeight = FontWeight.SemiBold)
                        if (row.subtitle.isNotBlank()) {
                            Text(row.subtitle, color = KayaColors.Text2, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
                        }
                        if (row.meta.isNotBlank()) {
                            Text(row.meta, color = KayaColors.Text3, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StaffActivityScreen(
    lang: String,
    loading: Boolean,
    error: String?,
    online: List<StaffPresence>,
    logins: List<StaffLoginRow>,
    loginsTotal: Int,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
) {
    var tab by remember { mutableStateOf("online") }
    var query by remember { mutableStateOf("") }
    var statusFilter by remember { mutableStateOf("all") }
    LaunchedEffect(Unit) { onRefresh() }
    val q = query.trim()
    val filteredOnline = online.filter { row ->
        val statusOk = statusFilter == "all" || row.status.equals(statusFilter, ignoreCase = true)
        val hay = listOfNotNull(row.name, row.email, row.branchName, row.departmentName).joinToString(" ")
        statusOk && (q.isBlank() || hay.contains(q, ignoreCase = true))
    }
    val filteredLogins = logins.filter { row ->
        val hay = listOfNotNull(row.userName, row.email, row.branchName, row.ip, row.country, row.summary).joinToString(" ")
        q.isBlank() || hay.contains(q, ignoreCase = true)
    }
    Column(Modifier.fillMaxSize().background(KayaColors.Bg).padding(horizontal = 16.dp, vertical = 12.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                L10n.t(lang, "back"),
                color = KayaColors.Accent,
                modifier = Modifier.clickable(onClick = onBack).padding(vertical = 8.dp),
            )
            Spacer(Modifier.weight(1f))
            Row(
                Modifier.clip(RoundedCornerShape(10.dp)).clickable(onClick = onRefresh).padding(horizontal = 10.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.Refresh, contentDescription = null, tint = KayaColors.Accent, modifier = Modifier.size(16.dp))
                Text(L10n.t(lang, "dashboard_refresh"), color = KayaColors.Accent, fontSize = 13.sp, modifier = Modifier.padding(start = 6.dp))
            }
        }
        Text(L10n.t(lang, "dash_page_staff"), color = KayaColors.Text, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
        StatusLine(error, onRefresh, L10n.t(lang, "retry"))
        Spacer(Modifier.height(10.dp))
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(KayaColors.Card).padding(4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            StaffTabChip(L10n.t(lang, "staff_tab_online"), tab == "online", Modifier.weight(1f)) { tab = "online" }
            StaffTabChip(
                "${L10n.t(lang, "staff_tab_logins")} (${dashDigits(lang, loginsTotal.takeIf { it > 0 } ?: logins.size)})",
                tab == "logins",
                Modifier.weight(1f),
            ) { tab = "logins" }
        }
        Spacer(Modifier.height(10.dp))
        BasicTextField(
            value = query,
            onValueChange = { query = it },
            singleLine = true,
            textStyle = TextStyle(color = KayaColors.Text, fontSize = 14.sp),
            cursorBrush = SolidColor(KayaColors.Accent),
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(KayaColors.Card)
                .padding(12.dp),
            decorationBox = { inner ->
                Box {
                    if (query.isBlank()) {
                        Text(L10n.t(lang, "staff_search_ph"), color = KayaColors.Text3, fontSize = 13.sp)
                    }
                    inner()
                }
            },
        )
        if (tab == "online") {
            Spacer(Modifier.height(8.dp))
            Row(
                Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                listOf(
                    "all" to L10n.t(lang, "filter_all"),
                    "online" to L10n.t(lang, "team_online"),
                    "away" to L10n.t(lang, "status_away"),
                    "busy" to L10n.t(lang, "status_busy"),
                ).forEach { (id, label) ->
                    val on = statusFilter == id
                    Text(
                        label,
                        color = if (on) Color.White else KayaColors.Text2,
                        fontSize = 12.sp,
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(if (on) KayaColors.Accent else KayaColors.Card)
                            .clickable { statusFilter = id }
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                    )
                }
            }
        } else {
            Spacer(Modifier.height(8.dp))
            Text(L10n.t(lang, "staff_logins_hint"), color = KayaColors.Text3, fontSize = 12.sp)
        }
        Spacer(Modifier.height(10.dp))
        when {
            loading && online.isEmpty() && logins.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KayaColors.Accent, modifier = Modifier.size(28.dp))
            }
            tab == "online" && filteredOnline.isEmpty() -> {
                val empty = if (online.isEmpty()) L10n.t(lang, "no_staff_online") else L10n.t(lang, "staff_no_match")
                Text(empty, color = KayaColors.Text2, fontSize = 14.sp, modifier = Modifier.padding(top = 24.dp))
            }
            tab == "logins" && filteredLogins.isEmpty() -> {
                val empty = if (logins.isEmpty()) L10n.t(lang, "empty_no_logins") else L10n.t(lang, "staff_no_match")
                Text(empty, color = KayaColors.Text2, fontSize = 14.sp, modifier = Modifier.padding(top = 24.dp))
            }
            tab == "online" -> LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(bottom = 24.dp),
            ) {
                items(filteredOnline, key = { it.id }) { row -> StaffOnlineCard(lang, row) }
            }
            else -> LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(bottom = 24.dp),
            ) {
                items(filteredLogins, key = { it.id }) { row -> StaffLoginCard(row) }
            }
        }
    }
}

@Composable
private fun StaffTabChip(label: String, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Box(
        modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (selected) KayaColors.Accent else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, color = if (selected) Color.White else KayaColors.Text2, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun StaffOnlineCard(lang: String, row: StaffPresence) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(KayaColors.Card)
            .padding(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .padding(end = 8.dp)
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(staffStatusColor(row.status)),
            )
            Text(row.name, color = KayaColors.Text, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                staffStatusLabel(lang, row.status),
                color = staffStatusColor(row.status),
                fontSize = 11.sp,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(staffStatusColor(row.status).copy(alpha = 0.16f))
                    .padding(horizontal = 8.dp, vertical = 3.dp),
            )
        }
        if (!row.email.isNullOrBlank()) {
            Text(row.email, color = KayaColors.Text2, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        val meta = listOfNotNull(row.branchName, row.departmentName).filter { it.isNotBlank() }
        if (meta.isNotEmpty()) {
            Text(meta.joinToString(" · "), color = KayaColors.Text3, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        val loginBits = buildList {
            row.lastLoginAt?.takeIf { it.isNotBlank() }?.let { add("${L10n.t(lang, "staff_last_login")} $it") }
            row.lastLoginCountry?.takeIf { it.isNotBlank() }?.let { add(it) }
        }
        if (loginBits.isNotEmpty()) {
            Text(loginBits.joinToString(" · "), color = KayaColors.Text3, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        if (!row.lastLoginIp.isNullOrBlank()) {
            RtlSafeText("\u2066${row.lastLoginIp}\u2069", color = KayaColors.Text3, fontSize = 11.sp, ltr = true)
        }
    }
}

@Composable
private fun StaffLoginCard(row: StaffLoginRow) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(KayaColors.Card)
            .padding(12.dp),
    ) {
        Text(row.userName, color = KayaColors.Text, fontWeight = FontWeight.Medium)
        val meta = listOfNotNull(row.email, row.branchName, row.createdAt).filter { it.isNotBlank() }
        if (meta.isNotEmpty()) {
            Text(meta.joinToString(" · "), color = KayaColors.Text2, fontSize = 12.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
        if (!row.ip.isNullOrBlank() || !row.country.isNullOrBlank()) {
            Row {
                if (!row.ip.isNullOrBlank()) {
                    RtlSafeText("\u2066${row.ip}\u2069", color = KayaColors.Text3, fontSize = 11.sp, ltr = true)
                }
                if (!row.country.isNullOrBlank()) {
                    Text(" · ${row.country}", color = KayaColors.Text3, fontSize = 11.sp)
                }
            }
        }
        if (!row.summary.isNullOrBlank()) {
            Text(row.summary, color = KayaColors.Text3, fontSize = 12.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
    }
}

private fun staffStatusLabel(lang: String, status: String): String = when (status.lowercase()) {
    "online" -> L10n.t(lang, "team_online")
    "away" -> L10n.t(lang, "status_away")
    "busy" -> L10n.t(lang, "status_busy")
    else -> L10n.t(lang, "team_offline")
}

private fun staffStatusColor(status: String): Color = when (status.lowercase()) {
    "online" -> KayaColors.Accent
    "away" -> Color(0xFFF59E0B)
    "busy" -> KayaColors.Danger
    else -> KayaColors.Text3
}

@Composable
fun UsersScreen(
    lang: String,
    loading: Boolean,
    error: String?,
    rows: List<OrgUser>,
    meId: String?,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onMessage: (OrgUser) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    var statusFilter by remember { mutableStateOf("all") }
    var roleFilter by remember { mutableStateOf("all") }
    LaunchedEffect(Unit) { onRefresh() }
    val q = query.trim()
    val roles = remember(rows) { rows.map { it.role }.distinct().sorted() }
    val filtered = rows.filter { row ->
        val statusOk = when (statusFilter) {
            "active" -> row.isActive
            "blocked" -> !row.isActive
            else -> true
        }
        val roleOk = roleFilter == "all" || row.role == roleFilter
        val hay = listOfNotNull(row.name, row.email, row.username, row.position, row.branchName, row.departmentName).joinToString(" ")
        statusOk && roleOk && (q.isBlank() || hay.contains(q, ignoreCase = true))
    }
    Column(Modifier.fillMaxSize().background(KayaColors.Bg).padding(horizontal = 16.dp, vertical = 12.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                L10n.t(lang, "back"),
                color = KayaColors.Accent,
                modifier = Modifier.clickable(onClick = onBack).padding(vertical = 8.dp),
            )
            Spacer(Modifier.weight(1f))
            Row(
                Modifier.clip(RoundedCornerShape(10.dp)).clickable(onClick = onRefresh).padding(horizontal = 10.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.Refresh, contentDescription = null, tint = KayaColors.Accent, modifier = Modifier.size(16.dp))
                Text(L10n.t(lang, "dashboard_refresh"), color = KayaColors.Accent, fontSize = 13.sp, modifier = Modifier.padding(start = 6.dp))
            }
        }
        Text(L10n.t(lang, "dash_page_users"), color = KayaColors.Text, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
        StatusLine(error, onRefresh, L10n.t(lang, "retry"))
        Spacer(Modifier.height(10.dp))
        BasicTextField(
            value = query,
            onValueChange = { query = it },
            singleLine = true,
            textStyle = TextStyle(color = KayaColors.Text, fontSize = 14.sp),
            cursorBrush = SolidColor(KayaColors.Accent),
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(KayaColors.Card)
                .padding(12.dp),
            decorationBox = { inner ->
                Box {
                    if (query.isBlank()) {
                        Text(L10n.t(lang, "users_search_ph"), color = KayaColors.Text3, fontSize = 13.sp)
                    }
                    inner()
                }
            },
        )
        Spacer(Modifier.height(8.dp))
        Row(
            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            listOf(
                "all" to L10n.t(lang, "filter_all"),
                "active" to L10n.t(lang, "users_active"),
                "blocked" to L10n.t(lang, "users_blocked"),
            ).forEach { (id, label) -> FilterChip(label, statusFilter == id) { statusFilter = id } }
            roles.forEach { role ->
                FilterChip(roleLabel(lang, role), roleFilter == role) {
                    roleFilter = if (roleFilter == role) "all" else role
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        when {
            loading && rows.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KayaColors.Accent, modifier = Modifier.size(28.dp))
            }
            filtered.isEmpty() -> {
                val empty = if (rows.isEmpty()) L10n.t(lang, "empty_users") else L10n.t(lang, "staff_no_match")
                Text(empty, color = KayaColors.Text2, fontSize = 14.sp, modifier = Modifier.padding(top = 24.dp))
            }
            else -> LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(bottom = 24.dp),
            ) {
                items(filtered, key = { it.id }) { row ->
                    OrgUserCard(
                        lang = lang,
                        row = row,
                        isMe = row.id == meId,
                        onMessage = { onMessage(row) },
                    )
                }
            }
        }
    }
}

@Composable
private fun FilterChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        label,
        color = if (selected) Color.White else KayaColors.Text2,
        fontSize = 12.sp,
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(if (selected) KayaColors.Accent else KayaColors.Card)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    )
}

@Composable
private fun OrgUserCard(lang: String, row: OrgUser, isMe: Boolean, onMessage: () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(KayaColors.Card)
            .padding(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box {
                AvatarCircle(row.name.take(1), Modifier.size(40.dp))
                Box(
                    Modifier
                        .align(Alignment.BottomEnd)
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(staffStatusColor(row.status))
                        .border(1.dp, KayaColors.Card, CircleShape),
                )
            }
            Column(Modifier.weight(1f).padding(start = 10.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(row.name, color = KayaColors.Text, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                    if (!row.isActive) {
                        Text(
                            L10n.t(lang, "users_blocked"),
                            color = KayaColors.Danger,
                            fontSize = 10.sp,
                            modifier = Modifier.padding(start = 6.dp).clip(RoundedCornerShape(8.dp)).background(KayaColors.Danger.copy(alpha = 0.16f)).padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                    if (isMe) {
                        Text(
                            L10n.t(lang, "users_you"),
                            color = KayaColors.Accent,
                            fontSize = 10.sp,
                            modifier = Modifier.padding(start = 6.dp).clip(RoundedCornerShape(8.dp)).background(KayaColors.AccentSoft).padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
                if (!row.position.isNullOrBlank()) {
                    Text(row.position, color = KayaColors.Accent, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                if (!row.email.isNullOrBlank()) {
                    Text(row.email, color = KayaColors.Text2, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
        }
        val meta = listOfNotNull(row.departmentName, row.branchName).filter { it.isNotBlank() }
        if (meta.isNotEmpty()) {
            Text(meta.joinToString(" · "), color = KayaColors.Text3, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Text(
            "${L10n.t(lang, "staff_last_login")}: ${row.lastLoginAt?.takeIf { it.isNotBlank() } ?: L10n.t(lang, "staff_never")}",
            color = KayaColors.Text3,
            fontSize = 11.sp,
            modifier = Modifier.padding(top = 2.dp),
        )
        Row(
            Modifier.fillMaxWidth().padding(top = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                roleLabel(lang, row.role),
                color = KayaColors.Accent,
                fontSize = 11.sp,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(KayaColors.AccentSoft)
                    .padding(horizontal = 8.dp, vertical = 3.dp),
            )
            Spacer(Modifier.weight(1f))
            if (!isMe) {
                Text(
                    L10n.t(lang, "users_message"),
                    color = KayaColors.Accent,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable(onClick = onMessage).padding(horizontal = 8.dp, vertical = 4.dp),
                )
            }
        }
    }
}

private fun roleLabel(lang: String, role: String): String = when (role.lowercase()) {
    "owner" -> L10n.t(lang, "role_owner")
    "admin" -> L10n.t(lang, "role_admin")
    "manager" -> L10n.t(lang, "role_manager")
    "supervisor" -> L10n.t(lang, "role_supervisor")
    "agent" -> L10n.t(lang, "role_agent")
    else -> role
}

@Composable
fun MoreMenuScreen(
    lang: String,
    onOpen: (MoreDest) -> Unit,
    onLogout: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxSize()
            .background(KayaColors.Bg)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        MoreRow(L10n.t(lang, "tickets"), Icons.Outlined.ConfirmationNumber) { onOpen(MoreDest.Tickets) }
        MoreRow(L10n.t(lang, "tasks"), Icons.AutoMirrored.Outlined.Assignment) { onOpen(MoreDest.Tasks) }
        MoreRow(L10n.t(lang, "team"), Icons.Outlined.Forum) { onOpen(MoreDest.Team) }
        MoreRow(L10n.t(lang, "profile_me"), Icons.Outlined.Person) { onOpen(MoreDest.Profile) }
        MoreRow(L10n.t(lang, "logout"), Icons.AutoMirrored.Outlined.Logout) { onLogout() }
    }
}

@Composable
fun AnnouncementsScreen(
    lang: String,
    rows: List<AnnouncementRow>,
    error: String?,
    sending: Boolean,
    canSend: Boolean,
    isManager: Boolean,
    users: List<AnnouncementTarget>,
    departments: List<AnnouncementTarget>,
    onRefresh: () -> Unit,
    onSend: (title: String, body: String, important: Boolean, targetType: String, targetId: String?) -> Unit,
    onDelete: (String) -> Unit,
) {
    var formOpen by remember { mutableStateOf(true) }
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }
    var important by remember { mutableStateOf(false) }
    var targetType by remember { mutableStateOf(if (isManager) "department" else "all") }
    var targetId by remember { mutableStateOf(departments.firstOrNull()?.id.orEmpty()) }
    var formError by remember { mutableStateOf<String?>(null) }
    var pendingClear by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    var tab by remember { mutableStateOf("all") }
    var sort by remember { mutableStateOf("newest") }
    var sortMenu by remember { mutableStateOf(false) }
    var targetMenu by remember { mutableStateOf(false) }
    var deleteId by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { onRefresh() }
    LaunchedEffect(departments) {
        if (isManager && targetId.isBlank()) targetId = departments.firstOrNull()?.id.orEmpty()
    }
    LaunchedEffect(sending, error) {
        if (pendingClear && !sending) {
            if (error == null) {
                title = ""
                body = ""
                important = false
                formError = null
            }
            pendingClear = false
        }
    }
    val q = query.trim()
    val filtered = remember(rows, tab, q, sort) {
        rows.filter { row ->
            val tabOk = when (tab) {
                "general" -> row.targetType == "all"
                "department" -> row.targetType == "department"
                "personal" -> row.targetType == "user"
                else -> true
            }
            val hay = listOfNotNull(row.title, row.body, row.fromName).joinToString(" ")
            tabOk && (q.isBlank() || hay.contains(q, ignoreCase = true))
        }.sortedWith(
            when (sort) {
                "oldest" -> compareBy { it.createdAt.orEmpty() }
                "important" -> compareByDescending<AnnouncementRow> { it.isImportant }.thenByDescending { it.createdAt.orEmpty() }
                else -> compareByDescending { it.createdAt.orEmpty() }
            },
        )
    }
    val targetLabel = when (targetType) {
        "department" -> departments.firstOrNull { it.id == targetId }?.name ?: L10n.t(lang, "ann_one_dept")
        "user" -> users.firstOrNull { it.id == targetId }?.name ?: L10n.t(lang, "ann_one_user")
        else -> L10n.t(lang, "ann_all")
    }
    Column(Modifier.fillMaxSize().background(KayaColors.Bg).padding(horizontal = 16.dp, vertical = 12.dp)) {
        StatusLine(error, onRefresh, L10n.t(lang, "retry"))
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(bottom = 24.dp),
        ) {
            if (canSend) {
                item {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(KayaColors.Card)
                            .padding(14.dp),
                    ) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text(L10n.t(lang, "ann_send_title"), color = KayaColors.Text, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            Row(
                                Modifier.clip(RoundedCornerShape(8.dp)).clickable { formOpen = !formOpen }.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(L10n.t(lang, if (formOpen) "ann_collapse" else "ann_expand"), color = KayaColors.Accent, fontSize = 12.sp)
                                Icon(
                                    if (formOpen) Icons.Outlined.KeyboardArrowUp else Icons.Outlined.KeyboardArrowDown,
                                    contentDescription = null,
                                    tint = KayaColors.Accent,
                                    modifier = Modifier.size(18.dp),
                                )
                            }
                        }
                        if (formOpen) {
                            Spacer(Modifier.height(12.dp))
                            Text(L10n.t(lang, "ann_recipient"), color = KayaColors.Text2, fontSize = 13.sp)
                            Spacer(Modifier.height(6.dp))
                            Box {
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(KayaColors.InputBg)
                                        .clickable { targetMenu = true }
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(targetLabel, color = KayaColors.Text, modifier = Modifier.weight(1f))
                                    Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = null, tint = KayaColors.Text3, modifier = Modifier.size(18.dp))
                                }
                                DropdownMenu(expanded = targetMenu, onDismissRequest = { targetMenu = false }) {
                                    if (!isManager) {
                                        DropdownMenuItem(text = { Text(L10n.t(lang, "ann_all")) }, onClick = {
                                            targetType = "all"
                                            targetId = ""
                                            targetMenu = false
                                        })
                                        departments.forEach { d ->
                                            DropdownMenuItem(text = { Text("${L10n.t(lang, "ann_one_dept")}: ${d.name}") }, onClick = {
                                                targetType = "department"
                                                targetId = d.id
                                                targetMenu = false
                                            })
                                        }
                                        users.forEach { u ->
                                            DropdownMenuItem(text = { Text(u.name) }, onClick = {
                                                targetType = "user"
                                                targetId = u.id
                                                targetMenu = false
                                            })
                                        }
                                    } else {
                                        departments.forEach { d ->
                                            DropdownMenuItem(text = { Text(d.name) }, onClick = {
                                                targetType = "department"
                                                targetId = d.id
                                                targetMenu = false
                                            })
                                        }
                                    }
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                            KayaField(title, { title = it; formError = null }, L10n.t(lang, "ann_ph_title"))
                            Spacer(Modifier.height(8.dp))
                            KayaField(body, { body = it; formError = null }, L10n.t(lang, "ann_ph_body"), singleLine = false)
                            Spacer(Modifier.height(8.dp))
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(KayaColors.InputBg)
                                    .clickable { important = !important }
                                    .padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Checkbox(
                                    checked = important,
                                    onCheckedChange = { important = it },
                                    colors = CheckboxDefaults.colors(checkedColor = KayaColors.Accent, uncheckedColor = KayaColors.Text3),
                                )
                                Text(L10n.t(lang, "ann_important"), color = KayaColors.Text, fontSize = 13.sp, modifier = Modifier.weight(1f))
                            }
                            if (!formError.isNullOrBlank()) {
                                Text(formError!!, color = KayaColors.Danger, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp))
                            }
                            Spacer(Modifier.height(12.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                KayaPrimaryButton(L10n.t(lang, "send_ann"), sending, Modifier.weight(1f)) {
                                    if (title.trim().isEmpty() || body.trim().isEmpty()) {
                                        formError = L10n.t(lang, "required")
                                        return@KayaPrimaryButton
                                    }
                                    if (targetType != "all" && targetId.isBlank()) {
                                        formError = L10n.t(lang, "ann_select")
                                        return@KayaPrimaryButton
                                    }
                                    pendingClear = true
                                    onSend(title.trim(), body.trim(), important, targetType, targetId.ifBlank { null })
                                }
                                Text(
                                    L10n.t(lang, "ann_reset"),
                                    color = KayaColors.Text2,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(KayaColors.Bg)
                                        .clickable {
                                            title = ""
                                            body = ""
                                            important = false
                                            formError = null
                                        }
                                        .padding(horizontal = 16.dp, vertical = 12.dp),
                                )
                            }
                        }
                    }
                }
            }
            item {
                Row(
                    Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    listOf(
                        "all" to "ann_tab_all",
                        "general" to "ann_tab_general",
                        "department" to "ann_tab_department",
                        "personal" to "ann_tab_personal",
                    ).forEach { (id, key) -> FilterChip(L10n.t(lang, key), tab == id) { tab = id } }
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    BasicTextField(
                        value = query,
                        onValueChange = { query = it },
                        singleLine = true,
                        textStyle = TextStyle(color = KayaColors.Text, fontSize = 14.sp),
                        cursorBrush = SolidColor(KayaColors.Accent),
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(KayaColors.Card)
                            .padding(12.dp),
                        decorationBox = { inner ->
                            Box {
                                if (query.isBlank()) {
                                    Text(L10n.t(lang, "ann_search_ph"), color = KayaColors.Text3, fontSize = 13.sp)
                                }
                                inner()
                            }
                        },
                    )
                    Box {
                        Row(
                            Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(KayaColors.Card)
                                .clickable { sortMenu = true }
                                .padding(horizontal = 12.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                L10n.t(lang, when (sort) {
                                    "oldest" -> "ann_sort_oldest"
                                    "important" -> "ann_sort_important"
                                    else -> "ann_sort_newest"
                                }),
                                color = KayaColors.Text,
                                fontSize = 13.sp,
                            )
                            Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = null, tint = KayaColors.Text3, modifier = Modifier.size(16.dp))
                        }
                        DropdownMenu(expanded = sortMenu, onDismissRequest = { sortMenu = false }) {
                            listOf("newest" to "ann_sort_newest", "oldest" to "ann_sort_oldest", "important" to "ann_sort_important").forEach { (id, key) ->
                                DropdownMenuItem(text = { Text(L10n.t(lang, key)) }, onClick = { sort = id; sortMenu = false })
                            }
                        }
                    }
                }
            }
            if (filtered.isEmpty()) {
                item {
                    Column(
                        Modifier.fillMaxWidth().padding(top = 48.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(Icons.Outlined.Campaign, contentDescription = null, tint = KayaColors.Accent, modifier = Modifier.size(56.dp))
                        Spacer(Modifier.height(12.dp))
                        Text(L10n.t(lang, "ann_empty"), color = KayaColors.Text, fontWeight = FontWeight.Medium)
                        Text(L10n.t(lang, "ann_empty_hint"), color = KayaColors.Text3, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            } else {
                items(filtered, key = { it.id }) { row ->
                    AnnouncementCard(lang, row) { if (row.canDelete) deleteId = row.id }
                }
            }
        }
    }
    deleteId?.let { id ->
        AlertDialog(
            onDismissRequest = { deleteId = null },
            title = { Text(L10n.t(lang, "ann_delete")) },
            text = { Text(L10n.t(lang, "ann_delete_confirm")) },
            confirmButton = {
                TextButton(onClick = { onDelete(id); deleteId = null }) {
                    Text(L10n.t(lang, "ann_delete"), color = KayaColors.Danger)
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteId = null }) { Text(L10n.t(lang, "cancel")) }
            },
            containerColor = KayaColors.Bg2,
        )
    }
}

@Composable
private fun AnnouncementCard(lang: String, row: AnnouncementRow, onDelete: () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(KayaColors.Card)
            .padding(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                if (row.isImportant) L10n.t(lang, "ann_type_important") else L10n.t(lang, "ann_type_info"),
                color = if (row.isImportant) Color.White else KayaColors.Text2,
                fontSize = 11.sp,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (row.isImportant) KayaColors.Danger else KayaColors.Bg)
                    .padding(horizontal = 8.dp, vertical = 3.dp),
            )
            Spacer(Modifier.weight(1f))
            if (row.canDelete) {
                Text(
                    L10n.t(lang, "ann_delete"),
                    color = KayaColors.Danger,
                    fontSize = 12.sp,
                    modifier = Modifier.clickable(onClick = onDelete).padding(4.dp),
                )
            }
        }
        Spacer(Modifier.height(6.dp))
        Text(row.title, color = KayaColors.Text, fontWeight = FontWeight.SemiBold)
        if (row.body.isNotBlank()) {
            Text(row.body, color = KayaColors.Text2, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
        }
        val target = when (row.targetType) {
            "department" -> row.targetName ?: L10n.t(lang, "ann_one_dept")
            "user" -> row.targetName ?: L10n.t(lang, "ann_one_user")
            else -> L10n.t(lang, "ann_all")
        }
        val meta = listOfNotNull(
            row.fromName?.let { "${L10n.t(lang, "ann_from")} $it" },
            "${L10n.t(lang, "ann_to")} $target",
            row.createdAt?.take(16)?.replace("T", " ")?.let { "${L10n.t(lang, "ann_sent_at")} $it" },
        )
        if (meta.isNotEmpty()) {
            Text(meta.joinToString(" · "), color = KayaColors.Text3, fontSize = 11.sp, modifier = Modifier.padding(top = 8.dp))
        }
    }
}

@Composable
private fun GroupTitle(text: String) {
    Text(text, color = KayaColors.Text3, fontSize = 12.sp, modifier = Modifier.padding(bottom = 2.dp))
}

@Composable
private fun KpiBox(num: String, label: String, modifier: Modifier, warn: Boolean = false, onClick: () -> Unit) {
    Column(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .background(KayaColors.Card)
            .clickable(onClick = onClick)
            .padding(12.dp),
    ) {
        Text(num, color = if (warn) KayaColors.Accent else KayaColors.Text, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Text(label, color = KayaColors.Text2, fontSize = 11.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun QuickBtn(label: String, icon: ImageVector, modifier: Modifier, onClick: () -> Unit) {
    Row(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, KayaColors.Accent, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        Icon(icon, contentDescription = null, tint = KayaColors.Accent, modifier = Modifier.size(14.dp))
        Text(label, color = KayaColors.Accent, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(start = 4.dp))
    }
}

@Composable
private fun PanelCard(lang: String, titleKey: String, meta: String?, icon: ImageVector, onClick: () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(KayaColors.Card)
            .clickable(onClick = onClick)
            .padding(12.dp),
    ) {
        Icon(icon, contentDescription = null, tint = KayaColors.Accent, modifier = Modifier.size(22.dp))
        Spacer(Modifier.height(8.dp))
        Text(L10n.t(lang, titleKey), color = KayaColors.Text, fontWeight = FontWeight.Medium, fontSize = 13.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
        if (!meta.isNullOrBlank()) {
            Spacer(Modifier.height(6.dp))
            Text(
                meta,
                color = KayaColors.Accent,
                fontSize = 10.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(KayaColors.AccentSoft)
                    .padding(horizontal = 8.dp, vertical = 3.dp),
            )
        }
    }
}

private fun convMeta(lang: String, stats: DashboardStats): String {
    return if (stats.unreadConversations > 0) {
        "${dashDigits(lang, stats.unreadConversations)} ${L10n.t(lang, "dashboard_stat_unread")}"
    } else {
        "${dashDigits(lang, stats.openConversations)} ${L10n.t(lang, "filter_open")}"
    }
}

private fun dashDigits(lang: String, n: Int): String = dashDigits(lang, n.toString())

private fun dashDigits(lang: String, raw: String): String {
    if (lang != "fa") return raw
    val fa = charArrayOf('۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹')
    return buildString {
        raw.forEach { c -> append(if (c in '0'..'9') fa[c - '0'] else c) }
    }
}

@Composable
private fun MoreRow(title: String, icon: ImageVector, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(KayaColors.Card)
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = title, tint = KayaColors.Accent)
        Text(title, color = KayaColors.Text, modifier = Modifier.padding(start = 12.dp))
    }
}
