package com.hanphone.blog.ui.login

import android.util.Log
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.hanphone.blog.core.AuthData
import com.hanphone.blog.core.auth
import com.hanphone.blog.core.saveAuth
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.repo.BlogRepository
import com.hanphone.blog.util.md5Hex
import kotlinx.coroutines.launch

/**
 * 登录页：用户名 + 密码 → POST /login → 保存 token（内存 + DataStore）。
 * 登录后可点赞 / 随笔评论。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(onBack: () -> Unit, onSuccess: () -> Unit, onRegister: () -> Unit) {
    val context = LocalContext.current
    val repo = remember { BlogRepository() }
    val scope = rememberCoroutineScope()

    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }

    fun toast(msg: String) = Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()

    fun doLogin() {
        if (username.isBlank() || password.isBlank()) {
            toast("请输入用户名和密码")
            return
        }
        scope.launch {
            loading = true
            try {
                val res = repo.login(username.trim(), md5Hex(password))
                val d = res.data
                Log.i("BlogLogin", "flag=${res.flag} code=${res.code} msg=${res.message} data=${d != null}")
                if (res.flag && d != null && d.token != null && d.user != null) {
                    val uid = d.user.id
                    TokenStore.restore(d.token, uid, d.user.nickname, d.user.avatar, d.user.type)
                    context.saveAuth(AuthData(d.token, uid, d.user.nickname, d.user.avatar, d.user.type))
                    toast("欢迎回来，${d.user.nickname ?: username}")
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

    Column(Modifier.fillMaxSize()) {
        TopAppBar(
            title = {},
            navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "返回") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            windowInsets = WindowInsets(0.dp)
        )
        Column(
            Modifier.fillMaxSize().padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                Modifier.size(72.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Text("云", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
            }
            Text("登录云林有风", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 12.dp, bottom = 20.dp))

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
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                textStyle = MaterialTheme.typography.bodyMedium
            )
            Button(
                onClick = { doLogin() },
                enabled = !loading,
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp)
            ) {
                Text(if (loading) "登录中…" else "登录")
            }
            Text(
                "登录后可点赞、发表随笔评论",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 16.dp)
            )
            TextButton(onClick = onRegister, modifier = Modifier.padding(top = 8.dp)) {
                Text("没有账号？立即注册")
            }
        }
    }
}