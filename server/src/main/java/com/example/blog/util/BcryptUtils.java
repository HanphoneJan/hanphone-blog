package com.example.blog.util;

import org.mindrot.jbcrypt.BCrypt;

/**
 * 对字符串进行 Bcrypt 加密处理及验证
 * Bcrypt 是一种更安全的密码哈希算法，自带盐值且计算速度较慢，能有效抵御暴力破解
 */
public class BcryptUtils {

    /**
     * 加密密码
     * @param password 原始密码
     * @return 加密后的哈希值
     */
    public static String encrypt(String password) {
        // 生成随机盐值并加密，workFactor为12（默认值，可根据需要调整，值越大加密越慢，安全性越高）
        return BCrypt.hashpw(password, BCrypt.gensalt(12));
    }

    /**
     * 验证密码
     * @param password 原始密码
     * @param hashedPassword 加密后的哈希值
     * @return 验证成功返回true，否则返回false
     */
    public static boolean verify(String password, String hashedPassword) {
        // 注意：如果hashedPassword为null或空，会抛出异常，这里做一下保护
        if (password == null || hashedPassword == null || hashedPassword.isEmpty()) {
            return false;
        }
        return BCrypt.checkpw(password, hashedPassword);
    }

}
