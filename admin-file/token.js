const jwt = require('jsonwebtoken');
require('dotenv').config();
const { logger } = require('./logger');

const config = {
  SECRET_KEY: process.env.SECRET_KEY || process.env.JWT_SECRET || '',
  ISSUER: process.env.JWT_ISSUER || 'auth0'
};

if (!config.SECRET_KEY) {
  logger.error('未配置 SECRET_KEY / JWT_SECRET 环境变量，拒绝启动以避免使用不安全的默认密钥');
  process.exit(1);
}

function createToken(userId, userType) {
  userId = userId.toString();
  return jwt.sign(
    {  userId,userType },  // 载荷
    config.SECRET_KEY,                     // 密钥
    {                                         // 配置项（合并所有参数）
      issuer: config.ISSUER,
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
        issuer: config.ISSUER,  // 验证issuer
        algorithms: ['HS256']  // 显式指定允许的算法，增强安全性
      }
    );
  } catch (error) {
    logger.warn('验证Token失败', { error: error.message, token: token.substring(0, 20) + '...' });
    return false;
  }
}

module.exports = { createToken, verifyToken };