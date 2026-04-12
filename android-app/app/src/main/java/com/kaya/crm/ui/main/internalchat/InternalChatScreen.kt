package com.kaya.crm.ui.main.internalchat

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
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
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
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
            Box(modifier = Modifier.fillMaxSize().pullRefresh(pullRefreshState)) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End
                        ) {
                            FilledTonalButton(
                                onClick = { showNewChat = true },
                                content = {
                                    Icon(Icons.Default.Add, contentDescription = null)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("گفتگوی جدید")
                                }
                            )
                        }
                    }
                    if (threads.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(32.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    "هنوز گفتگویی ندارید. برای شروع روی دکمه بالا بزنید.",
                                    style = MaterialTheme.typography.bodyLarge
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
    val preview = thread.lastMessage?.content ?: "بدون پیام"

    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.Person, contentDescription = null)
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(names, style = MaterialTheme.typography.titleMedium)
                Text(
                    preview.take(50) + if (preview.length > 50) "…" else "",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
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
                .heightIn(max = 520.dp),
            snackbarHost = { SnackbarHost(snackbarHostState) }
        ) { padding ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(padding)
            ) {
                Text(
                    participantNames,
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
                            items(messages, key = { it.id }) { msg ->
                                InternalMessageBubble(msg = msg, currentUserId = currentUserId)
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
                        maxLines = 4,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                        keyboardActions = KeyboardActions(
                            onSend = {
                                val t = inputText.trim()
                                if (t.isNotEmpty() && !sending) viewModel.sendMessage(threadId, t)
                            }
                        )
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    IconButton(
                        onClick = {
                            val t = inputText.trim()
                            if (t.isNotEmpty() && !sending) viewModel.sendMessage(threadId, t)
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

@Composable
private fun InternalMessageBubble(
    msg: InternalMessageItem,
    currentUserId: String?
) {
    val isMe = currentUserId != null && msg.fromUserId == currentUserId
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isMe) Arrangement.End else Arrangement.Start
    ) {
        Column(
            horizontalAlignment = if (isMe) Alignment.End else Alignment.Start
        ) {
            Surface(
                color = if (isMe)
                    MaterialTheme.colorScheme.primaryContainer
                else
                    MaterialTheme.colorScheme.surfaceVariant
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    if (!isMe) {
                        Text(
                            msg.fromUser?.name ?: "کاربر",
                            style = MaterialTheme.typography.labelSmall
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                    }
                    Text(msg.content)
                }
            }
            val timeStr = msg.createdAt?.takeIf { it.isNotBlank() }
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
