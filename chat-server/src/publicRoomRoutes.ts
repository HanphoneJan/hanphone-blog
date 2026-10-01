import { Router, Request, Response } from 'express';
import { PostgresService } from './postgresService.js';

const router = Router();

// GET /api/public/history — 获取公共聊天历史（无需认证）
router.get('/api/public/history', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    if (isNaN(limit) || limit <= 0 || limit > 500) {
      return res.status(400).json({ success: false, message: '无效的limit参数(1-500)' });
    }
    const messages = await PostgresService.getPublicHistory(limit);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('获取公共聊天历史失败:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

export default router;
