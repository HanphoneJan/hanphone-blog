// db.js 优化
const { Pool } = require('pg');

// 全局创建一个连接池
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'blog',
  port: process.env.DB_PORT || 5432,
  max: 20, // 最大连接数（可选）
  idleTimeoutMillis: 30000 // 连接空闲超时（可选）
});

async function getDbConnection() {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    throw new Error(`数据库连接失败: ${error.message}`);
  }
}

module.exports = { getDbConnection };