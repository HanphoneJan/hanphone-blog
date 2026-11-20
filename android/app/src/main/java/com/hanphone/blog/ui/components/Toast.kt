package com.hanphone.blog.ui.components

import android.widget.Toast
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

/**
 * 页面级轻提示：`val toast = rememberToast()`，避免每个页面自己 new 一个 `fun toast`。
 * 文案与时机遵循 HANDOVER 的 Toast 原则（成功且 UI 已有反馈就不弹）。
 */
@Composable
fun rememberToast(): (String) -> Unit {
    val context = LocalContext.current
    return remember(context) {
        { message: String ->
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        }
    }
}

/**
 * VM 的一次性提示（`message` 变化即弹一次并清空），替代各页手写的
 * `LaunchedMessage(vm.message) { Toast.makeText(...); vm.consumeMessage() }`。
 */
@Composable
fun ToastMessage(message: String?, onConsumed: () -> Unit) {
    val toast = rememberToast()
    LaunchedEffect(message) {
        if (message != null) {
            toast(message)
            onConsumed()
        }
    }
}
