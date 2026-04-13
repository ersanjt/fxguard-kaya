# Retrofit + Gson (annotations برای @SerializedName و متدهای HTTP)
-keepattributes Signature, InnerClasses, EnclosingMethod, RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations, *Annotation*
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn retrofit2.KotlinExtensions
-dontwarn retrofit2.KotlinExtensions$*

# OkHttp / Conscrypt (R8)
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# Kotlin
-keep class kotlin.Metadata { *; }

# BuildConfig
-keep class com.kaya.crm.BuildConfig { *; }
-keep @dagger.hilt.android.lifecycle.HiltViewModel class * { *; }

# کلاس‌های ما + تولید Hilt/KSP (بدون این، release با R8 اغلب بلافاصله کرش می‌کند)
-keep class com.kaya.crm.** { *; }
