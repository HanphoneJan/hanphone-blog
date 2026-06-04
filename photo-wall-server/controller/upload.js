// 数据库连接函数处理
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
 * 处理URL上传
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function upload(req, res) {
  // 初始化所有URL的上传结果
  const uploadResults = [];
  let hasError = false;
  let client;

  try {
    const { author = '佚名', userId, description = '暂无', title = '未命名', urls } = req.body;

    // 验证URLs是否存在
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ 
        status: 0, 
        message: '未提供任何URL' 
      });
    }

    // 验证必要参数
    if (!author || !userId) {
      return res.status(400).json({ 
        status: 0, 
        message: '作者和用户名不能为空' 
      });
    }

    // 检查数据库连接函数是否存在
    if (!getDbConnection) {
      return res.status(500).json({ 
        status: 0, 
        message: '服务器配置错误：无法获取数据库连接函数' 
      });
    }

    // 获取数据库连接
    client = await getDbConnection();

    for (const url of urls) {
      const result = { url: url };
      try {
        // 验证URL格式
        try {
          new URL(url);
        } catch (e) {
          result.status = 0;
          result.message = '无效的URL格式';
          uploadResults.push(result);
          continue;
        }

        // 生成上传时间
        const uploadTime = new Date().toISOString().slice(0, 19);

        // 插入数据库（使用自增主键，不指定id字段）
        const queryResult = await client.query(
          `INSERT INTO atlas_files (
            path, author, description, title, type, upload_time, likes, user_id
          ) VALUES ($1, $2, $3, $4, 0, $5, 0, $6)
          RETURNING id`,  // 添加RETURNING id获取自增主键
          [url, author, description, title, uploadTime, userId]
        );

        // 从返回结果中获取数据库生成的id
        const fileId = queryResult.rows[0].id;

        result.status = 830;
        result.message = 'URL保存成功';
        result.fileId = fileId; // 返回数据库生成的文件ID
        uploadResults.push(result);

      } catch (error) {
        hasError = true;
        result.status = 0;
        result.message = `处理失败: ${error.message}`;
        uploadResults.push(result);
      }
    }

    // 根据是否有错误返回对应状态码
    return res.status(hasError ? 207 : 200).json({
      overallStatus: hasError ? 0 : 830,
      message: hasError ? '部分URL保存失败' : '所有URL保存成功',
      results: uploadResults
    });

  } catch (error) {
    // 捕获全局错误（如数据库连接失败）
    return res.status(500).json({ 
      status: 0, 
      message: `服务器错误: ${error.message}`,
      results: uploadResults
    });
  } finally {
    // 释放数据库连接
    if (client && typeof client.release === 'function') {
      client.release();
    }
  }
}

module.exports = { upload };