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
                val token = graph.session.token
                val req = chain.request().newBuilder()
                if (!token.isNullOrBlank()) req.header("Authorization", "Bearer $token")
                chain.proceed(req.build())
            }
            .build()
        return ImageLoader.Builder(this)
            .okHttpClient(http)
            .crossfade(true)
            .build()
    }
}
