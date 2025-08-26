import { ConversationMessage, FrontendMessage } from '../types/conversation';

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
