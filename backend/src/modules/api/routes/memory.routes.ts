import express, { Request, Response, Router } from 'express';
import { memoryController } from '../controllers/memory.controller';

/**
 * @swagger
 * tags:
 *   name: Memories
 *   description: 记忆管理API
 */
const router: Router = express.Router();

/**
 * @swagger
 * /api/memories:
 *   get:
 *     summary: 获取所有记忆
 *     tags: [Memories]
 *     responses:
 *       200:
 *         description: 成功获取所有记忆
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
 *                     $ref: '#/components/schemas/Memory'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', (req: Request, res: Response) => {
  memoryController.getAllMemories(req, res);
});

/**
 * @swagger
 * /api/memories/{id}:
 *   get:
 *     summary: 获取单个记忆
 *     tags: [Memories]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 记忆ID
 *     responses:
 *       200:
 *         description: 成功获取记忆
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
 *                     memory:
 *                       $ref: '#/components/schemas/Memory'
 *                     relatedMemories:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Memory'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', (req: Request, res: Response) => {
  memoryController.getMemoryById(req, res);
});

/**
 * @swagger
 * /api/memories/search/{query}:
 *   get:
 *     summary: 搜索记忆
 *     tags: [Memories]
 *     parameters:
 *       - in: path
 *         name: query
 *         schema:
 *           type: string
 *         required: true
 *         description: 搜索关键词
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 返回结果数量限制
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: 记忆类型
 *       - in: query
 *         name: subtype
 *         schema:
 *           type: string
 *         description: 记忆子类型
 *       - in: query
 *         name: importance
 *         schema:
 *           type: string
 *         description: 重要性级别
 *     responses:
 *       200:
 *         description: 成功搜索记忆
 *       500:
 *         description: 服务器错误
 */
router.get('/search/:query', (req: Request, res: Response) => {
  memoryController.searchMemories(req, res);
});

/**
 * @swagger
 * /api/memories:
 *   post:
 *     summary: 创建新记忆
 *     tags: [Memories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               keywords:
 *                 type: string
 *               content:
 *                 type: string
 *               context:
 *                 type: string
 *               importance:
 *                 type: string
 *               relatedMemoryIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               memory_type:
 *                 type: string
 *               memory_subtype:
 *                 type: string
 *               is_pinned:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 成功创建记忆
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/', (req: Request, res: Response) => {
  memoryController.createMemory(req, res);
});

/**
 * @swagger
 * /api/memories/related/{query}:
 *   get:
 *     summary: 查找相关记忆
 *     tags: [Memories]
 *     parameters:
 *       - in: path
 *         name: query
 *         schema:
 *           type: string
 *         required: true
 *         description: 查询文本
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 返回结果数量限制
 *     responses:
 *       200:
 *         description: 成功查找相关记忆
 *       500:
 *         description: 服务器错误
 */
router.get('/related/:query', (req: Request, res: Response) => {
  memoryController.findRelatedMemories(req, res);
});

/**
 * @swagger
 * /api/memories/semantic-search/{query}:
 *   get:
 *     summary: 语义搜索记忆
 *     tags: [Memories]
 *     parameters:
 *       - in: path
 *         name: query
 *         schema:
 *           type: string
 *         required: true
 *         description: 查询文本
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 返回结果数量限制
 *     responses:
 *       200:
 *         description: 成功语义搜索记忆
 *       500:
 *         description: 服务器错误
 */
router.get('/semantic-search/:query', (req: Request, res: Response) => {
  memoryController.semanticSearchMemories(req, res);
});

/**
 * @swagger
 * /api/memories/review/due:
 *   get:
 *     summary: 获取需要复习的记忆
 *     tags: [Memories]
 *     responses:
 *       200:
 *         description: 成功获取需要复习的记忆
 *       500:
 *         description: 服务器错误
 */
router.get('/review/due', (req: Request, res: Response) => {
  memoryController.getMemoriesToReview(req, res);
});

/**
 * @swagger
 * /api/memories/review/{id}:
 *   post:
 *     summary: 记录记忆复习
 *     tags: [Memories]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 记忆ID
 *     responses:
 *       200:
 *         description: 成功记录记忆复习
 *       500:
 *         description: 服务器错误
 */
router.post('/review/:id', (req: Request, res: Response) => {
  memoryController.recordMemoryReview(req, res);
});

/**
 * @swagger
 * /api/memories/{id}/status:
 *   get:
 *     summary: 获取记忆状态
 *     tags: [Memories]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 记忆ID
 *     responses:
 *       200:
 *         description: 成功获取记忆状态
 *       404:
 *         description: 记忆不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:id/status', (req: Request, res: Response) => {
  memoryController.getMemoryStatus(req, res);
});

/**
 * @swagger
 * /api/memories/{id}:
 *   put:
 *     summary: 更新记忆
 *     tags: [Memories]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 记忆ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               keywords:
 *                 type: string
 *               importance:
 *                 type: string
 *               memory_type:
 *                 type: string
 *               memory_subtype:
 *                 type: string
 *               is_pinned:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 成功更新记忆
 *       500:
 *         description: 服务器错误
 */
router.put('/:id', (req: Request, res: Response) => {
  memoryController.updateMemory(req, res);
});

/**
 * @swagger
 * /api/memories/{id}/reinforce:
 *   post:
 *     summary: 强化记忆
 *     tags: [Memories]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 记忆ID
 *     responses:
 *       200:
 *         description: 成功强化记忆
 *       500:
 *         description: 服务器错误
 */
router.post('/:id/reinforce', (req: Request, res: Response) => {
  memoryController.reinforceMemory(req, res);
});

/**
 * @swagger
 * /api/memories/{id}:
 *   delete:
 *     summary: 删除记忆
 *     tags: [Memories]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: 记忆ID
 *     responses:
 *       200:
 *         description: 成功删除记忆
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 记忆删除成功
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:id', (req: Request, res: Response) => {
  memoryController.deleteMemory(req, res);
});

/**
 * @swagger
 * /api/memories/review/auto:
 *   post:
 *     summary: 触发自动记忆复习
 *     tags: [Memories]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               triggerType:
 *                 type: string
 *                 description: 触发类型
 *     responses:
 *       200:
 *         description: 成功执行自动记忆复习
 *       500:
 *         description: 服务器错误
 */
router.post('/review/auto', (req: Request, res: Response) => {
  memoryController.triggerAutoReview(req, res);
});

/**
 * @swagger
 * /api/memories/review/history:
 *   get:
 *     summary: 获取自动记忆复习历史
 *     tags: [Memories]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 返回结果数量限制
 *     responses:
 *       200:
 *         description: 成功获取复习历史
 *       500:
 *         description: 服务器错误
 */
router.get('/review/history', (req: Request, res: Response) => {
  memoryController.getReviewHistory(req, res);
});

/**
 * @swagger
 * /api/memories/review/count:
 *   get:
 *     summary: 获取待复习记忆数量
 *     tags: [Memories]
 *     responses:
 *       200:
 *         description: 成功获取待复习记忆数量
 *       500:
 *         description: 服务器错误
 */
router.get('/review/count', (req: Request, res: Response) => {
  memoryController.getMemoriesToReviewCount(req, res);
});

export default router;
