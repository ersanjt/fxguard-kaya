# Retrofit
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn retrofit2.KotlinExtensions
-dontwarn retrofit2.KotlinExtensions$*

# Gson — مدل‌های API و هر کلاسی که با Gson دی‌سریال می‌شود
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.kaya.crm.data.models.** { *; }

# Gson: کلاس خصوصی داخل ApiErrorParser (reflection)
-keep class com.kaya.crm.data.util.ApiErrorParser$ErrorResponse { *; }
-keepclassmembers class com.kaya.crm.data.util.ApiErrorParser$ErrorResponse { *; }

# OkHttp / Conscrypt (R8)
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# Kotlin
-keep class kotlin.Metadata { *; }

# BuildConfig؛ بقیهٔ Hilt/Dagger از consumer rules وابستگی‌ها merge می‌شود
-keep class com.kaya.crm.BuildConfig { *; }
-keep @dagger.hilt.android.lifecycle.HiltViewModel class * { *; }
