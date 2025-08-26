/**
 * 处理器索引
 */
import { ChatHandler } from './chat.handler';
import { TaskFlowHandler } from './task-flow.handler';
import { ToolHandler } from './tool.handler';
import { MemoryHandler } from './memory.handler';
import { ConversationHandler } from './conversation.handler';
import { SocketHandler } from '../socket.types';

// 创建处理器实例
const chatHandler = new ChatHandler();
const taskFlowHandler = new TaskFlowHandler();
const toolHandler = new ToolHandler();
const memoryHandler = new MemoryHandler();
const conversationHandler = new ConversationHandler();

// 导出所有处理器
export const handlers: SocketHandler[] = [
  chatHandler,
  taskFlowHandler,
  toolHandler,
  memoryHandler,
  conversationHandler
];

// 导出各个处理器
export {
  chatHandler,
  taskFlowHandler,
  toolHandler,
  memoryHandler,
  conversationHandler
};
