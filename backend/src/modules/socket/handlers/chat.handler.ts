/**
 * 聊天消息处理器
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  ChatMessage,
  SocketEventType,
  ThinkingRequest
} from '../socket.types';
import { SocketHandler } from '../socket.types';
import { modelService } from '../../model';
import { Message } from '../../model/interfaces/model-provider.interface';
import { conversationService } from '../../conversation';
import { memoryService, smartMemoryRetrievalService } from '../../memory';
import { agentService } from '../../agent';

/**
 * 聊天消息处理器
 */
export class ChatHandler implements SocketHandler {
  /**
   * 处理聊天消息事件
   * @param socket Socket实例
   * @param io SocketIO服务器实例
   */
  handle(socket: Socket, _io: SocketIOServer): void {
    // 设置全局Socket实例，供Agent工具使用
    (global as any).activeSocket = socket;
    
    // 监听Agent启动事件（兼容thinking:start）
    socket.on(SocketEventType.THINKING_START, async (request: ThinkingRequest) => {
      console.log('收到THINKING_START事件:', request);
      await this.handleAgentStart(socket, request);
    });

    // 监听Agent启动事件
    socket.on(SocketEventType.AGENT_START, async (request: any) => {
      console.log('收到AGENT_START事件:', request);
      await this.handleAgentStart(socket, request);
    });

    socket.on(SocketEventType.CHAT_MESSAGE, async (message: string) => {
      try {
        console.log('收到消息:', message);
        const timestamp = Date.now();

        // 获取或创建活动对话
        let activeConversation = await conversationService.getActiveConversation();
        if (!activeConversation) {
          // 创建新对话，使用默认标题，后续会更新
          activeConversation = await conversationService.createConversation('新对话');
          console.log('已创建新对话:', activeConversation.id);
        }

        // 记录用户消息
        const userMessage: ChatMessage = {
          content: message,
          sender: 'user',
          timestamp
        };

        // 保存用户消息到数据库
        await conversationService.addMessageToConversation(
          activeConversation.id,
          message,
          'user'
        );

        // 发送用户消息确认
        socket.emit(SocketEventType.CHAT_MESSAGE, userMessage);

        // 发送对话更新通知
        socket.emit(SocketEventType.CONVERSATION_UPDATED, activeConversation);

        // 发送思考开始事件
        socket.emit(SocketEventType.CHAT_THINKING_START);

        // 使用智能记忆检索服务判断是否需要创建记忆
        const containsMemoryInstruction = smartMemoryRetrievalService.shouldCreateMemory(message);

        // 使用模型生成回答（带工具调用）
        try {
          // 创建消息数组
          const messages: Message[] = [];
          
          messages.push({
            role: 'user',
            content: message
          });

          // 使用消息数组生成回答
          const result = await modelService.generateWithToolsUsingMessages(messages, {
            conversationId: activeConversation.id,
            socket, // 传递socket实例，用于发送中间状态
            enableMemory: true // 长期记忆功能始终启用
          });
          const aiTimestamp = Date.now();

          // 打印AI回答内容到控制台
          console.log('AI回答原始内容:');
          console.log('---开始输出---');
          console.log(result.content);
          console.log('---结束输出---');

          // 发送思考结束事件
          socket.emit(SocketEventType.CHAT_THINKING_END);

          // 发送AI回答
          const aiMessage: ChatMessage = {
            content: result.content,
            sender: 'ai',
            timestamp: aiTimestamp,
            tool_calls: result.toolCalls,
            tool_results: 'toolCallResults' in result ? result.toolCallResults : []
          };
          socket.emit(SocketEventType.CHAT_MESSAGE, aiMessage);

          // 保存AI消息到数据库
          await conversationService.addMessageToConversation(
            activeConversation.id,
            result.content,
            'ai',
            result.toolCalls,
            'toolCallResults' in result ? result.toolCallResults : undefined
          );

          // 更新对话时间 - 通过setActiveConversation来更新时间戳
          await conversationService.setActiveConversation(activeConversation.id);

          // 发送对话更新通知
          const updatedConversation = await conversationService.getConversationById(activeConversation.id);
          if (updatedConversation) {
            socket.emit(SocketEventType.CONVERSATION_UPDATED, updatedConversation);
          }

          // 如果消息包含记忆指令关键词，尝试生成记忆
          if (containsMemoryInstruction) {
            try {
              const memory = await memoryService.autoGenerateMemory(
                `用户: ${message}\n\nAI: ${result.content}`
              );

              if (memory) {
                socket.emit(SocketEventType.MEMORY_CREATED, memory);
              }
            } catch (memoryError) {
              console.error('生成记忆失败:', memoryError);
            }
          }
        } catch (error) {
          console.error('生成回答失败:', error);

          // 发送思考结束事件
          socket.emit(SocketEventType.CHAT_THINKING_END);

          // 发送错误消息
          socket.emit(SocketEventType.ERROR, {
            message: '生成回答失败',
            details: error instanceof Error ? error.message : String(error)
          });
        }
      } catch (error) {
        console.error('处理聊天消息失败:', error);

        // 发送错误消息
        socket.emit(SocketEventType.ERROR, {
          message: '处理聊天消息失败',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 监听思考步骤事件
    socket.on(SocketEventType.THINKING_STEPS, async (steps: any[]) => {
      socket.emit(SocketEventType.THINKING_STEPS, steps);
    });

    // 监听思考步骤操作更新事件
    socket.on(SocketEventType.THINKING_STEP_OPERATION, async (operation: any) => {
      socket.emit(SocketEventType.THINKING_STEP_OPERATION, operation);
    });

    // 监听用户对思考步骤的回答
    socket.on(SocketEventType.THINKING_USER_ANSWER, async (data: any) => {
      try {
        console.log('收到用户对思考步骤的回答:', data);
        // 这里可以处理用户的回答逻辑
        socket.emit(SocketEventType.THINKING_USER_ANSWER, data);
      } catch (error) {
        console.error('处理用户回答失败:', error);
        socket.emit(SocketEventType.ERROR, {
          message: '处理用户回答失败',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 监听记忆创建事件
    socket.on(SocketEventType.MEMORY_CREATE, async (data: any) => {
      try {
        console.log('收到记忆创建请求:', data);
        const memory = await memoryService.createMemory(
          data.content,
          data.keywords,
          data.context,
          data.importance,
          data.memory_type,
          data.memory_subtype,
          data.is_pinned,
          data.importance_level
        );
        socket.emit(SocketEventType.MEMORY_CREATED, memory);
      } catch (error) {
        console.error('创建记忆失败:', error);
        socket.emit(SocketEventType.ERROR, {
          message: '创建记忆失败',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 监听对话创建事件
    socket.on(SocketEventType.CONVERSATION_CREATE, async (data: any) => {
      try {
        console.log('收到对话创建请求:', data);
        const conversation = await conversationService.createConversation(data.title || '新对话');
        socket.emit(SocketEventType.CONVERSATION_CREATED, conversation);
      } catch (error) {
        console.error('创建对话失败:', error);
        socket.emit(SocketEventType.ERROR, {
          message: '创建对话失败',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 监听对话激活事件
    socket.on(SocketEventType.CONVERSATION_ACTIVATE, async (conversationId: number) => {
      try {
        console.log('收到对话激活请求:', conversationId);
        await conversationService.setActiveConversation(conversationId);
        const conversation = await conversationService.getConversationById(conversationId);
        if (conversation) {
          socket.emit(SocketEventType.CONVERSATION_ACTIVATED, conversation);
        }
      } catch (error) {
        console.error('激活对话失败:', error);
        socket.emit(SocketEventType.ERROR, {
          message: '激活对话失败',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  /**
   * 处理Agent启动
   * @param socket Socket实例
   * @param request 请求数据
   */
  private async handleAgentStart(socket: Socket, request: any): Promise<void> {
    try {
      console.log('收到Agent启动请求:', request);

      // 获取或创建活动对话
      let activeConversation = await conversationService.getActiveConversation();
      if (!activeConversation) {
        activeConversation = await conversationService.createConversation('新对话');
        console.log('已创建新对话:', activeConversation.id);
      }

      // 启动Agent任务
      const sessionId = await agentService.startAgentTask(
        request.message,
        `完成用户请求：${request.message}`,
        activeConversation.id.toString(),
        {
          onProgress: (event) => {
            // 确保事件包含sessionId
            const progressEvent = {
              ...event,
              sessionId: sessionId
            };
            socket.emit(SocketEventType.AGENT_PROGRESS, progressEvent);
          },
          onError: (error) => {
            socket.emit(SocketEventType.AGENT_ERROR, { error });
          },
          onComplete: (result) => {
            console.log('[ChatHandler] Agent完成回调被调用，发送完成事件:', { result });
            socket.emit(SocketEventType.AGENT_COMPLETE, { 
              sessionId: sessionId,
              result: result,
              timestamp: new Date().toISOString()
            });
          }
        }
      );

      // 发送Agent开始事件
      socket.emit(SocketEventType.AGENT_START, {
        sessionId,
        task: request.message,
        goal: `完成用户请求：${request.message}`,
        useTools: request.useTools,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('处理Agent启动失败:', error);
      socket.emit(SocketEventType.ERROR, {
        message: '启动Agent失败',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
