const { getDbConnection } = require('../../config/db');

let dbConnection;
try {
  const db = require('../../config/db');
  if (db && typeof typeof db.getDbConnection === 'function') {
    dbConnection = db.getDbConnection;
  }
} catch (err) {
  dbConnection = null;
}

async function deleteTag(req, res) {
  let client;
  try {
    const { tagId } = req.body;
    if (tagId === undefined) {
      return res.status(400).json({ message: '缺少id参数', status: 0 });
    }

    if (!dbConnection) {
      return res.status(500).json({ status: 0, message: '服务器配置错误：无法获取数据库连接函数' });
    }

    client = await dbConnection();
    await client.query('BEGIN');

    // 删除关联记录
    await client.query('DELETE FROM atlas_files_tag WHERE tag_id = $1', [tagId]);
    
    // 删除标签
    const result = await client.query('DELETE FROM atlas_tag WHERE id = $1', [tagId]);
    
    await client.query('COMMIT');

    if (result.rowCount > 0) {
      res.json({ message: '删除成功', status: 830 });
    } else {
      res.json({ message: '删除失败: 未找到标签', status: 0 });
    }
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    res.status(500).json({ message: `删除失败: ${error.message}`, status: 0 });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { deleteTag };