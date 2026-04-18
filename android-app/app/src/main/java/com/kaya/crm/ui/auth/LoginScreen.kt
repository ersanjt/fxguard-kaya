package com.kaya.crm.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import coil.compose.AsyncImage
import com.kaya.crm.R
import com.kaya.crm.data.ApiConfig
import com.kaya.crm.ui.util.MediaUrlResolve

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
    val branding by viewModel.publicBranding.collectAsState()
    val brandingLoading by viewModel.brandingLoading.collectAsState()
    val appLocale by viewModel.appLocale.collectAsState()

    var showForgotPassword by remember { mutableStateOf(false) }

    val baseApi = (savedServerUrl?.trim()?.takeIf { it.isNotBlank() } ?: ApiConfig.BASE_URL)
        .trimEnd('/') + "/api/"
    val displayTitle = branding?.loginTitle?.trim()?.takeIf { it.isNotBlank() }
        ?: branding?.siteName?.trim()?.takeIf { it.isNotBlank() }
        ?: branding?.pageTitle?.trim()?.takeIf { it.isNotBlank() }
        ?: stringResource(R.string.login_title_fallback)
    val logoUrl = MediaUrlResolve.absoluteFromApiPath(
        branding?.loginLogoUrl?.trim()?.takeIf { it.isNotBlank() } ?: branding?.logoUrl,
        baseApi
    )

    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn == true) onLoginSuccess()
    }
    LaunchedEffect(needTotp) {
        if (needTotp != null) onNeedTotp()
    }

    val signInContentDescription = stringResource(R.string.cd_sign_in)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
    ) {
        /* Column اول باشد تا IconButton بعدی روی لایهٔ بالا قرار بگیرد و لمسی نخورد */
        Column(
            modifier = Modifier
                .fillMaxSize()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(vertical = 48.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
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
            Spacer(modifier = Modifier.height(16.dp))
            Surface(
                shape = MaterialTheme.shapes.extraLarge,
                color = MaterialTheme.colorScheme.primaryContainer
            ) {
                Box(
                    modifier = Modifier.size(80.dp),
                    contentAlignment = Alignment.Center
                ) {
                    when {
                        brandingLoading && logoUrl == null -> {
                            CircularProgressIndicator(
                                modifier = Modifier.size(36.dp),
                                color = MaterialTheme.colorScheme.primary,
                                strokeWidth = 3.dp
                            )
                        }
                        logoUrl != null -> {
                            AsyncImage(
                                model = logoUrl,
                                contentDescription = stringResource(R.string.cd_login_logo),
                                modifier = Modifier
                                    .size(72.dp)
                                    .clip(CircleShape),
                                contentScale = ContentScale.Fit
                            )
                        }
                        else -> {
                            Text(
                                text = displayTitle.trim().firstOrNull()?.toString() ?: "?",
                                style = MaterialTheme.typography.headlineLarge,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = displayTitle,
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.login_tagline),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))
            TextButton(
                onClick = { viewModel.refreshPublicBranding() },
                enabled = !brandingLoading
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    if (brandingLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                    Text(stringResource(R.string.action_refresh_branding))
                }
            }
            Spacer(modifier = Modifier.height(24.dp))

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text(stringResource(R.string.email)) },
                leadingIcon = {
                    Icon(
                        Icons.Default.Mail,
                        contentDescription = stringResource(R.string.cd_email_field)
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                shape = MaterialTheme.shapes.medium
            )
            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text(stringResource(R.string.password)) },
                leadingIcon = {
                    Icon(
                        Icons.Default.Lock,
                        contentDescription = stringResource(R.string.cd_password_field)
                    )
                },
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = if (passwordVisible) {
                                stringResource(R.string.cd_hide_password)
                            } else {
                                stringResource(R.string.cd_show_password)
                            }
                        )
                    }
                },
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
                    Text(stringResource(R.string.forgot_password))
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
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .semantics { contentDescription = signInContentDescription },
                enabled = !loading && email.isNotBlank() && password.isNotBlank(),
                shape = MaterialTheme.shapes.medium
            ) {
                if (loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text(stringResource(R.string.sign_in))
                }
            }
        }

        IconButton(
            onClick = { showServerConfig = true },
            modifier = Modifier.align(Alignment.TopEnd)
        ) {
            Icon(
                Icons.Default.Settings,
                contentDescription = stringResource(R.string.cd_server_settings)
            )
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
        title = { Text(stringResource(R.string.forgot_title)) },
        text = {
            Column(
                Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                if (forgotUi.success) {
                    Text(
                        text = stringResource(R.string.forgot_success_message),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    Text(
                        text = stringResource(R.string.forgot_hint_email_body),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = forgotEmail,
                        onValueChange = { forgotEmail = it },
                        label = { Text(stringResource(R.string.email)) },
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
                    Text(stringResource(R.string.forgot_close))
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
                        Text(stringResource(R.string.forgot_send_link))
                    }
                }
            }
        },
        dismissButton = {
            if (!forgotUi.success) {
                TextButton(onClick = onDismiss, enabled = !forgotUi.inProgress) {
                    Text(stringResource(R.string.forgot_cancel))
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
        title = { Text(stringResource(R.string.server_url_title)) },
        text = {
            Column {
                Text(
                    text = stringResource(R.string.server_url_hint),
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
            TextButton(onClick = { onSave(url.trim()) }) {
                Text(stringResource(R.string.save))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        }
    )
}
