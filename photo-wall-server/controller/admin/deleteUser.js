const express = require('express');
const router = express.Router();

let dbConnection;
try {
  const db = require('../../config/db');
  if (db && typeof db.getDbConnection === 'function') {
    dbConnection = db.getDbConnection;
  }
} catch (err) {
  dbConnection = null;
}

router.use(express.json());

async function deleteUser(req, res) {
  let client;
  try {
    res.setHeader('Content-Type', 'application/json');

    const { username } = req.body;

    if (username === undefined) {
      return res.json({
        message: '缺少用户名',
        status: 0
      });
    }

    const usernameStr = String(username);

    if (!dbConnection) {
      return res.status(500).json({ status: 0, message: '服务器配置错误：无法获取数据库连接函数' });
    }

    client = await dbConnection();
    await client.query('BEGIN');

    const deleteQuery = 'DELETE FROM t_user WHERE username = $1';
    const result = await client.query(deleteQuery, [usernameStr]);

    if (result.rowCount === 0) {
      throw new Error('未找到该用户');
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

module.exports = { deleteUser };