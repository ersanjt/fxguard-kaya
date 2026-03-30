package com.kaya.crm.data.models

import com.google.gson.annotations.SerializedName

// Auth
data class LoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class TotpRequest(
    @SerializedName("tempToken") val tempToken: String,
    @SerializedName("code") val code: String
)

data class LoginResponse(
    @SerializedName("token") val token: String? = null,
    @SerializedName("user") val user: UserResponse? = null,
    @SerializedName("needTotp") val needTotp: Boolean = false,
    @SerializedName("tempToken") val tempToken: String? = null,
    @SerializedName("error") val error: String? = null
)

data class UserResponse(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String?,
    @SerializedName("email") val email: String,
    @SerializedName("role") val role: String,
    @SerializedName("status") val status: String? = null,
    @SerializedName("departmentId") val departmentId: String? = null,
    @SerializedName("branchId") val branchId: String? = null,
    @SerializedName("permissions") val permissions: Map<String, Boolean>? = null
)

// Dashboard
data class DashboardResponse(
    @SerializedName("totalConversations") val totalConversations: Int = 0,
    @SerializedName("openConversations") val openConversations: Int = 0,
    @SerializedName("unreadConversations") val unreadConversations: Int = 0,
    @SerializedName("todayMessages") val todayMessages: Int = 0,
    @SerializedName("totalCustomers") val totalCustomers: Int = 0,
    @SerializedName("ticketsOpen") val ticketsOpen: Int = 0,
    @SerializedName("tasksPending") val tasksPending: Int = 0,
    @SerializedName("announcementsCount") val announcementsCount: Int = 0,
    @SerializedName("unreadAnnouncements") val unreadAnnouncements: Int = 0,
    @SerializedName("staffOnline") val staffOnline: Int = 0,
    @SerializedName("loginsToday") val loginsToday: Int = 0
)

// Conversations
data class ConversationsResponse(
    @SerializedName("data") val data: List<Conversation>? = null,
    @SerializedName("total") val total: Int = 0
)

data class Conversation(
    @SerializedName("id") val id: String,
    @SerializedName("status") val status: String,
    @SerializedName("priority") val priority: String?,
    @SerializedName("unreadCount") val unreadCount: Int = 0,
    @SerializedName("lastMessageAt") val lastMessageAt: String?,
    @SerializedName("lastMessagePreview") val lastMessagePreview: String? = null,
    @SerializedName("customer") val customer: CustomerBrief?,
    @SerializedName("assignee") val assignee: UserBrief?,
    @SerializedName("department") val department: DepartmentBrief?,
    @SerializedName("metadata") val metadata: ConversationMetadata? = null
) {
    val isGroup: Boolean get() = metadata?.isGroup == true
    val groupName: String? get() = metadata?.groupName
    val displayName: String get() = when {
        isGroup && !groupName.isNullOrBlank() -> groupName!!
        customer?.name?.isNotBlank() == true -> customer!!.name!!
        customer?.phone?.isNotBlank() == true -> customer!!.phone!!
        else -> "مشتری"
    }
}

data class ConversationMetadata(
    @SerializedName("isGroup") val isGroup: Boolean? = null,
    @SerializedName("groupName") val groupName: String? = null
)

data class CustomerBrief(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String?,
    @SerializedName("phone") val phone: String?,
    @SerializedName("profilePic") val profilePic: String? = null
)

data class UserBrief(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String?,
    @SerializedName("email") val email: String? = null,
    @SerializedName("username") val username: String? = null,
    @SerializedName("avatar") val avatar: String? = null
)

data class DepartmentBrief(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String?,
    @SerializedName("color") val color: String? = null
)

// Messages
data class MessagesResponse(
    @SerializedName("data") val data: List<MessageItem>? = null,
    @SerializedName("messages") val messages: List<MessageItem>? = null
)

data class MessageItem(
    @SerializedName("id") val id: String,
    @SerializedName("body") val body: String? = null,
    @SerializedName("content") val content: String? = null,
    @SerializedName("direction") val direction: String,
    @SerializedName("timestamp") val timestamp: String? = null,
    @SerializedName("userId") val userId: String? = null,
    @SerializedName("user") val user: UserBrief? = null,
    @SerializedName("mediaUrl") val mediaUrl: String? = null,
    @SerializedName("mediaType") val mediaType: String? = null,
    @SerializedName("hasMedia") val hasMedia: Boolean? = null,
    @SerializedName("mediaData") val mediaData: Map<String, Any>? = null
) {
    val displayContent: String get() = body ?: content ?: ""
}

data class SendMessageRequest(
    @SerializedName("content") val content: String,
    @SerializedName("type") val type: String? = "text",
    @SerializedName("media") val media: Map<String, Any>? = null
)

// Customers
data class CustomersResponse(
    @SerializedName("data") val data: List<CustomerItem>,
    @SerializedName("total") val total: Int = 0
)

data class CustomerItem(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String?,
    @SerializedName("phone") val phone: String?,
    @SerializedName("email") val email: String? = null,
    @SerializedName("status") val status: String? = null,
    @SerializedName("lastContactAt") val lastContactAt: String? = null
)

data class CustomerDetail(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String?,
    @SerializedName("phone") val phone: String?,
    @SerializedName("email") val email: String? = null,
    @SerializedName("status") val status: String? = null
)

// Tickets
data class TicketsResponse(
    @SerializedName("data") val data: List<TicketItem>? = null,
    @SerializedName("tickets") val tickets: List<TicketItem>? = null,
    @SerializedName("total") val total: Int = 0
)

data class TicketItem(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String?,
    @SerializedName("subject") val subject: String? = null,
    @SerializedName("status") val status: String,
    @SerializedName("priority") val priority: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null
) {
    val displayTitle: String get() = title ?: subject ?: "تیکت"
}

// Tasks
data class TasksResponse(
    @SerializedName("data") val data: List<TaskItem>? = null,
    @SerializedName("tasks") val tasks: List<TaskItem>? = null,
    @SerializedName("total") val total: Int = 0
)

data class TaskItem(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String?,
    @SerializedName("description") val description: String? = null,
    @SerializedName("status") val status: String,
    @SerializedName("priority") val priority: String? = null,
    @SerializedName("dueAt") val dueAt: String? = null,
    @SerializedName("dueDate") val dueDate: String? = null
)

// Announcements
data class AnnouncementsResponse(
    @SerializedName("data") val data: List<Announcement>
)

data class Announcement(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String?,
    @SerializedName("body") val body: String?,
    @SerializedName("createdAt") val createdAt: String? = null,
    @SerializedName("read") val read: Boolean? = false
)

// Rates - API returns object with currency keys
data class RatesResponse(
    @SerializedName("data") val data: Map<String, RateValue>? = null
)

data class RateValue(
    @SerializedName("buy") val buy: Double? = null,
    @SerializedName("sell") val sell: Double? = null,
    @SerializedName("key") val key: String? = null,
    @SerializedName("label") val label: String? = null
)

data class Rate(
    val key: String,
    val label: String?,
    val buy: Double?,
    val sell: Double?
)

// چت داخلی سازمان
data class InternalThreadsResponse(
    @SerializedName("data") val data: List<InternalThreadBrief>
)

data class InternalThreadBrief(
    @SerializedName("id") val id: String,
    @SerializedName("lastMessageAt") val lastMessageAt: String?,
    @SerializedName("lastMessage") val lastMessage: InternalLastMessage?,
    @SerializedName("participants") val participants: List<UserBrief>
)

data class InternalLastMessage(
    @SerializedName("content") val content: String?,
    @SerializedName("fromUser") val fromUser: UserBrief?
)

data class InternalMessagesResponse(
    @SerializedName("data") val data: List<InternalMessageItem>
)

data class InternalMessageItem(
    @SerializedName("id") val id: String,
    @SerializedName("content") val content: String,
    @SerializedName("fromUserId") val fromUserId: String,
    @SerializedName("fromUser") val fromUser: UserBrief?,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class SendInternalMessageRequest(
    @SerializedName("content") val content: String
)

data class CreateThreadRequest(
    @SerializedName("userIds") val userIds: List<String>
)

data class InternalThread(
    @SerializedName("id") val id: String,
    @SerializedName("participants") val participants: List<UserBrief>? = null
)

data class InternalUsersResponse(
    @SerializedName("data") val data: List<UserBrief>
)

// WhatsApp / Gateway
data class WhatsAppStatus(
    @SerializedName("whatsapp") val whatsapp: Boolean? = false,
    @SerializedName("connected") val connected: Boolean? = null,
    @SerializedName("status") val status: String? = null,
    @SerializedName("phone") val phone: String? = null
) {
    val isConnected: Boolean get() = connected == true || whatsapp == true || status == "connected"
}

// Panel Settings (public)
data class PublicBrandingResponse(
    @SerializedName("iosAppUrl") val iosAppUrl: String? = null,
    @SerializedName("androidAppUrl") val androidAppUrl: String? = null
)
