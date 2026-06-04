// 调整数据库连接获取方式
let dbGetConnection;
try {
  const db = require('../../config/db');
  if (db && typeof db.getDbConnection === 'function') {
    dbGetConnection = db.getDbConnection;
  }
} catch (err) {
  dbGetConnection = null;
}

async function createTag(req, res) {
  // 允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  let client;
  try {
    const { tag } = req.body;
    if (!tag) {
      return res.status(400).json({ message: '缺少或无效的tag参数', status: 0 });
    }

    const { id, name } = tag;

    if (!dbGetConnection) {
      return res.status(500).json({ status: 0, message: '服务器配置错误：无法获取数据库连接函数' });
    }

    client = await dbGetConnection();

    // 检查标签是否存在
    const existingResult = await client.query(
      'SELECT id FROM atlas_tag WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length > 0) {
      // 更新标签
      await client.query('UPDATE atlas_tag SET name = $1 WHERE id = $2', [name, id]);
      res.json({ message: '更新标签成功', status: 830 });
    } else {
      // 新增标签
      await client.query('INSERT INTO atlas_tag (name) VALUES ($1)', [name]);
      res.json({ message: '新增标签成功', status: 830 });
    }
  } catch (error) {
    res.status(500).json({ message: error.message, status: 0 });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { createTag };