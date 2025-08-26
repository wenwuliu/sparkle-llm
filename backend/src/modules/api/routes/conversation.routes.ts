import express, { Request, Response, Router } from 'express';
import { conversationController } from '../controllers/conversation.controller';

/**
 * @swagger
 * tags:
 *   name: Conversations
 *   description: 对话管理API
 */
const router: Router = express.Router();

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     summary: 获取所有对话
 *     tags: [Conversations]
 *     responses:
 *       200:
 *         description: 成功获取对话列表
 *       500:
 *         description: 服务器错误
 */
router.get('/', (req: Request, res: Response) => {
  conversationController.getAllConversations(req, res);
});

/**
 * @swagger
 * /api/conversations/active:
 *   get:
 *     summary: 获取当前活动对话
 *     tags: [Conversations]
 *     responses:
 *       200:
 *         description: 成功获取活动对话
 *       500:
 *         description: 服务器错误
 */
router.get('/active', (req: Request, res: Response) => {
  conversationController.getActiveConversation(req, res);
});

/**
 * @swagger
 * /api/conversations/{id}:
 *   get:
 *     summary: 获取对话详情
 *     tags: [Conversations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 对话ID
 *     responses:
 *       200:
 *         description: 成功获取对话详情
 *       404:
 *         description: 对话不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:id', (req: Request, res: Response) => {
  conversationController.getConversationById(req, res);
});

/**
 * @swagger
 * /api/conversations:
 *   post:
 *     summary: 创建新对话
 *     tags: [Conversations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: 对话标题
 *     responses:
 *       200:
 *         description: 成功创建对话
 *       500:
 *         description: 服务器错误
 */
router.post('/', (req: Request, res: Response) => {
  conversationController.createConversation(req, res);
});

/**
 * @swagger
 * /api/conversations/{id}/activate:
 *   put:
 *     summary: 设置活动对话
 *     tags: [Conversations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 对话ID
 *     responses:
 *       200:
 *         description: 成功设置活动对话
 *       404:
 *         description: 对话不存在
 *       500:
 *         description: 服务器错误
 */
router.put('/:id/activate', (req: Request, res: Response) => {
  conversationController.setActiveConversation(req, res);
});

/**
 * @swagger
 * /api/conversations/{id}:
 *   delete:
 *     summary: 删除对话
 *     tags: [Conversations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 对话ID
 *     responses:
 *       200:
 *         description: 成功删除对话
 *       500:
 *         description: 服务器错误
 */
router.delete('/:id', (req: Request, res: Response) => {
  conversationController.deleteConversation(req, res);
});

export default router;
