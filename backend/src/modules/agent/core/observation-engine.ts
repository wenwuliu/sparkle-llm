/**
 * 观察引擎
 * 负责分析行动结果、提取洞察和生成观察报告
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  ObservationResult, 
  ToolCallResult, 
  TaskStep, 
  ExecutionContext,
  AgentConfig 
} from '../types/agent.types';
import { AgentPromptBuilder } from '../prompts/agent-prompts';
import { modelService } from '../../model';
import { settingService } from '../../settings';

/**
 * 观察引擎类
 */
export class ObservationEngine {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * 分析行动结果
   */
  async observe(
    actionResults: ToolCallResult[],
    expectedOutcome: string,
    context: ExecutionContext,
    step: TaskStep
  ): Promise<ObservationResult> {
    try {
      console.log(`[观察引擎] 开始分析行动结果，共 ${actionResults.length} 个工具调用`);

      // 构建观察提示词
      const prompt = AgentPromptBuilder.buildObservationPrompt(
        actionResults,
        expectedOutcome,
        context
      );

      // 调用模型进行分析
      const response = await this.callObservationModel(prompt);

      // 解析观察结果
      const observationResult = this.parseObservationResponse(response);

      // 增强观察结果
      const enhancedResult = this.enhanceObservationResult(
        observationResult,
        actionResults,
        step
      );

      console.log(`[观察引擎] 观察分析完成，提取了 ${enhancedResult.insights.length} 个洞察`);

      return enhancedResult;

    } catch (error) {
      console.error('[观察引擎] 观察分析失败:', error);
      
      // 返回默认观察结果
      return this.generateFallbackObservation(actionResults, step, error);
    }
  }

  /**
   * 调用观察模型
   */
  private async callObservationModel(prompt: string): Promise<string> {
    const provider = settingService.getModelProvider();
    let model: string | undefined;

    // 根据配置选择观察模型
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
      temperature: 0.4, // 观察需要一定的创造性
      max_tokens: 2048,
      system_prompt: '你是一个专业的观察分析器，擅长从结果中提取洞察和发现模式。请严格按照JSON格式输出分析结果。'
    });

    return result;
  }

  /**
   * 解析观察响应
   */
  private parseObservationResponse(response: string): any {
    try {
      // 尝试提取JSON部分
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      
      const parsed = JSON.parse(jsonStr);
      
      // 验证必要字段
      if (!parsed.observations || !Array.isArray(parsed.observations)) {
        throw new Error('观察响应格式不完整');
      }

      return parsed;
    } catch (error) {
      console.error('[观察引擎] 解析观察响应失败:', error);
      throw new Error(`解析观察响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 增强观察结果
   */
  private enhanceObservationResult(
    baseResult: any,
    actionResults: ToolCallResult[],
    step: TaskStep
  ): ObservationResult {
    // 计算执行统计
    const stats = this.calculateExecutionStats(actionResults);

    // 提取关键信息
    const keyFindings = this.extractKeyFindings(actionResults);

    // 生成改进建议
    const improvements = this.generateImprovements(actionResults, baseResult);

    return {
      observations: baseResult.observations || [],
      insights: baseResult.insights || [],
      implications: baseResult.implications || [],
      nextSteps: baseResult.nextSteps || [],
      confidence: baseResult.confidence || 0.5,
      metadata: {
        stepId: step.id,
        timestamp: Date.now(),
        executionStats: stats,
        keyFindings,
        improvements,
        model: this.config.reasoningModel
      }
    };
  }

  /**
   * 计算执行统计
   */
  private calculateExecutionStats(actionResults: ToolCallResult[]): any {
    const total = actionResults.length;
    const successful = actionResults.filter(r => r.success).length;
    const failed = total - successful;
    const totalExecutionTime = actionResults.reduce((sum, r) => sum + r.executionTime, 0);
    const averageExecutionTime = total > 0 ? totalExecutionTime / total : 0;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? successful / total : 0,
      totalExecutionTime,
      averageExecutionTime,
      fastestTool: actionResults.reduce((fastest, current) => 
        current.executionTime < fastest.executionTime ? current : fastest
      ),
      slowestTool: actionResults.reduce((slowest, current) => 
        current.executionTime > slowest.executionTime ? current : slowest
      )
    };
  }

  /**
   * 提取关键发现
   */
  private extractKeyFindings(actionResults: ToolCallResult[]): string[] {
    const findings: string[] = [];

    // 分析成功和失败的模式
    const successfulTools = actionResults.filter(r => r.success);
    const failedTools = actionResults.filter(r => !r.success);

    if (successfulTools.length > 0) {
      findings.push(`成功执行了 ${successfulTools.length} 个工具调用`);
      
      // 分析成功的工具类型
      const toolTypes = successfulTools.map(r => r.toolName);
      const uniqueTools = [...new Set(toolTypes)];
      findings.push(`涉及的工具类型: ${uniqueTools.join(', ')}`);
    }

    if (failedTools.length > 0) {
      findings.push(`有 ${failedTools.length} 个工具调用失败`);
      
      // 分析失败的原因
      const errorTypes = failedTools.map(r => r.error).filter(Boolean);
      if (errorTypes.length > 0) {
        findings.push(`主要错误类型: ${errorTypes.slice(0, 3).join(', ')}`);
      }
    }

    // 分析执行时间模式
    const executionTimes = actionResults.map(r => r.executionTime);
    const avgTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    findings.push(`平均执行时间: ${avgTime.toFixed(2)}ms`);

    return findings;
  }

  /**
   * 生成改进建议
   */
  private generateImprovements(actionResults: ToolCallResult[], baseResult: any): string[] {
    const improvements: string[] = [];

    // 基于失败的工具调用生成建议
    const failedTools = actionResults.filter(r => !r.success);
    if (failedTools.length > 0) {
      improvements.push('考虑为失败的工具调用添加重试机制');
      improvements.push('检查工具参数的正确性和完整性');
    }

    // 基于执行时间生成建议
    const slowTools = actionResults.filter(r => r.executionTime > 5000); // 超过5秒的工具
    if (slowTools.length > 0) {
      improvements.push('优化慢速工具的执行效率');
      improvements.push('考虑并行执行独立的工具调用');
    }

    // 基于观察结果生成建议
    if (baseResult.issues && Array.isArray(baseResult.issues)) {
      for (const issue of baseResult.issues) {
        if (issue.suggestions && Array.isArray(issue.suggestions)) {
          improvements.push(...issue.suggestions);
        }
      }
    }

    return improvements;
  }

  /**
   * 生成备用观察结果
   */
  private generateFallbackObservation(
    actionResults: ToolCallResult[],
    step: TaskStep,
    error: any
  ): ObservationResult {
    console.log('[观察引擎] 生成备用观察结果');

    const stats = this.calculateExecutionStats(actionResults);
    const keyFindings = this.extractKeyFindings(actionResults);

    return {
      observations: [
        `观察分析过程遇到错误: ${error instanceof Error ? error.message : '未知错误'}`,
        `共执行了 ${actionResults.length} 个工具调用`,
        `成功: ${stats.successful}, 失败: ${stats.failed}`
      ],
      insights: [
        '由于观察分析失败，采用基础统计信息',
        '建议检查工具调用的参数和权限'
      ],
      implications: [
        '需要重新评估执行策略',
        '可能需要用户干预或调整参数'
      ],
      nextSteps: [
        '检查失败的工具调用',
        '验证工具参数',
        '考虑重试或使用替代方案'
      ],
      confidence: 0.3,
      metadata: {
        stepId: step.id,
        timestamp: Date.now(),
        isFallback: true,
        error: error instanceof Error ? error.message : String(error),
        executionStats: stats,
        keyFindings
      }
    };
  }

  /**
   * 验证观察结果
   */
  validateObservationResult(result: ObservationResult): boolean {
    // 检查置信度
    if (result.confidence < 0.1 || result.confidence > 1.0) {
      console.warn('[观察引擎] 置信度超出有效范围:', result.confidence);
      return false;
    }

    // 检查必要字段
    if (!result.observations || result.observations.length === 0) {
      console.warn('[观察引擎] 观察结果缺少观察内容');
      return false;
    }

    // 检查洞察
    if (!result.insights || result.insights.length === 0) {
      console.warn('[观察引擎] 观察结果缺少洞察');
      return false;
    }

    return true;
  }

  /**
   * 合并多个观察结果
   */
  mergeObservationResults(results: ObservationResult[]): ObservationResult {
    if (results.length === 0) {
      throw new Error('没有观察结果可以合并');
    }

    if (results.length === 1) {
      return results[0];
    }

    // 合并所有观察结果
    const mergedObservations = results.flatMap(r => r.observations);
    const mergedInsights = results.flatMap(r => r.insights);
    const mergedImplications = results.flatMap(r => r.implications);
    const mergedNextSteps = results.flatMap(r => r.nextSteps);

    // 计算平均置信度
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    // 合并元数据
    const mergedMetadata = {
      timestamp: Date.now(),
      sourceCount: results.length,
      isMerged: true,
      originalResults: results.map(r => ({
        confidence: r.confidence,
        observationCount: r.observations.length,
        insightCount: r.insights.length
      }))
    };

    return {
      observations: [...new Set(mergedObservations)], // 去重
      insights: [...new Set(mergedInsights)],
      implications: [...new Set(mergedImplications)],
      nextSteps: [...new Set(mergedNextSteps)],
      confidence: avgConfidence,
      metadata: mergedMetadata
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[观察引擎] 配置已更新:', newConfig);
  }

  /**
   * 获取当前配置
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}
