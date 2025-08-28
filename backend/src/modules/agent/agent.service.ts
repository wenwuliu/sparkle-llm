/**
 * Agent服务
 * 新的智能任务执行服务，基于ReAct框架
 */

import { v4 as uuidv4 } from 'uuid';
import { ReActAgent } from './react-agent';
import { 
  AgentConfig, 
  ExecutionResult, 
  ProgressEvent, 
  AgentError,
  DEFAULT_AGENT_CONFIG 
} from './types/agent.types';
import { conversationService } from '../conversation';
import { memoryService } from '../memory';
import { toolManager } from '../tools/tool.manager';
import { settingService } from '../settings';

/**
 * Agent会话信息
 */
interface AgentSession {
  id: string;
  agent: ReActAgent;
  task: string;
  goal: string;
  conversationId: string;
  startTime: number;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  result?: ExecutionResult;
  error?: AgentError;
  onProgress?: (event: ProgressEvent) => void; // 新增属性
}

/**
 * Agent服务类
 */
export class AgentService {
  private sessions: Map<string, AgentSession> = new Map();
  private config: AgentConfig;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
  }

  /**
   * 启动Agent任务
   */
  async startAgentTask(
    task: string,
    goal: string,
    conversationId: string,
    options: {
      onProgress?: (event: ProgressEvent) => void;
      onError?: (error: AgentError) => void;
      onComplete?: (result: ExecutionResult) => void;
    } = {}
  ): Promise<string> {
    try {
      console.log(`[Agent服务] 启动Agent任务: ${task}`);

      // 创建Agent实例
      const agent = new ReActAgent(this.config);
      const sessionId = uuidv4();

      // 获取对话上下文
      const conversation = await conversationService.getConversationById(parseInt(conversationId));
      if (!conversation) {
        throw new Error('对话不存在');
      }

      // 获取相关记忆
      const memories = await memoryService.findRelatedMemories(task, 5);

      // 构建执行上下文
      const context = {
        constraints: [],
        availableTools: toolManager.getAllTools(),
        memory: memories,
        conversationHistory: conversation.messages || [],
        userPreferences: {},
        environment: {
          conversationId,
          timestamp: Date.now()
        }
      };

      // 创建会话
      const session: AgentSession = {
        id: sessionId,
        agent,
        task,
        goal,
        conversationId,
        startTime: Date.now(),
        status: 'running',
        onProgress: options.onProgress // 将传入的回调函数赋值给会话对象
      };

      this.sessions.set(sessionId, session);

      // 设置进度回调
      // const progressCallback = (event: ProgressEvent) => {
      //   if (options.onProgress) {
      //     options.onProgress(event);
      //   }
      // };

      const errorCallback = (error: AgentError) => {
        session.status = 'failed';
        session.error = error;
        
        if (options.onError) {
          options.onError(error);
        }
      };

      // 异步执行任务
      this.executeTaskAsync(session, context, options.onComplete);

      console.log(`[Agent服务] Agent任务已启动，会话ID: ${sessionId}`);

      return sessionId;

    } catch (error) {
      console.error('[Agent服务] 启动Agent任务失败:', error);
      throw error;
    }
  }

  /**
   * 异步执行任务
   */
  private async executeTaskAsync(
    session: AgentSession,
    context: any,
    onComplete?: (result: ExecutionResult) => void
  ) {
    try {
      const result = await session.agent.executeTask(
        session.task,
        session.goal,
        context,
        {
          conversationId: session.conversationId,
          onProgress: (event: ProgressEvent) => {
            // 处理进度事件
            this.handleProgressEvent(session.id, event);
          },
          onError: (error: AgentError) => {
            // 处理错误事件
            this.handleErrorEvent(session.id, error);
          }
        }
      );

      // 更新会话状态
      session.status = result.success ? 'completed' : 'failed';
      session.result = result;

      // 保存结果到对话
      await this.saveResultToConversation(session, result);

      // 调用完成回调
      if (onComplete) {
        console.log(`[Agent服务] 调用完成回调，会话ID: ${session.id}`);
        try {
          onComplete(result);
          console.log(`[Agent服务] 完成回调调用成功`);
        } catch (error) {
          console.error(`[Agent服务] 完成回调调用失败:`, error);
        }
      } else {
        console.warn(`[Agent服务] 没有设置完成回调`);
      }

      console.log(`[Agent服务] Agent任务执行完成，会话ID: ${session.id}`);

    } catch (error) {
      console.error(`[Agent服务] Agent任务执行失败，会话ID: ${session.id}:`, error);

      session.status = 'failed';
      session.error = {
        type: 'execution_error',
        message: '任务执行过程中发生错误',
        details: error instanceof Error ? error.message : String(error),
        recoverable: false,
        suggestions: ['检查任务描述', '验证工具可用性', '重试执行'],
        timestamp: Date.now()
      };

      // 如果有错误回调，也要调用
      if (onComplete) {
        onComplete({
          success: false,
          result: null,
          summary: '任务执行失败',
          steps: [],
          history: [],
          executionTime: 0,
          errorCount: 1,
          confidence: 0,
          recommendations: ['检查任务描述', '验证工具可用性', '重试执行'],
          metadata: {
            error: session.error
          }
        });
      }
    }
  }

  /**
   * 处理进度事件
   */
  private handleProgressEvent(sessionId: string, event: ProgressEvent) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`[Agent服务] 进度事件 [${sessionId}]: ${event.message}`);

    // 调用传入的进度回调函数
    if (session.onProgress) {
      try {
        session.onProgress(event);
      } catch (error) {
        console.error(`[Agent服务] 调用进度回调失败:`, error);
      }
    }
  }

  /**
   * 处理错误事件
   */
  private handleErrorEvent(sessionId: string, error: AgentError) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.error(`[Agent服务] 错误事件 [${sessionId}]: ${error.message}`);

    session.error = error;
    session.status = 'failed';
  }

  /**
   * 保存结果到对话
   */
  private async saveResultToConversation(session: AgentSession, result: ExecutionResult) {
    try {
      // 构建结果消息
      const resultMessage = this.buildResultMessage(result);

      // 保存到对话
      await conversationService.addMessageToConversation(
        parseInt(session.conversationId),
        resultMessage,
        'ai'
      );

      console.log(`[Agent服务] 结果已保存到对话: ${session.conversationId}`);

    } catch (error) {
      console.error('[Agent服务] 保存结果到对话失败:', error);
    }
  }

  /**
   * 构建结果消息
   */
  private buildResultMessage(result: ExecutionResult): string {
    let message = result.summary;

    if (result.recommendations && result.recommendations.length > 0) {
      message += '\n\n**建议**:\n';
      result.recommendations.forEach((rec, index) => {
        message += `${index + 1}. ${rec}\n`;
      });
    }

    if (result.executionTime > 0) {
      message += `\n\n**执行时间**: ${(result.executionTime / 1000).toFixed(2)}秒`;
    }

    return message;
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 获取所有会话
   */
  getAllSessions(): AgentSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 获取活跃会话
   */
  getActiveSessions(): AgentSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'running');
  }

  /**
   * 停止会话
   */
  stopSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (session.status === 'running') {
      session.agent.stop();
      session.status = 'stopped';
      console.log(`[Agent服务] 会话已停止: ${sessionId}`);
      return true;
    }

    return false;
  }

  /**
   * 删除会话
   */
  deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // 如果会话还在运行，先停止
    if (session.status === 'running') {
      session.agent.stop();
    }

    this.sessions.delete(sessionId);
    console.log(`[Agent服务] 会话已删除: ${sessionId}`);
    return true;
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.startTime > maxAge) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[Agent服务] 清理了 ${cleanedCount} 个过期会话`);
    }

    return cleanedCount;
  }

  /**
   * 获取会话统计
   */
  getSessionStats(): {
    total: number;
    running: number;
    completed: number;
    failed: number;
    stopped: number;
  } {
    const sessions = Array.from(this.sessions.values());
    
    return {
      total: sessions.length,
      running: sessions.filter(s => s.status === 'running').length,
      completed: sessions.filter(s => s.status === 'completed').length,
      failed: sessions.filter(s => s.status === 'failed').length,
      stopped: sessions.filter(s => s.status === 'stopped').length
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[Agent服务] 配置已更新:', newConfig);
  }

  /**
   * 获取当前配置
   */
  getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * 重启服务
   */
  restart(): void {
    console.log('[Agent服务] 重启服务...');
    
    // 停止所有运行中的会话
    for (const session of this.sessions.values()) {
      if (session.status === 'running') {
        session.agent.stop();
        session.status = 'stopped';
      }
    }

    // 清理会话
    this.sessions.clear();
    
    console.log('[Agent服务] 服务已重启');
  }
}

// 创建全局Agent服务实例
export const agentService = new AgentService();
