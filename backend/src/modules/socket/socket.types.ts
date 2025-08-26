/**
 * WebSocket服务类型定义
 */
import { Server as SocketIOServer, Socket } from 'socket.io';

import {
  ToolCall,
  ToolCallResult,
  ConversationCreateRequest
} from '../../shared/types/conversation.types';

/**
 * 聊天消息类型
 */
export interface ChatMessage {
  content: string;
  sender: 'user' | 'ai';
  timestamp: number;
  tool_calls?: any[];
  tool_results?: any[];
}

/**
 * 思考步骤类型
 */
export interface ThinkingStep {
  id: string;
  content: string;
  status: 'pending' | 'process' | 'completed' | 'error' | 'waiting_for_user';
  result?: string;
  has_tools?: boolean; // 是否包含工具调用
  question?: string; // 向用户提出的问题
  user_answer?: string; // 用户的回答
  images?: string[]; // 图片链接数组
  objective?: string; // 步骤的详细目标
  tool_calls?: any[]; // 工具调用列表
  tool_results?: any[]; // 工具调用结果
  operations_log?: string[]; // 操作日志，记录步骤内的各种操作
  current_operation?: string; // 当前正在执行的操作
}

/**
 * 思考请求类型
 */
export interface ThinkingRequest {
  message: string;
  useTools: boolean;
}

/**
 * 思考用户回答类型
 */
export interface ThinkingUserAnswerRequest {
  stepId: string;
  answer: string;
}

/**
 * 记忆创建请求类型
 */
export interface MemoryCreateRequest {
  content: string;
  keywords: string;
  context: string;
  importance?: number;
  memory_type?: string;
  memory_subtype?: string;
  is_pinned?: boolean;
  importance_level?: string;
}

// 导出共享类型
export type { ToolCall, ToolCallResult, ConversationCreateRequest };

/**
 * 任务进度事件类型
 */
export interface TaskProgressEvent {
  taskId: string;
  progress: number;
  status: string;
  message: string;
  socketId?: string;
}

/**
 * WebSocket事件类型
 */
export enum SocketEventType {
  // 连接事件
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',

  // 聊天事件
  CHAT_MESSAGE = 'chat:message',
  CHAT_TOOL_CALLING = 'chat:tool_calling', // 工具调用中
  CHAT_TOOL_CALLED = 'chat:tool_called',   // 工具调用完成
  CHAT_THINKING_START = 'chat:thinking_start', // 思考开始
  CHAT_THINKING_END = 'chat:thinking_end',     // 思考结束

  // 思考事件
  THINKING_START = 'thinking:start',
  THINKING_STEPS = 'thinking:steps',
  THINKING_USER_ANSWER = 'thinking:user_answer',
  THINKING_STEP_OPERATION = 'thinking:step_operation', // 思考步骤操作更新

  // Agent事件
  AGENT_START = 'agent:start',
  AGENT_PROGRESS = 'agent:progress',
  AGENT_ERROR = 'agent:error',
  AGENT_COMPLETE = 'agent:complete',
  AGENT_STOP = 'agent:stop',

  // 记忆事件
  MEMORY_CREATE = 'memory:create',
  MEMORY_CREATED = 'memory:created',

  // 对话事件
  CONVERSATION_CREATE = 'conversation:create',
  CONVERSATION_CREATED = 'conversation:created',
  CONVERSATION_ACTIVATE = 'conversation:activate',
  CONVERSATION_ACTIVATED = 'conversation:activated',
  CONVERSATION_UPDATED = 'conversation:updated',

  // 任务事件
  TASK_PROGRESS = 'task:progress'
}

/**
 * WebSocket处理器接口
 */
export interface SocketHandler {
  /**
   * 处理WebSocket事件
   * @param socket Socket实例
   * @param io SocketIO服务器实例
   */
  handle(socket: Socket, io: SocketIOServer): void;
}
