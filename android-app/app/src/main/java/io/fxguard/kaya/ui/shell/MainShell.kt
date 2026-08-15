/**
 * Kaya CRM — bottom navigation shell
 * @file    android-app/.../ui/shell/MainShell.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.ui.shell

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import io.fxguard.kaya.ui.i18n.L10n
import io.fxguard.kaya.ui.theme.KayaColors

enum class StaffTab { Inbox, Customers, Tickets, Profile }

@Composable
fun MainShell(
    lang: String,
    tab: StaffTab,
    onTab: (StaffTab) -> Unit,
    content: @Composable () -> Unit,
) {
    val items = listOf(
        Triple(StaffTab.Inbox, Icons.AutoMirrored.Outlined.Chat, L10n.t(lang, "inbox")),
        Triple(StaffTab.Customers, Icons.Outlined.People, L10n.t(lang, "customers")),
        Triple(StaffTab.Tickets, Icons.Outlined.ConfirmationNumber, L10n.t(lang, "tickets")),
        Triple(StaffTab.Profile, Icons.Outlined.Person, L10n.t(lang, "profile")),
    )
    Scaffold(
        containerColor = KayaColors.Bg,
        bottomBar = {
            NavigationBar(containerColor = KayaColors.Bg2) {
                items.forEach { (key, icon, label) ->
                    NavigationBarItem(
                        selected = tab == key,
                        onClick = { onTab(key) },
                        icon = { Icon(icon as ImageVector, contentDescription = label) },
                        label = { Text(label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = KayaColors.Accent,
                            selectedTextColor = KayaColors.Accent,
                            unselectedIconColor = KayaColors.Text3,
                            unselectedTextColor = KayaColors.Text3,
                            indicatorColor = KayaColors.AccentSoft,
                        ),
                    )
                }
            }
        },
    ) { padding ->
        androidx.compose.foundation.layout.Box(Modifier.padding(padding)) {
            content()
        }
    }
}
