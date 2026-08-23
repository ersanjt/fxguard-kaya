/**
 * Kaya CRM — chat voice player, recorder, emoji/sticker/GIF picker
 * @file    android-app/.../ui/inbox/ChatMedia.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.ui.inbox

import android.content.Context
import android.content.Intent
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.media.PlaybackParams
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.Pause
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.fxguard.kaya.ui.i18n.L10n
import io.fxguard.kaya.ui.theme.KayaColors
import java.io.File

data class WaGif(val label: String, val url: String)

object WaPicker {
    val emoji = "😀😃😄😁😅😂🤣😊😇🙂😉😍🥰😘🥲😋😛🤪😎😢😭😤😡🤬🤔😴🙄👍👎👏🙌🙏🤝💪✌️🤞✋👌🤌💬❤️🧡💛💚💙💔✨🔥⭐🎉💯✅❌❓☕🍕🎂🎁🏠✈️📱💼📎🖼🎵🎶🌙☀️🌟🌈⚽🎮🔔📌"
    val sticker = "❤️😂🔥😍🥰👏😊🎉🤔😭🙏✨🌟💯🎂🍕🐱🐶🌹🥳😎🤗💪👍🙌🤩😇🥺🦄🌸🍀🌻🎈🎀🏆🍉🥑🍓💖💝👻🎃🎄🧸"
    val gifs = listOf(
        WaGif("Funny", "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif"),
        WaGif("Wow", "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif"),
        WaGif("Happy", "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif"),
        WaGif("Love", "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif"),
        WaGif("Thanks", "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif"),
        WaGif("Hi", "https://media.giphy.com/media/ASd0Ukj0y3qMM/giphy.gif"),
    )
}

class VoiceCapture(private val context: Context) {
    private var recorder: MediaRecorder? = null
    var file: File? = null
        private set
    var startedAt = 0L
        private set

    fun start() {
        cancel()
        val out = File(context.cacheDir, "voice-${System.currentTimeMillis()}.m4a")
        val rec = if (Build.VERSION.SDK_INT >= 31) MediaRecorder(context) else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }
        rec.setAudioSource(MediaRecorder.AudioSource.MIC)
        rec.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        rec.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        rec.setAudioSamplingRate(44100)
        rec.setAudioEncodingBitRate(128000)
        rec.setOutputFile(out.absolutePath)
        rec.prepare()
        rec.start()
        recorder = rec
        file = out
        startedAt = System.currentTimeMillis()
    }

    fun stop(): File? {
        val out = file
        try {
            recorder?.stop()
        } catch (_: Exception) {
        }
        recorder?.release()
        recorder = null
        file = null
        return out
    }

    fun cancel() {
        try {
            recorder?.stop()
        } catch (_: Exception) {
        }
        recorder?.release()
        recorder = null
        file?.delete()
        file = null
        startedAt = 0L
    }
}

fun readPickedFile(context: Context, uri: Uri): Triple<ByteArray, String, String> {
    val mime = context.contentResolver.getType(uri) ?: "application/octet-stream"
    var name = "file"
    context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
        if (c.moveToFirst()) {
            val idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0) name = c.getString(idx) ?: name
        }
    }
    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
        ?: throw IllegalStateException("فایل خوانده نشد")
    return Triple(bytes, name, mime)
}

@Composable
fun VoiceBubble(
    lang: String,
    url: String,
    seed: String,
    mine: Boolean,
) {
    val context = LocalContext.current
    var playing by remember(url) { mutableStateOf(false) }
    var speed by remember(url) { mutableFloatStateOf(1f) }
    val player = remember(url) { MediaPlayer() }
    DisposableEffect(url) {
        try {
            player.setDataSource(context, Uri.parse(url))
            player.setOnCompletionListener { playing = false }
            player.prepareAsync()
        } catch (_: Exception) {
        }
        onDispose {
            runCatching { player.stop() }
            player.release()
        }
    }
    val bars = remember(seed) {
        val h = seed.hashCode()
        List(28) { i ->
            val v = ((h ushr (i % 24)) xor (i * 17)).and(0xFF)
            0.28f + (v % 72) / 100f
        }
    }
    val bg = if (mine) KayaColors.Accent else Color.White
    val fg = if (mine) Color.White else Color(0xFF1F2937)
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(bg)
            .padding(10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(KayaColors.Accent)
                    .clickable {
                        try {
                            if (playing) {
                                player.pause()
                                playing = false
                            } else {
                                applySpeed(player, speed)
                                player.start()
                                playing = true
                            }
                        } catch (_: Exception) {
                        }
                    },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    if (playing) Icons.Outlined.Pause else Icons.Outlined.PlayArrow,
                    contentDescription = L10n.t(lang, "voice"),
                    tint = Color.White,
                    modifier = Modifier.size(26.dp),
                )
            }
            Canvas(
                Modifier
                    .weight(1f)
                    .height(36.dp)
                    .padding(horizontal = 8.dp),
            ) {
                val w = size.width / bars.size
                bars.forEachIndexed { i, frac ->
                    val barH = size.height * frac
                    drawRect(
                        if (mine) Color.White.copy(alpha = 0.85f) else Color(0xFF10B981),
                        Offset(i * w + 1f, (size.height - barH) / 2f),
                        Size(w * 0.55f, barH),
                    )
                }
            }
            Text(
                if (speed == 1f) "1x" else if (speed == 1.5f) "1.5x" else "2x",
                color = fg,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (mine) Color.White.copy(alpha = 0.18f) else Color(0x1410B981))
                    .clickable {
                        speed = when (speed) {
                            1f -> 1.5f
                            1.5f -> 2f
                            else -> 1f
                        }
                        if (playing) applySpeed(player, speed)
                    }
                    .padding(horizontal = 8.dp, vertical = 4.dp),
            )
            IconButton(onClick = {
                runCatching {
                    context.startActivity(
                        Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                    )
                }
            }) {
                Icon(
                    Icons.Outlined.Download,
                    contentDescription = L10n.t(lang, "download_audio"),
                    tint = fg.copy(alpha = 0.7f),
                )
            }
        }
    }
}

@Composable
fun FileBubble(lang: String, name: String, url: String?, mine: Boolean) {
    val context = LocalContext.current
    Row(
        Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (mine) Color.White.copy(alpha = 0.12f) else Color.White.copy(alpha = 0.06f))
            .clickable(enabled = !url.isNullOrBlank()) {
                url?.let {
                    runCatching {
                        context.startActivity(
                            Intent(Intent.ACTION_VIEW, Uri.parse(it)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                        )
                    }
                }
            }
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(Icons.Outlined.Download, contentDescription = null, tint = if (mine) Color.White else KayaColors.Text)
        Text(
            name.ifBlank { L10n.t(lang, "file") },
            color = if (mine) Color.White else KayaColors.Text,
            fontSize = 13.sp,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
fun WaPickerSheet(
    lang: String,
    tab: String,
    onTab: (String) -> Unit,
    onInsert: (String) -> Unit,
    onGif: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .height(320.dp)
            .background(KayaColors.Bg2)
            .padding(8.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                L10n.t(
                    lang,
                    when (tab) {
                        "sticker" -> "sticker"
                        "gif" -> "gif"
                        else -> "emoji"
                    },
                ),
                color = KayaColors.Text,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f),
            )
            Text(
                "×",
                color = KayaColors.Text2,
                fontSize = 22.sp,
                modifier = Modifier
                    .clickable(onClick = onDismiss)
                    .padding(8.dp),
            )
        }
        Box(Modifier.weight(1f).fillMaxWidth()) {
            when (tab) {
                "gif" -> LazyVerticalGrid(
                    columns = GridCells.Fixed(3),
                    contentPadding = PaddingValues(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    items(WaPicker.gifs, key = { it.url }) { g ->
                        Column(
                            Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(KayaColors.Card)
                                .clickable { onGif(g.url) }
                                .padding(6.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            coil.compose.AsyncImage(
                                model = g.url,
                                contentDescription = g.label,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(72.dp)
                                    .clip(RoundedCornerShape(8.dp)),
                            )
                            Text(g.label, color = KayaColors.Text2, fontSize = 11.sp)
                        }
                    }
                }
                else -> {
                    val chars = if (tab == "sticker") WaPicker.sticker else WaPicker.emoji
                    val cells = chars.mapIndexed { i, ch -> "$i-$ch" to ch.toString() }
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(8),
                        contentPadding = PaddingValues(4.dp),
                    ) {
                        items(cells, key = { it.first }) { pair ->
                            val ch = pair.second
                            Text(
                                ch,
                                fontSize = 22.sp,
                                modifier = Modifier
                                    .clickable { onInsert(ch) }
                                    .padding(6.dp),
                            )
                        }
                    }
                }
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            listOf("emoji" to "😊", "gif" to "GIF", "sticker" to "◌").forEach { (key, icon) ->
                val active = tab == key
                Column(
                    Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (active) KayaColors.AccentSoft else Color.Transparent)
                        .clickable { onTab(key) }
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(icon, fontSize = 16.sp, color = KayaColors.Text)
                    Text(L10n.t(lang, key), color = if (active) KayaColors.Accent else KayaColors.Text3, fontSize = 11.sp)
                }
            }
        }
    }
}

private fun applySpeed(player: MediaPlayer, speed: Float) {
    try {
        player.playbackParams = PlaybackParams().setSpeed(speed)
    } catch (_: Exception) {
    }
}
