package com.kaya.crm

import android.app.Application
import android.os.StrictMode
import coil.ImageLoader
import coil.ImageLoaderFactory
import com.kaya.crm.BuildConfig
import com.kaya.crm.di.CoilOkHttpEntryPoint
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class KayaCrmApp : Application(), ImageLoaderFactory {
    override fun newImageLoader(): ImageLoader {
        return runCatching {
            val okHttp = EntryPointAccessors.fromApplication(
                applicationContext,
                CoilOkHttpEntryPoint::class.java
            ).okHttpClient()
            ImageLoader.Builder(applicationContext)
                .okHttpClient(okHttp)
                .crossfade(true)
                .build()
        }.getOrElse {
            // Fallback: do not crash app startup if DI/entrypoint fails on some devices.
            ImageLoader.Builder(applicationContext)
                .crossfade(true)
                .build()
        }
    }

    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.DEBUG) {
            StrictMode.setThreadPolicy(
                StrictMode.ThreadPolicy.Builder()
                    .detectDiskReads()
                    .detectDiskWrites()
                    .penaltyLog()
                    .build()
            )
            StrictMode.setVmPolicy(
                StrictMode.VmPolicy.Builder()
                    .detectLeakedSqlLiteObjects()
                    .detectLeakedClosableObjects()
                    .penaltyLog()
                    .build()
            )
        }
    }
}
