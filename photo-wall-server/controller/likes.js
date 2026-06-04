let getDbConnection;
try {
  const db = require('../config/db');
  if (db && typeof db.getDbConnection === 'function') {
    getDbConnection = db.getDbConnection;
  }
} catch (err) {
  getDbConnection = null;
}

/**
 * 点赞/取消点赞
 * 需要用户登录，一个用户对一张照片只能点赞一次
 */
async function likes(req, res) {
  let client;
  try {
    const { id } = req.body;
    // 从请求头或 session 中获取当前用户
    const userId = req.user?.username || req.headers['x-user-id'];

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ message: '缺少或无效的id参数', status: 0 });
    }

    if (!userId) {
      return res.status(401).json({ message: '请先登录', status: 0 });
    }

    if (!getDbConnection) {
      return res.status(500).json({ status: 0, message: '服务器配置错误：无法获取数据库连接函数' });
    }

    client = await getDbConnection();
    const photoId = Number(id);

    // 检查用户是否已经点赞过
    const checkResult = await client.query(
      'SELECT id FROM user_likes WHERE user_id = $1 AND photo_id = $2',
      [userId, photoId]
    );

    const hasLiked = checkResult.rowCount > 0;

    if (hasLiked) {
      // 已点赞，执行取消点赞
      await client.query('BEGIN');
      
      // 删除点赞记录
      await client.query(
        'DELETE FROM user_likes WHERE user_id = $1 AND photo_id = $2',
        [userId, photoId]
      );
      
      // 减少照片点赞数
      await client.query(
        'UPDATE atlas_files SET likes = GREATEST(likes - 1, 0) WHERE id = $1',
        [photoId]
      );
      
      await client.query('COMMIT');
      
      res.json({ 
        message: '取消点赞成功', 
        status: 830,
        action: 'unlike',
        isLiked: false
      });
    } else {
      // 未点赞，执行点赞
      await client.query('BEGIN');
      
      // 添加点赞记录
      await client.query(
        'INSERT INTO user_likes (user_id, photo_id) VALUES ($1, $2)',
        [userId, photoId]
      );
      
      // 增加照片点赞数
      await client.query(
        'UPDATE atlas_files SET likes = likes + 1 WHERE id = $1',
        [photoId]
      );
      
      await client.query('COMMIT');
      
      res.json({ 
        message: '点赞成功', 
        status: 830,
        action: 'like',
        isLiked: true
      });
    }
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    res.status(500).json({ message: `点赞失败: ${error.message}`, status: 0 });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

/**
 * 获取当前用户点赞过的照片列表
 */
async function getUserLikes(req, res) {
  let client;
  try {
    const userId = req.user?.username || req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ message: '请先登录', status: 0 });
    }

    if (!getDbConnection) {
      return res.status(500).json({ status: 0, message: '服务器配置错误' });
    }

    client = await getDbConnection();
    
    const result = await client.query(
      'SELECT photo_id FROM user_likes WHERE user_id = $1',
      [userId]
    );
    
    const likedPhotoIds = result.rows.map(row => row.photo_id);
    
    res.json({
      message: '获取成功',
      status: 830,
      data: likedPhotoIds
    });
  } catch (error) {
    res.status(500).json({ message: `获取失败: ${error.message}`, status: 0 });
  } finally {
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { likes, getUserLikes };
