/**
 * 任务流处理器
 * 处理任务流的执行逻辑，管理连续上下文的任务执行
 */
import { Socket } from 'socket.io';
import { SocketEventType } from '../socket.types';
import { toolManager } from '../../tools/tool.manager';
import { modelService } from '../../model';
import { settingService } from '../../settings';

/**
 * 任务流步骤接口
 */
interface TaskFlowStep {
  stepNumber: number;
  description: string;
  modelResponse: string;
  toolCalls?: any[];
  toolResults?: any[];
  timestamp: string;
}

/**
 * 任务流会话接口
 */
interface TaskFlowSession {
  sessionId: string;
  task: string;
  goal: string;
  useTools: boolean;
  conversationId: string;
  isActive: boolean;
  startTime: number;
  toolCallHistory: Array<{
    toolName: string;
    input: any;
    output: any;
    timestamp: number;
    success: boolean;
    error?: string;
  }>;
  steps: TaskFlowStep[];
}

/**
 * 任务流处理器类
 */
export class TaskFlowHandler {
  public taskFlowSession: TaskFlowSession | null = null;

  /**
   * 处理Socket事件
   * @param socket Socket实例
   * @param io SocketIO服务器实例
   */
  public handle(socket: Socket, io: any): void {
    // 将任务流处理器注册到全局，供工具调用
    (global as any).taskFlowHandler = this;
    (global as any).activeSocket = socket;

    // 监听任务流停止事件
    socket.on(SocketEventType.TASK_FLOW_STOP, () => {
      this.stopTaskFlow(socket);
    });

    console.log('任务流处理器已注册');
  }

  /**
   * 执行任务流
   * @param socket Socket实例
   */
  public async executeTaskFlow(socket: Socket): Promise<void> {
    if (!this.taskFlowSession) {
      console.error('没有活动的任务流会话');
      return;
    }

    const { sessionId, task, goal, useTools, conversationId } = this.taskFlowSession;

    try {
      console.log(`开始执行任务流 ${sessionId}: ${task}`);

      // 发送任务流执行状态
      socket.emit(SocketEventType.TASK_FLOW_STATUS, {
        sessionId,
        status: 'executing',
        message: '正在分析任务并开始执行...',
        timestamp: new Date().toISOString()
      });

      // 获取可用工具列表
      const availableTools = useTools ? toolManager.getToolDescriptions() : [];

      // 构建任务执行的初始提示词
      const { taskFlowPromptService } = require('../../model/prompts/task-flow-prompt.service');
      const initialPrompt = taskFlowPromptService.getTaskExecutionPrompt(
        task,
        goal,
        availableTools,
        this.taskFlowSession.toolCallHistory
      );

      // 开始连续对话执行任务
      await this.executeContinuousTask(socket, initialPrompt);

    } catch (error) {
      console.error(`任务流执行错误 ${sessionId}:`, error);
      
      // 发送错误状态
      socket.emit(SocketEventType.TASK_FLOW_STATUS, {
        sessionId,
        status: 'error',
        message: '任务执行过程中发生错误',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });

      // 清理会话
      this.cleanupSession();
    }
  }

  /**
   * 执行连续任务
   * @param socket Socket实例
   * @param prompt 初始提示词
   */
  private async executeContinuousTask(socket: Socket, prompt: string): Promise<void> {
    if (!this.taskFlowSession) return;

    const { sessionId, useTools, conversationId } = this.taskFlowSession;
    let currentPrompt = prompt;
    let iterationCount = 0;
    const maxIterations = 20; // 防止无限循环

    while (this.taskFlowSession.isActive && iterationCount < maxIterations) {
      iterationCount++;
      
      try {
        console.log(`任务流迭代 ${iterationCount}/${maxIterations}`);

        // 发送当前状态
        const statusMessage = `正在执行第 ${iterationCount} 轮分析...`;
        console.log(`[任务流] ${sessionId}: ${statusMessage}`);

        socket.emit(SocketEventType.TASK_FLOW_STATUS, {
          sessionId,
          status: 'processing',
          message: statusMessage,
          iteration: iterationCount,
          timestamp: new Date().toISOString()
        });

        // 发送模型分析状态
        socket.emit(SocketEventType.TASK_FLOW_STATUS, {
          sessionId,
          status: 'processing',
          message: `第 ${iterationCount} 轮：正在调用大模型分析任务...`,
          iteration: iterationCount,
          timestamp: new Date().toISOString()
        });

        // 获取模型响应
        const historyWindow = settingService.getHistoryWindowSize();
        console.log(`[任务流] ${sessionId}: 开始调用模型服务...`);

        // 任务流模式强制使用高级模型
        const provider = settingService.getModelProvider();
        let forceModel: string | undefined;

        if (provider === 'ollama') {
          // 强制使用用户配置的高级Ollama模型
          forceModel = settingService.getSetting('ollama_advanced_model') ||
                      settingService.getSetting('ollama_model') ||
                      'qwen3:7b';
          console.log(`[任务流] ${sessionId}: 强制使用Ollama高级模型: ${forceModel}`);
        } else if (provider === 'siliconflow') {
          // 强制使用用户配置的高级硅基流动模型
          forceModel = settingService.getSetting('siliconflow_advanced_model') ||
                      settingService.getSetting('siliconflow_model') ||
                      'Qwen/Qwen2.5-32B-Instruct';
          console.log(`[任务流] ${sessionId}: 强制使用硅基流动高级模型: ${forceModel}`);
        }

        const response = await modelService.generateTextWithTools(currentPrompt, {
          tools: useTools ? toolManager.getToolDescriptions() : [],
          conversationId,
          historyWindow,
          temperature: 0.3,
          max_tokens: 4096,
          model: forceModel // 强制使用高级模型
        });

        console.log(`[任务流] ${sessionId}: 模型响应完成，工具调用数量: ${response.tool_calls?.length || 0}`);
        console.log(`[任务流] ${sessionId}: 模型响应内容预览: ${response.content.substring(0, 200)}...`);

        // 生成步骤描述
        let stepDescription = '';
        if (response.tool_calls && response.tool_calls.length > 0) {
          const toolNames = response.tool_calls.map(tc => tc.name).join(', ');
          stepDescription = `第 ${iterationCount} 轮分析：模型决定使用工具 [${toolNames}] 来处理任务`;
        } else {
          stepDescription = `第 ${iterationCount} 轮分析：模型进行纯文本分析，未使用工具`;
        }

        // 检查是否有工具调用
        if (response.tool_calls && response.tool_calls.length > 0) {
          // 发送工具调用状态
          socket.emit(SocketEventType.TASK_FLOW_STATUS, {
            sessionId,
            status: 'processing',
            message: `第 ${iterationCount} 轮：检测到 ${response.tool_calls.length} 个工具调用，开始执行...`,
            iteration: iterationCount,
            timestamp: new Date().toISOString()
          });

          console.log(`[任务流] ${sessionId}: 开始执行 ${response.tool_calls.length} 个工具调用`);

          // 执行工具调用
          const toolResults = await this.executeToolCalls(socket, response.tool_calls);

          // 发送工具调用完成状态
          socket.emit(SocketEventType.TASK_FLOW_STATUS, {
            sessionId,
            status: 'processing',
            message: `第 ${iterationCount} 轮：工具调用完成，准备下一轮分析...`,
            iteration: iterationCount,
            timestamp: new Date().toISOString()
          });

          // 记录步骤信息
          const step: TaskFlowStep = {
            stepNumber: iterationCount,
            description: stepDescription,
            modelResponse: response.content,
            toolCalls: response.tool_calls,
            toolResults: toolResults,
            timestamp: new Date().toISOString()
          };
          this.taskFlowSession.steps.push(step);

          // 构建包含工具结果的新提示词
          const { taskFlowPromptService } = require('../../model/prompts/task-flow-prompt.service');
          currentPrompt = taskFlowPromptService.getToolResultPrompt(
            response.content,
            toolResults,
            this.taskFlowSession.goal
          );

        } else {
          // 没有工具调用，检查是否任务完成
          console.log(`[任务流] ${sessionId}: 模型未调用工具，检查任务是否完成`);

          if (this.isTaskCompleted(response.content)) {
            // 发送任务完成状态
            socket.emit(SocketEventType.TASK_FLOW_STATUS, {
              sessionId,
              status: 'completing',
              message: `第 ${iterationCount} 轮：任务分析完成，正在生成最终结果...`,
              iteration: iterationCount,
              timestamp: new Date().toISOString()
            });

            console.log(`[任务流] ${sessionId}: 任务完成，生成最终结果`);

            // 记录最终步骤
            const finalStep: TaskFlowStep = {
              stepNumber: iterationCount,
              description: `第 ${iterationCount} 轮分析：任务分析完成，生成最终结果`,
              modelResponse: response.content,
              timestamp: new Date().toISOString()
            };
            this.taskFlowSession.steps.push(finalStep);

            // 任务完成
            await this.completeTask(socket, response.content);
            break;
          } else {
            // 发送继续分析状态
            socket.emit(SocketEventType.TASK_FLOW_STATUS, {
              sessionId,
              status: 'processing',
              message: `第 ${iterationCount} 轮：分析未完成，准备继续...`,
              iteration: iterationCount,
              timestamp: new Date().toISOString()
            });

            console.log(`[任务流] ${sessionId}: 任务未完成，继续下一轮分析`);

            // 记录继续分析步骤
            const continueStep: TaskFlowStep = {
              stepNumber: iterationCount,
              description: stepDescription,
              modelResponse: response.content,
              timestamp: new Date().toISOString()
            };
            this.taskFlowSession.steps.push(continueStep);

            // 继续执行，但没有新的工具调用
            // 检查是否已经多次重复相同的响应
            const recentSteps = this.taskFlowSession.steps.slice(-3);
            const isRepeating = recentSteps.length >= 2 &&
              recentSteps.every(step =>
                step.modelResponse.toLowerCase().includes('任务完成') ||
                step.modelResponse.toLowerCase().includes('已完成')
              );

            if (isRepeating) {
              console.log(`[任务流] ${sessionId}: 检测到重复响应，强制完成任务`);
              await this.completeTask(socket, response.content);
              break;
            }

            currentPrompt = response.content + `\n\n请仔细检查任务目标是否真正完成。如果所有要求都已满足，请明确说明"任务已完成"。如果还有未完成的部分，请说明具体需要做什么，并调用相应的工具。当前迭代: ${iterationCount}/${maxIterations}`;
          }
        }

      } catch (error) {
        console.error(`任务流迭代 ${iterationCount} 错误:`, error);
        
        socket.emit(SocketEventType.TASK_FLOW_STATUS, {
          sessionId,
          status: 'error',
          message: `第 ${iterationCount} 轮执行出错`,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
        
        break;
      }
    }

    if (iterationCount >= maxIterations) {
      console.log(`[任务流] ${sessionId}: 达到最大迭代次数，强制完成任务`);

      socket.emit(SocketEventType.TASK_FLOW_STATUS, {
        sessionId,
        status: 'completing',
        message: '任务执行达到最大迭代次数，正在生成最终结果...',
        timestamp: new Date().toISOString()
      });

      // 生成最终结果摘要
      const finalResult = this.generateFinalSummary();
      await this.completeTask(socket, finalResult);
      return;
    }

    // 清理会话
    this.cleanupSession();
  }

  /**
   * 执行工具调用
   * @param socket Socket实例
   * @param toolCalls 工具调用列表
   * @returns 工具执行结果
   */
  private async executeToolCalls(socket: Socket, toolCalls: any[]): Promise<any[]> {
    if (!this.taskFlowSession) return [];

    const results = [];

    for (const toolCall of toolCalls) {
      try {
        console.log(`执行工具: ${toolCall.name}`);

        // 发送工具执行状态
        socket.emit(SocketEventType.TASK_FLOW_TOOL_CALL, {
          sessionId: this.taskFlowSession.sessionId,
          toolName: toolCall.name,
          input: toolCall.input,
          status: 'executing',
          timestamp: new Date().toISOString()
        });

        // 执行工具
        const result = await toolManager.executeTool(toolCall.name, toolCall.input);

        // 记录工具调用历史
        const toolRecord = {
          toolName: toolCall.name,
          input: toolCall.input,
          output: result,
          timestamp: Date.now(),
          success: true
        };
        this.taskFlowSession.toolCallHistory.push(toolRecord);

        // 发送工具执行结果
        socket.emit(SocketEventType.TASK_FLOW_TOOL_CALL, {
          sessionId: this.taskFlowSession.sessionId,
          toolName: toolCall.name,
          input: toolCall.input,
          output: result,
          status: 'completed',
          timestamp: new Date().toISOString()
        });

        results.push({
          tool_name: toolCall.name,
          tool_input: toolCall.input,
          tool_output: result,
          success: true
        });

      } catch (error) {
        console.error(`工具执行错误 ${toolCall.name}:`, error);

        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // 记录错误的工具调用
        const toolRecord = {
          toolName: toolCall.name,
          input: toolCall.input,
          output: null,
          timestamp: Date.now(),
          success: false,
          error: errorMessage
        };
        this.taskFlowSession.toolCallHistory.push(toolRecord);

        // 发送工具执行错误
        socket.emit(SocketEventType.TASK_FLOW_TOOL_CALL, {
          sessionId: this.taskFlowSession.sessionId,
          toolName: toolCall.name,
          input: toolCall.input,
          status: 'error',
          error: errorMessage,
          timestamp: new Date().toISOString()
        });

        results.push({
          tool_name: toolCall.name,
          tool_input: toolCall.input,
          tool_output: null,
          success: false,
          error: errorMessage
        });
      }
    }

    return results;
  }

  /**
   * 检查任务是否完成
   * @param content 模型响应内容
   * @returns 是否完成
   */
  private isTaskCompleted(content: string): boolean {
    const lowerContent = content.toLowerCase();

    // 强烈的完成信号
    const strongCompletionSignals = [
      '任务已完成',
      '目标已达成',
      '执行完毕',
      '任务执行完成',
      '所有步骤已完成',
      'task completed successfully',
      'goal achieved successfully',
      'all steps finished',
      'execution completed'
    ];

    // 检查是否有强烈的完成信号
    const hasStrongSignal = strongCompletionSignals.some(signal =>
      lowerContent.includes(signal.toLowerCase())
    );

    // 检查是否有继续执行的意图
    const continueSignals = [
      '需要',
      '接下来',
      '然后',
      '下一步',
      '继续',
      '还需要',
      'need to',
      'next step',
      'then',
      'continue',
      'still need'
    ];

    const hasContinueSignal = continueSignals.some(signal =>
      lowerContent.includes(signal.toLowerCase())
    );

    // 只有在有强烈完成信号且没有继续执行意图时才认为任务完成
    const isCompleted = hasStrongSignal && !hasContinueSignal;

    console.log(`[任务流] 任务完成检测: 强烈信号=${hasStrongSignal}, 继续信号=${hasContinueSignal}, 结果=${isCompleted}`);

    return isCompleted;
  }

  /**
   * 生成最终结果摘要
   * @returns 最终结果字符串
   */
  private generateFinalSummary(): string {
    if (!this.taskFlowSession) {
      return '任务流会话已结束，无法生成摘要。';
    }

    const { task, steps } = this.taskFlowSession;
    const stepCount = steps.length;
    const toolCallCount = this.taskFlowSession.toolCallHistory.length;

    let summary = `## 任务执行摘要\n\n`;
    summary += `**任务描述**: ${task}\n\n`;
    summary += `**执行统计**: 共执行 ${stepCount} 个步骤，调用 ${toolCallCount} 次工具\n\n`;

    if (steps.length > 0) {
      summary += `**执行过程**:\n`;
      steps.forEach((step, index) => {
        summary += `${index + 1}. ${step.description}\n`;
      });
      summary += `\n`;
    }

    // 获取最后一步的响应作为最终结果
    if (steps.length > 0) {
      const lastStep = steps[steps.length - 1];
      summary += `**最终状态**: ${lastStep.modelResponse}\n\n`;
    }

    summary += `**注意**: 任务执行已达到最大迭代次数限制，如有未完成的部分，请手动检查和处理。`;

    return summary;
  }

  /**
   * 完成任务
   * @param socket Socket实例
   * @param result 任务结果
   */
  private async completeTask(socket: Socket, result: string): Promise<void> {
    if (!this.taskFlowSession) return;

    const { sessionId } = this.taskFlowSession;
    const executionTime = Date.now() - this.taskFlowSession.startTime;

    console.log(`任务流完成 ${sessionId}, 执行时间: ${executionTime}ms`);

    // 发送任务完成事件
    socket.emit(SocketEventType.TASK_FLOW_COMPLETE, {
      sessionId,
      result,
      executionTime,
      toolCallCount: this.taskFlowSession.toolCallHistory.length,
      steps: this.taskFlowSession.steps,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 停止任务流
   * @param socket Socket实例
   */
  public stopTaskFlow(socket: Socket): void {
    if (!this.taskFlowSession) return;

    console.log(`停止任务流 ${this.taskFlowSession.sessionId}`);
    
    this.taskFlowSession.isActive = false;
    
    socket.emit(SocketEventType.TASK_FLOW_STATUS, {
      sessionId: this.taskFlowSession.sessionId,
      status: 'stopped',
      message: '任务流已被用户停止',
      timestamp: new Date().toISOString()
    });

    this.cleanupSession();
  }

  /**
   * 清理会话
   */
  private cleanupSession(): void {
    if (!this.taskFlowSession) return;

    const { sessionId } = this.taskFlowSession;
    
    // 从工具管理器中移除会话跟踪
    toolManager.removeTaskFlowSession(sessionId);
    toolManager.decrementTaskFlowDepth();

    // 清理会话数据
    this.taskFlowSession = null;

    console.log(`任务流会话已清理: ${sessionId}`);
  }
}
