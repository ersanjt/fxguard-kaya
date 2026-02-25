package com.kaya.crm.ui.main.profile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.kaya.crm.data.ApiConfig

@Composable
fun ProfileScreen(
    onLogout: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val user by viewModel.user.collectAsState()
    val savedServerUrl by viewModel.savedServerUrl.collectAsState(initial = null)
    var showServerDialog by remember { mutableStateOf(false) }

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

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = onLogout,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
            shape = MaterialTheme.shapes.medium
        ) {
            Icon(Icons.Default.Logout, contentDescription = null)
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
