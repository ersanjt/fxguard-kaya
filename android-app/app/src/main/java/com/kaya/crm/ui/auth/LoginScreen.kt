package com.kaya.crm.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.kaya.crm.data.ApiConfig

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNeedTotp: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel()
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var showServerConfig by remember { mutableStateOf(false) }
    val savedServerUrl by viewModel.savedServerUrl.collectAsState(initial = null)

    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()
    val needTotp by viewModel.needTotp.collectAsState()
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()
    val forgotUi by viewModel.forgotPassword.collectAsState()

    var showForgotPassword by remember { mutableStateOf(false) }

    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn == true) onLoginSuccess()
    }
    LaunchedEffect(needTotp) {
        if (needTotp != null) onNeedTotp()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
    ) {
        /* Column اول باشد تا IconButton بعدی روی لایهٔ بالا قرار بگیرد و لمسی نخورد */
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(vertical = 48.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Surface(
                shape = MaterialTheme.shapes.extraLarge,
                color = MaterialTheme.colorScheme.primaryContainer
            ) {
                Box(
                    modifier = Modifier.size(80.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "ک",
                        style = MaterialTheme.typography.headlineLarge,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "کایا CRM",
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "ورود به پورتال از سراسر دنیا",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(40.dp))

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("ایمیل") },
                leadingIcon = { Icon(Icons.Default.Mail, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                shape = MaterialTheme.shapes.medium
            )
            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("رمز عبور") },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                shape = MaterialTheme.shapes.medium
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                TextButton(
                    onClick = {
                        viewModel.resetForgotPassword()
                        showForgotPassword = true
                    }
                ) {
                    Text("فراموشی رمز عبور")
                }
            }
            Spacer(modifier = Modifier.height(16.dp))

            error?.let { msg ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
                ) {
                    Text(
                        text = msg,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            Button(
                onClick = { viewModel.login(email, password) },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                enabled = !loading && email.isNotBlank() && password.isNotBlank(),
                shape = MaterialTheme.shapes.medium
            ) {
                if (loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("ورود")
                }
            }
        }

        IconButton(
            onClick = { showServerConfig = true },
            modifier = Modifier.align(Alignment.TopEnd)
        ) {
            Icon(Icons.Default.Settings, contentDescription = "تنظیمات سرور")
        }
    }

    if (showServerConfig) {
        ServerUrlDialog(
            currentUrl = savedServerUrl?.trim()?.ifBlank { null } ?: ApiConfig.BASE_URL,
            onDismiss = { showServerConfig = false },
            onSave = { url ->
                viewModel.setServerUrl(url)
                showServerConfig = false
            }
        )
    }

    if (showForgotPassword) {
        ForgotPasswordDialog(
            initialEmail = email.trim(),
            forgotUi = forgotUi,
            onDismiss = {
                showForgotPassword = false
                viewModel.resetForgotPassword()
            },
            onSubmit = { viewModel.requestForgotPassword(it) }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ForgotPasswordDialog(
    initialEmail: String,
    forgotUi: LoginViewModel.ForgotPasswordUi,
    onDismiss: () -> Unit,
    onSubmit: (String) -> Unit
) {
    var forgotEmail by remember { mutableStateOf(initialEmail) }
    LaunchedEffect(initialEmail) {
        forgotEmail = initialEmail
    }
    AlertDialog(
        onDismissRequest = {
            if (!forgotUi.inProgress) onDismiss()
        },
        title = { Text("بازیابی رمز عبور") },
        text = {
            Column(
                Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                if (forgotUi.success) {
                    Text(
                        "در صورت وجود حساب با این ایمیل، لینک تعیین رمز جدید از همان سامانهٔ ایمیل پنل برای شما ارسال شده است.\n\n" +
                            "صندوق ورودی و پوشهٔ هرزنامه را بررسی کنید؛ با باز کردن لینک در مرورگر، رمز جدید را انتخاب کنید.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    Text(
                        "ایمیل حساب خود را وارد کنید. همان مسیر ارسال ایمیل وب‌سایت است؛ رمز به‌صورت خودکار در متن ایمیل نیست، بلکه از طریق لینک امن تعیین می‌شود.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = forgotEmail,
                        onValueChange = { forgotEmail = it },
                        label = { Text("ایمیل") },
                        leadingIcon = { Icon(Icons.Default.Mail, contentDescription = null) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        enabled = !forgotUi.inProgress,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Done
                        ),
                        shape = MaterialTheme.shapes.medium
                    )
                    forgotUi.error?.let { err ->
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = err,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        },
        confirmButton = {
            if (forgotUi.success) {
                TextButton(onClick = onDismiss) {
                    Text("بستن")
                }
            } else {
                TextButton(
                    onClick = { onSubmit(forgotEmail) },
                    enabled = !forgotUi.inProgress
                ) {
                    if (forgotUi.inProgress) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("ارسال لینک بازیابی")
                    }
                }
            }
        },
        dismissButton = {
            if (!forgotUi.success) {
                TextButton(onClick = onDismiss, enabled = !forgotUi.inProgress) {
                    Text("انصراف")
                }
            }
        }
    )
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
                    "آدرس پایه API سرور را وارد کنید. برای اعمال تغییرات، اپ را ببندید و دوباره باز کنید.",
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
