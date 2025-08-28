/**
 * 行动执行器
 * 负责工具调用、行动执行和结果处理
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  ToolCallResult, 
  TaskStep, 
  ExecutionContext,
  AgentConfig 
} from '../types/agent.types';
import { AgentPromptBuilder } from '../prompts/agent-prompts';
import { modelService } from '../../model';
import { toolManager } from '../../tools/tool.manager';
import { settingService } from '../../settings';

/**
 * 行动执行器类
 */
export class ActionExecutor {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * 执行行动
   */
  async executeAction(
    action: string,
    context: ExecutionContext,
    step: TaskStep
  ): Promise<ToolCallResult[]> {
    try {
      console.log(`[行动执行器] 开始执行行动: ${action}`);

      // 构建行动提示词
      const prompt = AgentPromptBuilder.buildActionPrompt(
        action,
        context.availableTools,
        context
      );

      // 调用模型生成执行计划
      const executionPlan = await this.generateExecutionPlan(prompt);

      // 执行工具调用
      const results = await this.executeToolCalls(executionPlan.toolCalls, step);

      console.log(`[行动执行器] 行动执行完成，调用了 ${results.length} 个工具`);

      return results;

    } catch (error) {
      console.error('[行动执行器] 行动执行失败:', error);
      
      // 返回错误结果
      return [{
        toolName: 'action_executor',
        input: { action },
        output: null,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: 0,
        metadata: {
          stepId: step.id,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : String(error)
        }
      }];
    }
  }

  /**
   * 生成执行计划
   */
  private async generateExecutionPlan(prompt: string): Promise<any> {
    const provider = settingService.getModelProvider();
    let model: string | undefined;

    // 根据配置选择行动模型
    if (provider === 'ollama') {
      model = settingService.getSetting('ollama_advanced_model') ||
              settingService.getSetting('ollama_model') ||
              'qwen3:7b';
    } else if (provider === 'siliconflow') {
      model = settingService.getSetting('siliconflow_advanced_model') ||
              settingService.getSetting('siliconflow_model') ||
              'Qwen/Qwen2.5-32B-Instruct';
    }

    const result = await modelService.generateText(prompt, {
      model,
      temperature: 0.2, // 行动执行需要更确定性的输出
      max_tokens: 2048,
      system_prompt: '你是一个专业的行动执行器，擅长工具调用和参数准备。请严格按照JSON格式输出执行计划。'
    });

    return this.parseExecutionPlan(result);
  }

  /**
   * 解析执行计划
   */
  private parseExecutionPlan(response: string): any {
    try {
      // 尝试提取JSON部分
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      
      const parsed = JSON.parse(jsonStr);
      
      // 验证必要字段
      if (!parsed.toolCalls || !Array.isArray(parsed.toolCalls)) {
        throw new Error('执行计划格式不完整');
      }

      return parsed;
    } catch (error) {
      console.error('[行动执行器] 解析执行计划失败:', error);
      throw new Error(`解析执行计划失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 执行工具调用
   */
  private async executeToolCalls(toolCalls: any[], step: TaskStep): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];

    for (const toolCall of toolCalls) {
      try {
        console.log(`[行动执行器] 执行工具: ${toolCall.toolName}`);

        const startTime = Date.now();

        // 执行工具
        const result = await toolManager.executeTool(toolCall.toolName, toolCall.input);

        const executionTime = Date.now() - startTime;

        // 处理工具执行结果
        const toolResult: ToolCallResult = {
          toolName: toolCall.toolName,
          input: toolCall.input,
          output: result.tool_output,
          success: !result.error,
          error: result.error || undefined,
          executionTime,
          metadata: {
            stepId: step.id,
            timestamp: Date.now(),
            reasoning: toolCall.reasoning,
            success: !result.error
          }
        };

        results.push(toolResult);

        console.log(`[行动执行器] 工具 ${toolCall.toolName} 执行${toolResult.success ? '成功' : '失败'}`);

      } catch (error) {
        console.error(`[行动执行器] 工具 ${toolCall.toolName} 执行出错:`, error);

        const errorResult: ToolCallResult = {
          toolName: toolCall.toolName,
          input: toolCall.input,
          output: null,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          executionTime: 0,
          metadata: {
            stepId: step.id,
            timestamp: Date.now(),
            reasoning: toolCall.reasoning,
            error: error instanceof Error ? error.message : String(error)
          }
        };

        results.push(errorResult);
      }
    }

    return results;
  }

  /**
   * 验证工具调用结果
   */
  validateToolCallResults(results: ToolCallResult[]): boolean {
    if (!results || results.length === 0) {
      console.warn('[行动执行器] 没有工具调用结果');
      return false;
    }

    // 检查是否有成功的工具调用
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log(`[行动执行器] 工具调用结果: ${successCount}/${totalCount} 成功`);

    // 如果所有工具都失败了，返回false
    if (successCount === 0) {
      console.warn('[行动执行器] 所有工具调用都失败了');
      return false;
    }

    return true;
  }

  /**
   * 重试失败的工具调用
   */
  async retryFailedTools(
    failedResults: ToolCallResult[],
    maxRetries: number = 3
  ): Promise<ToolCallResult[]> {
    const retryResults: ToolCallResult[] = [];

    for (const failedResult of failedResults) {
      if (failedResult.metadata?.retryCount >= maxRetries) {
        console.log(`[行动执行器] 工具 ${failedResult.toolName} 已达到最大重试次数`);
        retryResults.push(failedResult);
        continue;
      }

      try {
        console.log(`[行动执行器] 重试工具: ${failedResult.toolName}`);

        const startTime = Date.now();
        const result = await toolManager.executeTool(failedResult.toolName, failedResult.input);
        const executionTime = Date.now() - startTime;

        const retryResult: ToolCallResult = {
          ...failedResult,
          output: result.tool_output,
          success: !result.error,
          error: result.error || undefined,
          executionTime,
          metadata: {
            ...failedResult.metadata,
            retryCount: (failedResult.metadata?.retryCount || 0) + 1,
            timestamp: Date.now(),
            isRetry: true
          }
        };

        retryResults.push(retryResult);

        console.log(`[行动执行器] 工具 ${failedResult.toolName} 重试${retryResult.success ? '成功' : '失败'}`);

      } catch (error) {
        console.error(`[行动执行器] 工具 ${failedResult.toolName} 重试出错:`, error);

        const errorResult: ToolCallResult = {
          ...failedResult,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          executionTime: 0,
          metadata: {
            ...failedResult.metadata,
            retryCount: (failedResult.metadata?.retryCount || 0) + 1,
            timestamp: Date.now(),
            isRetry: true,
            error: error instanceof Error ? error.message : String(error)
          }
        };

        retryResults.push(errorResult);
      }
    }

    return retryResults;
  }

  /**
   * 获取工具执行统计
   */
  getExecutionStats(results: ToolCallResult[]): {
    total: number;
    successful: number;
    failed: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
  } {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const totalExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0);
    const averageExecutionTime = total > 0 ? totalExecutionTime / total : 0;

    return {
      total,
      successful,
      failed,
      totalExecutionTime,
      averageExecutionTime
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[行动执行器] 配置已更新:', newConfig);
  }

  /**
   * 获取当前配置
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}
