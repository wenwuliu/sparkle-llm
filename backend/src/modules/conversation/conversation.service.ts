import { db } from '../../config/database';
import { IConversationService } from './interfaces/conversation.interface';
import { Conversation, ConversationDetail, ConversationMessage } from './conversation.types';

/**
 * 对话服务实现
 */
export class ConversationService implements IConversationService {
  /**
   * 获取所有对话
   */
  public async getAllConversations(): Promise<Conversation[]> {
    try {
      return db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all() as Conversation[];
    } catch (error) {
      console.error('获取所有对话失败:', error);
      throw error;
    }
  }

  /**
   * 获取对话详情
   * @param id 对话ID
   */
  public async getConversationById(id: number): Promise<ConversationDetail> {
    try {
      // 获取对话
      const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Conversation;

      if (!conversation) {
        throw new Error('对话不存在');
      }

      // 获取对话消息
      const messages = db.prepare('SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY timestamp ASC').all(id) as ConversationMessage[];

      // 更新对话的最后访问时间
      db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(Date.now(), id);

      return {
        conversation,
        messages,
      };
    } catch (error) {
      console.error('获取对话详情失败:', error);
      throw error;
    }
  }

  /**
   * 创建新对话
   * @param title 对话标题
   */
  public async createConversation(title: string): Promise<Conversation> {
    try {
      const timestamp = Date.now();

      // 将所有对话设置为非活动状态
      db.prepare('UPDATE conversations SET is_active = 0').run();

      // 插入新对话
      const result = db.prepare(`
        INSERT INTO conversations (title, created_at, updated_at, is_active)
        VALUES (?, ?, ?, 1)
      `).run(title, timestamp, timestamp);

      const conversationId = result.lastInsertRowid as number;

      // 获取创建的对话
      return db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId) as Conversation;
    } catch (error) {
      console.error('创建对话失败:', error);
      throw error;
    }
  }

  /**
   * 添加消息到对话
   * @param conversationId 对话ID
   * @param content 消息内容
   * @param sender 发送者
   * @param toolCalls 工具调用
   * @param toolResults 工具调用结果
   */
  public async addMessageToConversation(
    conversationId: number,
    content: string,
    sender: 'user' | 'ai',
    toolCalls?: any[],
    toolResults?: any[]
  ): Promise<ConversationMessage> {
    try {
      const timestamp = Date.now();

      // 将工具调用和结果转换为JSON字符串
      const toolCallsJson = toolCalls ? JSON.stringify(toolCalls) : null;
      const toolResultsJson = toolResults ? JSON.stringify(toolResults) : null;

      // 插入消息
      const result = db.prepare(`
        INSERT INTO conversation_messages (conversation_id, content, sender, timestamp, tool_calls, tool_results)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(conversationId, content, sender, timestamp, toolCallsJson, toolResultsJson);

      const messageId = result.lastInsertRowid as number;

      // 更新对话的最后更新时间
      db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(timestamp, conversationId);

      // 获取创建的消息
      return db.prepare('SELECT * FROM conversation_messages WHERE id = ?').get(messageId) as ConversationMessage;
    } catch (error) {
      console.error('添加消息到对话失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前活动对话
   */
  public async getActiveConversation(): Promise<Conversation | null> {
    try {
      return db.prepare('SELECT * FROM conversations WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1').get() as Conversation | null;
    } catch (error) {
      console.error('获取活动对话失败:', error);
      throw error;
    }
  }

  /**
   * 设置活动对话
   * @param id 对话ID
   */
  public async setActiveConversation(id: number): Promise<Conversation> {
    try {
      // 将所有对话设置为非活动状态
      db.prepare('UPDATE conversations SET is_active = 0').run();

      // 设置指定对话为活动状态
      db.prepare('UPDATE conversations SET is_active = 1, updated_at = ? WHERE id = ?').run(Date.now(), id);

      // 获取更新后的对话
      const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Conversation;

      if (!conversation) {
        throw new Error('对话不存在');
      }

      // 如果对话标题是"新对话"，尝试生成更有意义的标题
      if (conversation.title === '新对话') {
        // 获取用户和AI消息各自的数量
        const userMessageCount = db.prepare("SELECT COUNT(*) as count FROM conversation_messages WHERE conversation_id = ? AND sender = 'user'").get(id) as { count: number };
        const aiMessageCount = db.prepare("SELECT COUNT(*) as count FROM conversation_messages WHERE conversation_id = ? AND sender = 'ai'").get(id) as { count: number };

        // 至少有一条用户消息和一条AI回复才生成标题
        if (userMessageCount && aiMessageCount && userMessageCount.count > 0 && aiMessageCount.count > 0) {
          // 异步更新标题，不阻塞当前操作
          setTimeout(() => {
            this.updateConversationTitle(id).catch(err => {
              console.error('异步更新对话标题失败:', err);
            });
          }, 0);
        }
      }

      return conversation;
    } catch (error) {
      console.error('设置活动对话失败:', error);
      throw error;
    }
  }

  /**
   * 删除对话
   * @param id 对话ID
   */
  public async deleteConversation(id: number): Promise<void> {
    try {
      // 删除对话（级联删除消息）
      db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
    } catch (error) {
      console.error('删除对话失败:', error);
      throw error;
    }
  }

  /**
   * 根据对话内容自动生成对话标题
   * @param content 消息内容或对话ID
   */
  public async generateConversationTitle(content: string | number): Promise<string> {
    try {
      // 导入模型服务
      const { modelService } = require('../model');

      let conversationContent = '';

      // 如果传入的是对话ID，则获取对话内容
      if (typeof content === 'number') {
        // 直接使用SQL查询获取对话消息，避免额外的对象转换
        const messages = db.prepare(`
          SELECT sender, content FROM conversation_messages
          WHERE conversation_id = ?
          ORDER BY timestamp ASC
        `).all(content);

        if (messages && messages.length > 0) {
          // 构建对话内容
          conversationContent = messages.map((msg: any) =>
            `${msg.sender === 'user' ? '用户' : 'AI'}: ${msg.content}`
          ).join('\n\n');
        }
      } else {
        // 如果传入的是消息内容，直接使用
        conversationContent = content;
      }

      // 如果没有内容，返回默认标题
      if (!conversationContent.trim()) {
        return '新对话';
      }

      // 构建提示词
      const prompt = `
请为以下对话内容生成一个简短、具体的标题，不超过10个字。标题应该概括对话的主要内容或主题。
只需返回标题本身，不要有任何其他文字、标点或引号。

对话内容:
${conversationContent}
`;

      // 调用大模型生成标题
      const title = await modelService.generateText(prompt, {
        temperature: 0.3,
        max_tokens: 50,
        skipSystemPrompt: true,
        model: 'this-is-sparkle-llm-force-default-model'
      });

      // 清理标题（移除可能的引号、空格等）
      let cleanTitle = title.trim();
      cleanTitle = cleanTitle.replace(/^["'"「『]|["'"」』]$/g, '');
      cleanTitle = cleanTitle.replace(/[\n\r]/g, '');

      // 确保标题不超过10个字
      if (cleanTitle.length > 10) {
        cleanTitle = cleanTitle.substring(0, 10);
      }

      // 如果生成的标题为空，使用默认标题
      if (!cleanTitle) {
        return '新对话';
      }

      return cleanTitle;
    } catch (error) {
      console.error('生成对话标题失败:', error);
      // 出错时返回默认标题
      return '新对话';
    }
  }

  /**
   * 更新对话标题
   * @param conversationId 对话ID
   */
  public async updateConversationTitle(conversationId: number): Promise<void> {
    try {
      // 直接查询对话标题
      const conversation = db.prepare('SELECT title FROM conversations WHERE id = ?').get(conversationId) as { title: string } | undefined;

      if (!conversation) {
        console.error('更新对话标题失败: 对话不存在');
        return;
      }

      // 如果对话已经有了非默认标题，不再更新
      if (conversation.title !== '新对话') {
        return;
      }

      // 生成新标题
      const newTitle = await this.generateConversationTitle(conversationId);

      // 如果生成的标题与默认标题相同，不更新
      if (newTitle === '新对话') {
        return;
      }

      // 更新对话标题
      db.prepare('UPDATE conversations SET title = ? WHERE id = ?').run(newTitle, conversationId);

      console.log(`对话 ${conversationId} 标题已更新为: ${newTitle}`);
    } catch (error) {
      console.error('更新对话标题失败:', error);
    }
  }
}

// 创建单例实例
export const conversationService = new ConversationService();
