package com.kaya.crm.di

import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient

/** برای [coil.ImageLoaderFactory] — همان OkHttp با هدر Authorization */
@EntryPoint
@InstallIn(SingletonComponent::class)
interface CoilOkHttpEntryPoint {
    fun okHttpClient(): OkHttpClient
}
