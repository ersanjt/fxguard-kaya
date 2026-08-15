/**
 * Kaya CRM — Android Application
 * @file    android-app/app/src/main/java/io/fxguard/kaya/KayaCrmApp.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya

import android.app.Application
import io.fxguard.kaya.di.AppGraph

class KayaCrmApp : Application() {
    lateinit var graph: AppGraph
        private set

    override fun onCreate() {
        super.onCreate()
        graph = AppGraph(this)
    }
}
