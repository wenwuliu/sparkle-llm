import express, { Request, Response, Router } from 'express';
import { modelController } from '../controllers/model.controller';

const router: Router = express.Router();

/**
 * @swagger
 * /api/model/models:
 *   get:
 *     summary: 获取可用模型列表
 *     tags: [Model]
 *     responses:
 *       200:
 *         description: 成功获取模型列表
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
 *                         example: "qwen2.5:3b"
 *       500:
 *         description: 服务器错误
 */
router.get('/models', (req: Request, res: Response) => {
  modelController.getModels(req, res);
});

/**
 * @swagger
 * /api/model/search:
 *   get:
 *     summary: 搜索模型
 *     tags: [Model]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *         example: "qwen"
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *         description: 模型提供商（可选）
 *         example: "siliconflow"
 *     responses:
 *       200:
 *         description: 成功搜索模型
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
 *                       id:
 *                         type: string
 *                         example: "Qwen/Qwen2.5-7B-Instruct"
 *                       name:
 *                         type: string
 *                         example: "Qwen/Qwen2.5-7B-Instruct"
 *       500:
 *         description: 服务器错误
 */
router.get('/search', (req: Request, res: Response) => {
  modelController.searchModels(req, res);
});

/**
 * @swagger
 * /api/model/config:
 *   get:
 *     summary: 获取模型配置
 *     tags: [Model]
 *     responses:
 *       200:
 *         description: 成功获取模型配置
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     provider:
 *                       type: string
 *                       example: "ollama"
 *                     model:
 *                       type: string
 *                       example: "qwen2.5:3b"
 *                     temperature:
 *                       type: number
 *                       example: 0.7
 *                     maxTokens:
 *                       type: number
 *                       example: 2048
 *       500:
 *         description: 服务器错误
 */
router.get('/config', (req: Request, res: Response) => {
  modelController.getModelConfig(req, res);
});

/**
 * @swagger
 * /api/model/config:
 *   put:
 *     summary: 更新模型配置
 *     tags: [Model]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 example: "ollama"
 *               model:
 *                 type: string
 *                 example: "qwen2.5:3b"
 *               temperature:
 *                 type: number
 *                 example: 0.7
 *               maxTokens:
 *                 type: number
 *                 example: 2048
 *     responses:
 *       200:
 *         description: 成功更新模型配置
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     provider:
 *                       type: string
 *                       example: "ollama"
 *                     model:
 *                       type: string
 *                       example: "qwen2.5:3b"
 *                     temperature:
 *                       type: number
 *                       example: 0.7
 *                     maxTokens:
 *                       type: number
 *                       example: 2048
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.put('/config', (req: Request, res: Response) => {
  modelController.updateModelConfig(req, res);
});

export default router;
