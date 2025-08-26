import { Request, Response } from 'express';
import { conversationService } from '../../conversation';

/**
 * 对话控制器
 * 处理对话相关的API请求
 */
export class ConversationController {
  /**
   * 获取所有对话
   * @param req 请求对象
   * @param res 响应对象
   */
  getAllConversations = async (req: Request, res: Response): Promise<void> => {
    try {
      const conversations = await conversationService.getAllConversations();
      res.json({ success: true, data: conversations });
    } catch (error) {
      console.error('获取所有对话失败:', error);
      res.status(500).json({ success: false, message: '获取所有对话失败' });
    }
  }

  /**
   * 获取当前活动对话
   * @param req 请求对象
   * @param res 响应对象
   */
  getActiveConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const conversation = await conversationService.getActiveConversation();
      res.json({ success: true, data: conversation });
    } catch (error) {
      console.error('获取活动对话失败:', error);
      res.status(500).json({ success: false, message: '获取活动对话失败' });
    }
  }

  /**
   * 获取对话详情
   * @param req 请求对象
   * @param res 响应对象
   */
  getConversationById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await conversationService.getConversationById(id);
      res.json({ success: true, data: conversation });
    } catch (error) {
      console.error('获取对话详情失败:', error);
      if (error instanceof Error && error.message === '对话不存在') {
        res.status(404).json({ success: false, message: '对话不存在' });
      } else {
        res.status(500).json({ success: false, message: '获取对话详情失败' });
      }
    }
  }

  /**
   * 创建新对话
   * @param req 请求对象
   * @param res 响应对象
   */
  createConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { title = '新对话' } = req.body;

      const conversation = await conversationService.createConversation(title);
      res.json({ success: true, data: conversation });
    } catch (error) {
      console.error('创建对话失败:', error);
      res.status(500).json({ success: false, message: '创建对话失败' });
    }
  }

  /**
   * 设置活动对话
   * @param req 请求对象
   * @param res 响应对象
   */
  setActiveConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await conversationService.setActiveConversation(id);
      res.json({ success: true, data: conversation });
    } catch (error) {
      console.error('设置活动对话失败:', error);
      if (error instanceof Error && error.message === '对话不存在') {
        res.status(404).json({ success: false, message: '对话不存在' });
      } else {
        res.status(500).json({ success: false, message: '设置活动对话失败' });
      }
    }
  }

  /**
   * 删除对话
   * @param req 请求对象
   * @param res 响应对象
   */
  deleteConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      await conversationService.deleteConversation(id);
      res.json({ success: true });
    } catch (error) {
      console.error('删除对话失败:', error);
      res.status(500).json({ success: false, message: '删除对话失败' });
    }
  }
}

// 创建对话控制器实例
export const conversationController = new ConversationController();
