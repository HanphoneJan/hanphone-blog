let getDbConnection;
try {
  // 仅使用 config/db.js 导出的 getDbConnection
  const db = require('../config/db');
  if (db && typeof db.getDbConnection === 'function') {
    getDbConnection = db.getDbConnection;
  } else {
    // 若模块存在但无有效函数，直接抛出错误
    throw new Error('config/db.js 未导出有效的 getDbConnection 函数');
  }
} catch (err) {
  // 加载失败时直接抛出错误，不再不再提供回退逻辑
  throw new Error(`无法初始化数据库连接: ${err.message}`);
}

async function show(req, res) {
  let client;

  try {
    // 获取当前用户（如果已登录）
    const userId = req.user?.username || req.headers['x-user-id'];
    let page = parseInt(req.query.page) || null;
    let limit = parseInt(req.query.limit) || null;
    if (limit) limit = Math.min(limit, 100);

    // 仅使用外部提供的连接函数（config/db.js）
    client = await getDbConnection();

    // 先查总数（仅在分页时查）
    let total = 0;
    if (page > 0 && limit > 0) {
      const countResult = await client.query(
        'SELECT COUNT(*) FROM atlas_files WHERE type != 0'
      );
      total = parseInt(countResult.rows[0].count);
    }

    let query = `
      SELECT f.*, t.id AS tag_id, t.name AS tag_name
      FROM atlas_files f
      LEFT JOIN atlas_files_tag ft ON f.id = ft.files_id
      LEFT JOIN atlas_tag t ON ft.tag_id = t.id
      WHERE f.type != 0
      ORDER BY f.id
    `;

    const params = [];
    if (page > 0 && limit > 0) {
      const offset = (page - 1) * limit;
      query += ` LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }

    const result = await client.query(query, params);

    const rows = result.rows;
    const map = new Map();

    // 如果用户已登录，查询该用户点赞过的照片
    let userLikes = new Set();
    if (userId) {
      const likesResult = await client.query(
        'SELECT photo_id FROM user_likes WHERE user_id = $1',
        [userId]
      );
      userLikes = new Set(likesResult.rows.map(row => row.photo_id));
    }

    for (const row of rows) {
      const fid = row.id;
      if (!map.has(fid)) {
        const { tag_id, tag_name, ...fileFields } = row;
        map.set(fid, {
          ...fileFields,
          tags: [],
          isLiked: userLikes.has(fid) // 添加用户点赞状态
        });
      }
      if (row.tag_id) {
        map.get(fid).tags.push({ id: row.tag_id, name: row.tag_name });
      }
    }

    const data = Array.from(map.values());

    const response = {
      message: data.length > 0 ? '查询成功' : '没有数据',
      status: data.length > 0 ? 830 : 0,
      data
    };
    if (page > 0 && limit > 0) {
      response.total = total;
      response.page = page;
      response.limit = limit;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message, status: 0 });
  } finally {
    // 释放连接
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

async function random(req, res) {
  let client;
  try {
    const userId = req.user?.username || req.headers['x-user-id'];
    let limit = parseInt(req.query.limit) || 12;
    if (limit < 1) limit = 12;
    limit = Math.min(limit, 50);

    client = await getDbConnection();

    const result = await client.query(
      `SELECT f.*, t.id AS tag_id, t.name AS tag_name
       FROM atlas_files f
       LEFT JOIN atlas_files_tag ft ON f.id = ft.files_id
       LEFT JOIN atlas_tag t ON ft.tag_id = t.id
       WHERE f.type != 0 AND f.id IN (
         SELECT id FROM atlas_files WHERE type != 0 ORDER BY RANDOM() LIMIT $1
       )
       ORDER BY f.id`,
      [limit]
    );

    const rows = result.rows;
    const map = new Map();

    let userLikes = new Set();
    if (userId) {
      const likesResult = await client.query(
        'SELECT photo_id FROM user_likes WHERE user_id = $1',
        [userId]
      );
      userLikes = new Set(likesResult.rows.map(row => row.photo_id));
    }

    for (const row of rows) {
      const fid = row.id;
      if (!map.has(fid)) {
        const { tag_id, tag_name, ...fileFields } = row;
        map.set(fid, {
          ...fileFields,
          tags: [],
          isLiked: userLikes.has(fid)
        });
      }
      if (row.tag_id) {
        map.get(fid).tags.push({ id: row.tag_id, name: row.tag_name });
      }
    }

    const data = Array.from(map.values());

    res.json({
      message: data.length > 0 ? '查询成功' : '没有数据',
      status: data.length > 0 ? 830 : 0,
      data
    });
  } catch (error) {
    res.status(500).json({ message: error.message, status: 0 });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { show, random };
