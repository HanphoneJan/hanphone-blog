// 统一数据库连接方式
let dbConnection;
try {
  const db = require('../config/db');
  if (db && typeof db.getDbConnection === 'function') {
    dbConnection = db.getDbConnection;
  }
} catch (err) {
  dbConnection = null;
}

async function getTag(req, res) {
  let client;
  try {
    if (!dbConnection) {
      return res.status(500).json({ status: 0, message: '服务器配置错误：无法获取数据库连接函数' });
    }

    client = await dbConnection();
    const result = await client.query('SELECT * FROM atlas_tag');
    const tags = result.rows;

    res.json({ message: '查询标签成功', status: 830, data: tags });
  } catch (error) {
    res.status(500).json({ message: error.message, status: 0 });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { getTag };