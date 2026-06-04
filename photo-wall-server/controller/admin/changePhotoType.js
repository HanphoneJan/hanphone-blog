let getDbConnection;
try {
  const db = require('../../config/db');
  if (db && typeof db.getDbConnection === 'function') {
    getDbConnection = db.getDbConnection;
  }
} catch (err) {
  getDbConnection = null;
}

async function changePhotoType(req, res) {
  let client;
  try {
    const { photo } = req.body;
    // 校验参数：id必填，type必须是数字（包括数字类型的字符串，这里会自动转换）
    if (!photo || !photo.id) {
      return res.status(400).json({ 
        message: '缺少id参数', 
        status: 0 
      });
    }

    // 处理type：尝试转换为数字，如果转换失败则报错
    const type = Number(photo.type);
    if (isNaN(type)) {
      return res.status(400).json({ 
        message: 'type参数必须是有效的数字', 
        status: 0 
      });
    }

    if (!getDbConnection) {
      return res.status(500).json({ status: 0, message: '服务器配置错误：无法获取数据库连接函数' });
    }

    const { id } = photo;
    client = await getDbConnection();
    // 这里的type已经是数字类型了
    const result = await client.query(
      'UPDATE atlas_files SET "type" = $1 WHERE id = $2',
      [type, id]
    );

    if (result.rowCount > 0) {
      res.json({ message: '类型更新成功', status: 830 });
    } else {
      res.json({ message: '类型更新失败，未找到对应记录', status: 0 });
    }
  } catch (error) {
    res.status(500).json({ message: `类型更新失败: ${error.message}`, status: 0 });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { changePhotoType };