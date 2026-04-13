package com.kaya.crm.ui.main.conversations

import android.Manifest
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Reply
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.kaya.crm.data.models.Conversation
import com.kaya.crm.data.models.MessageItem
import com.kaya.crm.media.VoiceRecorder
import com.kaya.crm.ui.components.WaBubbleAttachment
import com.kaya.crm.ui.components.WaChatRowDivider
import com.kaya.crm.ui.components.WaChatSheetHeader
import com.kaya.crm.ui.components.WaChatThreadRow
import com.kaya.crm.ui.components.WaEmojiPickerBottomSheet
import com.kaya.crm.ui.components.WaMessageBubble
import com.kaya.crm.ui.components.WaMessageComposer
import com.kaya.crm.ui.components.waChatBackdropColor
import com.kaya.crm.ui.util.MediaUrlResolve
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun ConversationsScreen(
    viewModel: ConversationsViewModel = hiltViewModel(),
    pendingOpenConversationId: String? = null,
    onPendingOpenConversationConsumed: () -> Unit = {}
) {
    val conversations by viewModel.conversations.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()
    val refreshing by viewModel.refreshing.collectAsState()
    val selectedConversationId by viewModel.selectedConversationId.collectAsState()
    val searchText by viewModel.searchText.collectAsState()
    val statusFilter by viewModel.statusFilter.collectAsState()
    val serverRoot by viewModel.serverRoot.collectAsState()

    LaunchedEffect(Unit) { viewModel.load() }

    LaunchedEffect(pendingOpenConversationId) {
        val id = pendingOpenConversationId ?: return@LaunchedEffect
        viewModel.openConversation(id)
        onPendingOpenConversationConsumed()
    }

    val onRefresh = { viewModel.refresh() }
    val pullRefreshState = rememberPullRefreshState(refreshing, onRefresh)

    if (error != null && conversations.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(error!!, color = MaterialTheme.colorScheme.error)
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = { viewModel.clearError(); viewModel.load() }) { Text("تلاش مجدد") }
            }
        }
    } else if (loading && conversations.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
        }
    } else {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.surface)
                .pullRefresh(pullRefreshState)
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                item {
                    OutlinedTextField(
                        value = searchText,
                        onValueChange = { viewModel.setSearchText(it) },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("جستجو نام یا شماره…") },
                        singleLine = true,
                        shape = RoundedCornerShape(24.dp)
                    )
                }
                item {
                    Text(
                        "فیلتر وضعیت مکالمه",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = statusFilter == null,
                            onClick = { viewModel.setStatusFilter(null) },
                            label = { Text("همه") }
                        )
                        FilterChip(
                            selected = statusFilter == "open",
                            onClick = { viewModel.setStatusFilter("open") },
                            label = { Text("باز") }
                        )
                        FilterChip(
                            selected = statusFilter == "pending",
                            onClick = { viewModel.setStatusFilter("pending") },
                            label = { Text("در انتظار") }
                        )
                        FilterChip(
                            selected = statusFilter == "closed",
                            onClick = { viewModel.setStatusFilter("closed") },
                            label = { Text("بسته") }
                        )
                    }
                }
                if (conversations.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("مکالمه‌ای یافت نشد", style = MaterialTheme.typography.bodyLarge)
                        }
                    }
                }
                items(conversations, key = { it.id }) { conv ->
                    ConversationRow(
                        conversation = conv,
                        serverRoot = serverRoot,
                        onClick = { viewModel.openConversation(conv.id) }
                    )
                }
            }
            PullRefreshIndicator(
                refreshing = refreshing,
                state = pullRefreshState,
                modifier = Modifier.align(Alignment.TopCenter)
            )
        }
    }

    selectedConversationId?.let { id ->
        val convTitle = conversations.find { it.id == id }?.displayName ?: "مکالمه"
        ConversationDetailSheet(
            conversationId = id,
            title = convTitle,
            onDismiss = { viewModel.closeConversation() },
            viewModel = viewModel
        )
    }
}

@Composable
private fun ConversationRow(
    conversation: Conversation,
    serverRoot: String,
    onClick: () -> Unit
) {
    val preview = conversation.lastMessagePreview?.let { if (it.length > 56) it.take(56) + "…" else it }
        ?: (conversation.department?.name ?: conversation.status)
    val timeStr = conversation.lastMessageAt?.takeIf { it.length >= 16 }?.drop(11)?.take(5)
    val letter = (conversation.displayName.firstOrNull()?.uppercaseChar() ?: "?").toString()
    val avatarUrl = if (!conversation.isGroup) {
        MediaUrlResolve.profilePicDisplayUrl(conversation.customer?.profilePic, serverRoot)
    } else null

    Column(modifier = Modifier.clickable(onClick = onClick)) {
        WaChatThreadRow(
            title = conversation.displayName,
            preview = preview,
            timeOrMeta = timeStr,
            avatarLetter = letter,
            trailingEmoji = if (conversation.isGroup) "👥" else null,
            unreadCount = conversation.unreadCount,
            avatarImageUrl = avatarUrl
        )
        WaChatRowDivider()
    }
}

private fun conversationMessageAttachments(msg: MessageItem): List<WaBubbleAttachment> {
    val rawUrl = msg.mediaUrl?.takeIf { it.isNotBlank() }
        ?: (msg.mediaData?.get("url") as? String)?.takeIf { it.isNotBlank() }
        ?: return emptyList()
    val name = (msg.mediaData?.get("filename") as? String)
        ?: (msg.mediaData?.get("name") as? String)
        ?: "فایل"
    val mime = (msg.mediaData?.get("mimetype") as? String) ?: ""
    val isImg = msg.messageType == "image" || mime.startsWith("image/") ||
        MediaUrlResolve.looksLikeImage(rawUrl, name)
    val isAudio = msg.messageType == "audio" || mime.startsWith("audio/")
    val label = if (isAudio) "🎤 $name" else name
    return listOf(
        WaBubbleAttachment(
            label = label,
            absoluteUrl = MediaUrlResolve.publicFile(rawUrl),
            showAsImage = isImg
        )
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ConversationDetailSheet(
    conversationId: String,
    title: String,
    onDismiss: () -> Unit,
    viewModel: ConversationsViewModel
) {
    val context = LocalContext.current
    val messages by viewModel.messages.collectAsState()
    val messagesLoading by viewModel.messagesLoading.collectAsState()
    val loadingOlder by viewModel.loadingOlderMessages.collectAsState()
    val hasMore by viewModel.hasMoreMessages.collectAsState()
    val detailError by viewModel.detailError.collectAsState()
    val sending by viewModel.sendingMessage.collectAsState()
    val inputClearNonce by viewModel.inputClearNonce.collectAsState()
    val replyDraft by viewModel.replyTo.collectAsState()
    val assignableUsers by viewModel.assignableUsers.collectAsState()
    val assignListLoading by viewModel.assignListLoading.collectAsState()

    var inputText by remember(conversationId) { mutableStateOf("") }
    var pendingUris by remember(conversationId) { mutableStateOf<List<Uri>>(emptyList()) }
    var showEmojiPicker by remember { mutableStateOf(false) }
    var showAssignDialog by remember { mutableStateOf(false) }
    var showConvMenu by remember { mutableStateOf(false) }
    var voiceRecording by remember(conversationId) { mutableStateOf(false) }
    var pendingMicStart by remember(conversationId) { mutableStateOf(false) }

    val listState = rememberLazyListState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val voiceRecorder = remember(conversationId) { VoiceRecorder(context.applicationContext) }

    DisposableEffect(conversationId) {
        onDispose { voiceRecorder.cancel() }
    }

    val pickFiles = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetMultipleContents()
    ) { uris: List<Uri> ->
        if (uris.isNotEmpty()) pendingUris = pendingUris + uris
    }

    val micPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted && pendingMicStart) {
            voiceRecorder.start().fold(
                onSuccess = { voiceRecording = true },
                onFailure = { e ->
                    scope.launch { snackbarHostState.showSnackbar(e.message ?: "ضبط شروع نشد") }
                }
            )
        } else if (!granted && pendingMicStart) {
            scope.launch { snackbarHostState.showSnackbar("برای پیام صوتی، اجازهٔ میکروفون لازم است") }
        }
        pendingMicStart = false
    }

    LaunchedEffect(inputClearNonce) {
        if (inputClearNonce > 0) {
            inputText = ""
            pendingUris = emptyList()
        }
    }

    LaunchedEffect(detailError) {
        val msg = detailError ?: return@LaunchedEffect
        snackbarHostState.showSnackbar(msg)
        viewModel.clearDetailError()
    }

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.lastIndex)
    }

    LaunchedEffect(showAssignDialog) {
        if (showAssignDialog) viewModel.loadAssignableUsers()
    }

    if (showAssignDialog) {
        AlertDialog(
            onDismissRequest = { showAssignDialog = false },
            title = { Text("تخصیص مکالمه به همکار") },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 360.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    Text(
                        "مثل پنل وب؛ مسئول می‌تواند مکالمه را به خودش یا دیگران بسپارد (طبق دسترسی شما در سرور).",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    if (assignListLoading) {
                        Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 2.dp)
                        }
                    } else {
                        TextButton(
                            onClick = {
                                scope.launch {
                                    val me = viewModel.currentUserId()
                                    if (me != null) viewModel.assignConversation(conversationId, me)
                                    showAssignDialog = false
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) { Text("تخصیص به من") }
                        assignableUsers.forEach { u ->
                            TextButton(
                                onClick = {
                                    viewModel.assignConversation(conversationId, u.id)
                                    showAssignDialog = false
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(u.name ?: u.email ?: u.id)
                            }
                        }
                        TextButton(
                            onClick = {
                                viewModel.assignConversation(conversationId, null)
                                showAssignDialog = false
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) { Text("بدون مسئول (خالی)") }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showAssignDialog = false }) { Text("بستن") }
            }
        )
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ) {
        Scaffold(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.92f),
            snackbarHost = { SnackbarHost(snackbarHostState) },
            containerColor = MaterialTheme.colorScheme.surface
        ) { padding ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(padding)
            ) {
                WaChatSheetHeader(
                    title = title,
                    subtitle = "مکالمه · واتساپ",
                    onDismiss = onDismiss,
                    trailing = {
                        Box {
                            IconButton(onClick = { showConvMenu = true }) {
                                Icon(
                                    Icons.Default.MoreVert,
                                    contentDescription = "منو",
                                    tint = Color.White
                                )
                            }
                            DropdownMenu(
                                expanded = showConvMenu,
                                onDismissRequest = { showConvMenu = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("تخصیص به همکار") },
                                    onClick = {
                                        showConvMenu = false
                                        showAssignDialog = true
                                    },
                                    leadingIcon = {
                                        Icon(Icons.Default.PersonAdd, contentDescription = null)
                                    }
                                )
                            }
                        }
                    }
                )

                replyDraft?.let { draft ->
                    Surface(
                        tonalElevation = 1.dp,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.AutoMirrored.Filled.Reply, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Column(Modifier.weight(1f)) {
                                Text("پاسخ به", style = MaterialTheme.typography.labelSmall)
                                Text(
                                    draft.preview.ifBlank { "پیام" },
                                    style = MaterialTheme.typography.bodySmall,
                                    maxLines = 2
                                )
                            }
                            TextButton(onClick = { viewModel.clearReplyTo() }) { Text("لغو") }
                        }
                    }
                }

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .background(waChatBackdropColor())
                ) {
                    if (messagesLoading && messages.isEmpty()) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator()
                        }
                    } else {
                        LazyColumn(
                            state = listState,
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            if (hasMore) {
                                item {
                                    if (loadingOlder) {
                                        Box(
                                            modifier = Modifier.fillMaxWidth().padding(8.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            CircularProgressIndicator(modifier = Modifier.size(24.dp))
                                        }
                                    } else {
                                        TextButton(
                                            onClick = { viewModel.loadOlderMessages() },
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Text("پیام‌های قدیمی‌تر")
                                        }
                                    }
                                }
                            }
                            items(messages, key = { it.id }) { msg ->
                                val isOutgoing = msg.direction == "outgoing"
                                val timeStr = msg.timestamp?.takeIf { it.isNotBlank() }?.let { ts ->
                                    if (ts.length >= 16) ts.drop(11).take(5)
                                    else ts.take(19).replace('T', ' ')
                                } ?: ""
                                val sender = if (isOutgoing) msg.user?.name else null
                                val atts = conversationMessageAttachments(msg)
                                val bodyText = msg.displayContent.ifBlank { if (atts.isNotEmpty()) "" else "—" }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.Bottom
                                ) {
                                    Column(Modifier.weight(1f)) {
                                        WaMessageBubble(
                                            isOutgoing = isOutgoing,
                                            text = bodyText,
                                            footer = timeStr.ifBlank { null },
                                            senderLabel = sender,
                                            attachments = atts
                                        )
                                    }
                                    if (!msg.whatsappId.isNullOrBlank()) {
                                        IconButton(
                                            onClick = {
                                                viewModel.setReplyTo(
                                                    msg.whatsappId,
                                                    msg.displayContent.take(80)
                                                )
                                            }
                                        ) {
                                            Icon(
                                                Icons.AutoMirrored.Filled.Reply,
                                                contentDescription = "پاسخ",
                                                tint = MaterialTheme.colorScheme.primary
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (pendingUris.isNotEmpty()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "${pendingUris.size} فایل برای ارسال",
                            style = MaterialTheme.typography.labelMedium
                        )
                        TextButton(onClick = { pendingUris = emptyList() }) {
                            Text("حذف پیوست‌ها")
                        }
                    }
                }

                WaMessageComposer(
                    text = inputText,
                    onTextChange = { inputText = it },
                    onSend = {
                        if (!sending && (inputText.isNotBlank() || pendingUris.isNotEmpty())) {
                            viewModel.sendMessage(conversationId, inputText, pendingUris)
                        }
                    },
                    sending = sending,
                    placeholder = if (voiceRecording) "در حال ضبط… (دوباره میکروفون را بزنید تا ارسال شود)" else "پیام…",
                    onAttachClick = { pickFiles.launch("*/*") },
                    extraCanSend = pendingUris.isNotEmpty(),
                    onEmojiClick = { showEmojiPicker = true },
                    voiceRecording = voiceRecording,
                    onVoiceTap = {
                        if (!voiceRecording) {
                            val ok = ContextCompat.checkSelfPermission(
                                context,
                                Manifest.permission.RECORD_AUDIO
                            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
                            if (ok) {
                                voiceRecorder.start().fold(
                                    onSuccess = { voiceRecording = true },
                                    onFailure = { e ->
                                        scope.launch {
                                            snackbarHostState.showSnackbar(e.message ?: "ضبط نشد")
                                        }
                                    }
                                )
                            } else {
                                pendingMicStart = true
                                micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                            }
                        } else {
                            val f = voiceRecorder.stop()
                            voiceRecording = false
                            if (f != null) {
                                viewModel.sendMessage(
                                    conversationId,
                                    inputText.trim(),
                                    emptyList(),
                                    voiceFile = f
                                )
                            } else {
                                scope.launch { snackbarHostState.showSnackbar("صدا ضبط نشد") }
                            }
                        }
                    }
                )

                WaEmojiPickerBottomSheet(
                    expanded = showEmojiPicker,
                    onDismiss = { showEmojiPicker = false },
                    onEmojiSelected = { inputText += it }
                )
            }
        }
    }
}
