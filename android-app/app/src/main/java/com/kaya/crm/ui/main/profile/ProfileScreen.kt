package com.kaya.crm.ui.main.profile

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.kaya.crm.BuildConfig
import com.kaya.crm.data.ApiConfig
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

@Composable
fun ProfileScreen(
    onLogout: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val user by viewModel.user.collectAsState()
    val publicBranding by viewModel.publicBranding.collectAsState()
    val savedServerUrl by viewModel.savedServerUrl.collectAsState(initial = null)
    val appUpdateViewModel: AppUpdateViewModel = hiltViewModel()
    var showServerDialog by remember { mutableStateOf(false) }
    val iosUrlRaw = publicBranding?.iosAppUrl?.trim().orEmpty()
    val androidUrlRaw = publicBranding?.androidAppUrl?.trim().orEmpty()
    val baseForLinks = savedServerUrl?.trim()?.takeIf { it.isNotBlank() } ?: ApiConfig.BASE_URL
    val iosUrl = iosUrlRaw.takeIf { it.isNotBlank() }?.let { resolveAppLink(it, baseForLinks) }.orEmpty()
    val androidUrl = androidUrlRaw.takeIf { it.isNotBlank() }?.let { resolveAppLink(it, baseForLinks) }.orEmpty()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp)
    ) {
        Text(
            text = "پروفایل من",
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(bottom = 24.dp)
        )

        user?.let { u ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    ProfileRow("نام", u.name ?: u.email)
                    Spacer(modifier = Modifier.height(16.dp))
                    ProfileRow("ایمیل", u.email)
                    Spacer(modifier = Modifier.height(16.dp))
                    ProfileRow("نقش", u.role)
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            shape = MaterialTheme.shapes.medium
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
                        maxLines = 1
                    )
                }
                TextButton(onClick = { showServerDialog = true }) {
                    Text("تغییر")
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            shape = MaterialTheme.shapes.medium
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
                Text(
                    "اگر روی سرور نسخهٔ جدید تعریف شده باشد، می‌توانید از اینجا بررسی و مستقیم از داخل اپ به‌روز کنید.",
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

        if (iosUrl.isNotBlank() || androidUrl.isNotBlank()) {
            Spacer(modifier = Modifier.height(24.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("دانلود اپ موبایل", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        "نسخه‌های قابل نصب مستقیم:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    if (iosUrl.isNotBlank()) {
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedButton(
                            onClick = {
                                runCatching {
                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(iosUrl)))
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("دانلود نسخه iOS")
                        }
                    }
                    if (androidUrl.isNotBlank()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = {
                                runCatching {
                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(androidUrl)))
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("دانلود نسخه Android")
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

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
private fun ProfileRow(label: String, value: String) {
    Column {
        Text(label, style = MaterialTheme.typography.labelMedium)
        Text(value, style = MaterialTheme.typography.bodyLarge)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
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
            TextButton(onClick = { onSave(url.trim()) }) {
                Text("ذخیره")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("انصراف")
            }
        }
    )
}
