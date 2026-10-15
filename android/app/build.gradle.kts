plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    alias(libs.plugins.google.services) apply false
}

// Google 服务插件（FCM）：仅在放置 android/app/google-services.json 时启用。
// 官方文档是无条件 apply，但 missing 该文件会直接让构建失败；此处做存在性判断，
// 缺失时构建照常成功，FCM 相关代码在运行时自动禁用（BuildConfig.FCM_CONFIGURED / PushRegistrar）。
// 放好 google-services.json 后本插件会自动生效；若要强制（缺失即报错），把下面 if 去掉即可。
if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

android {
    namespace = "com.hanphone.blog"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.hanphone.blog"
        minSdk = 26
        targetSdk = 35
        versionCode = 18
        versionName = "1.0.4"
        // 是否放置了 Firebase 配置（android/app/google-services.json）；缺失时 FCM 自动禁用
        buildConfigField("boolean", "FCM_CONFIGURED", file("google-services.json").exists().toString())
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    buildTypes {
        debug {
            buildConfigField("String", "API_BASE_URL", "\"https://hanphone.cn/api/\"")
            // 局域网真机联调可改成： http://<电脑IP>:8090/api/ （需在 debug manifest 开明文流量）
        }
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            buildConfigField("String", "API_BASE_URL", "\"https://hanphone.cn/api/\"")
            // 自分发：用 debug 密钥签名，便于直接安装/升级（正式商店签名留作 S5）
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(libs.core.ktx)
    implementation(libs.webkit)
    implementation(libs.lifecycle.runtime.ktx)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.activity.compose)

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)

    implementation(libs.paging.compose)
    implementation(libs.markdown.renderer.m3)
    implementation(libs.markdown.renderer.coil2)
    implementation(libs.markdown.renderer.code)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons.extended)
    implementation(libs.navigation.compose)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.moshi)
    implementation(libs.moshi.kotlin)
    implementation(libs.okhttp.logging)
    implementation(libs.coil.compose)
    implementation(libs.datastore.preferences)
    implementation(libs.socketio.client)

    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)
}