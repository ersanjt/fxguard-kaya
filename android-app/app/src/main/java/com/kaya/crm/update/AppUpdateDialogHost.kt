package com.kaya.crm.update

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kaya.crm.BuildConfig

@Composable
fun AppUpdateDialogHost(
    ui: AppUpdateUi,
    onDownload: () -> Unit,
    onDismissOptional: () -> Unit,
    onDismissError: () -> Unit
) {
    when (ui) {
        is AppUpdateUi.Available -> {
            val info = ui.info
            AlertDialog(
                onDismissRequest = {
                    if (!info.mandatory) onDismissOptional()
                },
                title = { Text("به‌روزرسانی اپ") },
                text = {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState())
                    ) {
                        Text(
                            "نسخهٔ جدید: ${info.versionName} (${info.versionCode})\n" +
                                "نسخهٔ فعلی شما: ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})"
                        )
                        if (!info.releaseNotes.isNullOrBlank()) {
                            Spacer(Modifier.height(12.dp))
                            Text(info.releaseNotes)
                        }
                        if (info.mandatory) {
                            Spacer(Modifier.height(8.dp))
                            Text("این به‌روزرسانی برای ادامهٔ کار لازم است.")
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = onDownload) {
                        Text("دانلود و نصب")
                    }
                },
                dismissButton = {
                    if (!info.mandatory) {
                        TextButton(onClick = onDismissOptional) {
                            Text("بعداً")
                        }
                    }
                }
            )
        }
        is AppUpdateUi.Downloading -> {
            AlertDialog(
                onDismissRequest = { },
                title = { Text("در حال دانلود…") },
                text = {
                    Column(Modifier.fillMaxWidth()) {
                        LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        Text("${ui.percent}٪")
                    }
                },
                confirmButton = {
                    TextButton(onClick = {}, enabled = false) {
                        Text("لطفاً صبر کنید…")
                    }
                }
            )
        }
        is AppUpdateUi.Error -> {
            AlertDialog(
                onDismissRequest = onDismissError,
                title = { Text("به‌روزرسانی") },
                text = { Text(ui.message) },
                confirmButton = {
                    TextButton(onClick = onDismissError) {
                        Text("بستن")
                    }
                }
            )
        }
        else -> { }
    }
}
