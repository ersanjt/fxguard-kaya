/**
 * Kaya CRM — fictional store-listing fixtures (debug only)
 * @file    android-app/.../store/StoreDemoData.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/STORE-RELEASE.md
 */
package io.fxguard.kaya.store

import io.fxguard.kaya.data.models.AnnouncementRow
import io.fxguard.kaya.data.models.Branding
import io.fxguard.kaya.data.models.ConversationRow
import io.fxguard.kaya.data.models.CustomerRow
import io.fxguard.kaya.data.models.DashboardStats

/** Sample names and 555 numbers only — never production customers. */
object StoreDemoData {
    val branding = Branding(
        siteName = "KAYA",
        loginTitle = "Kaya Staff",
        logoUrl = null,
        loginLogoUrl = null,
        primaryColor = null,
    )

    val stats = DashboardStats(
        openConversations = 6,
        unreadConversations = 2,
        unansweredConversations = 1,
        unassignedConversations = 2,
        todayMessages = 9,
        ticketsOpen = 1,
        tasksPending = 2,
        totalCustomers = 8,
        staffOnline = 3,
        loginsToday = 4,
        announcementsCount = 2,
        unreadAnnouncements = 1,
        avgRating = 4.8,
        ratedConversationsCount = 5,
    )

    val conversations = listOf(
        ConversationRow(
            id = "demo-c1",
            status = "open",
            unreadCount = 1,
            lastMessageAt = "2026-08-18T09:42:00Z",
            lastMessagePreview = "سلام، موجودی سفارش را می‌خواستم.",
            customerId = "demo-u1",
            customerName = "سارا محمدی",
            customerPhone = "+98 555 010 1001",
            customerAvatar = null,
            assigneeName = "کارشناس دمو",
            departmentName = "پشتیبانی",
        ),
        ConversationRow(
            id = "demo-c2",
            status = "open",
            unreadCount = 0,
            lastMessageAt = "2026-08-18T08:15:00Z",
            lastMessagePreview = "فایل را ارسال کردم، لطفاً بررسی کنید.",
            customerId = "demo-u2",
            customerName = "علی رضایی",
            customerPhone = "+98 555 010 1002",
            customerAvatar = null,
            assigneeName = "کارشناس دمو",
            departmentName = "فروش",
        ),
        ConversationRow(
            id = "demo-c3",
            status = "open",
            unreadCount = 2,
            lastMessageAt = "2026-08-17T16:20:00Z",
            lastMessagePreview = "ساعت جلسه را تأیید می‌کنید؟",
            customerId = "demo-u3",
            customerName = "نرگس احمدی",
            customerPhone = "+98 555 010 1003",
            customerAvatar = null,
            assigneeName = null,
            departmentName = "پشتیبانی",
        ),
        ConversationRow(
            id = "demo-c4",
            status = "open",
            unreadCount = 0,
            lastMessageAt = "2026-08-17T14:05:00Z",
            lastMessagePreview = "متشکرم، انجام شد.",
            customerId = "demo-u4",
            customerName = "مهدی کریمی",
            customerPhone = "+98 555 010 1004",
            customerAvatar = null,
            assigneeName = "کارشناس دمو",
            departmentName = "عملیات",
        ),
        ConversationRow(
            id = "demo-c5",
            status = "open",
            unreadCount = 0,
            lastMessageAt = "2026-08-17T11:40:00Z",
            lastMessagePreview = "نمونه پیام گروهی برای نمایش فروشگاه",
            customerId = "demo-g1",
            customerName = "گروه دمو پشتیبانی",
            customerPhone = null,
            customerAvatar = null,
            assigneeName = null,
            isGroup = true,
        ),
    )

    val customers = listOf(
        CustomerRow(
            id = "demo-u1",
            name = "سارا محمدی",
            phone = "+98 555 010 1001",
            email = "sara.demo@example.com",
            status = "active",
            avatar = null,
            lastContactAt = "2026-08-18T09:42:00Z",
            totalConversations = 4,
            departmentName = "پشتیبانی",
        ),
        CustomerRow(
            id = "demo-u2",
            name = "علی رضایی",
            phone = "+98 555 010 1002",
            email = "ali.demo@example.com",
            status = "active",
            avatar = null,
            lastContactAt = "2026-08-18T08:15:00Z",
            totalConversations = 2,
            departmentName = "فروش",
        ),
        CustomerRow(
            id = "demo-u3",
            name = "نرگس احمدی",
            phone = "+98 555 010 1003",
            email = null,
            status = "active",
            avatar = null,
            lastContactAt = "2026-08-17T16:20:00Z",
            totalConversations = 3,
            departmentName = "پشتیبانی",
        ),
        CustomerRow(
            id = "demo-u4",
            name = "مهدی کریمی",
            phone = "+98 555 010 1004",
            email = null,
            status = "inactive",
            avatar = null,
            lastContactAt = "2026-08-12T10:00:00Z",
            totalConversations = 1,
            departmentName = "عملیات",
        ),
        CustomerRow(
            id = "demo-u5",
            name = "زهرا نوری",
            phone = "+98 555 010 1005",
            email = null,
            status = "active",
            avatar = null,
            lastContactAt = "2026-08-16T12:00:00Z",
            totalConversations = 1,
            departmentName = "پشتیبانی",
        ),
    )

    val announcements = listOf(
        AnnouncementRow(
            id = "demo-a1",
            title = "جلسه هماهنگی هفتگی",
            body = "فردا ساعت ۱۰ جلسهٔ کوتاه تیم در اتاق آنلاین برگزار می‌شود.",
            isImportant = true,
            targetType = "all",
            fromName = "مدیر دمو",
            createdAt = "2026-08-18T07:00:00Z",
            read = false,
            canDelete = false,
        ),
        AnnouncementRow(
            id = "demo-a2",
            title = "بروزرسانی پنل",
            body = "نسخهٔ جدید پورتال کارکنان آماده است. پس از ورود، یک‌بار از حساب خارج شوید و دوباره وارد شوید.",
            isImportant = false,
            targetType = "all",
            fromName = "سیستم",
            createdAt = "2026-08-17T09:00:00Z",
            read = true,
            canDelete = false,
        ),
    )
}
