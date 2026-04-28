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
        return try {
            val okHttp = EntryPointAccessors.fromApplication(
                applicationContext,
                CoilOkHttpEntryPoint::class.java
            ).okHttpClient()
            ImageLoader.Builder(applicationContext)
                .okHttpClient(okHttp)
                .crossfade(true)
                .build()
        } catch (e: Exception) {
            // جلوگیری از کرش کل اپلیکیشن در صورت خطای تزریق وابستگی در Coil
            ImageLoader.Builder(applicationContext)
                .crossfade(true)
                .build()
        }
    }

    override fun onCreate() {
        super.onCreate()
        // StrictMode غیرفعال شد تا در شروع اپلیکیشن کرش نکند
    }
}
