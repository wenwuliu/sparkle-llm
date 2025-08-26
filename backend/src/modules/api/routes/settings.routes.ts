import express, { Request, Response, Router } from 'express';
import { settingsController } from '../controllers/settings.controller';

const router: Router = express.Router();

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: 获取所有设置
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: 成功获取设置
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
 *                       key:
 *                         type: string
 *                         example: "model_provider"
 *                       value:
 *                         type: string
 *                         example: "ollama"
 *                       updated_at:
 *                         type: number
 *                         example: 1619712000000
 *       500:
 *         description: 服务器错误
 */
router.get('/', (req: Request, res: Response) => {
  settingsController.getAllSettings(req, res);
});

/**
 * @swagger
 * /api/settings/model/config:
 *   get:
 *     summary: 获取模型配置
 *     tags: [Settings]
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
 *                     temperature:
 *                       type: number
 *                       example: 0.7
 *                     maxTokens:
 *                       type: number
 *                       example: 2048
 *       500:
 *         description: 服务器错误
 */
router.get('/model/config', (req: Request, res: Response) => {
  settingsController.getModelConfig(req, res);
});

/**
 * @swagger
 * /api/settings/{key}:
 *   get:
 *     summary: 获取指定设置
 *     tags: [Settings]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: 设置键名
 *     responses:
 *       200:
 *         description: 成功获取设置
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
 *                     value:
 *                       type: string
 *                       example: "ollama"
 *       404:
 *         description: 设置不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:key', (req: Request, res: Response) => {
  settingsController.getSetting(req, res);
});

/**
 * @swagger
 * /api/settings/{key}:
 *   put:
 *     summary: 保存设置
 *     tags: [Settings]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: 设置键名
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 type: string
 *                 example: "ollama"
 *     responses:
 *       200:
 *         description: 成功保存设置
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.put('/:key', (req: Request, res: Response) => {
  settingsController.saveSetting(req, res);
});

/**
 * @swagger
 * /api/settings:
 *   post:
 *     summary: 批量保存设置
 *     tags: [Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: object
 *                 example:
 *                   model_provider: "ollama"
 *                   temperature: "0.7"
 *     responses:
 *       200:
 *         description: 成功保存设置
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/', (req: Request, res: Response) => {
  settingsController.saveSettings(req, res);
});

export default router;
