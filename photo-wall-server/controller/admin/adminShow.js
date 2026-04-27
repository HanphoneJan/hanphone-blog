const { getDbConnection } = require('../../config/db');

async function adminShow(req, res) {
  let client;
  try {
    if (!getDbConnection) {
      return res.status(500).json({ status: 0, message: '服务器配置错误：无法获取数据库连接函数' });
    }

    client = await getDbConnection();
    
    // 查询所有文件（管理员权限）
    const filesResult = await client.query('SELECT * FROM atlas_files');
    const files = filesResult.rows;
    const data = [];

    for (const file of files) {
      // 查询文件关联的标签
      const tagRelationsResult = await client.query(
        'SELECT tag_id FROM atlas_files_tag WHERE files_id = $1',
        [file.id]
      );
      const tagRelations = tagRelationsResult.rows;

      const tags = [];
      for (const relation of tagRelations) {
        const tagRowsResult = await client.query(
          'SELECT name FROM atlas_tag WHERE id = $1',
          [relation.tag_id]
        );
        const tagRows = tagRowsResult.rows;
        if (tagRows.length > 0) {
          tags.push({
            id: relation.tag_id,
            name: tagRows[0].name
          });
        }
      }

      data.push({ ...file, tags });
    }

    if (data.length > 0) {
      res.json({ message: '查询成功', status: 830, data });
    } else {
      res.json({ message: '没有数据', status: 0, data: [] });
    }
  } catch (error) {
    res.status(500).json({ message: error.message, status: 0 });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { adminShow };