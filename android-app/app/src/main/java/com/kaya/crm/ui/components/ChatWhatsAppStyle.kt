package com.kaya.crm.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Mood
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.luminance
import coil.compose.AsyncImage

/** سبک واتساپ: سبز نوار، بژ پس‌زمینهٔ گفتگو، حباب‌ها و کامپوزر گرد */
object ChatWhatsAppStyle {
    val headerGreen = Color(0xFF075E54)
    val sendFabGreen = Color(0xFF25D366)
    val chatBackdropLight = Color(0xFFECE5DD)
    val bubbleOutgoingLight = Color(0xFFDCF8C6)
    val bubbleIncomingLight = Color.White
    val chatBackdropDark = Color(0xFF0B141A)
    val bubbleOutgoingDark = Color(0xFF005C4B)
    val bubbleIncomingDark = Color(0xFF202C33)
    val avatarPlaceholder = Color(0xFFDFE5E7)
    val avatarGlyph = Color(0xFF54656F)
}

@Composable
fun isChatDarkTheme(): Boolean =
    MaterialTheme.colorScheme.surface.luminance() < 0.35f

@Composable
fun waChatBackdropColor(): Color =
    if (isChatDarkTheme()) ChatWhatsAppStyle.chatBackdropDark
    else ChatWhatsAppStyle.chatBackdropLight

@Composable
fun waBubblePair(isOutgoing: Boolean): Pair<Color, Color> {
    val dark = isChatDarkTheme()
    return if (isOutgoing) {
        if (dark) ChatWhatsAppStyle.bubbleOutgoingDark to Color(0xFFE7EDEF)
        else ChatWhatsAppStyle.bubbleOutgoingLight to Color(0xFF0D1F1C)
    } else {
        if (dark) ChatWhatsAppStyle.bubbleIncomingDark to Color(0xFFE9EDEF)
        else ChatWhatsAppStyle.bubbleIncomingLight to Color(0xFF0D1F1C)
    }
}

/** پیوست نمایش داده‌شده داخل حباب (آدرس مطلق برای Coil / مرورگر) */
data class WaBubbleAttachment(
    val label: String,
    val absoluteUrl: String,
    val showAsImage: Boolean
)

@Composable
fun WaChatSheetHeader(
    title: String,
    subtitle: String? = null,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    onVoiceCall: (() -> Unit)? = null,
    onVideoCall: (() -> Unit)? = null,
    trailing: (@Composable () -> Unit)? = null
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = ChatWhatsAppStyle.headerGreen,
        shadowElevation = 4.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onDismiss) {
                Icon(
                    Icons.Default.Close,
                    contentDescription = "بستن",
                    tint = Color.White
                )
            }
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(end = 12.dp)
            ) {
                Text(
                    title,
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (!subtitle.isNullOrBlank()) {
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.85f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            if (onVoiceCall != null) {
                IconButton(onClick = onVoiceCall) {
                    Icon(Icons.Default.Call, contentDescription = "تماس صوتی", tint = Color.White)
                }
            }
            if (onVideoCall != null) {
                IconButton(onClick = onVideoCall) {
                    Icon(Icons.Default.Videocam, contentDescription = "تماس تصویری", tint = Color.White)
                }
            }
            if (trailing != null) {
                trailing()
            }
        }
    }
}

@Composable
fun WaChatThreadRow(
    title: String,
    preview: String,
    timeOrMeta: String?,
    avatarLetter: String,
    modifier: Modifier = Modifier,
    unreadCount: Int = 0,
    trailingEmoji: String? = null
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(CircleShape)
                .background(ChatWhatsAppStyle.avatarPlaceholder),
            contentAlignment = Alignment.Center
        ) {
            if (!trailingEmoji.isNullOrBlank()) {
                Text(
                    text = trailingEmoji,
                    style = MaterialTheme.typography.headlineSmall
                )
            } else {
                Text(
                    text = avatarLetter.uppercase(),
                    style = MaterialTheme.typography.titleMedium,
                    color = ChatWhatsAppStyle.avatarGlyph
                )
            }
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
                if (!timeOrMeta.isNullOrBlank()) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = timeOrMeta,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Spacer(modifier = Modifier.height(2.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = preview,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                if (unreadCount > 0) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(
                        color = ChatWhatsAppStyle.sendFabGreen,
                        shape = CircleShape
                    ) {
                        Text(
                            text = unreadCount.coerceAtMost(99).toString(),
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun WaChatRowDivider() {
    HorizontalDivider(
        modifier = Modifier.padding(start = 76.dp),
        thickness = 0.5.dp,
        color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
    )
}

@Composable
fun WaMessageBubble(
    isOutgoing: Boolean,
    text: String,
    footer: String?,
    senderLabel: String?,
    modifier: Modifier = Modifier,
    attachments: List<WaBubbleAttachment> = emptyList()
) {
    val (bg, fg) = waBubblePair(isOutgoing)
    val shape = RoundedCornerShape(12.dp)
    val uriHandler = LocalUriHandler.current
    val hideText = attachments.isNotEmpty() && text == "(پیوست)"
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = if (isOutgoing) Arrangement.End else Arrangement.Start
    ) {
        Column(
            horizontalAlignment = if (isOutgoing) Alignment.End else Alignment.Start
        ) {
            if (!senderLabel.isNullOrBlank()) {
                Text(
                    senderLabel,
                    style = MaterialTheme.typography.labelSmall,
                    color = if (isOutgoing) {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    } else {
                        MaterialTheme.colorScheme.primary
                    }
                )
                Spacer(modifier = Modifier.height(2.dp))
            }
            Surface(color = bg, shape = shape, shadowElevation = 0.5.dp) {
                Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp)) {
                    for (a in attachments) {
                        if (a.showAsImage) {
                            AsyncImage(
                                model = a.absoluteUrl,
                                contentDescription = a.label,
                                modifier = Modifier
                                    .heightIn(max = 200.dp)
                                    .fillMaxWidth(),
                                contentScale = ContentScale.Fit
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                        } else {
                            TextButton(
                                onClick = { uriHandler.openUri(a.absoluteUrl) },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("📎 ${a.label}", maxLines = 2, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }
                    if (!hideText) {
                        Text(text, style = MaterialTheme.typography.bodyMedium, color = fg)
                    }
                    if (!footer.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            footer,
                            style = MaterialTheme.typography.labelSmall,
                            color = fg.copy(alpha = 0.65f)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun WaMessageComposer(
    text: String,
    onTextChange: (String) -> Unit,
    onSend: () -> Unit,
    sending: Boolean,
    placeholder: String,
    modifier: Modifier = Modifier,
    imeSend: Boolean = true,
    onAttachClick: (() -> Unit)? = null,
    extraCanSend: Boolean = false,
    onEmojiClick: (() -> Unit)? = null,
    voiceRecording: Boolean = false,
    onVoiceTap: (() -> Unit)? = null
) {
    val canSend = (text.isNotBlank() || extraCanSend) && !sending
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
        shadowElevation = 6.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.Bottom
        ) {
            if (onAttachClick != null) {
                IconButton(onClick = onAttachClick, enabled = !sending) {
                    Icon(Icons.Default.AttachFile, contentDescription = "پیوست")
                }
            }
            OutlinedTextField(
                value = text,
                onValueChange = onTextChange,
                modifier = Modifier.weight(1f),
                placeholder = { Text(placeholder) },
                enabled = !sending,
                maxLines = 6,
                shape = RoundedCornerShape(24.dp),
                keyboardOptions = KeyboardOptions(
                    imeAction = if (imeSend) ImeAction.Send else ImeAction.Default
                ),
                keyboardActions = KeyboardActions(
                    onSend = { if (canSend) onSend() }
                ),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                    focusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.35f),
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.25f)
                )
            )
            if (onEmojiClick != null) {
                IconButton(onClick = onEmojiClick, enabled = !sending) {
                    Icon(Icons.Default.Mood, contentDescription = "ایموجی")
                }
            }
            if (onVoiceTap != null) {
                IconButton(onClick = onVoiceTap, enabled = !sending) {
                    Icon(
                        Icons.Default.Mic,
                        contentDescription = if (voiceRecording) "پایان ضبط" else "پیام صوتی",
                        tint = if (voiceRecording) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
                    )
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
            FloatingActionButton(
                onClick = { if (canSend) onSend() },
                modifier = Modifier
                    .size(48.dp)
                    .alpha(if (canSend) 1f else 0.45f),
                containerColor = ChatWhatsAppStyle.sendFabGreen,
                contentColor = Color.White,
                elevation = FloatingActionButtonDefaults.elevation(
                    defaultElevation = 0.dp,
                    pressedElevation = 2.dp
                ),
                shape = CircleShape
            ) {
                if (sending) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "ارسال")
                }
            }
        }
    }
}

private val WA_EMOJI_PRESET = listOf(
    "😀", "😃", "😄", "😁", "😅", "🤣", "😊", "🙂", "😉", "😍", "🥰", "😘",
    "😂", "🤔", "😢", "😭", "😡", "👍", "👎", "🙏", "👏", "🔥", "✨", "💯",
    "❤️", "✅", "❌", "⭐", "🎉", "📌", "📎", "☎️", "📞", "💼", "🏠"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WaEmojiPickerBottomSheet(
    expanded: Boolean,
    onDismiss: () -> Unit,
    onEmojiSelected: (String) -> Unit
) {
    if (!expanded) return
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp)
        ) {
            Text(
                "ایموجی",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)
            )
            WA_EMOJI_PRESET.chunked(6).forEach { row ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    row.forEach { em ->
                        TextButton(
                            onClick = {
                                onEmojiSelected(em)
                                onDismiss()
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(em, fontSize = 22.sp)
                        }
                    }
                    repeat(6 - row.size) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}
