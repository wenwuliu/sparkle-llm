/**
 * 推理引擎
 * 负责智能推理、决策制定和思考过程管理
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Thought, 
  ReasoningResult, 
  TaskStep, 
  ExecutionContext,
  AgentConfig 
} from '../types/agent.types';
import { AgentPromptBuilder } from '../prompts/agent-prompts';
import { modelService } from '../../model';
import { settingService } from '../../settings';

/**
 * 推理引擎类
 */
export class ReasoningEngine {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * 执行推理过程
   */
  async reason(
    currentStep: TaskStep,
    context: ExecutionContext,
    history: any[]
  ): Promise<ReasoningResult> {
    try {
      console.log(`[推理引擎] 开始推理步骤: ${currentStep.description}`);

      // 构建推理提示词
      const prompt = AgentPromptBuilder.buildReasoningPrompt(
        currentStep,
        context,
        history
      );

      // 调用模型进行推理
      const response = await this.callReasoningModel(prompt);

      // 解析推理结果
      const reasoningResult = this.parseReasoningResponse(response);

      // 记录思考过程
      const thoughts = this.generateThoughts(reasoningResult, currentStep);

      console.log(`[推理引擎] 推理完成，置信度: ${reasoningResult.confidence}`);

      return {
        thoughts,
        nextAction: reasoningResult.nextAction,
        confidence: reasoningResult.confidence,
        reasoning: reasoningResult.reasoning,
        alternatives: reasoningResult.alternatives,
        metadata: {
          stepId: currentStep.id,
          timestamp: Date.now(),
          model: this.config.reasoningModel
        }
      };

    } catch (error) {
      console.error('[推理引擎] 推理过程出错:', error);
      
      // 返回默认推理结果
      return this.generateFallbackReasoning(currentStep, error);
    }
  }

  /**
   * 调用推理模型
   */
  private async callReasoningModel(prompt: string): Promise<string> {
    const provider = settingService.getModelProvider();
    let model: string | undefined;

    // 根据配置选择推理模型
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
      temperature: 0.3, // 推理需要更确定性的输出
      max_tokens: 2048,
      system_prompt: '你是一个专业的推理引擎，擅长逻辑分析和决策制定。请严格按照JSON格式输出结果。'
    });

    return result;
  }

  /**
   * 解析推理响应
   */
  private parseReasoningResponse(response: string): any {
    try {
      // 尝试提取JSON部分
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      
      const parsed = JSON.parse(jsonStr);
      
      // 验证必要字段
      if (!parsed.thoughts || !parsed.nextAction || typeof parsed.confidence !== 'number') {
        throw new Error('推理响应格式不完整');
      }

      return parsed;
    } catch (error) {
      console.error('[推理引擎] 解析推理响应失败:', error);
      throw new Error(`解析推理响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成思考记录
   */
  private generateThoughts(reasoningResult: any, currentStep: TaskStep): Thought[] {
    const thoughts: Thought[] = [];

    // 添加推理结果中的思考
    if (reasoningResult.thoughts && Array.isArray(reasoningResult.thoughts)) {
      for (const thought of reasoningResult.thoughts) {
        thoughts.push({
          id: uuidv4(),
          type: thought.type || 'analysis',
          content: thought.content,
          confidence: thought.confidence || 0.5,
          reasoning: thought.reasoning || '',
          timestamp: Date.now(),
          metadata: {
            stepId: currentStep.id,
            source: 'reasoning_engine'
          }
        });
      }
    }

    // 添加决策思考
    thoughts.push({
      id: uuidv4(),
      type: 'decision',
      content: `决定执行: ${reasoningResult.nextAction}`,
      confidence: reasoningResult.confidence,
      reasoning: reasoningResult.reasoning,
      timestamp: Date.now(),
      metadata: {
        stepId: currentStep.id,
        source: 'reasoning_engine',
        alternatives: reasoningResult.alternatives
      }
    });

    return thoughts;
  }

  /**
   * 生成备用推理结果
   */
  private generateFallbackReasoning(currentStep: TaskStep, error: any): ReasoningResult {
    console.log('[推理引擎] 生成备用推理结果');

    const fallbackThought: Thought = {
      id: uuidv4(),
      type: 'analysis',
      content: `推理过程遇到错误: ${error instanceof Error ? error.message : '未知错误'}`,
      confidence: 0.3,
      reasoning: '由于推理失败，采用保守策略继续执行',
      timestamp: Date.now(),
      metadata: {
        stepId: currentStep.id,
        source: 'fallback',
        error: error instanceof Error ? error.message : String(error)
      }
    };

    return {
      thoughts: [fallbackThought],
      nextAction: '继续执行当前步骤',
      confidence: 0.3,
      reasoning: '采用保守策略，继续执行当前步骤',
      alternatives: ['重试推理', '跳过当前步骤', '请求用户指导'],
      metadata: {
        stepId: currentStep.id,
        timestamp: Date.now(),
        isFallback: true,
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }

  /**
   * 验证推理结果
   */
  validateReasoningResult(result: ReasoningResult): boolean {
    // 检查置信度
    if (result.confidence < 0.1 || result.confidence > 1.0) {
      console.warn('[推理引擎] 置信度超出有效范围:', result.confidence);
      return false;
    }

    // 检查必要字段
    if (!result.nextAction || !result.reasoning) {
      console.warn('[推理引擎] 推理结果缺少必要字段');
      return false;
    }

    // 检查思考过程
    if (!result.thoughts || result.thoughts.length === 0) {
      console.warn('[推理引擎] 推理结果缺少思考过程');
      return false;
    }

    return true;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[推理引擎] 配置已更新:', newConfig);
  }

  /**
   * 获取当前配置
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}
