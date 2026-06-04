const jwt = require('jsonwebtoken');
require('dotenv').config();
const { logger } = require('./logger');

const config = {
  SECRET_KEY: process.env.SECRET_KEY || 'your-default-secret-key-change-in-production'
};

function createToken(userId, userType) {
  userId = userId.toString();
  return jwt.sign(
    {  userId,userType },  // 载荷
    config.SECRET_KEY,                     // 密钥
    {                                         // 配置项（合并所有参数）
      issuer: 'auth0',
      expiresIn: '7d',
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
        issuer: 'auth0',  // 验证issuer
        algorithms: ['HS256']  // 显式指定允许的算法，增强安全性
      }
    );
  } catch (error) {
    logger.warn('验证Token失败', { error: error.message, token: token.substring(0, 20) + '...' });
    return false;
  }
}

module.exports = { createToken, verifyToken };