package com.kaya.crm.ui.main.permissions

import com.kaya.crm.data.models.UserResponse
import com.kaya.crm.ui.main.MainTab

/**
 * هم‌تراز با `applyNavByRole` / `applyHiddenSections` در داشبورد وب:
 * owner و admin همه‌چیز؛ داشبورد و پروفایل همیشه؛ بقیه از `user.permissions`؛
 * بعلاوهٔ مخفی‌سازی بخش‌ها توسط مدیر (`hiddenSections`).
 */
object PanelPermissions {

    fun hiddenBlocksPage(hidden: Set<String>, pageId: String): Boolean {
        if (hidden.isEmpty()) return false
        if (hidden.contains(pageId)) return true
        if (pageId == "rates-charts" && hidden.contains("rates")) return true
        return false
    }

    /** دسترسی به یک «بخش» مثل کلیدهای backend/lib/permissions.js */
    fun canSeeNavSection(user: UserResponse?, section: String): Boolean {
        if (section == "profile") return true
        if (user == null) return section == "dashboard"
        val role = user.role
        val isOwnerOrAdmin = role == "owner" || role == "admin"
        if (isOwnerOrAdmin) return true
        if (section == "dashboard") return true
        if (section == "rates_charts" && user.permissions?.get("rates") == true) return true
        return user.permissions?.get(section) == true
    }

    fun isMainTabVisible(user: UserResponse?, tab: MainTab, hiddenPanelPages: Set<String>): Boolean {
        val section = tab.permissionSection
        if (!canSeeNavSection(user, section)) return false
        val page = tab.panelPageId ?: return true
        return !hiddenBlocksPage(hiddenPanelPages, page)
    }

    fun visibleTabs(user: UserResponse?, hiddenPanelPages: Set<String>): List<MainTab> =
        MainTab.entries.filter { isMainTabVisible(user, it, hiddenPanelPages) }
}

val MainTab.permissionSection: String
    get() = when (this) {
        MainTab.DASHBOARD -> "dashboard"
        MainTab.CONVERSATIONS -> "conversations"
        MainTab.CUSTOMERS -> "customers"
        MainTab.TEAM -> "internal_chat"
        MainTab.TICKETS -> "tickets"
        MainTab.PROFILE -> "profile"
    }

/** شناسهٔ صفحه در `hiddenSections` پنل (با خط تیره مثل وب) */
val MainTab.panelPageId: String?
    get() = when (this) {
        MainTab.DASHBOARD -> "dashboard"
        MainTab.CONVERSATIONS -> "conversations"
        MainTab.CUSTOMERS -> "customers"
        MainTab.TEAM -> "internal-chat"
        MainTab.TICKETS -> "tickets"
        MainTab.PROFILE -> null
    }

fun canShowDashboardCard(
    user: UserResponse?,
    section: String,
    panelPageId: String?,
    hiddenPanelPages: Set<String>
): Boolean {
    if (!PanelPermissions.canSeeNavSection(user, section)) return false
    if (panelPageId != null && PanelPermissions.hiddenBlocksPage(hiddenPanelPages, panelPageId)) return false
    return true
}
