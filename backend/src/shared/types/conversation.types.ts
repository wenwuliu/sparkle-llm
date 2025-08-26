/**
 * 对话相关类型定义
 * 统一前后端使用的类型，减少重复定义
 */

/**
 * 对话类型
 */
export interface Conversation {
  id: number;
  title: string;
  created_at: number;
  updated_at: number;
  is_active: boolean;
}

/**
 * 对话消息类型
 */
export interface ConversationMessage {
  id: number;
  conversation_id: number;
  content: string;
  sender: 'user' | 'ai';
  timestamp: number;
  tool_calls?: string; // JSON字符串，存储在数据库中
  tool_results?: string; // JSON字符串，存储在数据库中
}

/**
 * 对话详情类型
 */
export interface ConversationDetail {
  conversation: Conversation;
  messages: ConversationMessage[];
}

/**
 * 前端使用的消息类型
 */
export interface FrontendMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  tool_calls?: any[]; // 已解析的对象
  tool_results?: any[]; // 已解析的对象
  status?: 'calling' | 'called'; // 工具调用状态
}

/**
 * 工具调用类型
 */
export interface ToolCall {
  name: string;
  input: any;
}

/**
 * 工具调用结果类型
 */
export interface ToolCallResult {
  tool_name: string;
  tool_input: any;
  tool_output: any;
  error?: string;
}

/**
 * 对话创建请求类型
 */
export interface ConversationCreateRequest {
  title?: string;
  reflectOnCurrent?: boolean;
}

/**
 * 消息格式转换工具函数
 * 将后端消息格式转换为前端格式
 */
export function convertToFrontendMessage(message: ConversationMessage): FrontendMessage {
  // 解析工具调用和结果
  const toolCalls = message.tool_calls ? JSON.parse(message.tool_calls) : undefined;
  const toolResults = message.tool_results ? JSON.parse(message.tool_results) : undefined;

  return {
    id: message.id.toString(),
    content: message.content,
    sender: message.sender,
    timestamp: new Date(message.timestamp),
    tool_calls: toolCalls,
    tool_results: toolResults,
    // 历史消息中不显示中间状态，只显示最终结果
    status: undefined
  };
}
