import { Conversation, ConversationDetail, ConversationMessage } from '../conversation.types';

/**
 * 对话服务接口
 */
export interface IConversationService {
  /**
   * 获取所有对话
   */
  getAllConversations(): Promise<Conversation[]>;

  /**
   * 获取对话详情
   * @param id 对话ID
   */
  getConversationById(id: number): Promise<ConversationDetail>;

  /**
   * 创建新对话
   * @param title 对话标题
   */
  createConversation(title: string): Promise<Conversation>;

  /**
   * 添加消息到对话
   * @param conversationId 对话ID
   * @param content 消息内容
   * @param sender 发送者
   * @param toolCalls 工具调用
   * @param toolResults 工具调用结果
   */
  addMessageToConversation(
    conversationId: number,
    content: string,
    sender: 'user' | 'ai',
    toolCalls?: any[],
    toolResults?: any[]
  ): Promise<ConversationMessage>;

  /**
   * 获取当前活动对话
   */
  getActiveConversation(): Promise<Conversation | null>;

  /**
   * 设置活动对话
   * @param id 对话ID
   */
  setActiveConversation(id: number): Promise<Conversation>;

  /**
   * 删除对话
   * @param id 对话ID
   */
  deleteConversation(id: number): Promise<void>;

  /**
   * 根据对话内容自动生成对话标题
   * @param content 消息内容或对话ID
   */
  generateConversationTitle(content: string | number): Promise<string>;

  /**
   * 更新对话标题
   * @param conversationId 对话ID
   */
  updateConversationTitle(conversationId: number): Promise<void>;
}
