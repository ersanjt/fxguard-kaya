/**
 * Kaya CRM — design tokens (login.css parity)
 * @file    android-app/.../ui/theme/Theme.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     mobile-shared/design-tokens.json
 */
package io.fxguard.kaya.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

object KayaColors {
    private val DefaultAccent = Color(0xFF10B981)
    private val DefaultHover = Color(0xFF059669)
    private val DefaultSoft = Color(0x2610B981)

    val Bg = Color(0xFF080D1A)
    val Bg2 = Color(0xFF0D1525)
    val Card = Color(0xD910182C)
    val Border = Color(0x14FFFFFF)
    var Accent by mutableStateOf(DefaultAccent)
        private set
    var AccentHover by mutableStateOf(DefaultHover)
        private set
    var AccentSoft by mutableStateOf(DefaultSoft)
        private set
    val Chrome = Color(0xD9161F38)
    val ChromeTab = Color(0xEB0F172A)
    val Danger = Color(0xFFEF4444)
    val Text = Color(0xFFF0F4FC)
    val Text2 = Color(0xFF8B9DC3)
    val Text3 = Color(0xFF8B9DC3)
    val InputBg = Color(0x0AFFFFFF)
    val BubbleIn = Color(0xFF162033)
    val BubbleOut = Color(0xFF0F3D32)

    fun applyBrandColor(hex: String?) {
        val parsed = parseHexColor(hex)
        if (parsed == null) {
            Accent = DefaultAccent
            AccentHover = DefaultHover
            AccentSoft = DefaultSoft
            return
        }
        Accent = parsed
        AccentHover = Color(
            red = (parsed.red * 0.82f).coerceIn(0f, 1f),
            green = (parsed.green * 0.82f).coerceIn(0f, 1f),
            blue = (parsed.blue * 0.82f).coerceIn(0f, 1f),
        )
        AccentSoft = parsed.copy(alpha = 0.15f)
    }
}

private fun parseHexColor(hex: String?): Color? {
    val h = hex?.trim().orEmpty()
    if (!h.matches(Regex("^#[0-9a-fA-F]{6}$"))) return null
    val v = h.substring(1).toLong(16)
    return Color(
        red = ((v shr 16) and 0xFF) / 255f,
        green = ((v shr 8) and 0xFF) / 255f,
        blue = (v and 0xFF) / 255f,
    )
}

val KayaCardShape = RoundedCornerShape(16.dp)
val KayaControlShape = RoundedCornerShape(10.dp)

@Composable
fun KayaTheme(content: @Composable () -> Unit) {
    val scheme = darkColorScheme(
        primary = KayaColors.Accent,
        onPrimary = Color.White,
        background = KayaColors.Bg,
        onBackground = KayaColors.Text,
        surface = KayaColors.Bg2,
        onSurface = KayaColors.Text,
        error = KayaColors.Danger,
    )
    MaterialTheme(colorScheme = scheme, content = content)
}
