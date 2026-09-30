# 云林有风 Android App ProGuard 规则
# release 暂未启用混淆(isMinifyEnabled=false)，此文件为后续开启预留。
# Retrofit / Gson 模型如果开启混淆，需要保留 data.model 包：
# -keep class com.hanphone.blog.data.model.** { *; }