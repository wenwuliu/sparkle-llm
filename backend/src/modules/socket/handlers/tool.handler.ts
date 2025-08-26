/**
 * 工具处理器
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import { SocketHandler, SocketEventType } from '../socket.types';
import { TaskProgressEvent } from '../socket.types';
import { toolManager } from '../../tools';

/**
 * 工具处理器
 */
export class ToolHandler implements SocketHandler {
  /**
   * 处理工具相关事件
   * @param socket Socket实例
   * @param io SocketIO服务器实例
   */
  handle(socket: Socket, io: SocketIOServer): void {
    // 监听任务进度事件
    // 这个事件是由自主任务工具触发的，通过全局io对象发送
    // 我们在这里将其转发给特定的socket
    io.on(SocketEventType.TASK_PROGRESS, (event: TaskProgressEvent) => {
      // 检查事件是否包含socketId，如果包含则只发送给特定的socket
      if (event.socketId && event.socketId === socket.id) {
        socket.emit(SocketEventType.TASK_PROGRESS, event);
      }
    });
  }
}
