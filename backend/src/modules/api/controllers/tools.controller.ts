import { Request, Response } from 'express';
import { toolManager } from '../../tools';

/**
 * 工具控制器
 * 处理工具相关的API请求
 */
export class ToolsController {
  /**
   * 获取所有可用工具
   * @param req 请求对象
   * @param res 响应对象
   */
  getAllTools = (req: Request, res: Response): void => {
    try {
      const tools = toolManager.getAllTools().map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema,
        category: tool.category,
        requires_auth: tool.requires_auth
      }));
      
      res.json({ success: true, data: tools });
    } catch (error) {
      console.error('获取工具列表失败:', error);
      res.status(500).json({ success: false, message: '获取工具列表失败' });
    }
  }

  /**
   * 获取指定工具的详情
   * @param req 请求对象
   * @param res 响应对象
   */
  getToolByName = (req: Request, res: Response): Response | void => {
    try {
      const { name } = req.params;
      const tool = toolManager.getTool(name);
      
      if (!tool) {
        return res.status(404).json({ success: false, message: `工具 ${name} 不存在` });
      }
      
      res.json({
        success: true,
        data: {
          name: tool.name,
          description: tool.description,
          input_schema: tool.input_schema,
          category: tool.category,
          requires_auth: tool.requires_auth
        }
      });
    } catch (error) {
      console.error('获取工具详情失败:', error);
      res.status(500).json({ success: false, message: '获取工具详情失败' });
    }
  }

  /**
   * 执行指定工具
   * @param req 请求对象
   * @param res 响应对象
   */
  executeTool = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { tool_name, input } = req.body;
      
      if (!tool_name) {
        return res.status(400).json({ success: false, message: '工具名称不能为空' });
      }
      
      if (!input) {
        return res.status(400).json({ success: false, message: '工具输入参数不能为空' });
      }
      
      const result = await toolManager.executeTool(tool_name, input);
      
      if (result.error && result.error.includes('不存在')) {
        return res.status(404).json({ success: false, message: result.error });
      }
      
      res.json({ success: !result.error, data: result });
    } catch (error) {
      console.error('执行工具失败:', error);
      res.status(500).json({ 
        success: false, 
        message: '执行工具失败', 
        error: error instanceof Error ? error.message : '未知错误' 
      });
    }
  }
}

// 创建工具控制器实例
export const toolsController = new ToolsController();
