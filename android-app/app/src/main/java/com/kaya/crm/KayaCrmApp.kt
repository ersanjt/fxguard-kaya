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
        val okHttp = EntryPointAccessors.fromApplication(
            applicationContext,
            CoilOkHttpEntryPoint::class.java
        ).okHttpClient()
        return ImageLoader.Builder(applicationContext)
            .okHttpClient(okHttp)
            .crossfade(true)
            .build()
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
