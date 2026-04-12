package com.kaya.crm.ui.main.customers

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.kaya.crm.ui.components.WaChatRowDivider
import com.kaya.crm.ui.components.WaChatSheetHeader
import com.kaya.crm.ui.components.WaChatThreadRow
import com.kaya.crm.data.models.CustomerDetail
import com.kaya.crm.data.models.CustomerItem

@OptIn(ExperimentalMaterialApi::class, ExperimentalMaterial3Api::class)
@Composable
fun CustomersScreen(
    viewModel: CustomersViewModel = hiltViewModel(),
    onOpenConversation: (String) -> Unit = {}
) {
    val customers by viewModel.customers.collectAsState()
    val total by viewModel.total.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val loadingMore by viewModel.loadingMore.collectAsState()
    val refreshing by viewModel.refreshing.collectAsState()
    val error by viewModel.error.collectAsState()
    val searchText by viewModel.searchText.collectAsState()
    val statusFilter by viewModel.statusFilter.collectAsState()
    val selectedCustomerId by viewModel.selectedCustomerId.collectAsState()
    val customerDetail by viewModel.customerDetail.collectAsState()
    val detailLoading by viewModel.detailLoading.collectAsState()
    val detailError by viewModel.detailError.collectAsState()
    val linkedConversationId by viewModel.linkedConversationId.collectAsState()

    LaunchedEffect(Unit) { viewModel.load(reset = true) }

    val onRefresh = { viewModel.refresh() }
    val pullRefreshState = rememberPullRefreshState(refreshing, onRefresh)

    if (error != null && customers.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(error!!, color = MaterialTheme.colorScheme.error)
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = { viewModel.clearError(); viewModel.load(reset = true) }) { Text("تلاش مجدد") }
            }
        }
    } else if (loading && customers.isEmpty()) {
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
                        placeholder = { Text("جستجو نام، شماره یا ایمیل…") },
                        singleLine = true,
                        shape = RoundedCornerShape(24.dp)
                    )
                }
                item {
                    Text(
                        "وضعیت مشتری",
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
                            selected = statusFilter == "active",
                            onClick = { viewModel.setStatusFilter("active") },
                            label = { Text("فعال") }
                        )
                        FilterChip(
                            selected = statusFilter == "inactive",
                            onClick = { viewModel.setStatusFilter("inactive") },
                            label = { Text("غیرفعال") }
                        )
                        FilterChip(
                            selected = statusFilter == "blocked",
                            onClick = { viewModel.setStatusFilter("blocked") },
                            label = { Text("مسدود") }
                        )
                    }
                }
                if (customers.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("مشتری یافت نشد", style = MaterialTheme.typography.bodyLarge)
                        }
                    }
                }
                items(customers, key = { it.id }) { customer ->
                    CustomerListRow(
                        customer = customer,
                        onClick = { viewModel.openCustomer(customer) }
                    )
                }
                if (customers.isNotEmpty() && customers.size < total) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            if (loadingMore) {
                                CircularProgressIndicator(modifier = Modifier.size(28.dp))
                            } else {
                                TextButton(onClick = { viewModel.loadMore() }) {
                                    Text("بارگذاری بیشتر (${customers.size} از $total)")
                                }
                            }
                        }
                    }
                }
            }
            PullRefreshIndicator(
                refreshing = refreshing,
                state = pullRefreshState,
                modifier = Modifier.align(Alignment.TopCenter)
            )
        }
    }

    if (selectedCustomerId != null) {
        CustomerDetailSheet(
            detail = customerDetail,
            detailLoading = detailLoading,
            detailError = detailError,
            linkedConversationId = linkedConversationId,
            onDismiss = { viewModel.closeCustomerDetail() },
            onOpenConversation = onOpenConversation,
            onClearDetailError = { viewModel.clearDetailError() }
        )
    }
}

@Composable
private fun CustomerListRow(
    customer: CustomerItem,
    onClick: () -> Unit
) {
    val context = LocalContext.current
    val title = customer.name ?: customer.phone ?: "—"
    val preview = buildString {
        if (!customer.name.isNullOrBlank() && !customer.phone.isNullOrBlank()) {
            append(customer.phone)
        }
        if (!customer.email.isNullOrBlank()) {
            if (isNotEmpty()) append(" · ")
            append(customer.email)
        }
        if (customer.lastOpenConv != null) {
            if (isNotEmpty()) append(" · ")
            append("مکالمه باز")
        }
    }.ifBlank { customer.phone ?: customer.email ?: "—" }.take(58)
    val initial = (title.firstOrNull() ?: '?').toString()

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .clickable(onClick = onClick)
        ) {
            WaChatThreadRow(
                title = title,
                preview = preview,
                timeOrMeta = customer.status?.takeIf { it.isNotBlank() },
                avatarLetter = initial
            )
            WaChatRowDivider()
        }
        customer.phone?.takeIf { it.isNotBlank() }?.let { phone ->
            IconButton(
                onClick = {
                    runCatching {
                        context.startActivity(
                            Intent(Intent.ACTION_DIAL, Uri.parse("tel:${Uri.encode(phone)}"))
                        )
                    }
                }
            ) {
                Icon(Icons.Filled.Phone, contentDescription = "تماس")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CustomerDetailSheet(
    detail: CustomerDetail?,
    detailLoading: Boolean,
    detailError: String?,
    linkedConversationId: String?,
    onDismiss: () -> Unit,
    onOpenConversation: (String) -> Unit,
    onClearDetailError: () -> Unit
) {
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(detailError) {
        val msg = detailError ?: return@LaunchedEffect
        snackbarHostState.showSnackbar(msg)
        onClearDetailError()
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
                    title = detail?.name ?: "جزئیات مشتری",
                    subtitle = "مشتریان",
                    onDismiss = onDismiss
                )
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp)
                ) {
                Spacer(modifier = Modifier.height(4.dp))
                if (detailLoading && detail == null) {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                } else if (detail != null) {
                    DetailFields(detail = detail)
                    detail.phone?.takeIf { it.isNotBlank() }?.let { phone ->
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedButton(
                            onClick = {
                                runCatching {
                                    context.startActivity(
                                        Intent(Intent.ACTION_DIAL, Uri.parse("tel:${Uri.encode(phone)}"))
                                    )
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Filled.Phone, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("تماس تلفنی")
                        }
                    }
                    linkedConversationId?.let { convId ->
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = {
                                onDismiss()
                                onOpenConversation(convId)
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.AutoMirrored.Filled.Chat, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("رفتن به مکالمه")
                        }
                    }
                } else {
                    Text("اطلاعاتی دریافت نشد", style = MaterialTheme.typography.bodyMedium)
                }
                }
            }
        }
    }
}

@Composable
private fun DetailFields(detail: CustomerDetail) {
    @Composable
    fun line(label: String, value: String?) {
        if (!value.isNullOrBlank()) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
            Text(value, style = MaterialTheme.typography.bodyMedium)
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
    line("نام", detail.name)
    line("تلفن", detail.phone)
    line("ایمیل", detail.email)
    line("وضعیت", detail.status)
    line("منبع", detail.source)
    line("شهر", detail.city)
    line("کشور", detail.country)
    line("آدرس", detail.address)
    line("آخرین تماس", detail.lastContactAt)
    line("یادداشت", detail.notes)
}
