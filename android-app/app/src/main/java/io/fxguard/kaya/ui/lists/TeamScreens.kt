/**
 * Kaya CRM — internal team chat
 * @file    android-app/.../ui/lists/TeamScreens.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.ui.lists

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.fxguard.kaya.data.models.TeamColleague
import io.fxguard.kaya.data.models.TeamMessage
import io.fxguard.kaya.data.models.TeamThread
import io.fxguard.kaya.ui.common.AvatarCircle
import io.fxguard.kaya.ui.common.KayaField
import io.fxguard.kaya.ui.common.StatusLine
import io.fxguard.kaya.ui.i18n.L10n
import io.fxguard.kaya.ui.theme.KayaColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeamListScreen(
    lang: String,
    loading: Boolean,
    rows: List<TeamThread>,
    error: String?,
    onRetry: () -> Unit,
    onOpen: (TeamThread) -> Unit,
    colleagues: List<TeamColleague>,
    colleagueSearch: String,
    onColleagueSearch: (String) -> Unit,
    colleaguesLoading: Boolean,
    onPickColleague: (TeamColleague) -> Unit,
    onLoadColleagues: () -> Unit,
) {
    var showNew by remember { mutableStateOf(false) }
    LaunchedEffect(showNew) { if (showNew) onLoadColleagues() }
    Box(Modifier.fillMaxSize().background(KayaColors.Bg)) {
        Column(Modifier.fillMaxSize().padding(16.dp)) {
            StatusLine(error, onRetry, L10n.t(lang, "retry"))
            Spacer(Modifier.height(12.dp))
            when {
                loading && rows.isEmpty() -> CenterBusy()
                rows.isEmpty() -> CenterEmpty(L10n.t(lang, "team_start_hint"))
                else -> LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(bottom = 88.dp),
                ) {
                    items(rows, key = { it.id }) { row ->
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(KayaColors.Card)
                                .clickable { onOpen(row) }
                                .padding(12.dp),
                        ) {
                            Column(Modifier.weight(1f)) {
                                Text(row.displayName, color = KayaColors.Text, fontWeight = FontWeight.Medium)
                                Text(row.lastPreview ?: "", color = KayaColors.Text2, fontSize = 13.sp, maxLines = 1)
                            }
                            if (row.unreadCount > 0) {
                                Text(
                                    row.unreadCount.toString(),
                                    color = KayaColors.Accent,
                                    fontSize = 12.sp,
                                )
                            }
                        }
                    }
                }
            }
        }
        FloatingActionButton(
            onClick = { showNew = true },
            containerColor = KayaColors.Accent,
            contentColor = Color.White,
            modifier = Modifier.align(Alignment.BottomEnd).padding(end = 16.dp, bottom = 16.dp),
        ) {
            Icon(Icons.Outlined.Add, contentDescription = L10n.t(lang, "team_new"))
        }
        if (showNew) {
            ModalBottomSheet(
                onDismissRequest = { showNew = false },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
                containerColor = KayaColors.Bg2,
            ) {
                Column(Modifier.padding(20.dp).height(420.dp)) {
                    Text(L10n.t(lang, "team_new"), color = KayaColors.Text, fontWeight = FontWeight.SemiBold)
                    Text(L10n.t(lang, "team_pick_hint"), color = KayaColors.Text2, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
                    Spacer(Modifier.height(10.dp))
                    BasicTextField(
                        value = colleagueSearch,
                        onValueChange = onColleagueSearch,
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
                                if (colleagueSearch.isBlank()) {
                                    Text(L10n.t(lang, "team_search_ph"), color = KayaColors.Text3, fontSize = 13.sp)
                                }
                                inner()
                            }
                        },
                    )
                    Spacer(Modifier.height(10.dp))
                    val q = colleagueSearch.trim()
                    val filtered = if (q.isBlank()) colleagues else colleagues.filter {
                        it.name.contains(q, ignoreCase = true) || (it.email?.contains(q, ignoreCase = true) == true)
                    }
                    when {
                        colleaguesLoading && colleagues.isEmpty() -> CenterBusy()
                        filtered.isEmpty() -> CenterEmpty(L10n.t(lang, "empty_team_users"))
                        else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            items(filtered, key = { it.id }) { user ->
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .clickable {
                                            onPickColleague(user)
                                            showNew = false
                                        }
                                        .padding(10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    AvatarCircle(user.name, Modifier.size(40.dp))
                                    Column(Modifier.padding(start = 10.dp).weight(1f)) {
                                        Text(user.name, color = KayaColors.Text, fontWeight = FontWeight.Medium)
                                        Text(
                                            user.email ?: presenceLabel(lang, user.status),
                                            color = KayaColors.Text2,
                                            fontSize = 12.sp,
                                        )
                                    }
                                    if (!user.status.isNullOrBlank()) {
                                        Box(
                                            Modifier
                                                .size(8.dp)
                                                .clip(CircleShape)
                                                .background(
                                                    if (user.status.equals("online", true)) KayaColors.Accent else KayaColors.Text3,
                                                ),
                                        )
                                    }
                                }
                            }
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                }
            }
        }
    }
}

private fun presenceLabel(lang: String, status: String?): String {
    return if (status.equals("online", true)) L10n.t(lang, "team_online") else L10n.t(lang, "team_offline")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeamChatScreen(
    lang: String,
    title: String,
    messages: List<TeamMessage>,
    draft: String,
    onDraft: (String) -> Unit,
    sending: Boolean,
    error: String?,
    onSend: () -> Unit,
    onRetry: (() -> Unit)? = null,
    onBack: () -> Unit,
) {
    val listState = rememberLazyListState()
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.lastIndex)
    }
    Column(Modifier.fillMaxSize().background(KayaColors.Bg).statusBarsPadding().imePadding()) {
        TopAppBar(
            title = { Text(title, maxLines = 1) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = L10n.t(lang, "back"))
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = KayaColors.Bg2,
                titleContentColor = KayaColors.Text,
                navigationIconContentColor = KayaColors.Text,
            ),
        )
        LazyColumn(
            state = listState,
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentPadding = PaddingValues(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(messages, key = { it.id.ifBlank { "tm-${it.hashCode()}" } }) { msg ->
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = if (msg.fromMe) Arrangement.End else Arrangement.Start,
                ) {
                    Column(
                        Modifier
                            .widthIn(max = 320.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (msg.fromMe) KayaColors.BubbleOut else KayaColors.BubbleIn)
                            .padding(10.dp),
                    ) {
                        if (!msg.fromMe && !msg.senderName.isNullOrBlank()) {
                            Text(msg.senderName, color = KayaColors.Accent, fontSize = 11.sp)
                        }
                        Text(msg.content, color = KayaColors.Text, fontSize = 15.sp)
                    }
                }
            }
        }
        StatusLine(error, onRetry, L10n.t(lang, "retry"))
        Row(
            Modifier.fillMaxWidth().background(KayaColors.Bg2).padding(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.weight(1f)) {
                KayaField(draft, onDraft, L10n.t(lang, "message_ph"), singleLine = false)
            }
            IconButton(onClick = onSend, enabled = !sending && draft.isNotBlank()) {
                Icon(Icons.AutoMirrored.Outlined.Send, contentDescription = L10n.t(lang, "send"), tint = KayaColors.Accent)
            }
        }
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
