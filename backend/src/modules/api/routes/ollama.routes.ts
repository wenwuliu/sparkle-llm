import express, { Request, Response, Router } from 'express';
import { modelService } from '../../model';

const router: Router = express.Router();

/**
 * @swagger
 * /api/ollama/models:
 *   get:
 *     summary: 获取Ollama可用模型列表
 *     tags: [Ollama]
 *     responses:
 *       200:
 *         description: 成功获取Ollama模型列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "qwen3:1.7b"
 *       500:
 *         description: 服务器错误
 */
router.get('/models', async (req: Request, res: Response) => {
  try {
    const models = await modelService.getAvailableModels();
    res.json({ success: true, data: models });
  } catch (error) {
    console.error('获取Ollama模型列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取Ollama模型列表失败',
      data: []
    });
  }
});

export default router;
