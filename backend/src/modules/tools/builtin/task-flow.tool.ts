/**
 * 任务流工具
 * 当大模型判断需要执行复杂任务时，可以调用此工具启动任务流模式
 */
import { toolManager } from '../tool.manager';
import { ToolCategory } from '../tools.types';

/**
 * 注册任务流工具
 */
export function registerTaskFlowTools(): void {
  // 任务流工具
  toolManager.registerTool({
    name: 'task_flow',
    description: '启动任务流模式，用于执行复杂任务。当遇到需要多步骤操作、工具调用的复杂任务时，应该调用此工具。',
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
        use_tools: {
          type: 'boolean',
          description: '在任务执行过程中是否需要使用工具',
          default: true,
        },
      },
      required: ['task', 'goal'],
    },
    handler: async (input: { task: string; goal: string; use_tools?: boolean }) => {
      const { task, goal, use_tools = true } = input;

      try {
        console.log('任务流工具被调用:', { task, goal, use_tools });

        // 导入工具管理器
        const { toolManager } = require('../tool.manager');

        // 使用安全检查机制，防止嵌套调用
        if (!toolManager.canStartNewTaskFlowSession()) {
          const currentDepth = toolManager.getTaskFlowDepth();
          const activeSessionCount = toolManager.getActiveTaskFlowSessionCount();
          console.log(`拒绝启动任务流：层级=${currentDepth}, 活跃会话=${activeSessionCount}`);
          return {
            success: false,
            message: '无法启动新的任务流会话：已有活跃的任务流会话或达到层级限制',
            task: task,
            goal: goal,
            current_depth: currentDepth,
            active_sessions: activeSessionCount,
            security_note: '此限制是为了防止无限递归调用和资源耗尽，确保系统稳定性'
          };
        }

        // 生成会话ID并添加到跟踪
        const { v4: uuidv4 } = require('uuid');
        const sessionId = uuidv4();
        
        // 增加任务流层级和会话跟踪
        toolManager.incrementTaskFlowDepth();
        toolManager.addTaskFlowSession(sessionId);

        // 获取全局的Socket实例（如果存在）
        const globalSocket = (global as any).activeSocket;

        if (!globalSocket) {
          // 如果没有Socket连接，清理会话并减少层级
          toolManager.removeTaskFlowSession(sessionId);
          toolManager.decrementTaskFlowDepth();
          return {
            success: false,
            message: '任务流模式需要WebSocket连接支持，请通过聊天界面使用此功能',
            task: task,
            goal: goal
          };
        }

        // 导入必要的服务
        const { conversationService } = require('../../conversation');
        const { modelService } = require('../../model');
        const { settingService } = require('../../settings');

        // 获取当前活跃对话
        const activeConversation = conversationService.getActiveConversation();
        if (!activeConversation) {
          // 清理会话并减少层级
          toolManager.removeTaskFlowSession(sessionId);
          toolManager.decrementTaskFlowDepth();
          return {
            success: false,
            message: '任务流模式需要活跃的对话上下文',
            task: task,
            goal: goal
          };
        }

        // 导入Socket事件类型
        const { SocketEventType } = require('../../socket/socket.types');

        try {
          // 发送任务流开始事件
          console.log('发送任务流开始事件');
          globalSocket.emit(SocketEventType.TASK_FLOW_START, {
            sessionId,
            task,
            goal,
            useTools: use_tools,
            timestamp: new Date().toISOString()
          });

          // 启动任务流处理器（如果存在）
          const taskFlowHandler = (global as any).taskFlowHandler;
          if (taskFlowHandler) {
            // 初始化任务流会话
            taskFlowHandler.taskFlowSession = {
              sessionId,
              task,
              goal,
              useTools: use_tools,
              conversationId: activeConversation.id,
              isActive: true,
              startTime: Date.now(),
              toolCallHistory: [],
              steps: []
            };

            // 开始执行任务流
            await taskFlowHandler.executeTaskFlow(globalSocket);
          }

          return {
            success: true,
            message: '任务流模式已启动，正在执行任务',
            sessionId,
            task: task,
            goal: goal,
            use_tools: use_tools
          };

        } catch (error) {
          console.error('任务流执行错误:', error);

          // 清理会话并减少层级
          toolManager.removeTaskFlowSession(sessionId);
          toolManager.decrementTaskFlowDepth();

          // 发送错误事件
          globalSocket.emit(SocketEventType.ERROR, {
            message: '任务流执行失败',
            details: error instanceof Error ? error.message : String(error)
          });

          return {
            success: false,
            message: '任务流执行失败',
            error: error instanceof Error ? error.message : String(error),
            task: task,
            goal: goal
          };
        }

      } catch (error) {
        console.error('任务流工具错误:', error);
        return {
          success: false,
          message: '任务流工具执行失败',
          error: error instanceof Error ? error.message : String(error),
          task: task,
          goal: goal
        };
      }
    },
    requires_auth: false,
    category: ToolCategory.THINKING,
  });
}
