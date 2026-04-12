package com.kaya.crm.ui.main.conversations

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
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
        Box(modifier = Modifier.fillMaxSize().pullRefresh(pullRefreshState)) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    OutlinedTextField(
                        value = searchText,
                        onValueChange = { viewModel.setSearchText(it) },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("جستجو نام یا شماره…") },
                        singleLine = true
                    )
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
        ConversationDetailSheet(
            conversationId = id,
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
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = MaterialTheme.shapes.medium,
                color = if (conversation.isGroup)
                    MaterialTheme.colorScheme.primaryContainer
                else
                    MaterialTheme.colorScheme.secondaryContainer
            ) {
                Box(
                    modifier = Modifier.size(48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (conversation.isGroup) "👥" else (conversation.displayName.firstOrNull()?.uppercaseChar() ?: "?").toString(),
                        style = MaterialTheme.typography.titleMedium
                    )
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = (if (conversation.isGroup) "👥 " else "") + conversation.displayName,
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 1
                    )
                    conversation.lastMessageAt?.let { time ->
                        val timeStr = if (time.length >= 16) time.drop(11).take(5) else time
                        Text(
                            text = timeStr,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                Text(
                    text = conversation.lastMessagePreview?.let { if (it.length > 45) it.take(45) + "…" else it }
                        ?: (conversation.department?.name ?: conversation.status),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2
                )
            }
            if (conversation.unreadCount > 0) {
                Spacer(modifier = Modifier.width(8.dp))
                Surface(
                    color = MaterialTheme.colorScheme.error,
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        conversation.unreadCount.toString(),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        color = MaterialTheme.colorScheme.onError,
                        style = MaterialTheme.typography.labelSmall
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ConversationDetailSheet(
    conversationId: String,
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
                .heightIn(max = 520.dp),
            snackbarHost = { SnackbarHost(snackbarHostState) }
        ) { padding ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(padding)
            ) {
                Text(
                    "مکالمه",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
                Box(modifier = Modifier.weight(1f)) {
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
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
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
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = if (isOutgoing) Arrangement.End else Arrangement.Start
                                ) {
                                    Column(
                                        horizontalAlignment = if (isOutgoing) Alignment.End else Alignment.Start
                                    ) {
                                        if (isOutgoing && !msg.user?.name.isNullOrBlank()) {
                                            Text(
                                                msg.user!!.name!!,
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                        Surface(
                                            color = if (isOutgoing)
                                                MaterialTheme.colorScheme.primaryContainer
                                            else
                                                MaterialTheme.colorScheme.surfaceVariant
                                        ) {
                                            Text(
                                                text = msg.displayContent.ifBlank { "—" },
                                                modifier = Modifier.padding(12.dp)
                                            )
                                        }
                                        val timeStr = msg.timestamp?.takeIf { it.isNotBlank() }
                                            ?.take(19)?.replace('T', ' ') ?: ""
                                        if (timeStr.isNotBlank()) {
                                            Text(
                                                timeStr,
                                                style = MaterialTheme.typography.labelSmall,
                                                modifier = Modifier.padding(top = 2.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = inputText,
                        onValueChange = { inputText = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("پیام…") },
                        enabled = !sending,
                        singleLine = false,
                        maxLines = 4,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                        keyboardActions = KeyboardActions(
                            onSend = {
                                val t = inputText.trim()
                                if (t.isNotEmpty() && !sending) {
                                    viewModel.sendMessage(conversationId, t)
                                }
                            }
                        )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(
                        onClick = {
                            val t = inputText.trim()
                            if (t.isNotEmpty() && !sending) {
                                viewModel.sendMessage(conversationId, t)
                            }
                        },
                        enabled = !sending && inputText.isNotBlank()
                    ) {
                        if (sending) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                        } else {
                            Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "ارسال")
                        }
                    }
                }
            }
        }
    }
}
