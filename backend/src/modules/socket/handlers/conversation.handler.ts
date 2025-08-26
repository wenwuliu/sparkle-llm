/**
 * 对话处理器
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import { SocketHandler, SocketEventType, ConversationCreateRequest } from '../socket.types';
import { conversationService } from '../../conversation';
import { memoryService } from '../../memory';

/**
 * 对话处理器
 */
export class ConversationHandler implements SocketHandler {
  /**
   * 异步从对话中生成多种类型的记忆
   * 不阻塞主流程，在后台处理
   * @param socket Socket实例
   */
  private async generateMemoriesFromConversationAsync(socket: Socket): Promise<void> {
    try {
      console.log('开始异步从对话中生成记忆...');

      // 获取当前活动对话（这里获取的是上一个对话，因为新对话已经被创建并激活）
      const conversations = await conversationService.getAllConversations();
      // 获取第二个对话（第一个是刚创建的新对话）
      const previousConversation = conversations.length > 1 ? conversations[1] : null;

      if (previousConversation) {
        // 获取对话详情
        const conversationDetail = await conversationService.getConversationById(previousConversation.id);
        const messages = conversationDetail.messages;

        if (messages && messages.length > 0) {
          // 构建对话内容
          const conversation = messages.map(msg =>
            `${msg.sender === 'user' ? '用户' : 'AI'}: ${msg.content}`
          ).join('\n\n');

          console.log('开始为上一个对话生成多种类型的记忆...');
          // 生成多种类型的记忆
          const memories = await memoryService.generateMultipleMemories(conversation);

          if (memories.length > 0) {
            console.log(`成功生成 ${memories.length} 条记忆`);

            // 逐个通知前端新记忆已创建
            for (const memory of memories) {
              console.log(`发送记忆到前端: ${memory.content}`);
              socket.emit(SocketEventType.MEMORY_CREATED, memory);
            }
          } else {
            console.log('没有从对话中生成任何记忆，可能没有值得记忆的内容');
          }
        }
      }
    } catch (error) {
      console.error('异步生成记忆失败:', error);
      // 不向前端发送错误，因为这是后台处理，不应影响用户体验
    }
  }

  /**
   * 处理对话相关事件
   * @param socket Socket实例
   * @param io SocketIO服务器实例
   */
  handle(socket: Socket, io: SocketIOServer): void {
    // 处理创建对话请求
    socket.on(SocketEventType.CONVERSATION_CREATE, async (request: ConversationCreateRequest) => {
      try {
        console.log('创建对话:', request);
        const { title = '新对话', reflectOnCurrent = false } = request;

        // 创建新对话
        const conversation = await conversationService.createConversation(title);

        // 发送对话创建成功事件
        socket.emit(SocketEventType.CONVERSATION_CREATED, conversation);
        socket.emit(SocketEventType.CONVERSATION_ACTIVATED, conversation);

        // 如果需要对当前对话进行记忆生成（异步处理，不阻塞新对话创建）
        if (reflectOnCurrent) {
          // 使用setImmediate确保异步执行，不阻塞主流程
          setImmediate(() => {
            this.generateMemoriesFromConversationAsync(socket)
              .catch(error => console.error('对话记忆生成异步处理失败:', error));
          });
          console.log('已安排异步从对话中生成多种类型的记忆');
        }
      } catch (error) {
        console.error('创建对话失败:', error);

        // 发送错误消息
        socket.emit(SocketEventType.ERROR, {
          message: '创建对话失败',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // 处理激活对话请求
    socket.on(SocketEventType.CONVERSATION_ACTIVATE, async (conversationId: number) => {
      try {
        console.log('激活对话:', conversationId);

        // 激活对话
        const conversation = await conversationService.setActiveConversation(conversationId);

        // 发送对话激活成功事件
        socket.emit(SocketEventType.CONVERSATION_ACTIVATED, conversation);
      } catch (error) {
        console.error('激活对话失败:', error);

        // 发送错误消息
        socket.emit(SocketEventType.ERROR, {
          message: '激活对话失败',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }
}
