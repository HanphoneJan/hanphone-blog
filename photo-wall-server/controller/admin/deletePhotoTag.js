let dbConnection;
try {
  const db = require('../../config/db');
  if (db && typeof db.getDbConnection === 'function') {
    dbConnection = db.getDbConnection;
  }
} catch (err) {
  dbConnection = null;
}

async function deletePhotoTag(req, res) {
  let client;
  try {
    res.setHeader('Content-Type', 'application/json');

    const { tagId, filesId } = req.body;

    if (tagId === undefined || filesId === undefined) {
      return res.json({ 
        message: '缺少tag_id或files_id参数', 
        status: 0 
      });
    }

    const tagIdInt = parseInt(tagId, 10);
    const filesIdStr = String(filesId);

    if (isNaN(tagIdInt)) {
      return res.json({ 
        message: 'tag_id必须为有效的整数', 
        status: 0 
      });
    }

    if (!dbConnection) {
      return res.status(500).json({ status: 0, message: '服务器配置错误：无法获取数据库连接函数' });
    }

    client = await dbConnection();
    await client.query('BEGIN');

    const deleteQuery = `
      DELETE FROM atlas_files_tag 
      WHERE tag_id = $1 AND files_id = $2
    `;
    const result = await client.query(deleteQuery, [tagIdInt, filesIdStr]);

    if (result.rowCount === 0) {
      throw new Error('未找到匹配的标签关联记录');
    }

    await client.query('COMMIT');

    res.json({
      message: '删除成功',
      status: 830
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    res.json({
      message: `删除失败: ${error.message}`,
      status: 0
    });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { deletePhotoTag };