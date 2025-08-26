import express, { Request, Response, Router } from 'express';
import { toolsController } from '../controllers/tools.controller';

/**
 * @swagger
 * tags:
 *   name: Tools
 *   description: 工具管理API
 */
const router: Router = express.Router();

/**
 * @swagger
 * /api/tools:
 *   get:
 *     summary: 获取所有可用工具
 *     tags: [Tools]
 *     responses:
 *       200:
 *         description: 成功获取工具列表
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
 *                         example: "file_read"
 *                       description:
 *                         type: string
 *                         example: "读取文件内容"
 *                       input_schema:
 *                         type: object
 *                       category:
 *                         type: string
 *                         example: "file"
 *                       requires_auth:
 *                         type: boolean
 *                         example: false
 *       500:
 *         description: 服务器错误
 */
router.get('/', (req: Request, res: Response) => {
  toolsController.getAllTools(req, res);
});

/**
 * @swagger
 * /api/tools/{name}:
 *   get:
 *     summary: 获取指定工具的详情
 *     tags: [Tools]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: 工具名称
 *     responses:
 *       200:
 *         description: 成功获取工具详情
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
 *                     name:
 *                       type: string
 *                       example: "file_read"
 *                     description:
 *                       type: string
 *                       example: "读取文件内容"
 *                     input_schema:
 *                       type: object
 *                     category:
 *                       type: string
 *                       example: "file"
 *                     requires_auth:
 *                       type: boolean
 *                       example: false
 *       404:
 *         description: 工具不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:name', (req: Request, res: Response) => {
  toolsController.getToolByName(req, res);
});

/**
 * @swagger
 * /api/tools/execute:
 *   post:
 *     summary: 执行指定工具
 *     tags: [Tools]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tool_name:
 *                 type: string
 *                 example: "file_read"
 *               input:
 *                 type: object
 *                 example:
 *                   path: "/path/to/file.txt"
 *     responses:
 *       200:
 *         description: 成功执行工具
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
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: 工具不存在
 *       500:
 *         description: 服务器错误
 */
router.post('/execute', (req: Request, res: Response) => {
  toolsController.executeTool(req, res);
});

export default router;
