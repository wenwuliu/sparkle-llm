/**
 * 应用核心服务
 * 解决模块间循环依赖问题，提供统一的服务协调
 */

import { ModelService } from '../model/model.service';
import { MemoryService } from '../memory/memory.service';
import { ToolService } from '../tools/tool.service';

export interface ApplicationContext {
  modelService: ModelService;
  memoryService: MemoryService;
  toolService: ToolService;
}

/**
 * 应用服务协调器
 * 负责管理服务间的协调和通信，避免直接依赖
 */
export class ApplicationService {
  private context: ApplicationContext;

  constructor(context: ApplicationContext) {
    this.context = context;
  }

  /**
   * 处理带工具的文本生成请求
   * 协调模型服务、工具服务和记忆服务
   */
  async generateWithToolsAndMemory(
    messages: any[],
    options: any = {}
  ): Promise<any> {
    // 1. 检索相关记忆
    const memories = await this.context.memoryService.findRelatedMemories(
      messages[messages.length - 1]?.content || '',
      5
    );

    // 2. 获取可用工具
    const tools = this.context.toolService.getAllTools();

    // 3. 调用模型生成
    const result = await this.context.modelService.generateWithToolsUsingMessages(
      messages,
      {
        ...options,
        tools,
        memories
      }
    );

    // 4. 处理工具调用结果
    if (result.toolCalls && result.toolCalls.length > 0) {
      for (const toolCall of result.toolCalls) {
        const toolResult = await this.context.toolService.executeTool(
          toolCall.name,
          toolCall.arguments
        );
        // 更新结果
        result.toolResults = result.toolResults || [];
        result.toolResults.push(toolResult);
      }
    }

    // 5. 生成记忆（如果需要）
    if (options.enableMemory !== false) {
      await this.context.memoryService.autoGenerateMemory(
        `用户: ${messages[messages.length - 1]?.content}\n\nAI: ${result.content}`
      );
    }

    return result;
  }

  /**
   * 获取应用上下文
   */
  getContext(): ApplicationContext {
    return this.context;
  }
}

// 创建应用服务实例
export const createApplicationService = (context: ApplicationContext): ApplicationService => {
  return new ApplicationService(context);
};
