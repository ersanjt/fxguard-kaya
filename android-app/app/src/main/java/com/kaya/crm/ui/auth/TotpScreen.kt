package com.kaya.crm.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import com.kaya.crm.R
import com.kaya.crm.data.ApiConfig

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TotpScreen(
    onVerified: () -> Unit,
    onBack: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel()
) {
    var code by remember { mutableStateOf("") }
    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()
    val branding by viewModel.publicBranding.collectAsState()
    val brandingLoading by viewModel.brandingLoading.collectAsState()
    val savedServerUrl by viewModel.savedServerUrl.collectAsState(initial = null)

    val baseApi = (savedServerUrl?.trim()?.takeIf { it.isNotBlank() } ?: ApiConfig.BASE_URL)
        .trimEnd('/') + "/api/"
    val orgTitle = branding?.loginTitle?.trim()?.takeIf { it.isNotBlank() }
        ?: branding?.siteName?.trim()?.takeIf { it.isNotBlank() }
        ?: branding?.pageTitle?.trim()?.takeIf { it.isNotBlank() }
        ?: stringResource(R.string.login_title_fallback)

    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn == true) onVerified()
    }

    LaunchedEffect(Unit) {
        code = ""
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.totp_title_toolbar)) },
                navigationIcon = {
                    IconButton(onClick = {
                        code = ""
                        onBack()
                    }) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.totp_back_cd)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding()
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.height(24.dp))
            if (!brandingLoading || orgTitle.isNotBlank()) {
                Text(
                    text = orgTitle,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(8.dp))
            }
            Text(
                text = stringResource(R.string.totp_hint_body),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(28.dp))

            OutlinedTextField(
                value = code,
                onValueChange = { if (it.length <= 6 && it.all { c -> c.isDigit() }) code = it },
                label = { Text(stringResource(R.string.totp_code_label)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Number,
                    imeAction = ImeAction.Done
                ),
                supportingText = {
                    Text(
                        stringResource(R.string.totp_code_progress, code.length),
                        style = MaterialTheme.typography.labelSmall
                    )
                }
            )
            Spacer(modifier = Modifier.height(20.dp))

            error?.let { msg ->
                Text(
                    text = msg,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }

            Button(
                onClick = { viewModel.verifyTotp(code) },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                enabled = !loading && code.length == 6
            ) {
                if (loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text(stringResource(R.string.totp_confirm_button))
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.totp_back_hint),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
