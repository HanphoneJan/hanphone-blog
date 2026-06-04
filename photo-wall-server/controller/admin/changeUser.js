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

async function changeUser(req, res) {
  let client;
  try {
    const { user } = req.body;
    if (!user || !user.username) {
      return res.status(400).json({ message: '缺少或无效的用户参数', status: 0 });
    }

    const { username } = user;

    if (!dbGetConnection) {
      return res.status(500).json({ status: 0, message: '服务器配置错误：无法获取数据库连接函数' });
    }

    client = await dbGetConnection();

    // 查询当前用户类型
    const userResult = await client.query(
      'SELECT "type" FROM t_user WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.json({ message: '未找到用户', status: 0 });
    }

    // 切换用户类型（0 <-> 1）
    const newType = userResult.rows[0].is_admin === 0 ? 1 : 0;
    const result = await client.query(
      'UPDATE t_user SET "type" = $1 WHERE username = $2',
      [newType, username]
    );

    if (result.rowCount > 0) {
      res.json({ message: '用户类型已切换', status: 830 });
    } else {
      res.json({ message: '未找到该记录或没有更改', status: 0 });
    }
  } catch (error) {
    res.status(500).json({ message: `修改用户类型失败: ${error.message}`, status: 0 });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { changeUser };