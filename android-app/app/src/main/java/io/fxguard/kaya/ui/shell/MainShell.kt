/**
 * Kaya CRM — web-mobile header + tab bar
 * @file    android-app/.../ui/shell/MainShell.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.ui.shell

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Campaign
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import io.fxguard.kaya.ui.common.AvatarCircle
import io.fxguard.kaya.ui.i18n.L10n
import io.fxguard.kaya.ui.theme.KayaColors

enum class StaffTab { Dashboard, Inbox, Customers, Announcements, More }

enum class MoreDest { Menu, Tickets, Tasks, Team, Profile }

@Composable
fun MainShell(
    lang: String,
    title: String,
    tab: StaffTab,
    onTab: (StaffTab) -> Unit,
    convBadge: Int,
    annBadge: Int,
    notifyBadge: Int,
    avatarUrl: String?,
    avatarLetter: String,
    onMenu: () -> Unit,
    onNotify: () -> Unit,
    onSearch: () -> Unit,
    onProfile: () -> Unit,
    immersive: Boolean = false,
    content: @Composable () -> Unit,
) {
    Column(Modifier.fillMaxSize().background(KayaColors.Bg)) {
        if (!immersive) {
            MobileHeader(
                title = title,
                notifyBadge = notifyBadge,
                avatarUrl = avatarUrl,
                avatarLetter = avatarLetter,
                menuLabel = L10n.t(lang, "menu"),
                notifyLabel = L10n.t(lang, "notify"),
                searchLabel = L10n.t(lang, "search"),
                profileLabel = L10n.t(lang, "profile"),
                onMenu = onMenu,
                onNotify = onNotify,
                onSearch = onSearch,
                onProfile = onProfile,
            )
        }
        Box(Modifier.weight(1f).fillMaxWidth()) { content() }
        if (!immersive) {
            MobileTabBar(
                lang = lang,
                tab = tab,
                onTab = onTab,
                convBadge = convBadge,
                annBadge = annBadge,
            )
        }
    }
}

@Composable
private fun MobileHeader(
    title: String,
    notifyBadge: Int,
    avatarUrl: String?,
    avatarLetter: String,
    menuLabel: String,
    notifyLabel: String,
    searchLabel: String,
    profileLabel: String,
    onMenu: () -> Unit,
    onNotify: () -> Unit,
    onSearch: () -> Unit,
    onProfile: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(KayaColors.Chrome)
            .statusBarsPadding()
            .padding(horizontal = 8.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onMenu) {
            Icon(Icons.Outlined.Menu, contentDescription = menuLabel, tint = KayaColors.Text)
        }
        Text(
            title,
            color = KayaColors.Text,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f).padding(horizontal = 4.dp),
        )
        Box {
            IconButton(onClick = onNotify) {
                Icon(Icons.Outlined.Notifications, contentDescription = notifyLabel, tint = KayaColors.Text2)
            }
            if (notifyBadge > 0) {
                Text(
                    if (notifyBadge > 99) "99+" else notifyBadge.toString(),
                    color = Color.White,
                    fontSize = 9.sp,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .clip(RoundedCornerShape(8.dp))
                        .background(KayaColors.Danger)
                        .padding(horizontal = 4.dp, vertical = 1.dp),
                )
            }
        }
        IconButton(onClick = onSearch) {
            Icon(Icons.Outlined.Search, contentDescription = searchLabel, tint = KayaColors.Text2)
        }
        IconButton(onClick = onProfile) {
            Box(
                Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(KayaColors.AccentSoft),
                contentAlignment = Alignment.Center,
            ) {
                if (!avatarUrl.isNullOrBlank()) {
                    AsyncImage(avatarUrl, contentDescription = profileLabel, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                } else {
                    AvatarCircle(avatarLetter, Modifier.fillMaxSize())
                }
            }
        }
    }
}

@Composable
private fun MobileTabBar(
    lang: String,
    tab: StaffTab,
    onTab: (StaffTab) -> Unit,
    convBadge: Int,
    annBadge: Int,
) {
    val items = listOf(
        Quad(StaffTab.Dashboard, Icons.Outlined.BarChart, L10n.t(lang, "dashboard"), 0),
        Quad(StaffTab.Inbox, Icons.AutoMirrored.Outlined.Chat, L10n.t(lang, "inbox"), convBadge),
        Quad(StaffTab.Customers, Icons.Outlined.People, L10n.t(lang, "customers"), 0),
        Quad(StaffTab.Announcements, Icons.Outlined.Campaign, L10n.t(lang, "announcements"), annBadge),
        Quad(StaffTab.More, Icons.Outlined.MoreHoriz, L10n.t(lang, "more"), 0),
    )
    Row(
        Modifier
            .fillMaxWidth()
            .background(KayaColors.ChromeTab)
            .navigationBarsPadding()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceAround,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        items.forEach { item ->
            val on = tab == item.tab
            Column(
                Modifier
                    .weight(1f)
                    .heightIn(min = 44.dp)
                    .clickable { onTab(item.tab) }
                    .padding(vertical = 4.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box {
                    Icon(
                        item.icon,
                        contentDescription = item.label,
                        tint = if (on) KayaColors.Accent else KayaColors.Text3,
                        modifier = Modifier.size(22.dp),
                    )
                    if (item.badge > 0) {
                        Text(
                            if (item.badge > 99) "99+" else item.badge.toString(),
                            color = Color.White,
                            fontSize = 9.sp,
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .clip(RoundedCornerShape(8.dp))
                                .background(KayaColors.Danger)
                                .padding(horizontal = 3.dp),
                        )
                    }
                }
                Text(
                    item.label,
                    color = if (on) KayaColors.Accent else KayaColors.Text3,
                    fontSize = 10.sp,
                    fontWeight = if (on) FontWeight.SemiBold else FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

private data class Quad(
    val tab: StaffTab,
    val icon: ImageVector,
    val label: String,
    val badge: Int,
)
