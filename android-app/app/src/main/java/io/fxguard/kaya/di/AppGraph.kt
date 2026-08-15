/**
 * Kaya CRM — composition root
 * @file    android-app/.../di/AppGraph.kt
 * @layer   android
 * @owner   Ersan Jahed Tabrizi <ersanjahedtabrizi@gmail.com>
 * @see     docs/MOBILE-APP.md
 */
package io.fxguard.kaya.di

import android.app.Application
import io.fxguard.kaya.data.api.ApiClient
import io.fxguard.kaya.data.preferences.SessionStore
import io.fxguard.kaya.data.realtime.SocketService

class AppGraph(app: Application) {
    val session = SessionStore(app)
    val api = ApiClient(session)
    val socket = SocketService(session)
}
