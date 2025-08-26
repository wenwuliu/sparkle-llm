/**
 * WebSocket模块入口
 */
import { socketService, SocketService } from './socket.service';
import { SocketHandler, SocketEventType } from './socket.types';
import * as handlers from './handlers';

// 导出WebSocket服务实例
export { socketService };

// 导出WebSocket服务类
export { SocketService };

// 导出WebSocket类型
export * from './socket.types';

// 导出处理器
export { handlers };
