/**
 * WebSocket服务
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import { handlers } from './handlers';
import { SocketEventType } from './socket.types';

/**
 * WebSocket服务类
 */
export class SocketService {
  private io: SocketIOServer | null = null;

  /**
   * 初始化WebSocket服务
   * @param io SocketIO服务器实例
   */
  initialize(io: SocketIOServer): void {
    console.log('初始化WebSocket服务...');
    this.io = io;

    // 监听连接事件
    io.on(SocketEventType.CONNECT, (socket: Socket) => {
      console.log('用户已连接:', socket.id);

      // 注册所有处理器
      for (const handler of handlers) {
        handler.handle(socket, io);
      }

      // 监听断开连接事件
      socket.on(SocketEventType.DISCONNECT, () => {
        console.log('用户已断开连接:', socket.id);
      });

      // 监听错误事件
      socket.on(SocketEventType.ERROR, (error: any) => {
        console.error('Socket错误:', error);
      });
    });

    console.log('WebSocket服务初始化完成');
  }

  /**
   * 获取SocketIO服务器实例
   * @returns SocketIO服务器实例
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * 广播事件给所有连接的客户端
   * @param event 事件名称
   * @param data 事件数据
   */
  broadcast(event: string, data: any): void {
    if (this.io) {
      this.io.emit(event, data);
    } else {
      console.error('WebSocket服务未初始化，无法广播事件');
    }
  }

  /**
   * 发送事件给特定的客户端
   * @param socketId Socket ID
   * @param event 事件名称
   * @param data 事件数据
   */
  sendToClient(socketId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(socketId).emit(event, data);
    } else {
      console.error('WebSocket服务未初始化，无法发送事件');
    }
  }
}

// 创建WebSocket服务实例
export const socketService = new SocketService();
