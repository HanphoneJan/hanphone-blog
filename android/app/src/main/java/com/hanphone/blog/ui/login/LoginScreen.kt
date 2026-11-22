package com.hanphone.blog.ui.login

import android.util.Log
import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.foundation.background
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.material3.OutlinedButton
import com.hanphone.blog.R
import com.hanphone.blog.ui.components.rememberToast
import com.hanphone.blog.ui.components.AppBackBar
import com.hanphone.blog.ui.components.imeLiftAboveKeyboard
import com.hanphone.blog.core.applyLogin
import com.hanphone.blog.data.auth.OAuthLogin
import com.hanphone.blog.data.repo.BlogRepository
import kotlinx.coroutines.launch

/**
 * 登录页：用户名 + 密码 → POST /login → 保存 token（内存 + DataStore）。
 * 登录后可点赞 / 随笔评论。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onBack: () -> Unit,
    onSuccess: () -> Unit,
    onRegister: () -> Unit,
    onForgotPassword: () -> Unit
) {
    val context = LocalContext.current
    val repo = remember { BlogRepository() }
    val scope = rememberCoroutineScope()

    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }

    val toast = rememberToast()

    fun doLogin() {
        if (username.isBlank() || password.isBlank()) {
            toast("请输入用户名和密码")
            return
        }
        scope.launch {
            loading = true
            try {
                val res = repo.login(username.trim(), password)
                val d = res.data
                Log.i("BlogLogin", "flag=${res.flag} code=${res.code} msg=${res.message} data=${d != null}")
                if (res.flag && d != null && d.token != null && d.user != null) {
                    context.applyLogin(d)
                    // 成功无需 toast：页面随即返回「我的」，已切换为登录态即是最好的反馈
                    onSuccess()
                } else {
                    Log.e("BlogLogin", "登录被拒: ${res.message}")
                    toast(res.message.ifBlank { "登录失败" })
                }
            } catch (e: Exception) {
                Log.e("BlogLogin", "登录异常", e)
                toast(e.message ?: "网络错误")
            }
            loading = false
        }
    }

    /** 第三方登录：跳系统浏览器，回跳后由 MainActivity 收尾（这里不等待结果） */
    fun startOAuth(provider: String) {
        try {
            OAuthLogin.start(context, provider)
        } catch (e: Exception) {
            toast("未找到可用浏览器，无法完成授权")
        }
    }

    Column(Modifier.fillMaxSize()) {
        AppBackBar(title = "", onBack = onBack)
        // 四组（品牌 / 账号密码 / 第三方 / 注册）等距铺满整屏：
        // 居中会让顶部空一大块，顶对齐又让底部空一大块；等距分配两者都没有大空洞。
        // 组内保持紧凑（输入框和登录按钮不被拉开），组间均匀呼吸。
        Column(
            Modifier.fillMaxSize().imeLiftAboveKeyboard().verticalScroll(rememberScrollState())
                .padding(horizontal = 32.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceEvenly
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Image(
                    painter = painterResource(R.drawable.ic_blog),
                    contentDescription = "云林有风",
                    modifier = Modifier.size(60.dp).clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
                Text("登录云林有风", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 10.dp))
            }

            Column(Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("用户名") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodyMedium
                )
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("密码") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { doLogin() }),
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                    textStyle = MaterialTheme.typography.bodyMedium
                )
                // 忘记密码入口：右对齐紧跟密码框，不把登录按钮顶开
                TextButton(
                    onClick = onForgotPassword,
                    enabled = !loading,
                    modifier = Modifier.align(Alignment.End),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text("忘记密码？", style = MaterialTheme.typography.bodySmall)
                }
                Button(
                    onClick = { doLogin() },
                    enabled = !loading,
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp)
                ) {
                    Text(if (loading) "登录中…" else "登录")
                }
            }

            Column(Modifier.fillMaxWidth()) {
                // 分隔线替代说明文字：第三方登录走系统浏览器，用户点下去自然就懂
                Row(
                    Modifier.fillMaxWidth().padding(bottom = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    HorizontalDivider(Modifier.weight(1f), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                    Text(
                        "或",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 10.dp)
                    )
                    HorizontalDivider(Modifier.weight(1f), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f))
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { startOAuth(OAuthLogin.GITHUB) },
                        enabled = !loading,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("GitHub 登录")
                    }
                    OutlinedButton(
                        onClick = { startOAuth(OAuthLogin.GOOGLE) },
                        enabled = !loading,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Google 登录")
                    }
                }
            }

            TextButton(onClick = onRegister) {
                Text("没有账号？立即注册")
            }
        }
    }
}