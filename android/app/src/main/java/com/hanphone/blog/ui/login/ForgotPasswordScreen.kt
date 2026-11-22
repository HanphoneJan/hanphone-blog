package com.hanphone.blog.ui.login

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.hanphone.blog.R
import com.hanphone.blog.data.repo.BlogRepository
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.imeLiftAboveKeyboard
import com.hanphone.blog.ui.components.rememberToast
import com.hanphone.blog.util.emailError
import com.hanphone.blog.util.passwordError
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * 忘记密码：向注册邮箱发通用验证码，验证后设置新密码（POST /user/resetPassword）。
 * 后端重置成功会令该用户全端下线，所以这里不自动登录，回到登录页让用户用新密码登录。
 */
@Composable
fun ForgotPasswordScreen(onBack: () -> Unit, onDone: () -> Unit) {
    val repo = remember { BlogRepository() }
    val scope = rememberCoroutineScope()

    var email by remember { mutableStateOf("") }
    var captcha by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var submitting by remember { mutableStateOf(false) }
    var countdown by remember { mutableIntStateOf(0) }

    LaunchedEffect(countdown) {
        if (countdown > 0) { delay(1000); countdown-- }
    }

    val toast = rememberToast()

    fun sendCaptcha() {
        emailError(email)?.let { toast(it); return }
        if (countdown > 0) return
        scope.launch {
            try {
                val res = repo.sendGeneralCaptcha(email.trim())
                // 该接口失败时也是 flag=true，必须再看 code（200 = OK）
                if (!res.flag || res.code != 200) {
                    toast(res.message.ifBlank { "发送验证码失败" })
                    return@launch
                }
                // 成功无需 toast：按钮随即进入 60s 倒计时即反馈
                countdown = 60
            } catch (e: Exception) {
                toast(e.message ?: "发送验证码失败")
            }
        }
    }

    fun doReset() {
        emailError(email)?.let { toast(it); return }
        if (captcha.isBlank()) { toast("请输入验证码"); return }
        passwordError(newPassword)?.let { toast(it); return }
        if (newPassword != confirmPassword) { toast("两次输入的密码不一致"); return }
        scope.launch {
            submitting = true
            try {
                val res = repo.resetPassword(email.trim(), captcha.trim(), newPassword)
                // 失败时后端返回 flag=true + code=201，所以两条件都要判
                if (res.flag && res.code == 200) {
                    toast("密码重置成功，请用新密码登录")
                    onDone()
                } else {
                    toast(res.message.ifBlank { "重置密码失败" })
                }
            } catch (e: Exception) {
                toast(e.message ?: "网络错误")
            }
            submitting = false
        }
    }

    Column(Modifier.fillMaxSize()) {
        AppBackBar(title = "", onBack = onBack)
        Column(
            Modifier.fillMaxSize().imeLiftAboveKeyboard().verticalScroll(rememberScrollState())
                .padding(horizontal = 32.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Image(
                painter = painterResource(R.drawable.ic_blog),
                contentDescription = "云林有风",
                modifier = Modifier.size(68.dp).clip(CircleShape).align(Alignment.CenterHorizontally),
                contentScale = ContentScale.Crop
            )
            Text(
                "找回密码",
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.align(Alignment.CenterHorizontally).padding(bottom = 2.dp)
            )
            Text(
                "向注册邮箱发送验证码，验证后设置新密码",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
            )

            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("邮箱") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                    modifier = Modifier.weight(1f),
                    textStyle = MaterialTheme.typography.bodyMedium
                )
                OutlinedButton(
                    onClick = { sendCaptcha() },
                    enabled = countdown == 0,
                    modifier = Modifier.height(56.dp)
                ) {
                    Text(if (countdown > 0) "${countdown}s" else "获取验证码")
                }
            }
            OutlinedTextField(
                value = captcha,
                onValueChange = { captcha = it },
                label = { Text("验证码") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                modifier = Modifier.fillMaxWidth(),
                textStyle = MaterialTheme.typography.bodyMedium
            )
            OutlinedTextField(
                value = newPassword,
                onValueChange = { newPassword = it },
                label = { Text("新密码") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Next),
                modifier = Modifier.fillMaxWidth(),
                textStyle = MaterialTheme.typography.bodyMedium
            )
            OutlinedTextField(
                value = confirmPassword,
                onValueChange = { confirmPassword = it },
                label = { Text("确认新密码") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { doReset() }),
                modifier = Modifier.fillMaxWidth(),
                textStyle = MaterialTheme.typography.bodyMedium
            )

            Button(
                onClick = { doReset() },
                enabled = !submitting,
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
            ) {
                Text(if (submitting) "提交中…" else "重置密码")
            }
        }
    }
}
