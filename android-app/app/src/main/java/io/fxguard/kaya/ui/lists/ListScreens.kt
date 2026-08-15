/**
 * Kaya CRM — customers, tickets, profile
 * @file    android-app/.../ui/lists/ListScreens.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.ui.lists

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.fxguard.kaya.data.models.CustomerRow
import io.fxguard.kaya.data.models.StaffUser
import io.fxguard.kaya.data.models.TicketRow
import io.fxguard.kaya.ui.common.AvatarCircle
import io.fxguard.kaya.ui.common.KayaField
import io.fxguard.kaya.ui.common.KayaPrimaryButton
import io.fxguard.kaya.ui.i18n.L10n
import io.fxguard.kaya.ui.theme.KayaColors

@Composable
fun CustomersScreen(
    lang: String,
    search: String,
    onSearch: (String) -> Unit,
    loading: Boolean,
    rows: List<CustomerRow>,
) {
    Column(Modifier.fillMaxSize().background(KayaColors.Bg).padding(16.dp)) {
        Text(L10n.t(lang, "customers"), color = KayaColors.Text, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(12.dp))
        KayaField(search, onSearch, L10n.t(lang, "search"))
        Spacer(Modifier.height(12.dp))
        when {
            loading && rows.isEmpty() -> CenterBusy()
            rows.isEmpty() -> CenterEmpty(L10n.t(lang, "empty_customers"))
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(rows, key = { it.id }) { row ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(KayaColors.Card)
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        AvatarCircle(row.name, Modifier.size(44.dp))
                        Column(Modifier.padding(start = 12.dp)) {
                            Text(row.name, color = KayaColors.Text, fontWeight = FontWeight.Medium)
                            Text(row.phone ?: row.email ?: row.status, color = KayaColors.Text2, fontSize = 13.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun TicketsScreen(lang: String, loading: Boolean, rows: List<TicketRow>) {
    Column(Modifier.fillMaxSize().background(KayaColors.Bg).padding(16.dp)) {
        Text(L10n.t(lang, "tickets"), color = KayaColors.Text, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(12.dp))
        when {
            loading && rows.isEmpty() -> CenterBusy()
            rows.isEmpty() -> CenterEmpty(L10n.t(lang, "empty_tickets"))
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(rows, key = { it.id }) { row ->
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(KayaColors.Card)
                            .padding(12.dp),
                    ) {
                        Text(row.title, color = KayaColors.Text, fontWeight = FontWeight.Medium)
                        Text(
                            listOfNotNull(row.ticketNumber, row.status, row.priority).joinToString(" · "),
                            color = KayaColors.Text2,
                            fontSize = 12.sp,
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileScreen(
    lang: String,
    user: StaffUser?,
    serverUrl: String,
    onServer: (String) -> Unit,
    onSaveServer: () -> Unit,
    onLang: (String) -> Unit,
    onLogout: () -> Unit,
) {
    Column(Modifier.fillMaxSize().background(KayaColors.Bg).padding(16.dp)) {
        Text(L10n.t(lang, "profile"), color = KayaColors.Text, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(16.dp))
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(KayaColors.Card)
                .padding(16.dp),
        ) {
            Text(user?.name ?: "—", color = KayaColors.Text, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
            Text(user?.email ?: "", color = KayaColors.Text2, fontSize = 13.sp)
            Text("${L10n.t(lang, "role")}: ${user?.role ?: ""}", color = KayaColors.Text3, fontSize = 12.sp)
        }
        Spacer(Modifier.height(18.dp))
        Text(L10n.t(lang, "language"), color = KayaColors.Text2, fontSize = 13.sp)
        Row {
            listOf("fa" to "فارسی", "en" to "EN", "tr" to "TR").forEach { (code, label) ->
                TextButton(onClick = { onLang(code) }) {
                    Text(label, color = if (lang == code) KayaColors.Accent else KayaColors.Text3)
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        KayaField(serverUrl, onServer, L10n.t(lang, "server"))
        Spacer(Modifier.height(10.dp))
        KayaPrimaryButton(L10n.t(lang, "save_server"), false, onClick = onSaveServer)
        Spacer(Modifier.height(24.dp))
        KayaPrimaryButton(L10n.t(lang, "logout"), false, onClick = onLogout)
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
