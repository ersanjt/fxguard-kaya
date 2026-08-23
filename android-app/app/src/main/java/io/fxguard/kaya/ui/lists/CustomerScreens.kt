/**
 * Kaya CRM — customers list + detail (web mobile parity)
 * @file    android-app/.../ui/lists/CustomerScreens.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.ui.lists

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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.FilterList
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SmallFloatingActionButton
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
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
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.fxguard.kaya.data.models.CustomerDraft
import io.fxguard.kaya.data.models.CustomerRow
import io.fxguard.kaya.data.models.TimelineItem
import io.fxguard.kaya.ui.common.CustomerPhoto
import io.fxguard.kaya.ui.common.KayaField
import io.fxguard.kaya.ui.common.KayaPrimaryButton
import io.fxguard.kaya.ui.common.RtlSafeText
import io.fxguard.kaya.ui.common.StatusLine
import io.fxguard.kaya.ui.common.displayCustomerName
import io.fxguard.kaya.ui.common.displayLabel
import io.fxguard.kaya.ui.common.displayPhoneOrFallback
import io.fxguard.kaya.ui.i18n.L10n
import io.fxguard.kaya.ui.theme.KayaColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomersScreen(
    lang: String,
    search: String,
    onSearch: (String) -> Unit,
    archive: Boolean,
    onArchive: (Boolean) -> Unit,
    loading: Boolean,
    rows: List<CustomerRow>,
    error: String?,
    onRetry: () -> Unit,
    onOpen: (CustomerRow) -> Unit,
    onSend: (CustomerRow) -> Unit,
    onInbox: () -> Unit,
    onCreate: (String, String) -> Unit,
    avatarUrl: (String?) -> String? = { null },
    wantAdd: Boolean = false,
    onWantAddConsumed: () -> Unit = {},
) {
    var showAdd by remember { mutableStateOf(false) }
    var showFilter by remember { mutableStateOf(false) }
    LaunchedEffect(wantAdd) {
        if (wantAdd) {
            showAdd = true
            onWantAddConsumed()
        }
    }
    Box(Modifier.fillMaxSize().background(KayaColors.Bg)) {
        Column(Modifier.fillMaxSize().padding(12.dp)) {
            Row(
                Modifier.fillMaxWidth(),
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
                                    Text(L10n.t(lang, "customer_search_ph"), color = KayaColors.Text3, fontSize = 13.sp)
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
                        .clickable { showFilter = true }
                        .padding(horizontal = 10.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Outlined.FilterList, contentDescription = null, tint = KayaColors.Accent, modifier = Modifier.size(16.dp))
                    Text(L10n.t(lang, "filter"), color = KayaColors.Text2, fontSize = 12.sp, modifier = Modifier.padding(start = 4.dp))
                }
            }
            Row(Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CustTab(L10n.t(lang, "customers_tab_active"), !archive) { onArchive(false) }
                CustTab(L10n.t(lang, "customers_tab_archive"), archive) { onArchive(true) }
            }
            StatusLine(error, onRetry, L10n.t(lang, "retry"))
            Spacer(Modifier.height(10.dp))
            when {
                loading && rows.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = KayaColors.Accent)
                }
                rows.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        L10n.t(lang, if (archive) "empty_customers_archive" else "empty_customers"),
                        color = KayaColors.Text2,
                    )
                }
                else -> LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(bottom = 96.dp),
                ) {
                    items(rows, key = { it.id }) { row ->
                        CustomerCard(lang, row, avatarUrl(row.id), onOpen = { onOpen(row) }, onSend = { onSend(row) })
                    }
                }
            }
        }
        SmallFloatingActionButton(
            onClick = onInbox,
            containerColor = KayaColors.Accent,
            contentColor = Color.White,
            modifier = Modifier.align(Alignment.BottomEnd).padding(end = 16.dp, bottom = 16.dp),
        ) {
            Icon(Icons.AutoMirrored.Outlined.Chat, contentDescription = L10n.t(lang, "inbox"))
        }
        FloatingActionButton(
            onClick = { showAdd = true },
            containerColor = KayaColors.Accent,
            contentColor = Color.White,
            modifier = Modifier.align(Alignment.BottomStart).padding(start = 16.dp, bottom = 16.dp),
        ) {
            Icon(Icons.Outlined.Add, contentDescription = L10n.t(lang, "customer_add"))
        }
        if (showFilter) {
            ModalBottomSheet(
                onDismissRequest = { showFilter = false },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
                containerColor = KayaColors.Bg2,
            ) {
                Column(Modifier.padding(20.dp)) {
                    Text(L10n.t(lang, "filter"), color = KayaColors.Text, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(12.dp))
                    Text(
                        L10n.t(lang, "customers_tab_active"),
                        color = if (!archive) KayaColors.Accent else KayaColors.Text,
                        modifier = Modifier.fillMaxWidth().clickable { onArchive(false); showFilter = false }.padding(vertical = 10.dp),
                    )
                    Text(
                        L10n.t(lang, "customers_tab_archive"),
                        color = if (archive) KayaColors.Accent else KayaColors.Text,
                        modifier = Modifier.fillMaxWidth().clickable { onArchive(true); showFilter = false }.padding(vertical = 10.dp),
                    )
                    Spacer(Modifier.height(16.dp))
                }
            }
        }
        if (showAdd) {
            var name by remember { mutableStateOf("") }
            var phone by remember { mutableStateOf("") }
            ModalBottomSheet(
                onDismissRequest = { showAdd = false },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
                containerColor = KayaColors.Bg2,
            ) {
                Column(Modifier.padding(20.dp)) {
                    Text(L10n.t(lang, "customer_add"), color = KayaColors.Text, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(12.dp))
                    KayaField(name, { name = it }, L10n.t(lang, "name"))
                    Spacer(Modifier.height(8.dp))
                    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                        KayaField(phone, { phone = it }, L10n.t(lang, "phone"))
                    }
                    Spacer(Modifier.height(14.dp))
                    KayaPrimaryButton(L10n.t(lang, "customer_add"), false) {
                        onCreate(name, phone)
                        showAdd = false
                    }
                    Spacer(Modifier.height(24.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerDetailScreen(
    lang: String,
    customer: CustomerRow,
    timeline: List<TimelineItem>,
    loading: Boolean,
    saving: Boolean,
    error: String?,
    onBack: () -> Unit,
    onChat: () -> Unit,
    onRetry: () -> Unit,
    onOpenConversation: (String) -> Unit,
    onSave: (CustomerDraft) -> Unit,
    avatarUrl: (String?) -> String? = { null },
) {
    var tab by remember { mutableStateOf(0) }
    var showEdit by remember { mutableStateOf(false) }
    val tabs = listOf("customer_timeline", "customer_history", "customer_transactions", "customer_docs", "customer_notes")
    Box(Modifier.fillMaxSize().background(KayaColors.Bg)) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(12.dp)) {
        Text(
            L10n.t(lang, "back_to_customers"),
            color = KayaColors.Accent,
            modifier = Modifier.clickable(onClick = onBack).padding(vertical = 8.dp),
        )
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ActionChip(L10n.t(lang, "customer_quick_chat"), KayaColors.Accent, Color.White, Modifier.weight(1f), onChat)
            ActionChip(L10n.t(lang, "customer_quick_edit"), KayaColors.Card, KayaColors.Text, Modifier.weight(1f)) { showEdit = true }
            ActionChip(L10n.t(lang, "transaction_add"), KayaColors.Card, KayaColors.Text, Modifier.weight(1f)) { tab = 2 }
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ActionChip(L10n.t(lang, "access_grant_btn"), KayaColors.Card, KayaColors.Text, Modifier.weight(1f)) { }
            ActionChip(L10n.t(lang, "customer_delete"), KayaColors.Danger, Color.White, Modifier.weight(1f)) { }
        }
        Spacer(Modifier.height(12.dp))
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(KayaColors.Card).padding(14.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                CustomerPhoto(avatarUrl(customer.id), customer.name)
                Column(Modifier.padding(start = 12.dp)) {
                    RtlSafeText(displayCustomerName(customer.name, customer.phone, "مشتری"), color = KayaColors.Text, fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
                    Row {
                        Text("${L10n.t(lang, "phone")}: ", color = KayaColors.Text2, fontSize = 13.sp)
                        RtlSafeText(customer.phone ?: "—", color = KayaColors.Text2, fontSize = 13.sp, ltr = true)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("${L10n.t(lang, "status")}: ", color = KayaColors.Text2, fontSize = 13.sp)
                        StatusBadge(lang, customer.status)
                    }
                    Text("${L10n.t(lang, "first_contact")}: ${shortDate(customer.firstContactAt)}", color = KayaColors.Text3, fontSize = 12.sp)
                    Text("${L10n.t(lang, "last_contact")}: ${shortDate(customer.lastContactAt)}", color = KayaColors.Text3, fontSize = 12.sp)
                    Text(
                        "${customer.totalConversations} ${L10n.t(lang, "conv_count")}",
                        color = KayaColors.Text3,
                        fontSize = 12.sp,
                    )
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            tabs.take(3).forEachIndexed { i, key ->
                DetailTab(L10n.t(lang, key), tab == i, Modifier.weight(1f)) { tab = i }
            }
        }
        Spacer(Modifier.height(6.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            tabs.drop(3).forEachIndexed { i, key ->
                DetailTab(L10n.t(lang, key), tab == i + 3, Modifier.weight(1f)) { tab = i + 3 }
            }
        }
        Spacer(Modifier.height(12.dp))
        StatusLine(error, onRetry, L10n.t(lang, "retry"))
        if (loading && timeline.isEmpty() && tab == 0) {
            Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KayaColors.Accent)
            }
        } else if (tab == 0) {
            if (timeline.isEmpty()) {
                Text(L10n.t(lang, "empty_timeline"), color = KayaColors.Text2)
            } else {
                timeline.forEach { item ->
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(KayaColors.Card)
                            .clickable(enabled = item.conversationId != null) {
                                item.conversationId?.let(onOpenConversation)
                            }
                            .padding(12.dp),
                    ) {
                        Text(item.title, color = KayaColors.Text, fontWeight = FontWeight.Medium)
                        if (item.meta.isNotBlank()) {
                            Text(item.meta, color = KayaColors.Text2, fontSize = 12.sp)
                        }
                    }
                }
            }
        } else {
            Text(L10n.t(lang, "empty_timeline"), color = KayaColors.Text2)
        }
        Spacer(Modifier.height(88.dp))
    }
        if (showEdit) {
            var name by remember(customer.id) { mutableStateOf(customer.name) }
            var phone by remember(customer.id) { mutableStateOf(customer.phone.orEmpty()) }
            var email by remember(customer.id) { mutableStateOf(customer.email.orEmpty()) }
            var notes by remember(customer.id) { mutableStateOf(customer.notes.orEmpty()) }
            var birthDate by remember(customer.id) { mutableStateOf(customer.birthDate.orEmpty()) }
            var nationalId by remember(customer.id) { mutableStateOf(customer.nationalId.orEmpty()) }
            var nationality by remember(customer.id) { mutableStateOf(customer.nationality.orEmpty()) }
            var gender by remember(customer.id) { mutableStateOf(customer.gender.orEmpty()) }
            var occupation by remember(customer.id) { mutableStateOf(customer.occupation.orEmpty()) }
            var companyName by remember(customer.id) { mutableStateOf(customer.companyName.orEmpty()) }
            var address by remember(customer.id) { mutableStateOf(customer.address.orEmpty()) }
            var city by remember(customer.id) { mutableStateOf(customer.city.orEmpty()) }
            var country by remember(customer.id) { mutableStateOf(customer.country.orEmpty()) }
            var postalCode by remember(customer.id) { mutableStateOf(customer.postalCode.orEmpty()) }
            var instagram by remember(customer.id) { mutableStateOf(customer.instagram.orEmpty()) }
            var telegram by remember(customer.id) { mutableStateOf(customer.telegram.orEmpty()) }
            var website by remember(customer.id) { mutableStateOf(customer.website.orEmpty()) }
            var status by remember(customer.id) { mutableStateOf(customer.status.ifBlank { "active" }) }
            var formError by remember { mutableStateOf<String?>(null) }
            ModalBottomSheet(
                onDismissRequest = { if (!saving) showEdit = false },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
                containerColor = KayaColors.Bg2,
            ) {
                Column(Modifier.imePadding().padding(20.dp).verticalScroll(rememberScrollState())) {
                    Text(L10n.t(lang, "customer_quick_edit"), color = KayaColors.Text, fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
                    Text(L10n.t(lang, "customer_modal_subtitle"), color = KayaColors.Text2, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp, bottom = 14.dp))
                    SectionTitle(L10n.t(lang, "customer_contact_info"))
                    KayaField(name, { name = it; formError = null }, L10n.t(lang, "name"))
                    Spacer(Modifier.height(8.dp))
                    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                        KayaField(phone, { phone = it }, L10n.t(lang, "phone"), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone))
                    }
                    Spacer(Modifier.height(8.dp))
                    KayaField(email, { email = it }, L10n.t(lang, "email"), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email))
                    Spacer(Modifier.height(14.dp))
                    SectionTitle(L10n.t(lang, "customer_personal"))
                    KayaField(birthDate, { birthDate = it }, L10n.t(lang, "birth_date"))
                    Spacer(Modifier.height(8.dp))
                    KayaField(nationalId, { nationalId = it }, L10n.t(lang, "national_id"))
                    Spacer(Modifier.height(8.dp))
                    KayaField(nationality, { nationality = it }, L10n.t(lang, "nationality"))
                    Spacer(Modifier.height(8.dp))
                    Text(L10n.t(lang, "gender"), color = KayaColors.Text2, fontSize = 13.sp)
                    Spacer(Modifier.height(6.dp))
                    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("" to "gender_select", "male" to "gender_male", "female" to "gender_female", "other" to "gender_other").forEach { (id, key) ->
                            val on = gender == id
                            Text(
                                L10n.t(lang, key),
                                color = if (on) Color.White else KayaColors.Text2,
                                fontSize = 12.sp,
                                modifier = Modifier.clip(RoundedCornerShape(20.dp)).background(if (on) KayaColors.Accent else KayaColors.Card).clickable { gender = id }.padding(horizontal = 12.dp, vertical = 6.dp),
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    KayaField(occupation, { occupation = it }, L10n.t(lang, "occupation"))
                    Spacer(Modifier.height(8.dp))
                    KayaField(companyName, { companyName = it }, L10n.t(lang, "company_name"))
                    Spacer(Modifier.height(14.dp))
                    SectionTitle(L10n.t(lang, "customer_address"))
                    KayaField(address, { address = it }, L10n.t(lang, "address"), singleLine = false)
                    Spacer(Modifier.height(8.dp))
                    KayaField(city, { city = it }, L10n.t(lang, "city"))
                    Spacer(Modifier.height(8.dp))
                    KayaField(country, { country = it }, L10n.t(lang, "country"))
                    Spacer(Modifier.height(8.dp))
                    KayaField(postalCode, { postalCode = it }, L10n.t(lang, "postal_code"))
                    Spacer(Modifier.height(14.dp))
                    SectionTitle(L10n.t(lang, "customer_social"))
                    KayaField(instagram, { instagram = it }, L10n.t(lang, "instagram"))
                    Spacer(Modifier.height(8.dp))
                    KayaField(telegram, { telegram = it }, L10n.t(lang, "telegram"))
                    Spacer(Modifier.height(8.dp))
                    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                        KayaField(website, { website = it }, L10n.t(lang, "website"))
                    }
                    Spacer(Modifier.height(14.dp))
                    SectionTitle(L10n.t(lang, "status"))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("active", "inactive", "blocked").forEach { id ->
                            val on = status == id
                            val label = when (id) {
                                "inactive" -> L10n.t(lang, "status_inactive")
                                "blocked" -> L10n.t(lang, "status_blocked")
                                else -> L10n.t(lang, "status_active")
                            }
                            Text(
                                label,
                                color = if (on) Color.White else KayaColors.Text2,
                                fontSize = 12.sp,
                                modifier = Modifier.clip(RoundedCornerShape(20.dp)).background(if (on) KayaColors.Accent else KayaColors.Card).clickable { status = id }.padding(horizontal = 12.dp, vertical = 6.dp),
                            )
                        }
                    }
                    Text(L10n.t(lang, "customer_status_hint"), color = KayaColors.Text3, fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp))
                    Spacer(Modifier.height(14.dp))
                    SectionTitle(L10n.t(lang, "customer_notes_label"))
                    KayaField(notes, { notes = it }, L10n.t(lang, "customer_notes_ph"), singleLine = false)
                    if (!formError.isNullOrBlank()) {
                        Text(formError!!, color = KayaColors.Danger, fontSize = 13.sp, modifier = Modifier.padding(top = 10.dp))
                    }
                    Spacer(Modifier.height(14.dp))
                    KayaPrimaryButton(L10n.t(lang, "save"), saving) {
                        if (name.trim().isEmpty()) {
                            formError = L10n.t(lang, "required")
                            return@KayaPrimaryButton
                        }
                        onSave(
                            CustomerDraft(
                                name = name.trim(),
                                phone = phone.trim().ifBlank { null },
                                email = email.trim().ifBlank { null },
                                status = status,
                                notes = notes.trim().ifBlank { null },
                                birthDate = birthDate.trim().ifBlank { null },
                                nationalId = nationalId.trim().ifBlank { null },
                                nationality = nationality.trim().ifBlank { null },
                                gender = gender.trim().ifBlank { null },
                                occupation = occupation.trim().ifBlank { null },
                                companyName = companyName.trim().ifBlank { null },
                                address = address.trim().ifBlank { null },
                                city = city.trim().ifBlank { null },
                                country = country.trim().ifBlank { null },
                                postalCode = postalCode.trim().ifBlank { null },
                                instagram = instagram.trim().ifBlank { null },
                                telegram = telegram.trim().ifBlank { null },
                                website = website.trim().ifBlank { null },
                            ),
                        )
                        showEdit = false
                    }
                    Text(
                        L10n.t(lang, "cancel"),
                        color = KayaColors.Text2,
                        modifier = Modifier.fillMaxWidth().clickable { showEdit = false }.padding(vertical = 12.dp),
                    )
                    Spacer(Modifier.height(24.dp))
                }
            }
        }
    }
}

@Composable
private fun CustomerCard(lang: String, row: CustomerRow, photoUrl: String?, onOpen: () -> Unit, onSend: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(KayaColors.Card)
            .clickable(onClick = onOpen)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        CustomerPhoto(photoUrl, row.name)
        Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                RtlSafeText(
                    displayCustomerName(row.name, row.phone, "مشتری"),
                    color = KayaColors.Text,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
                Spacer(Modifier.size(6.dp))
                StatusBadge(lang, row.status)
            }
            RtlSafeText(
                displayPhoneOrFallback(row.phone, row.email ?: "—"),
                color = KayaColors.Text2,
                fontSize = 12.sp,
                maxLines = 1,
                ltr = !row.phone.isNullOrBlank(),
            )
            Text(
                listOfNotNull(
                    shortDate(row.lastContactAt).takeIf { it != "—" },
                    "${row.totalConversations} ${L10n.t(lang, "conv_count")}",
                    row.departmentName ?: row.assigneeName,
                ).joinToString(" · "),
                color = KayaColors.Text3,
                fontSize = 11.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Text(
            L10n.t(lang, "btn_send"),
            color = Color.White,
            fontSize = 13.sp,
            modifier = Modifier
                .clip(RoundedCornerShape(10.dp))
                .background(KayaColors.Accent)
                .clickable(onClick = onSend)
                .padding(horizontal = 14.dp, vertical = 10.dp),
        )
    }
}

@Composable
private fun StatusBadge(lang: String, status: String) {
    val label = when (status) {
        "blocked" -> L10n.t(lang, "status_blocked")
        "inactive" -> L10n.t(lang, "status_inactive")
        else -> L10n.t(lang, "status_active")
    }
    Text(
        label,
        color = Color.White,
        fontSize = 11.sp,
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(KayaColors.Accent)
            .padding(horizontal = 8.dp, vertical = 2.dp),
    )
}

@Composable
private fun CustTab(label: String, on: Boolean, click: () -> Unit) {
    Text(
        label,
        color = if (on) Color.White else KayaColors.Text,
        fontSize = 13.sp,
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .border(1.dp, KayaColors.Accent, RoundedCornerShape(999.dp))
            .background(if (on) KayaColors.Accent else Color.Transparent)
            .clickable(onClick = click)
            .padding(horizontal = 14.dp, vertical = 8.dp),
    )
}

@Composable
private fun DetailTab(label: String, on: Boolean, modifier: Modifier, click: () -> Unit) {
    Column(
        modifier = modifier.clickable(onClick = click),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            label,
            color = if (on) KayaColors.Accent else KayaColors.Text2,
            fontSize = 12.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            fontWeight = if (on) FontWeight.SemiBold else FontWeight.Normal,
            modifier = Modifier.padding(vertical = 8.dp),
        )
        Box(
            Modifier
                .fillMaxWidth()
                .height(2.dp)
                .background(if (on) KayaColors.Accent else Color.Transparent),
        )
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text,
        color = KayaColors.Text,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        modifier = Modifier.padding(bottom = 8.dp),
    )
}

@Composable
private fun ActionChip(label: String, bg: Color, fg: Color, modifier: Modifier, onClick: () -> Unit) {
    Text(
        label,
        color = fg,
        fontSize = 12.sp,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(bg)
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 10.dp),
    )
}

private fun shortDate(raw: String?): String {
    if (raw.isNullOrBlank()) return "—"
    return raw.take(10)
}
