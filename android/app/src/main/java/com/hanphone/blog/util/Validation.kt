package com.hanphone.blog.util

private val EMAIL_PATTERN = Regex("""^[^@\s]+@[^@\s]+\.[^@\s]+$""")
private val PASSWORD_PATTERN = Regex("""^(?=.*[a-zA-Z])(?=.*\d).+$""")

/**
 * 表单校验规则集中地：邮箱、昵称、密码。
 * 返回 null 表示通过，否则返回可直接 Toast 的文案——各页面不再各写一份正则。
 */
fun isValidEmail(email: String): Boolean = EMAIL_PATTERN.matches(email.trim())

fun emailError(email: String): String? =
    if (isValidEmail(email)) null else "请输入有效的邮箱地址"

fun nicknameError(nickname: String, min: Int = 2, max: Int = 10): String? =
    if (nickname.trim().length in min..max) null else "昵称长度在 $min-$max 个字符之间"

fun passwordError(password: String, min: Int = 6, max: Int = 20): String? = when {
    password.length !in min..max -> "密码长度在 $min-$max 个字符之间"
    !PASSWORD_PATTERN.matches(password) -> "密码必须包含字母和数字"
    else -> null
}
