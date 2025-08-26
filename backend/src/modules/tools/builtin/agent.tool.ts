/**
 * Agent工具
 * 新的智能任务执行工具，基于ReAct框架
 */

import { toolManager } from '../tool.manager';
import { ToolCategory } from '../tools.types';
import { agentService } from '../../agent/agent.service';
import { SocketEventType } from '../../socket/socket.types';

/**
 * 注册Agent工具
 */
export function registerAgentTools(): void {
  // Agent任务执行工具
  toolManager.registerTool({
    name: 'agent_task',
    description: '启动智能Agent执行复杂任务。当遇到需要多步骤操作、工具调用的复杂任务时，应该调用此工具。Agent将自动分析任务、制定计划、执行步骤并生成结果。',
    input_schema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: '需要执行的任务描述，要求明确具体',
        },
        goal: {
          type: 'string',
          description: '任务的最终目标，期望达成的结果',
        },
        enable_reflection: {
          type: 'boolean',
          description: '是否启用反思功能，用于优化执行过程',
          default: true,
        },
        max_steps: {
          type: 'integer',
          description: '最大执行步骤数',
          default: 20,
        },
        confidence_threshold: {
          type: 'number',
          description: '置信度阈值，低于此值的步骤将被跳过',
          default: 0.7,
        },
      },
      required: ['task', 'goal'],
    },
    handler: async (input: {
      task: string;
      goal: string;
      enable_reflection?: boolean;
      max_steps?: number;
      confidence_threshold?: number;
    }) => {
      const {
        task,
        goal,
        enable_reflection = true,
        max_steps = 20,
        confidence_threshold = 0.7
      } = input;

      try {
        console.log('Agent工具被调用:', { task, goal, enable_reflection, max_steps, confidence_threshold });

        // 获取全局的Socket实例（如果存在）
        const globalSocket = (global as any).activeSocket;

        if (!globalSocket) {
          return {
            success: false,
            message: 'Agent模式需要WebSocket连接支持，请通过聊天界面使用此功能',
            task: task,
            goal: goal
          };
        }

        // 导入必要的服务
        const { conversationService } = require('../../conversation');

        // 获取当前活跃对话
        const activeConversation = conversationService.getActiveConversation();
        if (!activeConversation) {
          return {
            success: false,
            message: 'Agent模式需要活跃的对话上下文',
            task: task,
            goal: goal
          };
        }

        // 更新Agent配置
        agentService.updateConfig({
          enableReflection: enable_reflection,
          maxSteps: max_steps,
          confidenceThreshold: confidence_threshold
        });

        // 发送Agent开始事件
        globalSocket.emit(SocketEventType.AGENT_START, {
          task,
          goal,
          enableReflection: enable_reflection,
          maxSteps: max_steps,
          confidenceThreshold: confidence_threshold,
          timestamp: new Date().toISOString()
        });

        // 启动Agent任务
        const sessionId = await agentService.startAgentTask(
          task,
          goal,
          activeConversation.id,
          {
            onProgress: (event) => {
              // 发送进度事件
              globalSocket.emit(SocketEventType.AGENT_PROGRESS, {
                sessionId: event.agentId,
                ...event
              });
            },
            onError: (error) => {
              // 发送错误事件
              globalSocket.emit(SocketEventType.AGENT_ERROR, {
                sessionId: error.timestamp, // 临时使用timestamp作为sessionId
                error: error
              });
            },
            onComplete: (result) => {
              // 发送完成事件
              globalSocket.emit(SocketEventType.AGENT_COMPLETE, {
                sessionId: result.metadata?.agentId,
                result: result,
                timestamp: new Date().toISOString()
              });
            }
          }
        );

        return {
          success: true,
          message: 'Agent任务已启动，正在执行智能分析和任务执行',
          sessionId,
          task: task,
          goal: goal,
          features: {
            enableReflection: enable_reflection,
            maxSteps: max_steps,
            confidenceThreshold: confidence_threshold,
            reasoning: '启用结构化推理',
            action: '启用智能工具调用',
            observation: '启用结果分析',
            reflection: enable_reflection ? '启用执行反思' : '禁用执行反思'
          }
        };

      } catch (error) {
        console.error('Agent工具执行错误:', error);

        // 发送错误事件
        const globalSocket = (global as any).activeSocket;
        if (globalSocket) {
          globalSocket.emit(SocketEventType.ERROR, {
            message: 'Agent任务启动失败',
            details: error instanceof Error ? error.message : String(error)
          });
        }

        return {
          success: false,
          message: 'Agent任务启动失败',
          error: error instanceof Error ? error.message : String(error),
          task: task,
          goal: goal
        };
      }
    },
    requires_auth: false,
    category: ToolCategory.THINKING,
  });

  // Agent状态查询工具
  toolManager.registerTool({
    name: 'agent_status',
    description: '查询Agent任务执行状态和统计信息',
    input_schema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Agent会话ID，如果不提供则返回所有会话的统计信息',
        },
      },
      required: [],
    },
    handler: async (input: { session_id?: string }) => {
      const { session_id } = input;

      try {
        if (session_id) {
          // 查询特定会话
          const session = agentService.getSession(session_id);
          if (!session) {
            return {
              success: false,
              message: '指定的Agent会话不存在',
              session_id: session_id
            };
          }

          const agentState = session.agent.getState();
          
          return {
            success: true,
            session: {
              id: session.id,
              task: session.task,
              goal: session.goal,
              status: session.status,
              startTime: session.startTime,
              result: session.result,
              error: session.error,
              agentState: agentState ? {
                currentStep: agentState.currentStep,
                totalSteps: agentState.totalSteps,
                progress: agentState.progress,
                confidence: agentState.confidence,
                errorCount: agentState.errorCount
              } : null
            }
          };
        } else {
          // 返回统计信息
          const stats = agentService.getSessionStats();
          const activeSessions = agentService.getActiveSessions();
          
          return {
            success: true,
            stats: stats,
            activeSessions: activeSessions.map(s => ({
              id: s.id,
              task: s.task,
              goal: s.goal,
              startTime: s.startTime
            }))
          };
        }
      } catch (error) {
        console.error('Agent状态查询错误:', error);
        return {
          success: false,
          message: '查询Agent状态失败',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    },
    requires_auth: false,
    category: ToolCategory.THINKING,
  });

  // Agent停止工具
  toolManager.registerTool({
    name: 'agent_stop',
    description: '停止指定的Agent任务执行',
    input_schema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: '要停止的Agent会话ID',
        },
      },
      required: ['session_id'],
    },
    handler: async (input: { session_id: string }) => {
      const { session_id } = input;

      try {
        const success = agentService.stopSession(session_id);
        
        if (success) {
          // 发送停止事件
          const globalSocket = (global as any).activeSocket;
          if (globalSocket) {
            globalSocket.emit(SocketEventType.AGENT_STOP, {
              sessionId: session_id,
              timestamp: new Date().toISOString()
            });
          }

          return {
            success: true,
            message: 'Agent任务已停止',
            session_id: session_id
          };
        } else {
          return {
            success: false,
            message: 'Agent会话不存在或已经停止',
            session_id: session_id
          };
        }
      } catch (error) {
        console.error('Agent停止错误:', error);
        return {
          success: false,
          message: '停止Agent任务失败',
          error: error instanceof Error ? error.message : String(error),
          session_id: session_id
        };
      }
    },
    requires_auth: false,
    category: ToolCategory.THINKING,
  });

  console.log('Agent工具已注册');
}
