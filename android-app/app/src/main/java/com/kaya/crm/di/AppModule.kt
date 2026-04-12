package com.kaya.crm.di

import com.kaya.crm.data.ApiConfig
import com.kaya.crm.data.api.ApiService
import com.kaya.crm.data.network.RetryInterceptor
import com.kaya.crm.data.preferences.AuthPreferences
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideAuthInterceptor(prefs: AuthPreferences): Interceptor = Interceptor { chain ->
        val token = runBlocking { prefs.getToken() }
        val request = chain.request().newBuilder().apply {
            token?.let { addHeader("Authorization", "Bearer $it") }
            addHeader("Accept", "application/json")
            // Content-Type را اینجا ست نکنید تا multipart و JSON هر کدام هدر درست داشته باشند
        }.build()
        val response = chain.proceed(request)
        if (response.code == 401) {
            runBlocking { prefs.clear() }
        }
        response
    }

    /** بدون هدر JSON — مناسب دانلود APK */
    @Provides
    @Singleton
    @Named("updateDownloader")
    fun provideUpdateDownloadClient(): OkHttpClient =
        OkHttpClient.Builder()
            .followRedirects(true)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(300, TimeUnit.SECONDS)
            .writeTimeout(120, TimeUnit.SECONDS)
            .build()

    @Provides
    @Singleton
    fun provideOkHttpClient(authInterceptor: Interceptor): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        return OkHttpClient.Builder()
            .addInterceptor(RetryInterceptor())
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(25, TimeUnit.SECONDS)
            .writeTimeout(25, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient, prefs: AuthPreferences): Retrofit {
        val saved = runBlocking { prefs.getBaseUrl() }?.trim()
        val baseUrl = if (!saved.isNullOrBlank()) {
            val clean = saved.trimEnd('/')
            if (clean.endsWith("/api")) "$clean/" else "$clean/api/"
        } else ApiConfig.API_BASE
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService =
        retrofit.create(ApiService::class.java)
}
