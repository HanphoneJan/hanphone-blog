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

async function deletePhoto(req, res) {
  let client;
  try {
    const { fileId } = req.body;
    if (!fileId) {
      return res.status(400).json({ message: '缺少id参数', status: 0 });
    }

    if (!dbGetConnection) {
      return res.status(500).json({ status: 0, message: '服务器配置错误：无法获取数据库连接函数' });
    }

    client = await dbGetConnection();
    
    // 查询文件是否存在
    const result = await client.query('SELECT id FROM atlas_files WHERE id = $1', [fileId]);
    if (result.rows.length === 0) {
      return res.json({ message: '未找到文件', status: 0 });
    }

    // 仅删除数据库记录
    await client.query('DELETE FROM atlas_files WHERE id = $1', [fileId]);

    res.json({ message: '文件记录删除成功', status: 830 });
  } catch (error) {
    res.status(500).json({ message: `删除失败: ${error.message}`, status: 0 });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { deletePhoto };