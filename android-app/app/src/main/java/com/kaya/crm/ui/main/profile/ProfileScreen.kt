package com.kaya.crm.ui.main.profile

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.kaya.crm.BuildConfig
import com.kaya.crm.data.ApiConfig
import com.kaya.crm.data.models.TelegramLinkTokenResponse
import com.kaya.crm.data.models.TelegramStatusResponse
import com.kaya.crm.data.models.UserResponse
import com.kaya.crm.data.models.WhatsAppStatus
import com.kaya.crm.update.AppUpdateViewModel

private fun resolveAppLink(raw: String, base: String): String {
    val s = raw.trim()
    if (s.isEmpty()) return s
    if (s.startsWith("http://", ignoreCase = true) ||
        s.startsWith("https://", ignoreCase = true) ||
        s.startsWith("itms-services://", ignoreCase = true) ||
        s.startsWith("market://", ignoreCase = true) ||
        s.startsWith("intent:", ignoreCase = true)
    ) return s
    return if (s.startsWith("/")) base.trimEnd('/') + s else s
}

/** آدرس کامل برای تصویر پروفایل (نسبی یا مطلق) */
fun absoluteFromApiPath(path: String?, baseApi: String): String? {
    if (path.isNullOrBlank()) return null
    if (path.startsWith("http://", true) || path.startsWith("https://", true)) return path
    val origin = baseApi.trimEnd('/').removeSuffix("/api").removeSuffix("/api/")
    return origin + if (path.startsWith("/")) path else "/$path"
}

@OptIn(ExperimentalMaterialApi::class, ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onLogout: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val user by viewModel.user.collectAsState()
    val publicBranding by viewModel.publicBranding.collectAsState()
    val savedServerUrl by viewModel.savedServerUrl.collectAsState(initial = null)
    val gatewayStatus by viewModel.gatewayStatus.collectAsState()
    val gatewayError by viewModel.gatewayError.collectAsState()
    val profileError by viewModel.profileError.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val refreshing by viewModel.refreshing.collectAsState()
    val saveMessage by viewModel.saveMessage.collectAsState()
    val saving by viewModel.saving.collectAsState()
    val uploadingAvatar by viewModel.uploadingAvatar.collectAsState()
    val totpSetup by viewModel.totpSetup.collectAsState()
    val totpBusy by viewModel.totpBusy.collectAsState()
    val telegramStatus by viewModel.telegramStatus.collectAsState()
    val telegramToken by viewModel.telegramToken.collectAsState()
    val telegramBusy by viewModel.telegramBusy.collectAsState()
    val appUpdateViewModel: AppUpdateViewModel = hiltViewModel()
    var showServerDialog by remember { mutableStateOf(false) }
    var showDisableTotp by remember { mutableStateOf(false) }
    var disableTotpPassword by remember { mutableStateOf("") }
    var totpConfirmCode by remember { mutableStateOf("") }

    var username by remember { mutableStateOf("") }
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var dateOfBirth by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var avatarUrl by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var adminEmail by remember { mutableStateOf("") }

    LaunchedEffect(user?.id, user?.email, user?.avatar) {
        val u = user ?: return@LaunchedEffect
        username = u.username.orEmpty()
        firstName = u.firstName.orEmpty()
        lastName = u.lastName.orEmpty()
        dateOfBirth = u.dateOfBirth.orEmpty()
        phone = u.phone.orEmpty()
        avatarUrl = u.avatar.orEmpty()
        adminEmail = u.email
    }

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(saveMessage) {
        val m = saveMessage ?: return@LaunchedEffect
        snackbarHostState.showSnackbar(m)
        viewModel.clearSaveMessage()
    }

    val iosUrlRaw = publicBranding?.iosAppUrl?.trim().orEmpty()
    val androidUrlRaw = publicBranding?.androidAppUrl?.trim().orEmpty()
    val baseForLinks = savedServerUrl?.trim()?.takeIf { it.isNotBlank() } ?: ApiConfig.BASE_URL
    val iosUrl = iosUrlRaw.takeIf { it.isNotBlank() }?.let { resolveAppLink(it, baseForLinks) }.orEmpty()
    val androidUrl = androidUrlRaw.takeIf { it.isNotBlank() }?.let { resolveAppLink(it, baseForLinks) }.orEmpty()
    val baseApi = (savedServerUrl?.trim()?.takeIf { it.isNotBlank() } ?: ApiConfig.BASE_URL)
        .trimEnd('/') + "/api/"

    val pickImage = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) viewModel.uploadAvatar(uri)
    }

    val onRefresh = { viewModel.refreshAll(initial = false) }
    val pullRefreshState = rememberPullRefreshState(refreshing, onRefresh)

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .pullRefresh(pullRefreshState)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp)
            ) {
                Text(
                    text = "پروفایل من",
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                Text(
                    text = "نام کاربری، نام، نام خانوادگی، تاریخ تولد، تلفن و تصویر را می‌توانید ویرایش کنید. ایمیل و دپارتمان توسط مدیر تنظیم می‌شود مگر دسترسی مدیریت کاربران داشته باشید.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                if (profileError != null) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                profileError!!,
                                modifier = Modifier.weight(1f),
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                style = MaterialTheme.typography.bodySmall
                            )
                            TextButton(onClick = { viewModel.clearProfileError(); viewModel.refreshAll(initial = false) }) {
                                Text("تلاش مجدد")
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                }

                if (loading && user == null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }

                user?.let { u ->
                    ProfileHeaderCard(u = u, avatarUrlResolved = absoluteFromApiPath(u.avatar, baseApi))
                    Spacer(modifier = Modifier.height(16.dp))

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("اطلاعات فقط‌خواندنی", style = MaterialTheme.typography.titleMedium)
                            Spacer(modifier = Modifier.height(8.dp))
                            ProfileRow("ایمیل", u.email)
                            Spacer(modifier = Modifier.height(8.dp))
                            ProfileRow(
                                "دپارتمان",
                                u.department?.name ?: u.departmentId?.takeIf { it.isNotBlank() } ?: "—"
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("اطلاعات قابل ویرایش", style = MaterialTheme.typography.titleMedium)
                            Spacer(modifier = Modifier.height(12.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                OutlinedButton(
                                    onClick = {
                                        pickImage.launch(
                                            ActivityResultContracts.PickVisualMediaRequest(
                                                ActivityResultContracts.PickVisualMedia.ImageOnly
                                            )
                                        )
                                    },
                                    enabled = !uploadingAvatar && !saving,
                                    modifier = Modifier.weight(1f)
                                ) {
                                    if (uploadingAvatar) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(20.dp),
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Icon(Icons.Default.PhotoCamera, contentDescription = null)
                                        Spacer(Modifier.width(8.dp))
                                        Text("تصویر از گالری")
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            OutlinedTextField(
                                value = username,
                                onValueChange = { username = it },
                                label = { Text("نام کاربری (اختیاری)") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                enabled = !saving
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = firstName,
                                onValueChange = { firstName = it },
                                label = { Text("نام") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                enabled = !saving
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = lastName,
                                onValueChange = { lastName = it },
                                label = { Text("نام خانوادگی") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                enabled = !saving
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = dateOfBirth,
                                onValueChange = { dateOfBirth = it },
                                label = { Text("تاریخ تولد (YYYY-MM-DD)") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                enabled = !saving
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = phone,
                                onValueChange = { phone = it },
                                label = { Text("تلفن") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                enabled = !saving
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = avatarUrl,
                                onValueChange = { avatarUrl = it },
                                label = { Text("آدرس URL تصویر (اختیاری)") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = false,
                                minLines = 2,
                                enabled = !saving
                            )
                            if (u.permissions?.get("manage_users") == true) {
                                Spacer(modifier = Modifier.height(8.dp))
                                OutlinedTextField(
                                    value = adminEmail,
                                    onValueChange = { adminEmail = it },
                                    label = { Text("ایمیل (قابل ویرایش برای مدیر)") },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true,
                                    enabled = !saving
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = newPassword,
                                onValueChange = { newPassword = it },
                                label = { Text("رمز عبور جدید (در صورت تمایل)") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                enabled = !saving
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = {
                                    viewModel.saveProfile(
                                        username = username,
                                        firstName = firstName,
                                        lastName = lastName,
                                        dateOfBirth = dateOfBirth,
                                        phone = phone,
                                        avatarUrl = avatarUrl,
                                        newPassword = newPassword,
                                        adminEmail = if (u.permissions?.get("manage_users") == true) adminEmail else null
                                    )
                                    newPassword = ""
                                },
                                modifier = Modifier.fillMaxWidth(),
                                enabled = !saving
                            ) {
                                if (saving) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(22.dp),
                                        color = MaterialTheme.colorScheme.onPrimary,
                                        strokeWidth = 2.dp
                                    )
                                } else {
                                    Text("ذخیره تغییرات")
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    TotpSection(
                        totpEnabled = u.totpEnabled == true,
                        totpBusy = totpBusy,
                        onEnableClick = { viewModel.startTotpSetup() },
                        onDisableClick = { showDisableTotp = true }
                    )

                    Spacer(modifier = Modifier.height(16.dp))
                    TelegramSection(
                        status = telegramStatus,
                        token = telegramToken,
                        busy = telegramBusy,
                        onGenerate = { viewModel.generateTelegramToken() },
                        onUnlink = { viewModel.unlinkTelegram() },
                        onCopy = { line ->
                            clipboard.setText(AnnotatedString(line))
                        },
                        onOpenBot = { url ->
                            runCatching {
                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                            }
                        }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))
                GatewayCard(gatewayStatus, gatewayError)

                Spacer(modifier = Modifier.height(16.dp))
                ServerUrlCard(
                    savedServerUrl = savedServerUrl,
                    onChangeClick = { showServerDialog = true }
                )

                Spacer(modifier = Modifier.height(16.dp))
                AppUpdateCard(appUpdateViewModel)

                if (iosUrl.isNotBlank() || androidUrl.isNotBlank()) {
                    Spacer(modifier = Modifier.height(16.dp))
                    StoreLinksCard(iosUrl, androidUrl, context)
                }

                Spacer(modifier = Modifier.height(32.dp))
                Button(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    shape = MaterialTheme.shapes.medium
                ) {
                    Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("خروج")
                }
            }

            PullRefreshIndicator(
                refreshing = refreshing,
                state = pullRefreshState,
                modifier = Modifier.align(Alignment.TopCenter)
            )
        }
    }

    totpSetup?.let { setup ->
        AlertDialog(
            onDismissRequest = { viewModel.clearTotpSetup(); totpConfirmCode = "" },
            title = { Text("فعال‌سازی Google Authenticator") },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    Text(
                        "کد QR را در اپ اسکن کنید یا کلید را دستی وارد کنید.",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    setup.qrCode?.let { qr ->
                        AsyncImage(
                            model = qr,
                            contentDescription = "QR",
                            modifier = Modifier
                                .size(200.dp)
                                .align(Alignment.CenterHorizontally),
                            contentScale = ContentScale.Fit
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    setup.secret?.let { sec ->
                        Text("کلید: $sec", style = MaterialTheme.typography.labelSmall)
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                    OutlinedTextField(
                        value = totpConfirmCode,
                        onValueChange = { totpConfirmCode = it },
                        label = { Text("کد شش‌رقمی") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.confirmTotp(totpConfirmCode)
                        totpConfirmCode = ""
                    },
                    enabled = !totpBusy && totpConfirmCode.replace(Regex("\\s"), "").length == 6
                ) {
                    Text("تأیید")
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.clearTotpSetup(); totpConfirmCode = "" }) {
                    Text("انصراف")
                }
            }
        )
    }

    if (showDisableTotp) {
        AlertDialog(
            onDismissRequest = { showDisableTotp = false; disableTotpPassword = "" },
            title = { Text("غیرفعال کردن احراز دو مرحله‌ای") },
            text = {
                OutlinedTextField(
                    value = disableTotpPassword,
                    onValueChange = { disableTotpPassword = it },
                    label = { Text("رمز عبور فعلی") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.disableTotp(disableTotpPassword)
                        showDisableTotp = false
                        disableTotpPassword = ""
                    },
                    enabled = disableTotpPassword.isNotBlank() && !totpBusy
                ) {
                    Text("غیرفعال کن")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDisableTotp = false; disableTotpPassword = "" }) {
                    Text("انصراف")
                }
            }
        )
    }

    if (showServerDialog) {
        ServerUrlDialog(
            currentUrl = savedServerUrl?.trim()?.ifBlank { null } ?: ApiConfig.BASE_URL,
            onDismiss = { showServerDialog = false },
            onSave = { url ->
                viewModel.setServerUrl(url)
                showServerDialog = false
            }
        )
    }
}

@Composable
private fun RoleBadge(text: String) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.secondaryContainer
    ) {
        Text(
            text,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium
        )
    }
}

@Composable
private fun ProfileHeaderCard(u: UserResponse, avatarUrlResolved: String?) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (!avatarUrlResolved.isNullOrBlank()) {
                AsyncImage(
                    model = avatarUrlResolved,
                    contentDescription = null,
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
            } else {
                Surface(
                    modifier = Modifier.size(72.dp),
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            (u.name?.firstOrNull() ?: u.email.firstOrNull() ?: '?').toString().uppercase(),
                            style = MaterialTheme.typography.headlineSmall
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(u.name ?: u.email, style = MaterialTheme.typography.titleLarge)
                u.username?.takeIf { it.isNotBlank() }?.let {
                    Text("@$it", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                }
                Text(u.email, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    RoleBadge(u.role)
                    u.branch?.name?.let { bn -> RoleBadge(bn) }
                }
                u.lastLoginAt?.takeIf { it.isNotBlank() }?.let { t ->
                    val short = if (t.length >= 16) t.replace('T', ' ').take(16) else t
                    Text("آخرین ورود: $short", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun TotpSection(
    totpEnabled: Boolean,
    totpBusy: Boolean,
    onEnableClick: () -> Unit,
    onDisableClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("احراز هویت دو مرحله‌ای", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                "ورود امن‌تر با Google Authenticator؛ از همین‌جا فعال یا غیرفعال کنید.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                if (totpEnabled) "وضعیت: فعال" else "وضعیت: غیرفعال",
                style = MaterialTheme.typography.bodyLarge,
                color = if (totpEnabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(12.dp))
            if (!totpEnabled) {
                Button(onClick = onEnableClick, enabled = !totpBusy) {
                    if (totpBusy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Text("فعال‌سازی")
                }
            } else {
                OutlinedButton(onClick = onDisableClick, enabled = !totpBusy) {
                    Text("غیرفعال کردن (نیاز به رمز)")
                }
            }
        }
    }
}

@Composable
private fun TelegramSection(
    status: TelegramStatusResponse?,
    token: TelegramLinkTokenResponse?,
    busy: Boolean,
    onGenerate: () -> Unit,
    onUnlink: () -> Unit,
    onCopy: (String) -> Unit,
    onOpenBot: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("اتصال به بات تلگرام", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                "کد اتصال را در بات بفرستید یا از لینک مستقیم استفاده کنید.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))
            val linked = status?.linked == true
            Text(
                if (linked) "وضعیت: متصل" else "وضعیت: غیرمتصل",
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onGenerate, enabled = !busy) {
                    if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Text("دریافت کد اتصال")
                }
                if (linked) {
                    OutlinedButton(onClick = onUnlink, enabled = !busy) {
                        Text("قطع اتصال")
                    }
                }
            }
            token?.token?.let { t ->
                Spacer(modifier = Modifier.height(12.dp))
                Text("دستور (۱۵ دقیقه اعتبار):", style = MaterialTheme.typography.labelMedium)
                Surface(
                    tonalElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        "/link $t",
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(onClick = { onCopy("/link $t") }) { Text("کپی دستور") }
                    token.botUrl?.takeIf { it.isNotBlank() }?.let { url ->
                        TextButton(onClick = { onOpenBot(url) }) { Text("باز کردن بات") }
                    }
                }
                token.instruction?.takeIf { it.isNotBlank() }?.let { ins ->
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(ins, style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

@Composable
private fun GatewayCard(
    gatewayStatus: WhatsAppStatus?,
    gatewayError: String?
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("وضعیت واتساپ / Gateway", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            when {
                gatewayError != null -> Text(gatewayError, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                gatewayStatus != null -> {
                    val g = gatewayStatus
                    val ok = g.isConnected
                    Text(
                        if (ok) "متصل" else "غیرمتصل",
                        color = if (ok) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyLarge
                    )
                    g.phone?.takeIf { it.isNotBlank() }?.let { ph ->
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("شماره: $ph", style = MaterialTheme.typography.bodySmall)
                    }
                    g.status?.takeIf { it.isNotBlank() }?.let { st ->
                        Text(st, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                else -> Text("—", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun ServerUrlCard(savedServerUrl: String?, onChangeClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.Settings, contentDescription = null)
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("آدرس سرور", style = MaterialTheme.typography.labelMedium)
                Text(
                    savedServerUrl?.takeIf { it.isNotBlank() } ?: ApiConfig.BASE_URL,
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 2
                )
            }
            TextButton(onClick = onChangeClick) { Text("تغییر") }
        }
    }
}

@Composable
private fun AppUpdateCard(appUpdateViewModel: AppUpdateViewModel) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("به‌روزرسانی اپ", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "نسخهٔ نصب‌شده: ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = { appUpdateViewModel.checkManual() },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("بررسی به‌روزرسانی از سرور")
            }
        }
    }
}

@Composable
private fun StoreLinksCard(iosUrl: String, androidUrl: String, context: Context) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("دانلود اپ موبایل", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            if (iosUrl.isNotBlank()) {
                OutlinedButton(
                    onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(iosUrl))) } },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("دانلود iOS") }
            }
            if (androidUrl.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(androidUrl))) } },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("دانلود Android") }
            }
        }
    }
}

@Composable
private fun ProfileRow(label: String, value: String) {
    Column {
        Text(label, style = MaterialTheme.typography.labelMedium)
        Text(value, style = MaterialTheme.typography.bodyLarge)
    }
}

@Composable
private fun ServerUrlDialog(
    currentUrl: String,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    var url by remember { mutableStateOf(currentUrl) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("آدرس سرور") },
        text = {
            Column {
                Text(
                    "برای اعمال تغییرات، اپ را ببندید و دوباره باز کنید.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    label = { Text("مثال: https://kaya.fxguard.io") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onSave(url.trim()) }) { Text("ذخیره") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("انصراف") }
        }
    )
}
