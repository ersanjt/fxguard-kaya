package com.kaya.crm.ui.main.conversations

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.kaya.crm.ui.components.WaChatRowDivider
import com.kaya.crm.ui.components.WaChatSheetHeader
import com.kaya.crm.ui.components.WaChatThreadRow
import com.kaya.crm.ui.components.WaMessageBubble
import com.kaya.crm.ui.components.WaMessageComposer
import com.kaya.crm.ui.components.waChatBackdropColor
import com.kaya.crm.data.models.Conversation

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
    onClick: () -> Unit
) {
    val preview = conversation.lastMessagePreview?.let { if (it.length > 56) it.take(56) + "…" else it }
        ?: (conversation.department?.name ?: conversation.status)
    val timeStr = conversation.lastMessageAt?.takeIf { it.length >= 16 }?.drop(11)?.take(5)
    val letter = (conversation.displayName.firstOrNull()?.uppercaseChar() ?: "?").toString()

    Column(modifier = Modifier.clickable(onClick = onClick)) {
        WaChatThreadRow(
            title = conversation.displayName,
            preview = preview,
            timeOrMeta = timeStr,
            avatarLetter = letter,
            trailingEmoji = if (conversation.isGroup) "👥" else null,
            unreadCount = conversation.unreadCount
        )
        WaChatRowDivider()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ConversationDetailSheet(
    conversationId: String,
    title: String,
    onDismiss: () -> Unit,
    viewModel: ConversationsViewModel
) {
    val messages by viewModel.messages.collectAsState()
    val messagesLoading by viewModel.messagesLoading.collectAsState()
    val loadingOlder by viewModel.loadingOlderMessages.collectAsState()
    val hasMore by viewModel.hasMoreMessages.collectAsState()
    val detailError by viewModel.detailError.collectAsState()
    val sending by viewModel.sendingMessage.collectAsState()
    val inputClearNonce by viewModel.inputClearNonce.collectAsState()

    var inputText by remember(conversationId) { mutableStateOf("") }
    val listState = rememberLazyListState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(inputClearNonce) {
        if (inputClearNonce > 0) inputText = ""
    }

    LaunchedEffect(detailError) {
        val msg = detailError ?: return@LaunchedEffect
        snackbarHostState.showSnackbar(msg)
        viewModel.clearDetailError()
    }

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.lastIndex)
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
                    subtitle = "مکالمه",
                    onDismiss = onDismiss
                )
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
                                WaMessageBubble(
                                    isOutgoing = isOutgoing,
                                    text = msg.displayContent.ifBlank { "—" },
                                    footer = timeStr.ifBlank { null },
                                    senderLabel = sender
                                )
                            }
                        }
                    }
                }
                WaMessageComposer(
                    text = inputText,
                    onTextChange = { inputText = it },
                    onSend = {
                        val t = inputText.trim()
                        if (t.isNotEmpty() && !sending) {
                            viewModel.sendMessage(conversationId, t)
                        }
                    },
                    sending = sending,
                    placeholder = "پیام…"
                )
            }
        }
    }
}
