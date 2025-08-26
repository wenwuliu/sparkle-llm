# Socket模块

## 概述

Socket模块负责管理WebSocket连接，提供实时通信功能，支持流式响应、实时通知和事件广播。该模块是前端与后端实时交互的核心组件。

## 目录结构

```
socket/
├── interfaces/                # 接口定义目录
│   └── socket.interface.ts    # Socket接口定义
├── socket.service.ts          # Socket服务实现
├── socket.types.ts            # Socket相关类型定义
├── index.ts                   # 模块入口文件
└── README.md                  # 模块文档
```

## 主要功能

- WebSocket连接管理
- 事件处理和分发
- 流式响应支持
- 实时通知
- 客户端状态跟踪

## 核心类型

### SocketEvent

```typescript
enum SocketEvent {
  CONNECT = 'connect',                 // 连接事件
  DISCONNECT = 'disconnect',           // 断开连接事件
  MESSAGE = 'message',                 // 消息事件
  CHAT_REQUEST = 'chat_request',       // 聊天请求事件
  CHAT_RESPONSE = 'chat_response',     // 聊天响应事件
  CHAT_STREAM = 'chat_stream',         // 聊天流事件
  CHAT_STREAM_END = 'chat_stream_end', // 聊天流结束事件
  TOOL_CALL = 'tool_call',             // 工具调用事件
  TOOL_RESULT = 'tool_result',         // 工具结果事件
  ERROR = 'error',                     // 错误事件
  NOTIFICATION = 'notification'        // 通知事件
}
```

### SocketMessage

```typescript
interface SocketMessage {
  type: string;          // 消息类型
  payload: any;          // 消息负载
  timestamp: number;     // 时间戳
}
```

### SocketClient

```typescript
interface SocketClient {
  id: string;            // 客户端ID
  userId?: string;       // 用户ID（如果已认证）
  connectedAt: number;   // 连接时间
  lastActiveAt: number;  // 最后活动时间
  metadata?: any;        // 元数据
}
```

## 核心接口

### ISocketService

```typescript
interface ISocketService {
  // 初始化Socket服务
  initialize(io: Server): void;
  
  // 发送消息给指定客户端
  sendToClient(clientId: string, event: string, data: any): boolean;
  
  // 发送消息给所有客户端
  broadcast(event: string, data: any): void;
  
  // 发送流式消息
  sendStream(clientId: string, event: string, data: any, isEnd?: boolean): boolean;
  
  // 获取连接的客户端
  getConnectedClients(): SocketClient[];
  
  // 获取指定客户端
  getClient(clientId: string): SocketClient | null;
  
  // 注册事件处理器
  registerHandler(event: string, handler: (socket: Socket, data: any) => void): void;
  
  // 发送通知
  sendNotification(clientId: string, title: string, message: string, type?: string): boolean;
}
```

## 使用示例

```typescript
import { socketService, SocketEvent } from '../modules/socket';
import { Server } from 'socket.io';

// 初始化Socket服务
function initializeSocketService(io: Server) {
  try {
    // 初始化Socket服务
    socketService.initialize(io);
    
    // 注册聊天请求处理器
    socketService.registerHandler(SocketEvent.CHAT_REQUEST, handleChatRequest);
    
    console.log('Socket服务初始化成功');
  } catch (error) {
    console.error('初始化Socket服务时出错:', error);
    throw error;
  }
}

// 处理聊天请求
async function handleChatRequest(socket: any, data: any) {
  try {
    const { message, conversationId } = data;
    const clientId = socket.id;
    
    console.log(`收到来自客户端 ${clientId} 的聊天请求:`, message);
    
    // 发送流式响应
    for (let i = 0; i < 5; i++) {
      const chunk = `这是响应的第 ${i + 1} 部分`;
      socketService.sendStream(clientId, SocketEvent.CHAT_STREAM, {
        text: chunk,
        index: i
      });
      
      // 模拟处理时间
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 发送流结束事件
    socketService.sendStream(clientId, SocketEvent.CHAT_STREAM_END, {
      conversationId,
      messageId: Date.now().toString()
    }, true);
    
    // 发送通知
    socketService.sendNotification(
      clientId,
      '响应完成',
      '您的聊天请求已处理完成',
      'success'
    );
  } catch (error) {
    console.error('处理聊天请求时出错:', error);
    socket.emit(SocketEvent.ERROR, {
      message: '处理聊天请求时出错',
      error: error.message
    });
  }
}

// 广播系统通知
function broadcastSystemNotification(title: string, message: string) {
  try {
    socketService.broadcast(SocketEvent.NOTIFICATION, {
      title,
      message,
      type: 'system',
      timestamp: Date.now()
    });
    
    console.log('系统通知已广播');
  } catch (error) {
    console.error('广播系统通知时出错:', error);
    throw error;
  }
}
```
