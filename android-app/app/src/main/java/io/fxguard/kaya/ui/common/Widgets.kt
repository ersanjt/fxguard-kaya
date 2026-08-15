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
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
        content()
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
fun ErrorText(message: String?) {
    if (!message.isNullOrBlank()) {
        Text(
            message,
            color = KayaColors.Danger,
            fontSize = 13.sp,
            modifier = Modifier.padding(top = 10.dp),
        )
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
