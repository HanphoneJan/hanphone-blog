let getDbConnection;
try {
  const db = require('../../config/db');
  if (db && typeof db.getDbConnection === 'function') {
    getDbConnection = db.getDbConnection;
  }
} catch (err) {
  getDbConnection = null;
}

async function adminUpdate(req, res) {
  let client;
  try {
    const { id, author, username, description, title, type, likes } = req.body;

    if (!id) {
      return res.status(400).json({ message: '缺少或无效的id参数', status: 0 });
    }

    if (!getDbConnection) {
      return res.status(500).json({ status: 0, message: '服务器配置错误：无法获取数据库连接函数' });
    }

    // 构建动态更新字段
    const updateFields = [];
    const params = [];

    if (author !== undefined) {
      updateFields.push(`author = $${params.length + 1}`);
      params.push(author);
    }
    if (username !== undefined) {
      updateFields.push(`username = $${params.length + 1}`);
      params.push(username);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${params.length + 1}`);
      params.push(description);
    }
    if (title !== undefined) {
      updateFields.push(`title = $${params.length + 1}`);
      params.push(title);
    }
    if (type !== undefined) {
      updateFields.push(`type = $${params.length + 1}`);
      params.push(type);
    }
    if (likes !== undefined) {
      updateFields.push(`likes = $${params.length + 1}`);
      params.push(likes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: '没有提供要更新的字段', status: 0 });
    }

    params.push(id);
    const query = `UPDATE atlas_files SET ${updateFields.join(', ')} WHERE id = $${params.length}`;
    
    client = await getDbConnection();
    const result = await client.query(query, params);

    if (result.rowCount > 0) {
      res.json({ message: '更新图片数据成功', status: 830 });
    } else {
      res.json({ message: '未找到该图片或没有更改', status: 0 });
    }
  } catch (error) {
    res.status(500).json({ message: `修改图片数据失败: ${error.message}`, status: 0 });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { adminUpdate };