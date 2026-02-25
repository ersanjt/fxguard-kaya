package com.kaya.crm.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.LayoutDirection
import androidx.core.view.WindowCompat

private val Primary = Color(0xFF075E54)
private val PrimaryDark = Color(0xFF054D45)
private val Secondary = Color(0xFF25D366)
private val Tertiary = Color(0xFF128C7E)
private val Accent = Color(0xFF34B7F1)

private val DarkColorScheme = darkColorScheme(
    primary = Primary,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF0D7377),
    secondary = Secondary,
    onSecondary = Color(0xFF003D36),
    tertiary = Tertiary,
    background = Color(0xFF0A1628),
    surface = Color(0xFF0F1E32),
    surfaceVariant = Color(0xFF1A2D47),
    onBackground = Color(0xFFE8EDF4),
    onSurface = Color(0xFFE8EDF4),
    onSurfaceVariant = Color(0xFFB8C5D6),
    errorContainer = Color(0xFF4A1C1C),
    onErrorContainer = Color(0xFFF5D0D0)
)

private val LightColorScheme = lightColorScheme(
    primary = Primary,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE0F7F4),
    secondary = Secondary,
    onSecondary = Color.White,
    tertiary = Tertiary,
    background = Color(0xFFF0F7F5),
    surface = Color.White,
    surfaceVariant = Color(0xFFE8F5F3),
    onBackground = Color(0xFF0D1F1C),
    onSurface = Color(0xFF1A2E2B),
    onSurfaceVariant = Color(0xFF3D5A54),
    errorContainer = Color(0xFFFDE8E8),
    onErrorContainer = Color(0xFF5C1010)
)

@Composable
fun KayaCrmTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }
    CompositionLocalProvider(
        LocalLayoutDirection provides LayoutDirection.Rtl
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            content = content
        )
    }
}
