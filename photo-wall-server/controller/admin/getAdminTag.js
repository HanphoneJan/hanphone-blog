const { getDbConnection } = require('../../config/db');

async function getAdminTag(req, res) {
  let client;
  try {
    if (!getDbConnection) {
      return res.status(500).json({ status: 0, message: '服务器配置错误：无法获取数据库连接函数' });
    }

    client = await getDbConnection();
    const result = await client.query(`
      SELECT tag.id AS tag_id, 
             COALESCE(COUNT(atlas_files_tag.tag_id), 0) AS number, 
             tag.name 
      FROM atlas_tag AS tag
      LEFT JOIN atlas_files_tag ON atlas_files_tag.tag_id = tag.id 
      GROUP BY tag.id
    `);

    const data = result.rows.map(tag => ({
      id: tag.tag_id,
      number: parseInt(tag.number, 10),
      name: tag.name
    }));

    res.json({ 
      message: data.length > 0 ? '查询成功' : '没有数据', 
      status: 830, 
      data 
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: '查询失败', status: 0, data: [] });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { getAdminTag };