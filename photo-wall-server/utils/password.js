const bcrypt = require('bcrypt');

/**
 * 加密密码
 * @param {string} password 原始密码
 * @returns {Promise<string>} 加密后的哈希值
 */
async function encrypt(password) {
    // 生成盐值，workFactor为12（默认值，值越大加密越慢，安全性越高）
    const salt = await bcrypt.genSalt(12);
    // 使用盐值对密码进行加密
    return bcrypt.hash(password, salt);
}

/**
 * 验证密码
 * @param {string} password 原始密码
 * @param {string} hashedPassword 加密后的哈希值
 * @returns {Promise<boolean>} 验证成功返回true，否则返回false
 */
async function verify(password, hashedPassword) {
    // 处理空值情况，避免抛出异常
    if (!password || !hashedPassword) {
        return false;
    }
    // 验证密码与哈希值是否匹配
    return bcrypt.compare(password, hashedPassword);
}

module.exports = {
    encrypt,
    verify
};