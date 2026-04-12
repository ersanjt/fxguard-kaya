plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.dagger.hilt.android")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.kaya.crm"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.kaya.crm"
        minSdk = 26
        targetSdk = 36
        versionCode = 5
        versionName = "1.4.0"
        buildConfigField("String", "API_BASE_URL", "\"https://kaya.fxguard.io/\"")
    }

    signingConfigs {
        // برای تست: از کلید debug برای release هم استفاده می‌شود
        create("release") {
            val debugKeystore = File(System.getProperty("user.home"), ".android/debug.keystore")
            if (debugKeystore.exists()) {
                storeFile = debugKeystore
                storePassword = "android"
                keyAlias = "androiddebugkey"
                keyPassword = "android"
            }
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            isDebuggable = true
            // روی گوشی واقعی 10.0.2.2 کار نمی‌کند (فقط امولاتور). پیش‌فرض = همان سرور release؛
            // برای بک‌اند لوکال از آیکن چرخ‌دندهٔ ورود آدرس بگذارید و اپ را یک‌بار ببندید و باز کنید.
            buildConfigField("String", "API_BASE_URL", "\"https://kaya.fxguard.io/\"")
        }
        release {
            isMinifyEnabled = false  // برای تست نصب راحت‌تر؛ بعداً true کنید
            isDebuggable = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.0")
    implementation("androidx.activity:activity-compose:1.13.0")

    // Compose
    implementation(platform("androidx.compose:compose-bom:2026.03.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.material:material")
    implementation("androidx.navigation:navigation-compose:2.9.7")

    // Hilt (با KSP به‌جای kapt - پایدارتر)
    implementation("com.google.dagger:hilt-android:2.54")
    ksp("com.google.dagger:hilt-android-compiler:2.54")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

    // Retrofit & OkHttp
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // DataStore
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    // Coil for images
    implementation("io.coil-kt:coil-compose:2.7.0")
}
