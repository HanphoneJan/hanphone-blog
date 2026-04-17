package com.example.blog.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;

/**
 * BcryptUtils 工具类单元测试
 */
class BcryptUtilsTest {

    @Test
    @DisplayName("测试密码加密 - 加密后的密码应该与原始密码不同")
    void encrypt_ShouldReturnDifferentHash() {
        String password = "testPassword123";
        
        String hashed = BcryptUtils.encrypt(password);
        
        assertNotNull(hashed);
        assertNotEquals(password, hashed);
        assertTrue(hashed.startsWith("$2a$") || hashed.startsWith("$2b$"));
    }

    @Test
    @DisplayName("测试密码加密 - 相同密码加密后应该产生不同哈希（盐值不同）")
    void encrypt_SamePasswordShouldReturnDifferentHashes() {
        String password = "testPassword123";
        
        String hash1 = BcryptUtils.encrypt(password);
        String hash2 = BcryptUtils.encrypt(password);
        
        assertNotEquals(hash1, hash2);
    }

    @Test
    @DisplayName("测试密码验证 - 正确密码应该验证通过")
    void verify_CorrectPasswordShouldReturnTrue() {
        String password = "testPassword123";
        String hashed = BcryptUtils.encrypt(password);
        
        boolean result = BcryptUtils.verify(password, hashed);
        
        assertTrue(result);
    }

    @Test
    @DisplayName("测试密码验证 - 错误密码应该验证失败")
    void verify_WrongPasswordShouldReturnFalse() {
        String password = "testPassword123";
        String wrongPassword = "wrongPassword456";
        String hashed = BcryptUtils.encrypt(password);
        
        boolean result = BcryptUtils.verify(wrongPassword, hashed);
        
        assertFalse(result);
    }

    @Test
    @DisplayName("测试密码验证 - null 密码应该返回 false")
    void verify_NullPasswordShouldReturnFalse() {
        String hashed = BcryptUtils.encrypt("somePassword");
        
        boolean result = BcryptUtils.verify(null, hashed);
        
        assertFalse(result);
    }

    @Test
    @DisplayName("测试密码验证 - null 哈希应该返回 false")
    void verify_NullHashShouldReturnFalse() {
        boolean result = BcryptUtils.verify("somePassword", null);
        
        assertFalse(result);
    }

    @Test
    @DisplayName("测试密码验证 - 空哈希应该返回 false")
    void verify_EmptyHashShouldReturnFalse() {
        boolean result = BcryptUtils.verify("somePassword", "");
        
        assertFalse(result);
    }

    @Test
    @DisplayName("测试密码验证 - 空密码应该能验证通过自身加密")
    void verify_EmptyPasswordShouldWork() {
        String password = "";
        String hashed = BcryptUtils.encrypt(password);
        
        boolean result = BcryptUtils.verify(password, hashed);
        
        assertTrue(result);
    }
}
