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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

object KayaColors {
    val Bg = Color(0xFF080D1A)
    val Bg2 = Color(0xFF0D1525)
    val Card = Color(0xD910182C)
    val Border = Color(0x14FFFFFF)
    val Accent = Color(0xFF10B981)
    val AccentHover = Color(0xFF059669)
    val AccentSoft = Color(0x2610B981)
    val Danger = Color(0xFFEF4444)
    val Text = Color(0xFFF0F4FC)
    val Text2 = Color(0xFF8B9DC3)
    val Text3 = Color(0xFF4E6080)
    val InputBg = Color(0x0AFFFFFF)
    val BubbleIn = Color(0xFF162033)
    val BubbleOut = Color(0xFF0F3D32)
}

val KayaCardShape = RoundedCornerShape(16.dp)
val KayaControlShape = RoundedCornerShape(10.dp)

private val scheme = darkColorScheme(
    primary = KayaColors.Accent,
    onPrimary = Color.White,
    background = KayaColors.Bg,
    onBackground = KayaColors.Text,
    surface = KayaColors.Bg2,
    onSurface = KayaColors.Text,
    error = KayaColors.Danger,
)

@Composable
fun KayaTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = scheme, content = content)
}
