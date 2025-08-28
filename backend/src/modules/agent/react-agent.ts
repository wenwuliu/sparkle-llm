/**
 * ReAct Agent
 * 基于ReAct框架的智能任务执行代理
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  AgentState, 
  TaskStep, 
  ExecutionContext, 
  ExecutionResult, 
  AgentConfig,
  AgentStatus,
  ProgressEvent,
  AgentError,
  DEFAULT_AGENT_CONFIG
} from './types/agent.types';
import { ReasoningEngine } from './core/reasoning-engine';
import { ActionExecutor } from './core/action-executor';
import { ObservationEngine } from './core/observation-engine';
import { AgentPromptBuilder } from './prompts/agent-prompts';
import { modelService } from '../model';
import { toolManager } from '../tools/tool.manager';
import { settingService } from '../settings';
import { conversationService } from '../conversation';

/**
 * ReAct Agent类
 */
export class ReActAgent {
  private state: AgentState | null = null;
  private config: AgentConfig;
  private reasoningEngine: ReasoningEngine;
  private actionExecutor: ActionExecutor;
  private observationEngine: ObservationEngine;
  private progressCallback?: (event: ProgressEvent) => void;
  private errorCallback?: (error: AgentError) => void;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    this.reasoningEngine = new ReasoningEngine(this.config);
    this.actionExecutor = new ActionExecutor(this.config);
    this.observationEngine = new ObservationEngine(this.config);
  }

  /**
   * 执行任务
   */
  async executeTask(
    task: string,
    goal: string,
    context: Partial<ExecutionContext> = {},
    options: {
      conversationId?: string;
      onProgress?: (event: ProgressEvent) => void;
      onError?: (error: AgentError) => void;
    } = {}
  ): Promise<ExecutionResult> {
    try {
      console.log(`[ReAct Agent] 开始执行任务: ${task}`);

      // 设置回调函数
      this.progressCallback = options.onProgress;
      this.errorCallback = options.onError;

      // 初始化状态
      this.state = this.initializeState(task, goal, context, options.conversationId);

      // 发送开始事件
      this.emitProgress({
        type: 'status_change',
        agentId: this.state.id,
        status: 'planning',
        progress: 0,
        message: '开始任务分析和规划',
        timestamp: Date.now()
      });

      // 1. 任务分析和规划
      const plan = await this.analyzeAndPlan(task, goal, context);
      this.state.plan = plan;
      this.state.totalSteps = plan.length;

      // 2. 执行ReAct循环
      const result = await this.executeReActLoop();

      // 3. 生成最终结果
      const executionResult = await this.generateFinalResult(result);

      console.log(`[ReAct Agent] 任务执行完成，共执行 ${this.state.history.length} 个步骤`);

      return executionResult;

    } catch (error) {
      console.error('[ReAct Agent] 任务执行失败:', error);
      
      const agentError: AgentError = {
        type: 'execution_error',
        message: '任务执行过程中发生错误',
        details: error instanceof Error ? error.message : String(error),
        recoverable: false,
        suggestions: ['检查任务描述', '验证工具可用性', '重试执行'],
        timestamp: Date.now()
      };

      this.emitError(agentError);

      // 返回错误结果
      return {
        success: false,
        result: null,
        summary: `任务执行失败: ${agentError.message}`,
        steps: this.state?.plan || [],
        history: this.state?.history || [],
        executionTime: this.state ? Date.now() - this.state.startTime : 0,
        errorCount: 1,
        confidence: 0,
        recommendations: agentError.suggestions,
        metadata: {
          error: agentError,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * 初始化Agent状态
   */
  private initializeState(
    task: string,
    goal: string,
    context: Partial<ExecutionContext>,
    conversationId?: string
  ): AgentState {
    const now = Date.now();

    // 构建完整的执行上下文
    const fullContext: ExecutionContext = {
      task,
      goal,
      constraints: context.constraints || [],
      availableTools: context.availableTools || toolManager.getAllTools(),
      memory: context.memory || [],
      conversationHistory: context.conversationHistory || [],
      userPreferences: context.userPreferences || {},
      environment: context.environment || {}
    };

    return {
      id: uuidv4(),
      task,
      goal,
      status: 'idle',
      currentStep: 0,
      totalSteps: 0,
      plan: [],
      context: fullContext,
      history: [],
      startTime: now,
      lastUpdateTime: now,
      progress: 0,
      confidence: 1.0,
      errorCount: 0,
      retryCount: 0,
      metadata: {
        conversationId,
        timestamp: now
      }
    };
  }

  /**
   * 任务分析和规划
   */
  private async analyzeAndPlan(
    task: string,
    goal: string,
    context: Partial<ExecutionContext>
  ): Promise<TaskStep[]> {
    try {
      console.log('[ReAct Agent] 开始任务分析和规划');

      // 构建分析提示词
      const prompt = AgentPromptBuilder.buildTaskAnalysisPrompt(task, goal, this.state!.context);

      // 调用模型进行分析
      const response = await this.callPlanningModel(prompt);

      // 解析分析结果
      const analysis = this.parseAnalysisResponse(response);

      // 生成执行步骤
      const steps = this.generateExecutionSteps(analysis, task, goal);

      console.log(`[ReAct Agent] 规划完成，生成了 ${steps.length} 个执行步骤`);

      return steps;

    } catch (error) {
      console.error('[ReAct Agent] 任务分析失败:', error);
      
      // 生成默认步骤
      return this.generateDefaultSteps(task, goal);
    }
  }

  /**
   * 调用规划模型
   */
  private async callPlanningModel(prompt: string): Promise<string> {
    const provider = settingService.getModelProvider();
    let model: string | undefined;

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
      temperature: 0.3,
      max_tokens: 2048,
      system_prompt: '你是一个专业的任务规划专家，擅长任务分解和步骤设计。请严格按照JSON格式输出分析结果。'
    });

    return result;
  }

  /**
   * 解析分析响应
   */
  private parseAnalysisResponse(response: string): any {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      
      const parsed = JSON.parse(jsonStr);
      
      if (!parsed.estimatedSteps || !parsed.executionStrategy) {
        throw new Error('分析响应格式不完整');
      }

      return parsed;
    } catch (error) {
      console.error('[ReAct Agent] 解析分析响应失败:', error);
      throw new Error(`解析分析响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成执行步骤
   */
  private generateExecutionSteps(analysis: any, task: string, goal: string): TaskStep[] {
    const steps: TaskStep[] = [];
    const stepCount = Math.min(analysis.estimatedSteps || 5, this.config.maxSteps);

    for (let i = 0; i < stepCount; i++) {
      const step: TaskStep = {
        id: uuidv4(),
        type: 'reasoning',
        description: `步骤 ${i + 1}: 分析和执行`,
        expectedOutcome: `完成步骤 ${i + 1} 的目标`,
        dependencies: i > 0 ? [steps[i - 1].id] : [],
        status: 'pending',
        thoughts: [],
        metadata: {
          stepNumber: i + 1,
          complexity: analysis.complexity || 'medium',
          requiredTools: analysis.requiredTools || []
        }
      };

      steps.push(step);
    }

    return steps;
  }

  /**
   * 生成默认步骤
   */
  private generateDefaultSteps(task: string, goal: string): TaskStep[] {
    return [
      {
        id: uuidv4(),
        type: 'reasoning',
        description: '分析任务需求',
        expectedOutcome: '理解任务目标和约束',
        dependencies: [],
        status: 'pending',
        thoughts: [],
        metadata: { stepNumber: 1 }
      },
      {
        id: uuidv4(),
        type: 'action',
        description: '执行任务操作',
        expectedOutcome: '完成主要任务目标',
        dependencies: [],
        status: 'pending',
        thoughts: [],
        metadata: { stepNumber: 2 }
      },
      {
        id: uuidv4(),
        type: 'reflection',
        description: '验证任务完成',
        expectedOutcome: '确认任务目标达成',
        dependencies: [],
        status: 'pending',
        thoughts: [],
        metadata: { stepNumber: 3 }
      }
    ];
  }

  /**
   * 执行ReAct循环
   */
  private async executeReActLoop(): Promise<any> {
    if (!this.state) throw new Error('Agent状态未初始化');

    let currentStepIndex = 0;
    let finalResult = null;

    while (currentStepIndex < this.state.plan.length && this.state.status !== 'completed') {
      const step = this.state.plan[currentStepIndex];
      
      try {
        // 更新状态
        this.state.currentStep = currentStepIndex + 1;
        this.state.status = 'reasoning';
        this.updateProgress();

        // 发送步骤开始事件
        this.emitProgress({
          type: 'step_start',
          agentId: this.state.id,
          stepId: step.id,
          status: 'reasoning',
          progress: (currentStepIndex / this.state.plan.length) * 100,
          message: `开始执行步骤 ${currentStepIndex + 1}: ${step.description}`,
          data: {
            stepIndex: currentStepIndex,
            stepId: step.id,
            stepType: step.type,
            agentState: {
              currentStep: currentStepIndex + 1,
              totalSteps: this.state.plan.length,
              status: 'reasoning',
              plan: this.state.plan
            }
          },
          timestamp: Date.now()
        });

        // 1. Reasoning - 推理
        const reasoningResult = await this.reasoningEngine.reason(
          step,
          this.state.context,
          this.state.history
        );

        // 更新步骤状态
        step.status = 'running';
        step.startTime = Date.now();
        step.thoughts = reasoningResult.thoughts;

        // 2. Acting - 行动
        if (reasoningResult.nextAction && reasoningResult.confidence >= this.config.confidenceThreshold) {
          this.state.status = 'acting';
          this.updateProgress();

          // 发送acting状态事件
          this.emitProgress({
            type: 'status_change',
            agentId: this.state.id,
            status: 'acting',
            progress: (currentStepIndex / this.state.plan.length) * 100,
            message: `正在执行操作: ${reasoningResult.nextAction}`,
            data: {
              action: reasoningResult.nextAction,
              confidence: reasoningResult.confidence,
              agentState: {
                currentStep: currentStepIndex + 1,
                totalSteps: this.state.plan.length,
                status: 'acting',
                plan: this.state.plan
              }
            },
            timestamp: Date.now()
          });

          const actionResults = await this.actionExecutor.executeAction(
            reasoningResult.nextAction,
            this.state.context,
            step
          );

          // 3. Observing - 观察
          this.state.status = 'observing';
          this.updateProgress();

          // 发送observing状态事件
          this.emitProgress({
            type: 'status_change',
            agentId: this.state.id,
            status: 'observing',
            progress: (currentStepIndex / this.state.plan.length) * 100,
            message: `正在观察执行结果`,
            data: {
              actionResults,
              agentState: {
                currentStep: currentStepIndex + 1,
                totalSteps: this.state.plan.length,
                status: 'observing',
                plan: this.state.plan
              }
            },
            timestamp: Date.now()
          });

          const observationResult = await this.observationEngine.observe(
            actionResults,
            step.expectedOutcome,
            this.state.context,
            step
          );

          // 记录执行历史
          this.recordExecutionHistory(step, reasoningResult, actionResults, observationResult);

          // 检查是否需要反思
          if (this.config.enableReflection && this.shouldReflect(observationResult)) {
            await this.performReflection();
          }

          // 更新步骤结果
          step.status = 'completed';
          step.endTime = Date.now();
          step.duration = step.endTime - step.startTime;
          step.result = {
            reasoning: reasoningResult,
            actions: actionResults,
            observation: observationResult
          };

          finalResult = observationResult;

        } else {
          // 置信度不足，跳过当前步骤
          step.status = 'skipped';
          step.result = { reason: '置信度不足', confidence: reasoningResult.confidence };
        }

        // 发送步骤完成事件
        this.emitProgress({
          type: 'step_complete',
          agentId: this.state.id,
          stepId: step.id,
          status: this.state.status,
          progress: ((currentStepIndex + 1) / this.state.plan.length) * 100,
          message: `步骤 ${currentStepIndex + 1} 执行完成`,
          data: { 
            step,
            agentState: {
              currentStep: currentStepIndex + 1,
              totalSteps: this.state.plan.length,
              status: this.state.status,
              plan: this.state.plan
            }
          },
          timestamp: Date.now()
        });

        currentStepIndex++;

      } catch (error) {
        console.error(`[ReAct Agent] 步骤 ${currentStepIndex + 1} 执行失败:`, error);

        // 记录错误
        step.status = 'failed';
        step.error = error instanceof Error ? error.message : String(error);
        this.state.errorCount++;

        // 发送错误事件
        this.emitProgress({
          type: 'step_error',
          agentId: this.state.id,
          stepId: step.id,
          status: 'failed',
          progress: (currentStepIndex / this.state.plan.length) * 100,
          message: `步骤 ${currentStepIndex + 1} 执行失败`,
          data: { error: step.error },
          timestamp: Date.now()
        });

        // 检查是否应该继续
        if (this.state.errorCount > this.config.maxRetries) {
          this.state.status = 'failed';
          break;
        }

        // 重试当前步骤
        this.state.retryCount++;
        continue;
      }
    }

    // 所有步骤执行完成，设置状态为completed
    if (this.state) {
      this.state.status = 'completed';
      this.state.progress = 100;
      this.updateProgress();
      
      // 发送完成状态事件
      this.emitProgress({
        type: 'status_change',
        agentId: this.state.id,
        status: 'completed',
        progress: 100,
        message: '任务执行完成',
        timestamp: Date.now()
      });
    }

    return finalResult;
  }

  /**
   * 记录执行历史
   */
  private recordExecutionHistory(
    step: TaskStep,
    reasoningResult: any,
    actionResults: any[],
    observationResult: any
  ) {
    if (!this.state) return;

    const historyEntry = {
      id: uuidv4(),
      stepId: step.id,
      type: step.type,
      description: step.description,
      input: { reasoning: reasoningResult, actions: actionResults },
      output: observationResult,
      success: true,
      timestamp: Date.now(),
      duration: step.duration || 0,
      thoughts: reasoningResult.thoughts || []
    };

    this.state.history.push(historyEntry);
    this.state.lastUpdateTime = Date.now();
  }

  /**
   * 判断是否需要反思
   */
  private shouldReflect(observationResult: any): boolean {
    // 基于观察结果的置信度判断
    if (observationResult.confidence < 0.5) return true;
    
    // 基于问题数量判断
    if (observationResult.metadata?.issues?.length > 0) return true;
    
    // 基于执行统计判断
    const stats = observationResult.metadata?.executionStats;
    if (stats && stats.successRate < 0.7) return true;

    return false;
  }

  /**
   * 执行反思
   */
  private async performReflection(): Promise<void> {
    if (!this.state || !this.config.enableReflection) return;

    console.log('[ReAct Agent] 开始执行反思');

    try {
      const prompt = AgentPromptBuilder.buildReflectionPrompt(
        this.state.plan,
        this.state.history,
        this.state.context
      );

      const response = await modelService.generateText(prompt, {
        temperature: 0.4,
        max_tokens: 1024,
        system_prompt: '你是一个专业的反思分析器，擅长总结经验教训和改进建议。'
      });

      // 记录反思结果
      this.state.metadata.reflection = response;

      console.log('[ReAct Agent] 反思完成');

    } catch (error) {
      console.error('[ReAct Agent] 反思过程出错:', error);
    }
  }

  /**
   * 生成最终结果
   */
  private async generateFinalResult(finalObservation: any): Promise<ExecutionResult> {
    if (!this.state) throw new Error('Agent状态未初始化');

    const executionTime = Date.now() - this.state.startTime;
    const completedSteps = this.state.plan.filter(s => s.status === 'completed').length;
    const success = this.state.status === 'completed' && completedSteps > 0;

    // 生成摘要
    const summary = this.generateSummary();

    // 生成建议
    const recommendations = this.generateRecommendations();

    // 生成任务结论总结
    const taskConclusion = await this.generateTaskConclusion(summary, recommendations);

    return {
      success,
      result: finalObservation,
      summary,
      taskConclusion,  // 新增：任务结论总结
      steps: this.state.plan,
      history: this.state.history,
      executionTime,
      errorCount: this.state.errorCount,
      confidence: this.state.confidence,
      recommendations,
      metadata: {
        agentId: this.state.id,
        finalStatus: this.state.status,
        completedSteps,
        totalSteps: this.state.plan.length,
        timestamp: Date.now()
      }
    };
  }

  /**
   * 生成任务结论总结
   */
  private async generateTaskConclusion(summary: string, recommendations: string[]): Promise<any> {
    try {
      console.log('[ReAct Agent] 开始生成任务结论总结');

      // 构建执行结果对象
      const executionResult = {
        summary,
        steps: this.state!.plan,
        history: this.state!.history,
        executionTime: Date.now() - this.state!.startTime,
        confidence: this.state!.confidence,
        recommendations
      };

      // 构建任务结论提示词
      const prompt = AgentPromptBuilder.buildTaskConclusionPrompt(
        this.state!.task,
        this.state!.goal,
        executionResult,
        this.state!.task  // 用户需求就是任务描述
      );

      // 调用模型生成结论
      const response = await modelService.generateText(prompt, {
        temperature: 0.3,
        max_tokens: 2048,
        system_prompt: '你是一个专业的任务总结专家，擅长生成清晰、准确的任务结论。请严格按照JSON格式输出。'
      });

      // 解析结论结果
      const conclusion = this.parseConclusionResponse(response);

      console.log('[ReAct Agent] 任务结论总结生成完成');

      return conclusion;

    } catch (error) {
      console.error('[ReAct Agent] 生成任务结论总结失败:', error);
      
      // 返回默认结论
      const completedSteps = this.state!.plan.filter(s => s.status === 'completed').length;
      return {
        taskCompletion: {
          isCompleted: this.state!.status === 'completed',
          completionRate: completedSteps / this.state!.plan.length,
          successLevel: this.state!.status === 'completed' ? 'high' : 'low'
        },
        mainResults: ['任务执行完成'],
        userResponse: `已完成任务：${this.state!.task}`,
        resultExplanation: summary,
        keyFindings: [],
        nextSteps: recommendations,
        conclusion: summary
      };
    }
  }

  /**
   * 解析结论响应
   */
  private parseConclusionResponse(response: string): any {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      
      const parsed = JSON.parse(jsonStr);
      
      // 验证必要字段
      if (!parsed.taskCompletion || !parsed.userResponse || !parsed.conclusion) {
        throw new Error('结论响应格式不完整');
      }

      return parsed;
    } catch (error) {
      console.error('[ReAct Agent] 解析结论响应失败:', error);
      throw new Error(`解析结论响应失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成执行摘要
   */
  private generateSummary(): string {
    if (!this.state) return '无法生成摘要';

    const completedSteps = this.state.plan.filter(s => s.status === 'completed').length;
    const failedSteps = this.state.plan.filter(s => s.status === 'failed').length;
    const skippedSteps = this.state.plan.filter(s => s.status === 'skipped').length;

    let summary = `## 任务执行摘要\n\n`;
    summary += `**任务**: ${this.state.task}\n`;
    summary += `**目标**: ${this.state.goal}\n\n`;
    summary += `**执行统计**:\n`;
    summary += `- 总步骤数: ${this.state.plan.length}\n`;
    summary += `- 完成步骤: ${completedSteps}\n`;
    summary += `- 失败步骤: ${failedSteps}\n`;
    summary += `- 跳过步骤: ${skippedSteps}\n`;
    summary += `- 执行时间: ${((Date.now() - this.state.startTime) / 1000).toFixed(2)}秒\n\n`;

    if (this.state.status === 'completed') {
      summary += `**结果**: 任务成功完成\n`;
    } else if (this.state.status === 'failed') {
      summary += `**结果**: 任务执行失败\n`;
    } else {
      summary += `**结果**: 任务部分完成\n`;
    }

    return summary;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!this.state) return recommendations;

    // 基于错误数量生成建议
    if (this.state.errorCount > 0) {
      recommendations.push('检查工具配置和权限设置');
      recommendations.push('验证输入参数的正确性');
    }

    // 基于完成情况生成建议
    const completedSteps = this.state.plan.filter(s => s.status === 'completed').length;
    if (completedSteps < this.state.plan.length) {
      recommendations.push('考虑重新执行未完成的步骤');
      recommendations.push('检查任务分解是否合理');
    }

    // 基于反思结果生成建议
    if (this.state.metadata.reflection) {
      recommendations.push('参考反思结果优化后续执行');
    }

    return recommendations;
  }

  /**
   * 更新进度
   */
  private updateProgress(): void {
    if (!this.state) return;

    const progress = (this.state.currentStep / this.state.plan.length) * 100;
    this.state.progress = Math.min(progress, 100);
    this.state.lastUpdateTime = Date.now();
  }

  /**
   * 发送进度事件
   */
  private emitProgress(event: ProgressEvent): void {
    if (this.progressCallback) {
      this.progressCallback(event);
    }
  }

  /**
   * 发送错误事件
   */
  private emitError(error: AgentError): void {
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }

  /**
   * 获取当前状态
   */
  getState(): AgentState | null {
    return this.state;
  }

  /**
   * 停止执行
   */
  stop(): void {
    if (this.state) {
      this.state.status = 'paused';
      console.log('[ReAct Agent] 执行已停止');
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.reasoningEngine.updateConfig(this.config);
    this.actionExecutor.updateConfig(this.config);
    this.observationEngine.updateConfig(this.config);
    console.log('[ReAct Agent] 配置已更新:', newConfig);
  }

  /**
   * 获取当前配置
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}
