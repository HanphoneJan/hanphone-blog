// 统一数据库连接方式
let getDbConnection;
try {
  const db = require('../../config/db');
  if (db && typeof db.getDbConnection === 'function') {
    getDbConnection = db.getDbConnection;
  }
} catch (err) {
  getDbConnection = null;
}

async function addTag(req, res) {
  let client;
  try {
    const { tagName, filesId } = req.body;

    if (!tagName || !filesId) {
      return res.status(400).json({ message: '缺少或无效的参数', status: 0 });
    }

    if (!getDbConnection) {
      return res.status(500).json({ status: 0, message: '服务器配置错误：无法获取数据库连接函数' });
    }

    client = await getDbConnection();
    let tagId;

    // 检查标签是否存在
    const tagResult = await client.query(
      'SELECT id FROM atlas_tag WHERE name = $1',
      [tagName]
    );
    const tagRows = tagResult.rows;

    if (tagRows.length > 0) {
      tagId = tagRows[0].id;
    } else {
      // 插入新标签
      const insertResult = await client.query(
        'INSERT INTO tag (name) VALUES ($1) RETURNING id',
        [tagName]
      );
      tagId = insertResult.rows[0].id;
    }

    // 关联文件和标签
    const assocResult = await client.query(
      'INSERT INTO atlas_files_tag (files_id, tag_id) VALUES ($1, $2) RETURNING *',
      [filesId, tagId]
    );

    if (assocResult.rows.length > 0) {
      res.json({ message: '操作成功', status: 830 });
    } else {
      res.json({ message: '未找到该记录或没有更改', status: 0 });
    }
  } catch (error) {
    res.status(500).json({ message: `数据库错误: ${error.message}`, status: 0 });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { addTag };