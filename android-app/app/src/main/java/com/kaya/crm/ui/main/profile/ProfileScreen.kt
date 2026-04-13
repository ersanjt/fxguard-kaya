package com.kaya.crm.ui.main.profile

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.OpenInNew
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
import androidx.compose.ui.platform.LocalClipboard
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.toClipEntry
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import com.kaya.crm.BuildConfig
import com.kaya.crm.data.ApiConfig
import com.kaya.crm.data.models.TelegramLinkTokenResponse
import com.kaya.crm.data.models.TelegramStatusResponse
import com.kaya.crm.data.models.UserResponse
import com.kaya.crm.data.models.WhatsAppStatus
import com.kaya.crm.ui.main.permissions.canShowDashboardCard
import com.kaya.crm.ui.util.MediaUrlResolve
import com.kaya.crm.R
import com.kaya.crm.update.AppUpdateViewModel
import androidx.compose.ui.res.stringResource

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

@OptIn(ExperimentalMaterialApi::class, ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    hiddenPanelPages: Set<String> = emptySet(),
    onLogout: () -> Unit,
    appUpdateViewModel: AppUpdateViewModel,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val clipboard = LocalClipboard.current
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
    val presenceBusy by viewModel.presenceBusy.collectAsState()
    val appLocale by viewModel.appLocale.collectAsState()
    val clipTelegramCmd = stringResource(R.string.clipboard_telegram_command_copied)
    val clipTelegramToken = stringResource(R.string.clipboard_telegram_token_copied)
    val clipTotpSecret = stringResource(R.string.clipboard_totp_secret_copied)
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
    val scope = rememberCoroutineScope()

    fun copyToClipboard(label: String, text: String) {
        scope.launch {
            clipboard.setClipEntry(ClipData.newPlainText("kaya", text).toClipEntry())
            snackbarHostState.showSnackbar(label)
        }
    }

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

    val pickImage = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
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
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = stringResource(R.string.language_label),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    FilterChip(
                        selected = appLocale != "fa",
                        onClick = { viewModel.setAppLocale("en") },
                        label = { Text(stringResource(R.string.language_english)) }
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    FilterChip(
                        selected = appLocale == "fa",
                        onClick = { viewModel.setAppLocale("fa") },
                        label = { Text(stringResource(R.string.language_farsi)) }
                    )
                }
                Text(
                    text = stringResource(R.string.profile_title),
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                Text(
                    text = stringResource(R.string.profile_intro),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                val profileErr = profileError
                if (profileErr != null) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                profileErr,
                                modifier = Modifier.weight(1f),
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                style = MaterialTheme.typography.bodySmall
                            )
                            TextButton(onClick = { viewModel.clearProfileError(); viewModel.refreshAll(initial = false) }) {
                                Text(stringResource(R.string.retry))
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
                    val serverRoot = baseForLinks.trimEnd('/')
                    ProfileHeaderCard(
                        u = u,
                        avatarUrlResolved = u.avatar?.let { raw ->
                            MediaUrlResolve.profilePicDisplayUrl(raw, serverRoot)
                        }
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(stringResource(R.string.profile_readonly), style = MaterialTheme.typography.titleMedium)
                            Spacer(modifier = Modifier.height(8.dp))
                            ProfileRow(stringResource(R.string.email), u.email)
                            Spacer(modifier = Modifier.height(8.dp))
                            ProfileRow(
                                stringResource(R.string.department),
                                u.department?.name ?: u.departmentId?.takeIf { it.isNotBlank() }
                                    ?: stringResource(R.string.placeholder_em_dash)
                            )
                            u.lastLoginAt?.takeIf { it.isNotBlank() }?.let { last ->
                                Spacer(modifier = Modifier.height(8.dp))
                                ProfileRow(stringResource(R.string.last_login), last)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    ProfilePresenceCard(
                        currentStatus = u.status,
                        busy = presenceBusy,
                        onSelect = { viewModel.setPresenceStatus(it) }
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(stringResource(R.string.profile_editable), style = MaterialTheme.typography.titleMedium)
                            Spacer(modifier = Modifier.height(12.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                OutlinedButton(
                                    onClick = { pickImage.launch("image/*") },
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
                                        Text(stringResource(R.string.photo_from_gallery))
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            OutlinedTextField(
                                value = username,
                                onValueChange = { username = it },
                                label = { Text(stringResource(R.string.field_username)) },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                enabled = !saving
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = firstName,
                                onValueChange = { firstName = it },
                                label = { Text(stringResource(R.string.field_first_name)) },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                enabled = !saving
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = lastName,
                                onValueChange = { lastName = it },
                                label = { Text(stringResource(R.string.field_last_name)) },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                enabled = !saving
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = dateOfBirth,
                                onValueChange = { dateOfBirth = it },
                                label = { Text(stringResource(R.string.field_dob)) },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                enabled = !saving
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = phone,
                                onValueChange = { phone = it },
                                label = { Text(stringResource(R.string.field_phone)) },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                enabled = !saving
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = avatarUrl,
                                onValueChange = { avatarUrl = it },
                                label = { Text(stringResource(R.string.field_avatar_url)) },
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
                                    label = { Text(stringResource(R.string.field_email_admin)) },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true,
                                    enabled = !saving
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = newPassword,
                                onValueChange = { newPassword = it },
                                label = { Text(stringResource(R.string.field_new_password)) },
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
                                    Text(stringResource(R.string.save_changes))
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
                        onCopyCommand = { copyToClipboard(clipTelegramCmd, it) },
                        onCopyTokenOnly = { copyToClipboard(clipTelegramToken, it) },
                        onOpenBot = { url ->
                            runCatching {
                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                            }
                        }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))
                val showGateway = user == null ||
                    canShowDashboardCard(user, "whatsapp", "whatsapp", hiddenPanelPages)
                if (showGateway) {
                    GatewayCard(gatewayStatus, gatewayError)
                    Spacer(modifier = Modifier.height(16.dp))
                }

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
                    Text(stringResource(R.string.sign_out))
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
            title = { Text(stringResource(R.string.totp_setup_title)) },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    setup.error?.takeIf { it.isNotBlank() }?.let { err ->
                        Text(
                            err,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    Text(
                        text = stringResource(R.string.totp_setup_instructions),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    setup.qrCode?.let { qr ->
                        AsyncImage(
                            model = qr,
                            contentDescription = stringResource(R.string.totp_qr_cd),
                            modifier = Modifier
                                .size(200.dp)
                                .align(Alignment.CenterHorizontally),
                            contentScale = ContentScale.Fit
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    setup.secret?.let { sec ->
                        OutlinedTextField(
                            value = sec,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text(stringResource(R.string.totp_secret_label)) },
                            textStyle = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace),
                            modifier = Modifier.fillMaxWidth(),
                            trailingIcon = {
                                IconButton(
                                    onClick = {
                                        copyToClipboard(clipTotpSecret, sec)
                                    }
                                ) {
                                    Icon(
                                        Icons.Default.ContentCopy,
                                        contentDescription = stringResource(R.string.cd_copy_totp_secret)
                                    )
                                }
                            }
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedButton(
                            onClick = { copyToClipboard(clipTotpSecret, sec) },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(stringResource(R.string.totp_copy_secret))
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                    OutlinedTextField(
                        value = totpConfirmCode,
                        onValueChange = { v -> totpConfirmCode = v.filter { ch -> ch.isDigit() }.take(6) },
                        label = { Text(stringResource(R.string.totp_code_from_app)) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
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
                    Text(stringResource(R.string.totp_confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.clearTotpSetup(); totpConfirmCode = "" }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        )
    }

    if (showDisableTotp) {
        AlertDialog(
            onDismissRequest = { showDisableTotp = false; disableTotpPassword = "" },
            title = { Text(stringResource(R.string.totp_disable_title)) },
            text = {
                OutlinedTextField(
                    value = disableTotpPassword,
                    onValueChange = { disableTotpPassword = it },
                    label = { Text(stringResource(R.string.totp_current_password)) },
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
                    Text(stringResource(R.string.totp_disable_action))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDisableTotp = false; disableTotpPassword = "" }) {
                    Text(stringResource(R.string.cancel))
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
private fun ProfilePresenceCard(
    currentStatus: String?,
    busy: Boolean,
    onSelect: (String) -> Unit
) {
    val normalized = currentStatus?.trim()?.lowercase()?.takeIf { it.isNotEmpty() } ?: "online"
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(stringResource(R.string.presence_title), style = MaterialTheme.typography.titleMedium)
            Text(
                stringResource(R.string.presence_subtitle),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)
            ) {
                PresenceFilterChip("online", stringResource(R.string.presence_online), normalized, busy, onSelect)
                PresenceFilterChip("away", stringResource(R.string.presence_away), normalized, busy, onSelect)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)
            ) {
                PresenceFilterChip("busy", stringResource(R.string.presence_busy), normalized, busy, onSelect)
                PresenceFilterChip("offline", stringResource(R.string.presence_offline), normalized, busy, onSelect)
            }
            if (busy) {
                Spacer(modifier = Modifier.height(8.dp))
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun PresenceFilterChip(
    id: String,
    label: String,
    current: String,
    busy: Boolean,
    onSelect: (String) -> Unit
) {
    FilterChip(
        selected = current == id,
        onClick = { onSelect(id) },
        label = { Text(label) },
        enabled = !busy
    )
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
                    Text(
                        stringResource(R.string.last_login_inline, short),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
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
            Text(stringResource(R.string.totp_section_title), style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                stringResource(R.string.totp_section_intro),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                stringResource(
                    R.string.totp_status_line,
                    stringResource(if (totpEnabled) R.string.totp_state_on else R.string.totp_state_off)
                ),
                style = MaterialTheme.typography.bodyLarge,
                color = if (totpEnabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(12.dp))
            if (!totpEnabled) {
                Button(onClick = onEnableClick, enabled = !totpBusy) {
                    if (totpBusy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Text(stringResource(R.string.totp_activate))
                }
            } else {
                OutlinedButton(onClick = onDisableClick, enabled = !totpBusy) {
                    Text(stringResource(R.string.totp_disable_need_password))
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
    onCopyCommand: (String) -> Unit,
    onCopyTokenOnly: (String) -> Unit,
    onOpenBot: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(stringResource(R.string.telegram_title), style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                stringResource(R.string.telegram_section_intro),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))
            val linked = status?.linked == true
            Text(
                stringResource(
                    R.string.telegram_status_line,
                    stringResource(if (linked) R.string.telegram_state_linked else R.string.telegram_state_not_linked)
                ),
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onGenerate, enabled = !busy) {
                    if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Text(stringResource(R.string.telegram_get_code))
                }
                if (linked) {
                    OutlinedButton(onClick = onUnlink, enabled = !busy) {
                        Text(stringResource(R.string.telegram_unlink))
                    }
                }
            }
            token?.token?.let { t ->
                val fullCommand = "/link $t"
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = fullCommand,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text(stringResource(R.string.telegram_command_label)) },
                    textStyle = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace),
                    modifier = Modifier.fillMaxWidth(),
                    trailingIcon = {
                        IconButton(onClick = { onCopyCommand(fullCommand) }) {
                            Icon(Icons.Default.ContentCopy, contentDescription = stringResource(R.string.cd_copy_full_command))
                        }
                    }
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = { onCopyCommand(fullCommand) },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(stringResource(R.string.telegram_copy_cmd), maxLines = 1)
                    }
                    OutlinedButton(
                        onClick = { onCopyTokenOnly(t) },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(stringResource(R.string.telegram_copy_code_only), maxLines = 1)
                    }
                }
                token.botUrl?.takeIf { it.isNotBlank() }?.let { url ->
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = { onOpenBot(url) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.telegram_open_bot))
                    }
                }
                token.instruction?.takeIf { it.isNotBlank() }?.let { ins ->
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(ins, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
            Text(stringResource(R.string.gateway_title), style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            when {
                gatewayError != null -> Text(gatewayError, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                gatewayStatus != null -> {
                    val g = gatewayStatus
                    val ok = g.isConnected
                    Text(
                        stringResource(if (ok) R.string.gateway_state_connected else R.string.gateway_state_disconnected),
                        color = if (ok) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyLarge
                    )
                    g.phone?.takeIf { it.isNotBlank() }?.let { ph ->
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(stringResource(R.string.gateway_phone, ph), style = MaterialTheme.typography.bodySmall)
                    }
                    g.status?.takeIf { it.isNotBlank() }?.let { st ->
                        Text(st, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                else -> Text(stringResource(R.string.placeholder_em_dash), style = MaterialTheme.typography.bodySmall)
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
                Text(stringResource(R.string.server_address), style = MaterialTheme.typography.labelMedium)
                Text(
                    savedServerUrl?.takeIf { it.isNotBlank() } ?: ApiConfig.BASE_URL,
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 2
                )
            }
            TextButton(onClick = onChangeClick) { Text(stringResource(R.string.change)) }
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
            Text(stringResource(R.string.app_update_title), style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                stringResource(R.string.app_version_installed, BuildConfig.VERSION_NAME, BuildConfig.VERSION_CODE),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = { appUpdateViewModel.checkManual() },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(stringResource(R.string.check_update))
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
            Text(stringResource(R.string.mobile_download_title), style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            if (iosUrl.isNotBlank()) {
                OutlinedButton(
                    onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(iosUrl))) } },
                    modifier = Modifier.fillMaxWidth()
                ) { Text(stringResource(R.string.download_ios)) }
            }
            if (androidUrl.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(androidUrl))) } },
                    modifier = Modifier.fillMaxWidth()
                ) { Text(stringResource(R.string.download_android)) }
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
        title = { Text(stringResource(R.string.server_url_title)) },
        text = {
            Column {
                Text(
                    text = stringResource(R.string.server_url_apply_note),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    label = { Text(stringResource(R.string.server_url_example_label)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onSave(url.trim()) }) { Text(stringResource(R.string.save)) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) }
        }
    )
}
