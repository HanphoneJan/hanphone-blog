package com.hanphone.blog.ui.login

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.hanphone.blog.core.AuthData
import com.hanphone.blog.core.saveAuth
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.repo.BlogRepository
import com.hanphone.blog.util.md5Hex
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val PASSWORD_PATTERN = Regex("^(?=.*[A-Za-z])(?=.*\\d).+$")

/**
 * 注册页：用户名/昵称/邮箱 + 邮箱验证码 + 密码。
 * 注册成功后后端直接返回 token，自动登录并返回。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(onBack: () -> Unit, onSuccess: () -> Unit) {
    val context = LocalContext.current
    val repo = remember { BlogRepository() }
    val scope = rememberCoroutineScope()

    var username by remember { mutableStateOf("") }
    var nickname by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var captcha by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    var countdown by remember { mutableIntStateOf(0) }

    LaunchedEffect(countdown) {
        if (countdown > 0) { delay(1000); countdown-- }
    }

    fun toast(msg: String) = Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()

    fun sendCaptcha() {
        if (email.isBlank()) { toast("请先填写邮箱"); return }
        if (countdown > 0) return
        scope.launch {
            try {
                val res = repo.sendRegisterCaptcha(email.trim())
                toast(res.message.ifBlank { "验证码已发送，请查收邮箱" })
                countdown = 60
            } catch (e: Exception) {
                toast(e.message ?: "发送失败")
            }
        }
    }

    fun doRegister() {
        if (username.isBlank() || email.isBlank() || password.isBlank() || captcha.isBlank()) {
            toast("请填写完整信息"); return
        }
        if (password.length < 6) { toast("密码长度不能少于 6 位"); return }
        if (!PASSWORD_PATTERN.matches(password)) { toast("密码必须包含字母和数字"); return }
        scope.launch {
            sending = true
            try {
                val res = repo.register(username.trim(), nickname.trim().ifEmpty { username.trim() }, email.trim(), md5Hex(password), "", captcha.trim())
                val d = res.data
                if (res.flag && d != null && d.token != null && d.user != null) {
                    val uid = d.user.id
                    TokenStore.restore(d.token, uid, d.user.nickname, d.user.avatar, d.user.type)
                    context.saveAuth(AuthData(d.token, uid, d.user.nickname, d.user.avatar, d.user.type))
                    toast("注册成功，欢迎 ${d.user.nickname ?: username}")
                    onSuccess()
                } else {
                    toast(res.message.ifBlank { "注册失败" })
                }
            } catch (e: Exception) {
                toast(e.message ?: "网络错误")
            }
            sending = false
        }
    }

    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            title = {},
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "返回") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            windowInsets = WindowInsets(0.dp)
        )
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 32.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                Modifier.size(64.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer).align(Alignment.CenterHorizontally),
                contentAlignment = Alignment.Center
            ) {
                Text("云", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onPrimaryContainer)
            }
            Text("注册云林有风", style = MaterialTheme.typography.titleLarge, modifier = Modifier.align(Alignment.CenterHorizontally).padding(bottom = 8.dp))

            OutlinedTextField(username, { username = it }, label = { Text("用户名") }, singleLine = true, modifier = Modifier.fillMaxWidth(), textStyle = MaterialTheme.typography.bodyMedium)
            OutlinedTextField(nickname, { nickname = it }, label = { Text("昵称（可选）") }, singleLine = true, modifier = Modifier.fillMaxWidth(), textStyle = MaterialTheme.typography.bodyMedium)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(email, { email = it }, label = { Text("邮箱") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), modifier = Modifier.weight(1f), textStyle = MaterialTheme.typography.bodyMedium)
                OutlinedButton(onClick = { sendCaptcha() }, enabled = countdown == 0, modifier = Modifier.height(56.dp)) {
                    Text(if (countdown > 0) "${countdown}s" else "获取验证码")
                }
            }
            OutlinedTextField(password, { password = it }, label = { Text("密码") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { doRegister() }), modifier = Modifier.fillMaxWidth(), textStyle = MaterialTheme.typography.bodyMedium)
            OutlinedTextField(captcha, { captcha = it }, label = { Text("邮箱验证码") }, singleLine = true, modifier = Modifier.fillMaxWidth(), textStyle = MaterialTheme.typography.bodyMedium)

            Button(onClick = { doRegister() }, enabled = !sending, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                Text(if (sending) "注册中…" else "注册并登录")
            }
            TextButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                Text("已有账号？去登录")
            }
        }
    }
}