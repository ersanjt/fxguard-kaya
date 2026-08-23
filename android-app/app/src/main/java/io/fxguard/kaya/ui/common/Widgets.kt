/**
 * Kaya CRM — shared Compose widgets
 * @file    android-app/.../ui/common/Widgets.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import io.fxguard.kaya.ui.theme.KayaColors
import io.fxguard.kaya.ui.theme.KayaControlShape

@Composable
fun KayaBackdrop(content: @Composable () -> Unit) {
    Box(
        Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    listOf(KayaColors.Bg, KayaColors.Bg2),
                ),
            ),
    ) {
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(KayaColors.AccentSoft, Color.Transparent),
                    ),
                ),
        )
        Box(Modifier.fillMaxSize().statusBarsPadding().imePadding()) {
            content()
        }
    }
}

@Composable
fun KayaField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    trailing: @Composable (() -> Unit)? = null,
    singleLine: Boolean = true,
) {
    Column(modifier.fillMaxWidth()) {
        Text(label, color = KayaColors.Text2, fontSize = 13.sp)
        Spacer(Modifier.height(6.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            singleLine = singleLine,
            visualTransformation = visualTransformation,
            keyboardOptions = keyboardOptions,
            keyboardActions = keyboardActions,
            trailingIcon = trailing,
            shape = KayaControlShape,
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = KayaColors.Text,
                unfocusedTextColor = KayaColors.Text,
                focusedBorderColor = KayaColors.Accent,
                unfocusedBorderColor = KayaColors.Border,
                focusedContainerColor = KayaColors.InputBg,
                unfocusedContainerColor = KayaColors.InputBg,
                cursorColor = KayaColors.Accent,
            ),
        )
    }
}

@Composable
fun KayaPrimaryButton(
    text: String,
    loading: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Button(
        onClick = onClick,
        enabled = !loading,
        modifier = modifier
            .fillMaxWidth()
            .height(50.dp),
        shape = KayaControlShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = KayaColors.Accent,
            disabledContainerColor = KayaColors.AccentHover,
        ),
    ) {
        if (loading) {
            CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.height(22.dp))
        } else {
            Text(text, color = Color.White)
        }
    }
}

@Composable
fun ErrorText(message: String?, success: Boolean = false) {
    if (!message.isNullOrBlank()) {
        Text(
            message,
            color = if (success) KayaColors.Accent else KayaColors.Danger,
            fontSize = 13.sp,
            modifier = Modifier.padding(top = 10.dp),
        )
    }
}

@Composable
fun StatusLine(message: String?, onRetry: (() -> Unit)? = null, retryLabel: String = "تلاش دوباره") {
    if (message.isNullOrBlank()) return
    Column(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Text(message, color = KayaColors.Danger, fontSize = 13.sp)
        if (onRetry != null) {
            Text(
                retryLabel,
                color = KayaColors.Accent,
                fontSize = 13.sp,
                modifier = Modifier.padding(top = 6.dp).clickable(onClick = onRetry),
            )
        }
    }
}

@Composable
fun AvatarCircle(letter: String, modifier: Modifier = Modifier) {
    Box(
        modifier
            .clip(CircleShape)
            .background(KayaColors.AccentSoft)
            .border(1.dp, KayaColors.Border, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Text(letter.take(1).uppercase(), color = KayaColors.Accent, fontSize = 16.sp)
    }
}

/** Same source as web: GET /api/customers/:id/avatar (Bearer via Coil). */
@Composable
fun CustomerPhoto(
    url: String?,
    name: String,
    modifier: Modifier = Modifier.size(44.dp),
    tile: Boolean = true,
) {
    val shape = if (tile) RoundedCornerShape(10.dp) else CircleShape
    val bg = if (tile) KayaColors.Accent else KayaColors.AccentSoft
    val letterColor = if (tile) Color.White else KayaColors.Accent
    val src = remember(url) { url?.takeIf { it.isNotBlank() } }
    Box(
        modifier.clip(shape).background(bg),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            name.firstOrNull()?.toString() ?: "?",
            color = letterColor,
            fontWeight = FontWeight.Bold,
            fontSize = if (tile) 18.sp else 16.sp,
        )
        if (src != null) {
            AsyncImage(
                model = src,
                contentDescription = name,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
        }
    }
}

/** Keep +E.164 / spaced phone digits as one LTR run inside RTL screens. */
fun ltrPhone(raw: String?): String {
    val t = raw?.trim().orEmpty()
    if (t.isEmpty()) return ""
    return "\u2066$t\u2069"
}

fun looksLikePhone(raw: String?): Boolean {
    val t = raw?.trim().orEmpty()
    if (t.isEmpty() || t.contains('@')) return false
    val digits = t.count { it.isDigit() }
    if (digits < 8) return false
    return t.all { ch -> ch.isDigit() || ch == '+' || ch == '-' || ch == ' ' || ch == '(' || ch == ')' || ch == '.' }
}

fun displayLabel(raw: String): String = if (looksLikePhone(raw)) ltrPhone(raw) else raw

fun displayPhoneOrFallback(phone: String?, fallback: String): String {
    val p = phone?.trim().orEmpty()
    return if (p.isNotEmpty()) ltrPhone(p) else fallback
}

fun displayCustomerName(name: String?, phone: String?, fallback: String): String {
    val n = name?.trim().orEmpty()
    if (n.isNotEmpty()) {
        if (looksLikePhone(n) && phone.isNullOrBlank()) return fallback
        return n
    }
    return fallback
}

@Composable
fun RtlSafeText(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = Color.Unspecified,
    fontSize: TextUnit = TextUnit.Unspecified,
    fontWeight: FontWeight? = null,
    maxLines: Int = Int.MAX_VALUE,
    overflow: TextOverflow = TextOverflow.Clip,
    ltr: Boolean = looksLikePhone(text.replace("\u2066", "").replace("\u2069", "")),
) {
    Text(
        text = text,
        modifier = modifier,
        color = color,
        fontSize = fontSize,
        fontWeight = fontWeight,
        maxLines = maxLines,
        overflow = overflow,
        style = TextStyle(textDirection = if (ltr) TextDirection.Ltr else TextDirection.Unspecified),
    )
}

@Composable
fun InAppPushBanner(
    title: String,
    body: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Column(
        modifier
            .statusBarsPadding()
            .padding(12.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(KayaColors.Card)
            .border(1.dp, KayaColors.Accent.copy(alpha = 0.35f), RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(14.dp),
    ) {
        Text(title, color = KayaColors.Text, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, maxLines = 1)
        if (body.isNotBlank()) {
            Spacer(Modifier.height(4.dp))
            Text(body, color = KayaColors.Text2, fontSize = 13.sp, maxLines = 2)
        }
    }
}
