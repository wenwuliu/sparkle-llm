/**
 * 工具服务
 */
import { toolManager } from './tool.manager';
import { Tool } from './interfaces/tool.interface';
import { ToolCall, ToolCallResult } from './tools.types';
import { initializeBuiltinTools } from './builtin';

/**
 * 工具服务类
 * 提供工具相关的服务功能
 */
export class ToolService {
  /**
   * 初始化工具服务
   */
  async initialize(): Promise<void> {
    console.log('初始化工具服务...');
    await initializeBuiltinTools();
    console.log('工具服务初始化完成');
  }

  /**
   * 注册工具
   * @param tool 工具对象
   */
  registerTool(tool: Tool): void {
    toolManager.registerTool(tool);
  }

  /**
   * 获取工具
   * @param name 工具名称
   * @returns 工具对象或undefined
   */
  getTool(name: string): Tool | undefined {
    return toolManager.getTool(name);
  }

  /**
   * 获取所有工具
   * @returns 工具数组
   */
  getAllTools(): Tool[] {
    return toolManager.getAllTools();
  }

  /**
   * 获取工具描述（用于大模型API）- 传统格式
   * @returns 工具描述数组
   */
  getToolDescriptions(): any[] {
    return toolManager.getToolDescriptions();
  }

  /**
   * 获取OpenAI兼容的函数调用格式工具描述
   * @returns OpenAI兼容的函数调用格式工具描述
   */
  getOpenAIFunctionTools(): any[] {
    return toolManager.getOpenAIFunctionTools();
  }

  /**
   * 执行工具
   * @param name 工具名称
   * @param input 工具输入参数
   * @returns 工具调用结果
   */
  async executeTool(name: string, input: any): Promise<ToolCallResult> {
    return toolManager.executeTool(name, input);
  }

  /**
   * 批量执行工具
   * @param toolCalls 工具调用数组
   * @returns 工具调用结果数组
   */
  async executeTools(toolCalls: ToolCall[]): Promise<ToolCallResult[]> {
    return toolManager.executeTools(toolCalls);
  }
}

// 创建工具服务实例
export const toolService = new ToolService();
