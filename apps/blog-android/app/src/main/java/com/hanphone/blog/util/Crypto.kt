package com.hanphone.blog.util

import java.security.MessageDigest

/**
 * MD5 十六进制小写。
 * 与网站前端完全一致：登录/注册时先把明文密码 md5 后再送给后端
 * （后端 bcrypt 存储/校验的是 md5(明文)）。
 */
fun md5Hex(input: String): String {
    val digest = MessageDigest.getInstance("MD5").digest(input.toByteArray())
    return digest.joinToString("") { "%02x".format(it) }
}