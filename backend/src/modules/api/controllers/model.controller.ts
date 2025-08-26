import { Request, Response } from 'express';
import { modelService } from '../../model';
import { DEFAULT_MODEL_CONFIG } from '../../../config/model.config';

/**
 * 模型控制器
 * 处理模型相关的API请求
 */
export class ModelController {
  /**
   * 获取可用模型列表
   * @param req 请求对象
   * @param res 响应对象
   */
  getModels = async (req: Request, res: Response): Promise<void> => {
    try {
      // 从查询参数中获取提供商类型，如果没有指定则使用当前设置的提供商
      const provider = req.query.provider as string || undefined;

      const models = await modelService.getAvailableModels(provider);
      res.json({ success: true, data: models });
    } catch (error) {
      console.error('获取模型列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取模型列表失败',
        // 如果模型服务不可用，返回默认模型
        data: [{ name: DEFAULT_MODEL_CONFIG.OLLAMA.MODEL }]
      });
    }
  }

  /**
   * 获取模型配置
   * @param req 请求对象
   * @param res 响应对象
   */
  getModelConfig = (req: Request, res: Response): void => {
    try {
      const config = modelService.getModelConfig();
      res.json({ success: true, data: config });
    } catch (error) {
      console.error('获取模型配置失败:', error);
      res.status(500).json({ success: false, message: '获取模型配置失败' });
    }
  }

  /**
   * 搜索模型
   * @param req 请求对象
   * @param res 响应对象
   */
  searchModels = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.query.q as string || '';
      const provider = req.query.provider as string || undefined;

      const models = await modelService.searchModels(query, provider);
      res.json({ success: true, data: models });
    } catch (error) {
      console.error('搜索模型失败:', error);
      res.status(500).json({
        success: false,
        message: '搜索模型失败',
        data: []
      });
    }
  }

  /**
   * 更新模型配置
   * @param req 请求对象
   * @param res 响应对象
   */
  updateModelConfig = (req: Request, res: Response): void => {
    try {
      const { provider, model, temperature, maxTokens } = req.body;

      if (!provider) {
        res.status(400).json({ success: false, message: '模型提供商不能为空' });
        return;
      }

      const success = modelService.updateModelConfig({
        provider,
        model,
        temperature: temperature !== undefined ? parseFloat(temperature) : undefined,
        maxTokens: maxTokens !== undefined ? parseInt(maxTokens) : undefined
      });

      if (!success) {
        res.status(500).json({ success: false, message: '更新模型配置失败' });
        return;
      }

      res.json({ success: true, data: modelService.getModelConfig() });
    } catch (error) {
      console.error('更新模型配置失败:', error);
      res.status(500).json({ success: false, message: '更新模型配置失败' });
    }
  }
}

// 创建模型控制器实例
export const modelController = new ModelController();
