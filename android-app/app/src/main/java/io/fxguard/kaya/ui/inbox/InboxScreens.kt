/**
 * Kaya CRM — inbox + chat (web conversations parity)
 * @file    android-app/.../ui/inbox/InboxScreens.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.ui.inbox

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.AttachFile
import androidx.compose.material.icons.outlined.Call
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.FilterList
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.KeyboardArrowUp
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.SentimentSatisfied
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Videocam
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import io.fxguard.kaya.data.models.ChatMessage
import io.fxguard.kaya.data.models.ConversationRow
import io.fxguard.kaya.data.models.CustomerRow
import io.fxguard.kaya.data.models.InboxFilter
import io.fxguard.kaya.ui.common.CustomerPhoto
import io.fxguard.kaya.ui.common.RtlSafeText
import io.fxguard.kaya.ui.common.StatusLine
import io.fxguard.kaya.ui.common.displayCustomerName
import io.fxguard.kaya.ui.common.displayLabel
import io.fxguard.kaya.ui.common.displayPhoneOrFallback
import io.fxguard.kaya.ui.common.ltrPhone
import io.fxguard.kaya.ui.i18n.L10n
import io.fxguard.kaya.ui.theme.KayaColors
import java.io.File
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InboxScreen(
    lang: String,
    search: String,
    onSearch: (String) -> Unit,
    filter: InboxFilter,
    onFilter: (InboxFilter) -> Unit,
    loading: Boolean,
    rows: List<ConversationRow>,
    unreadTotal: Int,
    error: String?,
    onRetry: () -> Unit,
    onOpen: (ConversationRow) -> Unit,
    customers: List<CustomerRow>,
    customerSearch: String,
    onCustomerSearch: (String) -> Unit,
    customersLoading: Boolean,
    onPickCustomer: (CustomerRow) -> Unit,
    wantNew: Boolean = false,
    onWantNewConsumed: () -> Unit = {},
    avatarUrl: (String?) -> String? = { null },
) {
    var showQuick by remember { mutableStateOf(true) }
    var showMore by remember { mutableStateOf(false) }
    var showNew by remember { mutableStateOf(false) }
    LaunchedEffect(wantNew) {
        if (wantNew) {
            showNew = true
            onWantNewConsumed()
        }
    }
    LaunchedEffect(showNew) { if (showNew) onCustomerSearch(customerSearch) }
    Box(Modifier.fillMaxSize().background(KayaColors.Bg)) {
        Column(Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 10.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "${L10n.t(lang, "inbox")} (${rows.size})",
                    color = KayaColors.Text,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = onRetry) {
                    Icon(Icons.Outlined.Refresh, contentDescription = L10n.t(lang, "retry"), tint = KayaColors.Text2)
                }
            }
            Row(
                Modifier.fillMaxWidth().padding(top = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Row(
                    Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .background(KayaColors.Card)
                        .padding(horizontal = 10.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Outlined.Search, contentDescription = null, tint = KayaColors.Text3, modifier = Modifier.size(18.dp))
                    BasicTextField(
                        value = search,
                        onValueChange = onSearch,
                        singleLine = true,
                        textStyle = TextStyle(color = KayaColors.Text, fontSize = 14.sp),
                        cursorBrush = SolidColor(KayaColors.Accent),
                        modifier = Modifier.padding(start = 8.dp).weight(1f),
                        decorationBox = { inner ->
                            Box {
                                if (search.isBlank()) {
                                    Text(L10n.t(lang, "conv_search_ph"), color = KayaColors.Text3, fontSize = 13.sp)
                                }
                                inner()
                            }
                        },
                    )
                }
                Row(
                    Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(KayaColors.Card)
                        .clickable { showMore = true }
                        .padding(horizontal = 10.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Outlined.FilterList, contentDescription = null, tint = KayaColors.Accent, modifier = Modifier.size(16.dp))
                    Text(
                        L10n.t(lang, "more_filters"),
                        color = KayaColors.Text2,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(start = 4.dp),
                    )
                }
            }
            Row(
                Modifier.fillMaxWidth().padding(top = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(L10n.t(lang, "conv_quick_filters"), color = KayaColors.Text3, fontSize = 12.sp, modifier = Modifier.weight(1f))
                Row(
                    Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { showQuick = !showQuick }
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        L10n.t(lang, if (showQuick) "conv_quick_tabs_hide" else "conv_quick_tabs_show"),
                        color = KayaColors.Text2,
                        fontSize = 12.sp,
                    )
                    Icon(
                        Icons.Outlined.KeyboardArrowUp,
                        contentDescription = null,
                        tint = KayaColors.Text2,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
            if (showQuick) {
                Row(
                    Modifier.horizontalScroll(rememberScrollState()).padding(top = 6.dp, bottom = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    listOf(
                        InboxFilter.All to "filter_all",
                        InboxFilter.Archived to "filter_archived",
                        InboxFilter.Restricted to "filter_restricted",
                        InboxFilter.Unread to "filter_unread",
                        InboxFilter.Unanswered to "filter_unanswered",
                        InboxFilter.Unassigned to "filter_unassigned",
                        InboxFilter.Open to "filter_open",
                        InboxFilter.Mine to "conv_tab_mine",
                        InboxFilter.Groups to "conv_tab_groups",
                    ).forEach { (key, label) ->
                        val on = filter == key
                        Text(
                            L10n.t(lang, label),
                            color = if (on) Color.White else KayaColors.Text2,
                            fontSize = 13.sp,
                            modifier = Modifier
                                .clip(RoundedCornerShape(999.dp))
                                .background(if (on) KayaColors.Accent else KayaColors.Card)
                                .clickable { onFilter(key) }
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                        )
                    }
                }
            }
            StatusLine(error, onRetry, L10n.t(lang, "retry"))
            Spacer(Modifier.height(6.dp))
            when {
                loading && rows.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = KayaColors.Accent)
                }
                rows.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(L10n.t(lang, "empty_inbox"), color = KayaColors.Text2)
                }
                else -> LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                    contentPadding = PaddingValues(bottom = 88.dp),
                ) {
                    items(rows, key = { it.id.ifBlank { "c-${it.hashCode()}" } }) { row ->
                        ConversationCard(lang, row, avatarUrl(row.customerId)) { onOpen(row) }
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
            Icon(Icons.Outlined.Add, contentDescription = L10n.t(lang, "conv_new"))
        }
        if (showMore) {
            ModalBottomSheet(
                onDismissRequest = { showMore = false },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
                containerColor = KayaColors.Bg2,
            ) {
                Column(Modifier.padding(20.dp)) {
                    Text(L10n.t(lang, "more_filters"), color = KayaColors.Text, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(12.dp))
                    Text(L10n.t(lang, "conv_quick_filters"), color = KayaColors.Text2, fontSize = 13.sp)
                    Spacer(Modifier.height(8.dp))
                    listOf(
                        InboxFilter.All to "filter_all",
                        InboxFilter.Unread to "filter_unread",
                        InboxFilter.Unanswered to "filter_unanswered",
                        InboxFilter.Mine to "conv_tab_mine",
                        InboxFilter.Groups to "conv_tab_groups",
                        InboxFilter.Archived to "filter_archived",
                        InboxFilter.Restricted to "filter_restricted",
                    ).forEach { (key, label) ->
                        Text(
                            L10n.t(lang, label),
                            color = if (filter == key) KayaColors.Accent else KayaColors.Text,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    onFilter(key)
                                    showMore = false
                                }
                                .padding(vertical = 10.dp),
                        )
                    }
                    Spacer(Modifier.height(24.dp))
                }
            }
        }
        if (showNew) {
            ModalBottomSheet(
                onDismissRequest = { showNew = false },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
                containerColor = KayaColors.Bg2,
            ) {
                Column(Modifier.padding(20.dp).height(420.dp)) {
                    Text(L10n.t(lang, "conv_new"), color = KayaColors.Text, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(10.dp))
                    BasicTextField(
                        value = customerSearch,
                        onValueChange = onCustomerSearch,
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
                                if (customerSearch.isBlank()) {
                                    Text(L10n.t(lang, "conv_search_ph"), color = KayaColors.Text3, fontSize = 13.sp)
                                }
                                inner()
                            }
                        },
                    )
                    Spacer(Modifier.height(10.dp))
                    when {
                        customersLoading && customers.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = KayaColors.Accent)
                        }
                        customers.isEmpty() -> Text(L10n.t(lang, "empty_customers"), color = KayaColors.Text2)
                        else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(customers, key = { it.id }) { row ->
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(KayaColors.Card)
                                        .clickable {
                                            onPickCustomer(row)
                                            showNew = false
                                        }
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    CustomerPhoto(avatarUrl(row.id), row.name, Modifier.size(40.dp), tile = false)
                                    Column(Modifier.padding(start = 10.dp)) {
                                        RtlSafeText(displayCustomerName(row.name, row.phone, L10n.t(lang, "customer")), color = KayaColors.Text, fontWeight = FontWeight.Medium)
                                        RtlSafeText(
                                            displayPhoneOrFallback(row.phone, row.email ?: ""),
                                            color = KayaColors.Text2,
                                            fontSize = 12.sp,
                                            ltr = !row.phone.isNullOrBlank(),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ConversationCard(lang: String, row: ConversationRow, photoUrl: String?, onClick: () -> Unit) {
    val meta = buildString {
        append(
            if (row.isGroup) {
                L10n.t(lang, "wa_group")
            } else {
                row.customerPhone?.takeIf { it.isNotBlank() && !it.contains("@") }?.let { ltrPhone(it) }
                    ?: L10n.t(lang, "inbox")
            },
        )
        val who = if (row.lastOutgoingIsAutoReply) L10n.t(lang, "ai_assistant") else row.assigneeName
        if (!who.isNullOrBlank()) {
            append(" · ")
            append(who)
        }
    }
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 4.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(if (row.isGroup) Color(0xFF5B4B8A) else KayaColors.AccentSoft),
            contentAlignment = Alignment.Center,
        ) {
            if (row.isGroup) {
                Icon(Icons.Outlined.Groups, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
            } else {
                CustomerPhoto(photoUrl, row.customerName, Modifier.size(48.dp), tile = false)
            }
        }
        Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (row.isGroup) {
                    Icon(
                        Icons.Outlined.Groups,
                        contentDescription = null,
                        tint = Color(0xFFA78BFA),
                        modifier = Modifier.size(14.dp),
                    )
                    Spacer(Modifier.width(4.dp))
                }
                RtlSafeText(
                    displayCustomerName(row.customerName, row.customerPhone, L10n.t(lang, "customer")),
                    color = KayaColors.Text,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                val clock = formatClock(row.lastMessageAt)
                if (clock.isNotBlank()) {
                    Text(clock, color = KayaColors.Text3, fontSize = 11.sp)
                }
            }
            val preview = row.lastMessagePreview?.ifBlank { null } ?: meta
            Text(preview, color = KayaColors.Text2, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(meta, color = KayaColors.Text3, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        if (row.unreadCount > 0) {
            Box(
                Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(KayaColors.Accent)
                    .padding(horizontal = 8.dp, vertical = 2.dp),
            ) {
                Text(row.unreadCount.toString(), color = Color.White, fontSize = 11.sp)
            }
        }
    }
}

@Composable
fun ChatScreen(
    lang: String,
    chat: ConversationRow,
    messages: List<ChatMessage>,
    loading: Boolean,
    draft: String,
    onDraft: (String) -> Unit,
    sending: Boolean,
    error: String?,
    notice: String? = null,
    pendingCallLink: String? = null,
    onCallLinkConsumed: () -> Unit = {},
    onSend: () -> Unit,
    onSendFile: (ByteArray, String, String) -> Unit,
    onSendVoice: (File) -> Unit,
    onSendGif: (String) -> Unit,
    onStartCall: (String) -> Unit,
    onSettings: (() -> Unit)? = null,
    onNotice: (String) -> Unit,
    onRetry: (() -> Unit)? = null,
    onBack: () -> Unit,
    resolveMedia: (String?) -> String? = { it },
) {
    val context = LocalContext.current
    val listState = rememberLazyListState()
    val capture = remember { VoiceCapture(context) }
    var recording by remember { mutableStateOf(false) }
    var elapsedMs by remember { mutableLongStateOf(0L) }
    var pickerTab by remember { mutableStateOf<String?>(null) }
    val pickFile = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        try {
            val (bytes, name, mime) = readPickedFile(context, uri)
            onSendFile(bytes, name, mime)
        } catch (e: Exception) {
            onNotice(L10n.error(e, lang))
        }
    }
    val micPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) {
            try {
                capture.start()
                recording = true
                elapsedMs = 0
            } catch (_: Exception) {
                onNotice(L10n.t(lang, "voice_err_open"))
            }
        } else {
            onNotice(L10n.t(lang, "voice_no_permission"))
        }
    }
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.lastIndex)
    }
    DisposableEffect(Unit) {
        onDispose { capture.cancel() }
    }
    LaunchedEffect(pendingCallLink) {
        val link = pendingCallLink ?: return@LaunchedEffect
        runCatching {
            context.startActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse(link)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        }
        onCallLinkConsumed()
    }
    LaunchedEffect(recording) {
        while (recording) {
            elapsedMs = (System.currentTimeMillis() - capture.startedAt).coerceAtLeast(0L)
            delay(200)
        }
    }
    Column(Modifier.fillMaxSize().background(KayaColors.Bg).imePadding()) {
        ChatHeader(lang, chat, resolveMedia(chat.customerId?.let { "/api/customers/$it/avatar" }), onBack, onStartCall, onSettings)
        Box(Modifier.weight(1f).fillMaxWidth()) {
            ChatPatternBackground(Modifier.fillMaxSize())
            when {
                loading && messages.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = KayaColors.Accent)
                }
                messages.isEmpty() -> Column(
                    Modifier.fillMaxSize().padding(32.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(
                        Icons.AutoMirrored.Outlined.Chat,
                        contentDescription = null,
                        tint = KayaColors.Text3,
                        modifier = Modifier.size(40.dp),
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(L10n.t(lang, "empty_messages"), color = KayaColors.Text, fontSize = 16.sp, textAlign = TextAlign.Center)
                    Spacer(Modifier.height(6.dp))
                    Text(L10n.t(lang, "empty_messages_hint"), color = KayaColors.Text2, fontSize = 13.sp, textAlign = TextAlign.Center)
                }
                else -> LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(messages, key = { it.id.ifBlank { "m-${it.hashCode()}" } }) { msg ->
                        MessageBubble(lang, msg, resolveMedia)
                    }
                }
            }
        }
        StatusLine(error ?: notice, if (error != null) onRetry else null, L10n.t(lang, "retry"))
        if (pickerTab != null) {
            WaPickerSheet(
                lang = lang,
                tab = pickerTab ?: "emoji",
                onTab = { pickerTab = it },
                onInsert = {
                    onDraft(draft + it)
                    pickerTab = null
                },
                onGif = {
                    pickerTab = null
                    onSendGif(it)
                },
                onDismiss = { pickerTab = null },
            )
        }
        if (recording) {
            RecordingBar(
                lang = lang,
                elapsedMs = elapsedMs,
                onDiscard = {
                    capture.cancel()
                    recording = false
                },
                onSend = {
                    val file = capture.stop()
                    recording = false
                    if (file == null || elapsedMs < 450 || file.length() < 256) {
                        file?.delete()
                        onNotice(L10n.t(lang, "voice_too_short"))
                    } else {
                        onSendVoice(file)
                    }
                },
            )
        } else {
            ChatComposer(
                lang = lang,
                draft = draft,
                onDraft = onDraft,
                sending = sending,
                onSend = onSend,
                onAttach = { pickFile.launch("*/*") },
                onEmoji = { pickerTab = if (pickerTab == null) "emoji" else null },
                onMic = {
                    val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
                        PackageManager.PERMISSION_GRANTED
                    if (granted) {
                        try {
                            capture.start()
                            recording = true
                            elapsedMs = 0
                        } catch (_: Exception) {
                            onNotice(L10n.t(lang, "voice_err_open"))
                        }
                    } else {
                        micPermission.launch(Manifest.permission.RECORD_AUDIO)
                    }
                },
            )
        }
    }
}

@Composable
private fun ChatHeader(
    lang: String,
    chat: ConversationRow,
    photoUrl: String?,
    onBack: () -> Unit,
    onStartCall: (String) -> Unit,
    onSettings: (() -> Unit)? = null,
) {
    Column(Modifier.fillMaxWidth().background(KayaColors.Bg2)) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = L10n.t(lang, "back"), tint = KayaColors.Text)
            }
            Box(
                Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(if (chat.isGroup) Color(0xFF5B4B8A) else KayaColors.AccentSoft),
                contentAlignment = Alignment.Center,
            ) {
                if (chat.isGroup) {
                    Icon(Icons.Outlined.Groups, contentDescription = null, tint = Color.White, modifier = Modifier.size(22.dp))
                } else {
                    CustomerPhoto(photoUrl, chat.customerName, Modifier.size(40.dp), tile = false)
                }
            }
            Column(Modifier.weight(1f).padding(start = 10.dp, end = 4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (chat.isGroup) {
                        Icon(
                            Icons.Outlined.Groups,
                            contentDescription = null,
                            tint = Color(0xFFA78BFA),
                            modifier = Modifier.size(14.dp),
                        )
                        Spacer(Modifier.width(4.dp))
                    }
                    RtlSafeText(
                        displayCustomerName(chat.customerName, chat.customerPhone, L10n.t(lang, "customer")),
                        color = KayaColors.Text,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Text(
                    if (chat.isGroup) L10n.t(lang, "group_whatsapp") else L10n.t(lang, "channel_whatsapp"),
                    color = KayaColors.Text2,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            IconButton(onClick = { onStartCall("video") }) {
                Icon(Icons.Outlined.Videocam, contentDescription = L10n.t(lang, "call_video"), tint = KayaColors.Text2)
            }
            IconButton(onClick = { onStartCall("voice") }) {
                Icon(Icons.Outlined.Call, contentDescription = L10n.t(lang, "call_voice"), tint = KayaColors.Text2)
            }
            if (onSettings != null) {
                IconButton(onClick = onSettings) {
                    Icon(Icons.Outlined.Settings, contentDescription = L10n.t(lang, "chat_settings"), tint = KayaColors.Text2)
                }
            }
        }
        val chips = buildList {
            add(statusLabel(lang, chat.status) to Color(0xFF10B981))
            chat.departmentName?.takeIf { it.isNotBlank() }?.let { add(it to Color(0xFF60A5FA)) }
            if (chat.assigneeName.isNullOrBlank()) {
                add(L10n.t(lang, "filter_unassigned") to Color(0xFFFBBF24))
            } else {
                add(chat.assigneeName to Color(0xFFA78BFA))
            }
        }
        Row(
            Modifier
                .horizontalScroll(rememberScrollState())
                .padding(start = 56.dp, end = 12.dp, bottom = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            chips.forEach { (label, color) ->
                Text(
                    label,
                    color = color,
                    fontSize = 11.sp,
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(color.copy(alpha = 0.16f))
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                )
            }
        }
    }
}

@Composable
private fun MessageBubble(
    lang: String,
    msg: ChatMessage,
    resolveMedia: (String?) -> String?,
) {
    val mine = msg.direction == "outgoing"
    val media = resolveMedia(msg.mediaUrl)
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start,
        verticalAlignment = Alignment.Bottom,
    ) {
        if (!mine) {
            Box(
                Modifier
                    .padding(end = 6.dp)
                    .size(22.dp)
                    .clip(CircleShape)
                    .background(KayaColors.AccentSoft),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    (msg.senderName ?: "?").first().toString(),
                    color = KayaColors.Accent,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        Column(
            Modifier
                .widthIn(max = 320.dp)
                .then(
                    if (msg.isVoice) Modifier
                    else Modifier
                        .clip(RoundedCornerShape(14.dp))
                        .background(if (mine) KayaColors.Accent else KayaColors.BubbleIn)
                        .padding(10.dp),
                ),
        ) {
            if (!msg.isVoice && !msg.senderName.isNullOrBlank()) {
                Text(
                    msg.senderName,
                    color = if (mine) Color.White.copy(alpha = 0.92f) else KayaColors.Accent,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
            when {
                msg.isVoice && !media.isNullOrBlank() -> VoiceBubble(lang, media, msg.id, mine)
                msg.isImage && !media.isNullOrBlank() -> AsyncImage(
                    model = media,
                    contentDescription = L10n.t(lang, "media"),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(220.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .padding(bottom = 6.dp),
                )
                msg.hasMedia && !msg.isVoice -> FileBubble(
                    lang,
                    msg.mediaName ?: L10n.t(lang, "file"),
                    media,
                    mine,
                )
            }
            if (msg.content.isNotBlank() && !msg.isVoice) {
                Text(
                    msg.content,
                    color = if (mine) Color.White else KayaColors.Text,
                    fontSize = 15.sp,
                )
            }
            val clock = formatClock(msg.timestamp)
            if (clock.isNotBlank()) {
                Text(
                    clock,
                    color = if (mine || msg.isVoice) {
                        if (mine && !msg.isVoice) Color.White.copy(alpha = 0.85f) else KayaColors.Text3
                    } else {
                        KayaColors.Text3
                    },
                    fontSize = 10.sp,
                    modifier = Modifier.align(Alignment.End).padding(top = 4.dp),
                )
            }
        }
    }
}

@Composable
private fun ChatComposer(
    lang: String,
    draft: String,
    onDraft: (String) -> Unit,
    sending: Boolean,
    onSend: () -> Unit,
    onAttach: () -> Unit,
    onEmoji: () -> Unit,
    onMic: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(KayaColors.Bg2)
            .padding(horizontal = 8.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onAttach, enabled = !sending) {
            Icon(Icons.Outlined.AttachFile, contentDescription = L10n.t(lang, "attach"), tint = KayaColors.Text2)
        }
        Row(
            Modifier
                .weight(1f)
                .clip(RoundedCornerShape(22.dp))
                .background(KayaColors.Card)
                .padding(start = 14.dp, end = 4.dp, top = 6.dp, bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.weight(1f)) {
                if (draft.isEmpty()) {
                    Text(L10n.t(lang, "message_ph"), color = KayaColors.Text3, fontSize = 14.sp)
                }
                BasicTextField(
                    value = draft,
                    onValueChange = onDraft,
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = TextStyle(color = KayaColors.Text, fontSize = 15.sp),
                    cursorBrush = SolidColor(KayaColors.Accent),
                    maxLines = 4,
                )
            }
            IconButton(onClick = onEmoji) {
                Icon(
                    Icons.Outlined.SentimentSatisfied,
                    contentDescription = L10n.t(lang, "emoji"),
                    tint = KayaColors.Text2,
                )
            }
        }
        if (draft.isBlank()) {
            IconButton(onClick = onMic, enabled = !sending) {
                Icon(Icons.Outlined.Mic, contentDescription = L10n.t(lang, "voice"), tint = KayaColors.Text2)
            }
        } else {
            IconButton(onClick = onSend, enabled = !sending) {
                Icon(Icons.AutoMirrored.Outlined.Send, contentDescription = L10n.t(lang, "send"), tint = KayaColors.Accent)
            }
        }
    }
}

@Composable
private fun RecordingBar(
    lang: String,
    elapsedMs: Long,
    onDiscard: () -> Unit,
    onSend: () -> Unit,
) {
    val sec = (elapsedMs / 1000).toInt()
    val clock = "%d:%02d".format(sec / 60, sec % 60)
    Row(
        Modifier
            .fillMaxWidth()
            .background(KayaColors.Bg2)
            .padding(horizontal = 8.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onDiscard) {
            Icon(Icons.Outlined.Close, contentDescription = L10n.t(lang, "voice_discard"), tint = KayaColors.Danger)
        }
        Box(
            Modifier
                .size(10.dp)
                .clip(CircleShape)
                .background(KayaColors.Danger),
        )
        Text(
            "${L10n.t(lang, "recording")}  $clock",
            color = KayaColors.Text,
            modifier = Modifier.weight(1f).padding(horizontal = 10.dp),
        )
        IconButton(onClick = onSend) {
            Icon(Icons.Outlined.Check, contentDescription = L10n.t(lang, "voice_send"), tint = KayaColors.Accent)
        }
    }
}

@Composable
private fun ChatPatternBackground(modifier: Modifier) {
    Canvas(modifier.background(KayaColors.Bg)) {
        val step = 22.dp.toPx()
        val shade = Color(0x0DFFFFFF)
        var y = 0f
        var row = 0
        while (y < size.height) {
            var x = if (row % 2 == 0) 0f else step
            while (x < size.width) {
                drawRect(shade, Offset(x, y), Size(step, step))
                x += step * 2
            }
            y += step
            row++
        }
    }
}

private fun statusLabel(lang: String, status: String): String = when (status) {
    "closed" -> L10n.t(lang, "status_closed")
    "archived" -> L10n.t(lang, "status_archived")
    else -> L10n.t(lang, "status_open")
}

private fun formatClock(raw: String?): String {
    if (raw.isNullOrBlank()) return ""
    val t = raw.trim()
    return try {
        val instant = runCatching { Instant.parse(t) }.getOrElse {
            val normalized = t.replace(' ', 'T').let { s ->
                if (s.endsWith("Z") || s.contains('+') || s.contains("T") && s.length > 19 && s[19] == '.') s
                else if (!s.endsWith("Z") && !s.contains('+')) "${s}Z" else s
            }
            Instant.parse(normalized)
        }
        DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.systemDefault()).format(instant)
    } catch (_: Exception) {
        if (t.length >= 5) t.takeLast(5) else t
    }
}
