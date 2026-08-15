/**
 * Kaya CRM — inbox + chat
 * @file    android-app/.../ui/inbox/InboxScreens.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.ui.inbox

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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.fxguard.kaya.data.models.ChatMessage
import io.fxguard.kaya.data.models.ConversationRow
import io.fxguard.kaya.ui.common.AvatarCircle
import io.fxguard.kaya.ui.common.KayaField
import io.fxguard.kaya.ui.i18n.L10n
import io.fxguard.kaya.ui.theme.KayaColors

@Composable
fun InboxScreen(
    lang: String,
    search: String,
    onSearch: (String) -> Unit,
    loading: Boolean,
    rows: List<ConversationRow>,
    unreadTotal: Int,
    onOpen: (ConversationRow) -> Unit,
) {
    Column(Modifier.fillMaxSize().background(KayaColors.Bg).padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(L10n.t(lang, "inbox"), color = KayaColors.Text, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
            if (unreadTotal > 0) {
                Text(
                    "$unreadTotal ${L10n.t(lang, "unread")}",
                    color = KayaColors.Accent,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(start = 10.dp),
                )
            }
        }
        Spacer(Modifier.height(12.dp))
        KayaField(search, onSearch, L10n.t(lang, "search"))
        Spacer(Modifier.height(12.dp))
        when {
            loading && rows.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KayaColors.Accent)
            }
            rows.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(L10n.t(lang, "empty_inbox"), color = KayaColors.Text2)
            }
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(rows, key = { it.id }) { row ->
                    ConversationCard(row) { onOpen(row) }
                }
            }
        }
    }
}

@Composable
private fun ConversationCard(row: ConversationRow, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(KayaColors.Card)
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AvatarCircle(row.customerName, Modifier.size(46.dp))
        Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
            Text(row.customerName, color = KayaColors.Text, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                row.lastMessagePreview ?: row.customerPhone ?: "",
                color = KayaColors.Text2,
                fontSize = 13.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        if (row.unreadCount > 0) {
            Box(
                Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(KayaColors.Accent)
                    .padding(horizontal = 8.dp, vertical = 2.dp),
            ) {
                Text(row.unreadCount.toString(), color = androidx.compose.ui.graphics.Color.White, fontSize = 11.sp)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    lang: String,
    title: String,
    messages: List<ChatMessage>,
    draft: String,
    onDraft: (String) -> Unit,
    sending: Boolean,
    onSend: () -> Unit,
    onBack: () -> Unit,
) {
    val listState = rememberLazyListState()
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.lastIndex)
    }
    Column(Modifier.fillMaxSize().background(KayaColors.Bg)) {
        TopAppBar(
            title = { Text(title, maxLines = 1, overflow = TextOverflow.Ellipsis) },
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
            items(messages, key = { it.id }) { msg ->
                val mine = msg.direction == "outgoing"
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start,
                ) {
                    Column(
                        Modifier
                            .widthIn(max = 320.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (mine) KayaColors.BubbleOut else KayaColors.BubbleIn)
                            .padding(10.dp),
                    ) {
                        if (!mine && !msg.senderName.isNullOrBlank()) {
                            Text(msg.senderName, color = KayaColors.Accent, fontSize = 11.sp)
                        }
                        Text(
                            msg.content.ifBlank { if (msg.hasMedia) "[media]" else "" },
                            color = KayaColors.Text,
                            fontSize = 15.sp,
                        )
                    }
                }
            }
        }
        Row(
            Modifier
                .fillMaxWidth()
                .background(KayaColors.Bg2)
                .padding(10.dp),
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
