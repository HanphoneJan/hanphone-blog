const { getDbConnection } = require('../../config/db'); // 对应 PHP 的数据库连接配置

async function getUser(req, res) {
  let client;
  try {
    // 设置响应类型为 JSON
    res.setHeader('Content-Type', 'application/json');

    if (!getDbConnection) {
      return res.status(500).json({ status: 0, message: '服务器配置错误：无法获取数据库连接函数' });
    }

    // 获取数据库连接
    client = await getDbConnection();

    // 查询用户表数据
    const result = await client.query('SELECT * FROM t_user');

    if (result.rows.length > 0) {
      // 格式化返回数据（只包含需要的字段）
      const data = result.rows.map(row => ({
        username: row.username,
        email: row.email,
        type: row.type
      }));

      // 返回成功响应
      res.json({
        message: '查询成功',
        status: 830,
        data: data
      });
    } else {
      // 无数据时的响应
      res.json({
        message: '没有数据',
        status: 0,
        data: []
      });
    }

  } catch (error) {
    // 处理数据库错误
    res.json({
      message: `查询失败: ${error.message}`,
      status: 0,
      data: []
    });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { getUser };