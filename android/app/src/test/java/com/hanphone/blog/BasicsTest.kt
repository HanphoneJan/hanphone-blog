package com.hanphone.blog

import com.hanphone.blog.data.update.isNewerVersion
import com.hanphone.blog.util.emailError
import com.hanphone.blog.util.isValidEmail
import com.hanphone.blog.util.nicknameError
import com.hanphone.blog.util.passwordError
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 纯函数回归：版本比较（启动检查更新用）、表单校验、密码规则。
 * 这些逻辑以前散落在各页面，抽出来后才能被测试。
 */
class BasicsTest {

    @Test
    fun newerVersionSupportsPrefixAndDifferentSegmentCounts() {
        assertTrue(isNewerVersion("v1.3.1", "1.3.0"))
        assertTrue(isNewerVersion("1.3", "1.2.9"))
        assertFalse(isNewerVersion("v1.3.0", "1.3.0"))
        assertFalse(isNewerVersion("1.2.9", "1.3"))
    }

    @Test
    fun emailValidation() {
        assertTrue(isValidEmail("a@b.cn"))
        assertTrue(isValidEmail("  a.b@c.d  "))
        assertFalse(isValidEmail("a@b"))
        assertFalse(isValidEmail("a b@c.d"))
        assertNull(emailError("a@b.cn"))
        assertEquals("请输入有效的邮箱地址", emailError("bad"))
    }

    @Test
    fun nicknameLengthRules() {
        assertNull(nicknameError("寒枫"))
        assertEquals("昵称长度在 2-10 个字符之间", nicknameError("a"))
        assertEquals("昵称长度在 2-10 个字符之间", nicknameError("12345678901"))
    }

    @Test
    fun passwordRules() {
        assertNull(passwordError("abcd1234"))
        assertEquals("密码长度在 6-20 个字符之间", passwordError("ab1"))
        assertEquals("密码必须包含字母和数字", passwordError("abcdefgh"))
    }
}
