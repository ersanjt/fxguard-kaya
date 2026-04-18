package com.kaya.crm.di

import com.kaya.crm.BuildConfig
import com.kaya.crm.data.ApiConfig
import com.kaya.crm.data.api.ApiService
import com.kaya.crm.data.network.RetryInterceptor
import com.kaya.crm.data.preferences.AuthPreferences
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.flow.firstOrNull
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
    @Named("dynamicBaseUrl")
    fun provideDynamicBaseUrlInterceptor(prefs: AuthPreferences): Interceptor = Interceptor { chain ->
        var request = chain.request()
        // استفاده از runBlocking در اینترسپتور اجباری است اما با رعایت احتیاط
        val savedBaseUrl = runBlocking { prefs.baseUrl.firstOrNull() }?.trim()?.trimEnd('/')

        if (!savedBaseUrl.isNullOrBlank()) {
            val newBaseUrl = if (savedBaseUrl.endsWith("/api")) savedBaseUrl else "$savedBaseUrl/api"
            val finalUrl = request.url.toString().replace(ApiConfig.API_BASE.trimEnd('/'), newBaseUrl)
            request = request.newBuilder().url(finalUrl).build()
        }
        chain.proceed(request)
    }

    @Provides
    @Singleton
    @Named("auth")
    fun provideAuthInterceptor(prefs: AuthPreferences): Interceptor = Interceptor { chain ->
        val token = runBlocking { prefs.token.firstOrNull() }
        val request = chain.request().newBuilder().apply {
            token?.let { addHeader("Authorization", "Bearer $it") }
            addHeader("Accept", "application/json")
        }.build()

        val response = chain.proceed(request)
        if (response.code == 401) {
            runBlocking { prefs.clear() }
        }
        return@Interceptor response
    }

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
    fun provideOkHttpClient(
        @Named("auth") authInterceptor: Interceptor,
        @Named("dynamicBaseUrl") dynamicBaseUrlInterceptor: Interceptor
    ): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
            else HttpLoggingInterceptor.Level.NONE
        }
        return OkHttpClient.Builder()
            .addInterceptor(dynamicBaseUrlInterceptor)
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
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(ApiConfig.API_BASE)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService =
        retrofit.create(ApiService::class.java)
}
