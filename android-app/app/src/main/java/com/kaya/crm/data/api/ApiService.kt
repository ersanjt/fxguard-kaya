package com.kaya.crm.data.api

import com.kaya.crm.data.models.*
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    @GET("config")
    suspend fun getPublicConfig(): Response<PublicConfigResponse>

    // Auth
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): Response<LoginResponse>

    @POST("auth/totp/verify-login")
    suspend fun verifyTotp(@Body body: TotpRequest): Response<LoginResponse>

    @GET("auth/me")
    suspend fun getMe(): Response<UserResponse>

    @PATCH("users/me")
    suspend fun patchProfile(@Body body: PatchProfilePayload): Response<UserResponse>

    @Multipart
    @POST("upload")
    suspend fun uploadFile(@Part file: MultipartBody.Part): Response<UploadResponse>

    @GET("auth/totp/setup")
    suspend fun getTotpSetup(): Response<TotpSetupResponse>

    @POST("auth/totp/confirm-setup")
    suspend fun confirmTotpSetup(@Body body: TotpConfirmBody): Response<Map<String, Any>>

    @POST("auth/totp/disable")
    suspend fun disableTotp(@Body body: TotpDisableBody): Response<Map<String, Any>>

    @POST("auth/telegram-link-token")
    suspend fun requestTelegramLinkToken(): Response<TelegramLinkTokenResponse>

    @GET("auth/telegram-status")
    suspend fun getTelegramStatus(): Response<TelegramStatusResponse>

    @DELETE("auth/telegram-link")
    suspend fun unlinkTelegram(): Response<Map<String, Any>>

    @PATCH("auth/me/presence")
    suspend fun patchPresence(@Body body: PresenceBody): Response<Map<String, Any>>

    // Analytics / Dashboard
    @GET("analytics/dashboard")
    suspend fun getDashboard(): Response<DashboardResponse>

    // Conversations
    @GET("conversations")
    suspend fun getConversations(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50,
        @Query("status") status: String? = null,
        @Query("search") search: String? = null
    ): Response<ConversationsResponse>

    @GET("conversations/{id}/messages")
    suspend fun getMessages(
        @Path("id") conversationId: String,
        @Query("limit") limit: Int = 100,
        @Query("before") before: String? = null
    ): Response<MessagesResponse>

    @POST("conversations/{id}/read")
    suspend fun markConversationRead(@Path("id") conversationId: String): Response<Map<String, Any>>

    @POST("conversations/{id}/send")
    suspend fun sendMessage(
        @Path("id") conversationId: String,
        @Body body: SendMessageRequest
    ): Response<MessageItem>

    // Customers
    @GET("customers")
    suspend fun getCustomers(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50,
        @Query("search") search: String? = null,
        @Query("status") status: String? = null
    ): Response<CustomersResponse>

    @GET("customers/{id}")
    suspend fun getCustomer(@Path("id") id: String): Response<CustomerDetail>

    // Tickets
    @GET("tickets")
    suspend fun getTickets(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<TicketsResponse>

    // Tasks
    @GET("tasks")
    suspend fun getTasks(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50,
        @Query("status") status: String? = null
    ): Response<TasksResponse>

    // Announcements
    @GET("announcements/for-me")
    suspend fun getAnnouncements(): Response<AnnouncementsResponse>

    // Rates
    @GET("rates")
    suspend fun getRates(): Response<Map<String, Any>>

    // WhatsApp / Gateway status
    @GET("gateway/status")
    suspend fun getGatewayStatus(): Response<WhatsAppStatus>

    // Panel settings (public)
    @GET("panel-settings/public/branding")
    suspend fun getPublicBranding(): Response<PublicBrandingResponse>

    // چت داخلی سازمان
    @GET("internal/threads")
    suspend fun getInternalThreads(): Response<InternalThreadsResponse>

    @GET("internal/threads/{id}/messages")
    suspend fun getInternalMessages(@Path("id") threadId: String): Response<InternalMessagesResponse>

    @POST("internal/threads/{id}/messages")
    suspend fun sendInternalMessage(
        @Path("id") threadId: String,
        @Body body: SendInternalMessageRequest
    ): Response<InternalMessageItem>

    @POST("internal/threads")
    suspend fun createInternalThread(@Body body: CreateThreadRequest): Response<InternalThread>

    @GET("internal/users")
    suspend fun getInternalUsers(): Response<InternalUsersResponse>
}
