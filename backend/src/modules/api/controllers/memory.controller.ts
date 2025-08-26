import { Request, Response } from 'express';
import { memoryService, autoMemoryReviewService } from '../../memory';
import { vectorDbService } from '../../index';
import { MemoryType, ImportanceLevel } from '../../memory';
import { db } from '../../../config/database';

/**
 * 记忆控制器
 * 处理记忆相关的API请求
 */
export class MemoryController {
  /**
   * 获取所有记忆
   * @param req 请求对象
   * @param res 响应对象
   */
  getAllMemories = async (req: Request, res: Response): Promise<void> => {
    try {
      const type = req.query.type as string;
      let memories;

      if (type === 'core') {
        memories = await memoryService.getCoreMemories();
      } else if (type === 'factual') {
        memories = await memoryService.getFactualMemories();
      } else {
        memories = await memoryService.getAllMemories();
      }

      res.json({ success: true, data: memories });
    } catch (error) {
      console.error('获取记忆失败:', error);
      res.status(500).json({ success: false, message: '获取记忆失败' });
    }
  }

  /**
   * 获取单个记忆
   * @param req 请求对象
   * @param res 响应对象
   */
  getMemoryById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await memoryService.getMemoryById(parseInt(id));
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('获取记忆失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取记忆失败'
      });
    }
  }

  /**
   * 搜索记忆
   * @param req 请求对象
   * @param res 响应对象
   */
  searchMemories = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const memoryType = req.query.type as string;
      const memorySubtype = req.query.subtype as string;
      const importanceLevel = req.query.importance as string;

      const memories = await memoryService.searchMemories(
        query,
        limit,
        memoryType,
        memorySubtype,
        importanceLevel
      );

      res.json({ success: true, data: memories });
    } catch (error) {
      console.error('搜索记忆失败:', error);
      res.status(500).json({ success: false, message: '搜索记忆失败' });
    }
  }

  /**
   * 创建新记忆
   * @param req 请求对象
   * @param res 响应对象
   */
  createMemory = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const {
        keywords,
        content,
        context,
        importance,
        relatedMemoryIds,
        memory_type,
        memory_subtype,
        is_pinned
      } = req.body;

      if (!keywords || !content || !context) {
        return res.status(400).json({ success: false, message: '缺少必要参数' });
      }

      const memory = await memoryService.createMemory(
        keywords,
        content,
        context,
        importance,
        relatedMemoryIds,
        memory_type || MemoryType.FACTUAL,
        memory_subtype || null,
        is_pinned || false
      );

      res.json({ success: true, data: memory });
    } catch (error) {
      console.error('创建记忆失败:', error);
      res.status(500).json({ success: false, message: '创建记忆失败' });
    }
  }

  /**
   * 查找相关记忆
   * @param req 请求对象
   * @param res 响应对象
   */
  findRelatedMemories = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

      const memories = await memoryService.findRelatedMemories(query, limit);
      res.json({ success: true, data: memories });
    } catch (error) {
      console.error('查找相关记忆失败:', error);
      res.status(500).json({ success: false, message: '查找相关记忆失败' });
    }
  }

  /**
   * 语义搜索记忆
   * @param req 请求对象
   * @param res 响应对象
   */
  semanticSearchMemories = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

      const memories = await vectorDbService.semanticSearchMemories(query, limit);
      res.json({ success: true, data: memories });
    } catch (error) {
      console.error('语义搜索记忆失败:', error);
      res.status(500).json({ success: false, message: '语义搜索记忆失败' });
    }
  }

  /**
   * 获取需要复习的记忆
   * @param req 请求对象
   * @param res 响应对象
   */
  getMemoriesToReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const memories = await memoryService.getMemoriesToReview();
      res.json({ success: true, data: memories });
    } catch (error) {
      console.error('获取需要复习的记忆失败:', error);
      res.status(500).json({ success: false, message: '获取需要复习的记忆失败' });
    }
  }

  /**
   * 记录记忆复习
   * @param req 请求对象
   * @param res 响应对象
   */
  recordMemoryReview = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const memoryId = parseInt(id);

      // 验证ID是否有效
      if (isNaN(memoryId) || memoryId <= 0) {
        return res.status(400).json({
          success: false,
          message: `无效的记忆ID: ${id}`
        });
      }

      await memoryService.recordMemoryReview(memoryId);

      // 获取更新后的记忆
      const result = await memoryService.getMemoryById(memoryId);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('记录记忆复习失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '记录记忆复习失败'
      });
    }
  }

  /**
   * 获取记忆状态
   * @param req 请求对象
   * @param res 响应对象
   */
  getMemoryStatus = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const result = await memoryService.getMemoryById(parseInt(id));

      if (!result || !result.memory) {
        return res.status(404).json({ success: false, message: '记忆不存在' });
      }

      const memory = result.memory;
      const strength = memoryService.calculateMemoryStrength(memory);
      const stage = memoryService.getMemoryStage(memory);
      const nextReviewTime = memoryService.getNextReviewTime(memory);

      res.json({
        success: true,
        data: {
          memory,
          strength,
          stage,
          nextReviewTime,
          nextReviewDate: new Date(nextReviewTime).toLocaleString(),
        },
      });
    } catch (error) {
      console.error('获取记忆状态失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取记忆状态失败'
      });
    }
  }

  /**
   * 更新记忆
   * @param req 请求对象
   * @param res 响应对象
   */
  updateMemory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { content, keywords, importance, memory_type, memory_subtype, is_pinned } = req.body;

      const memory = await memoryService.updateMemory(parseInt(id), {
        content,
        keywords,
        importance,
        memory_type,
        memory_subtype,
        is_pinned
      });

      res.json({ success: true, data: memory });
    } catch (error) {
      console.error('更新记忆失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '更新记忆失败'
      });
    }
  }

  /**
   * 强化记忆
   * @param req 请求对象
   * @param res 响应对象
   */
  reinforceMemory = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const memoryId = parseInt(id);

      // 验证ID是否有效
      if (isNaN(memoryId) || memoryId <= 0) {
        return res.status(400).json({
          success: false,
          message: `无效的记忆ID: ${id}`
        });
      }

      await memoryService.reinforceMemory(memoryId);

      // 获取更新后的记忆
      const result = await memoryService.getMemoryById(memoryId);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('强化记忆失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '强化记忆失败'
      });
    }
  }

  /**
   * 删除记忆
   * @param req 请求对象
   * @param res 响应对象
   */
  deleteMemory = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const memoryId = parseInt(id);

      // 检查记忆是否存在
      const memory = await memoryService.getMemoryById(memoryId);
      if (!memory) {
        return res.status(404).json({ success: false, message: '记忆不存在' });
      }

      // 删除记忆
      const success = await memoryService.deleteMemory(memoryId);
      if (success) {
        res.json({ success: true, message: '记忆删除成功' });
      } else {
        res.status(500).json({ success: false, message: '记忆删除失败' });
      }
    } catch (error) {
      console.error('删除记忆失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '删除记忆失败'
      });
    }
  }

  /**
   * 触发自动记忆复习
   * @param req 请求对象
   * @param res 响应对象
   */
  triggerAutoReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const triggerType = req.body.triggerType || 'manual';
      const result = await autoMemoryReviewService.performAutoReview(undefined, triggerType);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('触发自动记忆复习失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '触发自动记忆复习失败'
      });
    }
  }

  /**
   * 获取自动记忆复习历史
   * @param req 请求对象
   * @param res 响应对象
   */
  getReviewHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const history = db.prepare(`
        SELECT * FROM memory_review_sessions
        ORDER BY timestamp DESC
        LIMIT ?
      `).all(limit);

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('获取自动记忆复习历史失败:', error);
      res.status(500).json({
        success: false,
        message: '获取自动记忆复习历史失败'
      });
    }
  }

  /**
   * 获取待复习记忆数量
   * @param req 请求对象
   * @param res 响应对象
   */
  getMemoriesToReviewCount = async (req: Request, res: Response): Promise<void> => {
    try {
      const memories = await memoryService.getMemoriesToReview();
      res.json({
        success: true,
        count: memories.length
      });
    } catch (error) {
      console.error('获取待复习记忆数量失败:', error);
      res.status(500).json({
        success: false,
        message: '获取待复习记忆数量失败'
      });
    }
  }
}

// 创建记忆控制器实例
export const memoryController = new MemoryController();
