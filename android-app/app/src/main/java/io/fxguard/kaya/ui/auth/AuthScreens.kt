/**
 * Kaya CRM — login / TOTP / forgot
 * @file    android-app/.../ui/auth/AuthScreens.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     backend/public/login.html
 */
package io.fxguard.kaya.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import io.fxguard.kaya.data.models.Branding
import io.fxguard.kaya.ui.common.ErrorText
import io.fxguard.kaya.ui.common.KayaBackdrop
import io.fxguard.kaya.ui.common.KayaField
import io.fxguard.kaya.ui.common.KayaPrimaryButton
import io.fxguard.kaya.ui.i18n.L10n
import io.fxguard.kaya.ui.theme.KayaCardShape
import io.fxguard.kaya.ui.theme.KayaColors

@Composable
fun LoginScreen(
    lang: String,
    branding: Branding?,
    logoUrl: String?,
    serverUrl: String,
    loading: Boolean,
    error: String?,
    errorOk: Boolean = false,
    onLang: (String) -> Unit,
    onServer: (String) -> Unit,
    onSubmit: (String, String) -> Unit,
    onForgot: (String) -> Unit,
) {
    var email by remember { mutableStateOf("") }
    var pass by remember { mutableStateOf("") }
    var showPass by remember { mutableStateOf(false) }
    var forgotMode by remember { mutableStateOf(false) }
    val t = { k: String -> L10n.t(lang, k) }
    val keyboard = LocalSoftwareKeyboardController.current
    val uriHandler = LocalUriHandler.current
    val privacyUrl = serverUrl.trimEnd('/') + "/privacy"
    val submitLogin = {
        keyboard?.hide()
        onSubmit(email.trim(), pass)
    }

    KayaBackdrop {
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.Top,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(KayaCardShape)
                    .background(KayaColors.Card)
                    .padding(22.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                if (!logoUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = logoUrl,
                        contentDescription = branding?.displayTitle,
                        modifier = Modifier.size(88.dp),
                        contentScale = ContentScale.Fit,
                    )
                } else {
                    Box(
                        Modifier
                            .size(72.dp)
                            .clip(RoundedCornerShape(18.dp))
                            .background(KayaColors.AccentSoft),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("K", color = KayaColors.Accent, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(Modifier.height(10.dp))
                Text(
                    branding?.displayTitle ?: "KAYA",
                    color = KayaColors.Text,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(t("login_sub"), color = KayaColors.Text2, fontSize = 13.sp, textAlign = TextAlign.Center)
                Spacer(Modifier.height(16.dp))
                LangSwitch(lang, onLang)
                Spacer(Modifier.height(18.dp))

                if (forgotMode) {
                    KayaField(email, { email = it }, t("login_email"), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email))
                    ErrorText(error, success = errorOk)
                    Spacer(Modifier.height(14.dp))
                    KayaPrimaryButton(t("forgot_send"), loading) {
                        keyboard?.hide()
                        onForgot(email.trim())
                    }
                    TextButton(onClick = { forgotMode = false }) { Text(t("back"), color = KayaColors.Text2) }
                } else {
                    Text(t("login_title"), color = KayaColors.Text, fontSize = 18.sp, fontWeight = FontWeight.Medium)
                    Spacer(Modifier.height(14.dp))
                    KayaField(
                        email,
                        { email = it },
                        t("login_email"),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    )
                    Spacer(Modifier.height(12.dp))
                    KayaField(
                        value = pass,
                        onValueChange = { pass = it },
                        label = t("login_pass"),
                        visualTransformation = if (showPass) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { submitLogin() }),
                        trailing = {
                            IconButton(onClick = { showPass = !showPass }) {
                                Icon(
                                    if (showPass) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                    contentDescription = if (showPass) t("toggle_hide") else t("toggle_show"),
                                    tint = KayaColors.Text2,
                                )
                            }
                        },
                    )
                    ErrorText(error)
                    Spacer(Modifier.height(16.dp))
                    KayaPrimaryButton(if (loading) t("login_loading") else t("login_btn"), loading) {
                        submitLogin()
                    }
                    TextButton(onClick = { forgotMode = true }) { Text(t("forgot"), color = KayaColors.Accent) }
                    KayaField(serverUrl, onServer, t("server"))
                    TextButton(onClick = { uriHandler.openUri(privacyUrl) }) {
                        Text(t("privacy"), color = KayaColors.Text3, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun TotpScreen(
    lang: String,
    hint: String?,
    loading: Boolean,
    error: String?,
    onBack: () -> Unit,
    onSubmit: (String) -> Unit,
) {
    var code by remember { mutableStateOf("") }
    val t = { k: String -> L10n.t(lang, k) }
    KayaBackdrop {
        Column(
            Modifier
                .fillMaxSize()
                .padding(20.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(KayaCardShape)
                    .background(KayaColors.Card)
                    .padding(22.dp),
            ) {
                Text(t("totp_title"), color = KayaColors.Text, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                Text(t("totp_sub"), color = KayaColors.Text2, fontSize = 13.sp)
                if (!hint.isNullOrBlank()) {
                    Text(hint, color = KayaColors.Text3, fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp))
                }
                Spacer(Modifier.height(16.dp))
                KayaField(
                    code,
                    { if (it.length <= 6) code = it.filter { ch -> ch.isDigit() } },
                    t("totp_code"),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                )
                ErrorText(error)
                Spacer(Modifier.height(16.dp))
                KayaPrimaryButton(t("totp_btn"), loading) { onSubmit(code) }
                TextButton(onClick = onBack) { Text(t("back"), color = KayaColors.Text2) }
            }
        }
    }
}

@Composable
private fun LangSwitch(lang: String, onLang: (String) -> Unit) {
    Row(
        Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(KayaColors.InputBg)
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        listOf("fa" to "فارسی", "en" to "English", "tr" to "Türkçe").forEach { (code, label) ->
            val active = lang == code
            Text(
                label,
                color = if (active) Color.White else KayaColors.Text3,
                fontSize = 12.sp,
                fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(if (active) KayaColors.Accent else androidx.compose.ui.graphics.Color.Transparent)
                    .clickable { onLang(code) }
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            )
        }
    }
}
