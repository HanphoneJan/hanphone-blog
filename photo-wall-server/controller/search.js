// 数据库连接函数处理
let getDbConnection;
try {
  const db = require('../config/db');
  if (db && typeof db.getDbConnection === 'function') {
    getDbConnection = db.getDbConnection;
  }
} catch (err) {
  getDbConnection = null;
}

/**
 * 处理搜索请求
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function search(req, res) {
  let client;
  // 限制请求方法为POST
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').json({ 
      message: '仅支持 POST 请求', 
      status: 0 
    });
  }

  try {
    const { query } = req.body; // 移除分页参数
    const trimmedQuery = query?.trim();

    // 验证查询参数
    if (!trimmedQuery) {
      return res.status(400).json({ 
        message: '查询参数不能为空', 
        status: 0, 
        data: []
      });
    }

    // 检查数据库连接函数是否存在
    if (!getDbConnection) {
      return res.status(500).json({ 
        status: 0, 
        message: '服务器配置错误：无法获取数据库连接函数',
        data: []
      });
    }

    // 防SQL注入处理（使用PostgreSQL参数化查询）
    const searchPattern = `%${trimmedQuery}%`;
    client = await getDbConnection();

    // PostgreSQL使用$1, $2...作为参数占位符
    const result = await client.query(
      `SELECT id, title, author, path, upload_time, likes 
       FROM atlas_files 
       WHERE (title LIKE $1 OR author LIKE $2) AND type != 0`,
      [searchPattern, searchPattern]
    );
    // PostgreSQL查询结果在result.rows中
    const rows = result.rows;

    return res.json({ 
      message: rows.length > 0 ? '查询成功' : '未找到匹配记录', 
      status: 830, 
      data: rows
    });

  } catch (error) {
    console.error('搜索错误:', error); // 记录错误日志
    return res.status(500).json({ 
      message: '查询失败，请稍后重试', 
      status: 0,
      data: []
    });
  } finally {
    // 释放数据库连接
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { search };
