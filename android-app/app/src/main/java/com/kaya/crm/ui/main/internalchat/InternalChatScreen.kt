package com.kaya.crm.ui.main.internalchat

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.kaya.crm.ui.components.ChatWhatsAppStyle
import com.kaya.crm.ui.components.WaChatRowDivider
import com.kaya.crm.ui.components.WaChatSheetHeader
import com.kaya.crm.ui.components.WaChatThreadRow
import com.kaya.crm.ui.components.WaMessageBubble
import com.kaya.crm.ui.components.WaMessageComposer
import com.kaya.crm.ui.components.waChatBackdropColor
import com.kaya.crm.data.models.InternalThreadBrief
import com.kaya.crm.data.models.InternalMessageItem
import com.kaya.crm.data.models.UserBrief

@OptIn(ExperimentalMaterialApi::class, ExperimentalMaterial3Api::class)
@Composable
fun InternalChatScreen(viewModel: InternalChatViewModel = hiltViewModel()) {
    val threads by viewModel.threads.collectAsState()
    val users by viewModel.users.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()
    val refreshing by viewModel.refreshing.collectAsState()
    val selectedThreadId by viewModel.selectedThreadId.collectAsState()
    var showNewChat by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadThreads()
        viewModel.loadUsers()
    }

    val onRefresh = { viewModel.refresh() }
    val pullRefreshState = rememberPullRefreshState(refreshing, onRefresh)

    Box(modifier = Modifier.fillMaxSize()) {
        if (error != null && threads.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(error!!, color = MaterialTheme.colorScheme.error)
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(onClick = { viewModel.clearError(); viewModel.loadThreads() }) {
                        Text("تلاش مجدد")
                    }
                }
            }
        } else if (loading && threads.isEmpty()) {
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
                    contentPadding = PaddingValues(bottom = 88.dp)
                ) {
                    if (threads.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(32.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    "هنوز گفتگویی ندارید. برای شروع دکمهٔ سبز را بزنید.",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                    items(threads, key = { it.id }) { thread ->
                        InternalThreadItem(
                            thread = thread,
                            onClick = { viewModel.openThread(thread.id) }
                        )
                    }
                }
                FloatingActionButton(
                    onClick = { showNewChat = true },
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(20.dp),
                    containerColor = ChatWhatsAppStyle.sendFabGreen,
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "گفتگوی جدید")
                }
                PullRefreshIndicator(
                    refreshing = refreshing,
                    state = pullRefreshState,
                    modifier = Modifier.align(Alignment.TopCenter)
                )
            }
        }
    }

    if (showNewChat) {
        NewChatDialog(
            users = users,
            onDismiss = { showNewChat = false },
            onSelectUser = { user ->
                viewModel.createThread(listOf(user.id))
                showNewChat = false
            }
        )
    }

    val currentUserId by viewModel.currentUserId.collectAsState()
    selectedThreadId?.let { id ->
        InternalChatDetailSheet(
            threadId = id,
            threads = threads,
            currentUserId = currentUserId,
            onDismiss = { viewModel.closeThread() },
            viewModel = viewModel
        )
    }
}

@Composable
private fun InternalThreadItem(
    thread: InternalThreadBrief,
    onClick: () -> Unit
) {
    val names = thread.participants.joinToString("، ") { it.name ?: it.email ?: "—" }
    val previewRaw = thread.lastMessage?.content ?: "بدون پیام"
    val preview = previewRaw.take(56) + if (previewRaw.length > 56) "…" else ""
    val timeStr = thread.lastMessageAt?.takeIf { it.length >= 16 }?.drop(11)?.take(5)
    val initial = names.firstOrNull()?.toString() ?: "?"

    Column(modifier = Modifier.clickable(onClick = onClick)) {
        WaChatThreadRow(
            title = names,
            preview = preview,
            timeOrMeta = timeStr,
            avatarLetter = initial
        )
        WaChatRowDivider()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NewChatDialog(
    users: List<UserBrief>,
    onDismiss: () -> Unit,
    onSelectUser: (UserBrief) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("شروع گفتگوی جدید") },
        text = {
            Column(
                modifier = Modifier
                    .heightIn(max = 400.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                if (users.isEmpty()) {
                    Text("کاربری برای چت یافت نشد", style = MaterialTheme.typography.bodyMedium)
                } else {
                    users.forEach { user ->
                        Card(
                            modifier = Modifier.fillMaxWidth().clickable {
                                onSelectUser(user)
                            }
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Person, contentDescription = null)
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(user.name ?: user.email ?: "—")
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("انصراف") }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun InternalChatDetailSheet(
    threadId: String,
    threads: List<InternalThreadBrief>,
    currentUserId: String?,
    onDismiss: () -> Unit,
    viewModel: InternalChatViewModel
) {
    val messages by viewModel.messages.collectAsState()
    val messagesLoading by viewModel.messagesLoading.collectAsState()
    val detailError by viewModel.detailError.collectAsState()
    val sending by viewModel.sendingMessage.collectAsState()
    val inputClearNonce by viewModel.inputClearNonce.collectAsState()
    var inputText by remember(threadId) { mutableStateOf("") }
    val listState = rememberLazyListState()
    val snackbarHostState = remember { SnackbarHostState() }
    val thread = threads.find { it.id == threadId }
    val participantNames = thread?.participants?.joinToString("، ") { it.name ?: it.email ?: "—" } ?: "چت"

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
                    title = participantNames,
                    subtitle = "چت داخلی",
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
                            items(messages, key = { it.id }) { msg ->
                                val isMe = currentUserId != null && msg.fromUserId == currentUserId
                                val timeStr = msg.createdAt?.takeIf { it.isNotBlank() }
                                    ?.take(16)?.drop(11)?.take(5) ?: ""
                                WaMessageBubble(
                                    isOutgoing = isMe,
                                    text = msg.content,
                                    footer = timeStr.ifBlank { null },
                                    senderLabel = if (isMe) null else (msg.fromUser?.name ?: "کاربر")
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
                        if (t.isNotEmpty() && !sending) viewModel.sendMessage(threadId, t)
                    },
                    sending = sending,
                    placeholder = "پیام…"
                )
            }
        }
    }
}
