// 统一数据库连接方式
let getDbConnection;
try {
  const db = require('../config/db');
  if (db && typeof db.getDbConnection === 'function') {
    getDbConnection = db.getDbConnection;
  }
} catch (err) {
  getDbConnection = null;
}

async function visitCount(req, res) {
  let client;
  try {
    if (!getDbConnection) {
      return res.status(500).json({ status: 0, message: '服务器配置错误：无法获取数据库连接函数' });
    }

    client = await getDbConnection();
    // 增加访问计数
    await client.query('UPDATE atlas_visitcounts SET visit_count = visit_count + 1 WHERE id = 1');
    // 获取当前访问计数
    const result = await client.query('SELECT visit_count FROM atlas_visitcounts WHERE id = 1');
    res.json({ visitCount: result.rows[0].visit_count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { visitCount };