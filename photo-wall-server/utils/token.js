const jwt = require('jsonwebtoken');
const config = require('../config/config');

function createToken(userId, userType) {
  userId = userId.toString();
  return jwt.sign(
    {  userId,userType },  // 载荷
    config.SECRET_KEY,                     // 密钥
    {                                         // 配置项（合并所有参数）
      issuer: config.JWT_ISSUER || 'auth0',
      expiresIn: config.JWT_EXPIRES_IN,
      algorithm: 'HS256'                     // 算法配置移到这里
    }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(
      token,
      config.SECRET_KEY,  // 密钥保持一致
      {
        issuer: config.JWT_ISSUER || 'auth0',  // 验证issuer
        algorithms: ['HS256']  // 显式指定允许的算法，增强安全性
        // 移除audience验证，与生成逻辑保持一致
      }
    );
  } catch (error) {
    console.error('验证Token失败', error);  // 增加错误日志
    return false;
  }
}

module.exports = { createToken, verifyToken };