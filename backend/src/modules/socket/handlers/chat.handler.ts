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
      try {
        console.log('收到Agent启动请求:', request);

        // 获取或创建活动对话
        let activeConversation = await conversationService.getActiveConversation();
        if (!activeConversation) {
          activeConversation = await conversationService.createConversation('新对话');
          console.log('已创建新对话:', activeConversation.id);
        }

        // 启动Agent任务
        const { agentService } = require('../../agent');
        const sessionId = await agentService.startAgentTask(
          request.message,
          `完成用户请求：${request.message}`,
          activeConversation.id.toString(),
          {
            onProgress: (event) => {
              socket.emit(SocketEventType.AGENT_PROGRESS, event);
            },
            onError: (error) => {
              socket.emit(SocketEventType.AGENT_ERROR, { error });
            },
            onComplete: (result) => {
              socket.emit(SocketEventType.AGENT_COMPLETE, { result });
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
  }
}
