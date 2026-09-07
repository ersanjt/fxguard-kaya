/**
 * Kaya CRM — Android Application
 * @file    android-app/app/src/main/java/io/fxguard/kaya/KayaCrmApp.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import io.fxguard.kaya.di.AppGraph
import io.fxguard.kaya.push.NotificationHelper
import io.fxguard.kaya.push.PushRegistrar
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient

class KayaCrmApp : Application(), ImageLoaderFactory {
    lateinit var graph: AppGraph
        private set

    override fun onCreate() {
        super.onCreate()
        graph = AppGraph(this)
        NotificationHelper.attach(this)
        NotificationHelper.ensureChannels(this)
        if (graph.session.isLoggedIn) {
            PushRegistrar.onLoggedIn(this, graph.api)
        }
    }

    override fun newImageLoader(): ImageLoader {
        val http = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val original = chain.request()
                val token = graph.session.token
                val apiHost = graph.session.baseUrl.toHttpUrlOrNull()?.host
                val sameHost = !apiHost.isNullOrBlank() &&
                    original.url.host.equals(apiHost, ignoreCase = true)
                val req = if (!token.isNullOrBlank() && sameHost) {
                    original.newBuilder().header("Authorization", "Bearer $token").build()
                } else {
                    original
                }
                chain.proceed(req)
            }
            .build()
        return ImageLoader.Builder(this)
            .okHttpClient(http)
            .crossfade(true)
            .build()
    }
}
