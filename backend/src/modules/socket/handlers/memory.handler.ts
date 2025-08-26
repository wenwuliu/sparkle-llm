/**
 * 记忆处理器
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import { SocketHandler, SocketEventType, MemoryCreateRequest } from '../socket.types';
import { memoryService } from '../../memory';

/**
 * 记忆处理器
 */
export class MemoryHandler implements SocketHandler {
  /**
   * 处理记忆相关事件
   * @param socket Socket实例
   * @param io SocketIO服务器实例
   */
  handle(socket: Socket, io: SocketIOServer): void {
    // 处理创建记忆请求
    socket.on(SocketEventType.MEMORY_CREATE, async (request: MemoryCreateRequest) => {
      try {
        console.log('创建记忆:', request);
        const { 
          content, 
          keywords, 
          context, 
          importance = 0.5,
          memory_type,
          memory_subtype,
          is_pinned = false,
          importance_level
        } = request;
        
        // 创建记忆
        const memory = await memoryService.createMemory(
          keywords,
          content,
          context,
          importance,
          [], // 关联记忆ID
          memory_type,
          memory_subtype,
          is_pinned,
          importance_level
        );
        
        // 发送记忆创建成功事件
        socket.emit(SocketEventType.MEMORY_CREATED, memory);
      } catch (error) {
        console.error('创建记忆失败:', error);
        
        // 发送错误消息
        socket.emit(SocketEventType.ERROR, {
          message: '创建记忆失败',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }
}
