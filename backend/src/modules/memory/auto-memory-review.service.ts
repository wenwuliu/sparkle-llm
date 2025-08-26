/**
 * 自动记忆复习服务
 * 负责自动评估记忆并决定是否保留、强化或淡忘
 */

import { db } from '../../config/database';
import { modelService } from '../model';
import { Memory } from './memory.types';
import { MemoryService } from './memory.service';

/**
 * 记忆评估结果接口
 */
interface MemoryEvaluation {
  memoryId: number;
  memory?: Memory;
  action: 'review' | 'forget' | 'unchanged';
  forgetStrategy?: 'delete' | 'downgrade';
  reason: string;
}

/**
 * 复习结果接口
 */
interface ReviewResult {
  reviewed: number;
  forgotten: number;
  unchanged: number;
  details: Array<{
    id: number;
    action: string;
    reason: string;
  }>;
}

/**
 * 自动记忆复习服务类
 */
export class AutoMemoryReviewService {
  private memoryService: MemoryService;

  /**
   * 构造函数
   * @param memoryService 记忆服务实例
   */
  constructor(memoryService: MemoryService) {
    this.memoryService = memoryService;
    this.initializeReviewHistoryTable();
  }

  /**
   * 初始化复习历史表
   */
  private initializeReviewHistoryTable(): void {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS memory_review_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          reviewed_count INTEGER NOT NULL,
          forgotten_count INTEGER NOT NULL,
          unchanged_count INTEGER NOT NULL,
          details TEXT,
          trigger_type TEXT
        );
      `);
      console.log('记忆复习历史表初始化完成');
    } catch (error) {
      console.error('初始化记忆复习历史表失败:', error);
    }
  }

  /**
   * 执行自动记忆复习
   * @param memories 指定要复习的记忆，如果不提供则自动获取
   * @param triggerType 触发类型
   */
  async performAutoReview(
    memories?: Memory[],
    triggerType: string = 'auto'
  ): Promise<ReviewResult> {
    try {
      console.log(`开始执行自动记忆复习 (触发类型: ${triggerType})...`);

      // 如果没有提供记忆，则获取需要复习的记忆
      const memoriesToReview = memories || await this.memoryService.getMemoriesToReview();

      if (memoriesToReview.length === 0) {
        console.log('没有需要复习的记忆');
        return {
          reviewed: 0,
          forgotten: 0,
          unchanged: 0,
          details: []
        };
      }

      console.log(`找到${memoriesToReview.length}条需要复习的记忆`);

      // 获取用户最近的对话和记忆上下文
      const context = await this.getReviewContext();

      // 使用大模型评估记忆
      const evaluationResults = await this.evaluateMemoriesWithModel(memoriesToReview, context);

      // 处理评估结果
      let reviewed = 0, forgotten = 0, unchanged = 0;
      const details = [];

      for (const result of evaluationResults) {
        details.push({
          id: result.memoryId,
          action: result.action,
          reason: result.reason
        });

        switch (result.action) {
          case 'review':
            try {
              // 验证memoryId是否有效
              if (result.memoryId && typeof result.memoryId === 'number' && result.memoryId > 0) {
                // 记录记忆复习，强化记忆
                await this.memoryService.recordMemoryReview(result.memoryId);
                reviewed++;
              } else {
                console.error(`跳过无效的记忆ID: ${result.memoryId}`);
              }
            } catch (reviewError) {
              console.error(`记忆复习失败: ${reviewError.message}`);
            }
            break;

          case 'forget':
            try {
              // 验证memoryId是否有效
              if (result.memoryId && typeof result.memoryId === 'number' && result.memoryId > 0) {
                // 根据遗忘策略处理记忆
                if (result.forgetStrategy === 'delete') {
                  await this.memoryService.deleteMemory(result.memoryId);
                } else if (result.forgetStrategy === 'downgrade') {
                  // 降低记忆重要性
                  const memory = result.memory;
                  if (memory) {
                    await this.memoryService.updateMemory(result.memoryId, {
                      importance: Math.max(0.1, memory.importance - 0.2),
                      importance_level: 'unimportant'
                    });
                  }
                }
                forgotten++;
              } else {
                console.error(`跳过无效的记忆ID: ${result.memoryId}`);
              }
            } catch (forgetError) {
              console.error(`记忆遗忘操作失败: ${forgetError.message}`);
            }
            break;

          case 'unchanged':
          default:
            unchanged++;
            break;
        }
      }

      // 记录复习历史
      await this.recordReviewHistory({
        timestamp: Date.now(),
        reviewed_count: reviewed,
        forgotten_count: forgotten,
        unchanged_count: unchanged,
        details: JSON.stringify(details),
        trigger_type: triggerType
      });

      console.log(`自动记忆复习完成: 强化${reviewed}条, 淡忘${forgotten}条, 保持不变${unchanged}条`);

      return { reviewed, forgotten, unchanged, details };
    } catch (error) {
      console.error('执行自动记忆复习失败:', error);
      throw error;
    }
  }

  /**
   * 使用大模型评估记忆
   */
  private async evaluateMemoriesWithModel(
    memories: Memory[],
    context: string
  ): Promise<MemoryEvaluation[]> {
    try {
      // 导入提示词服务
      const { promptService } = require('../../modules/model/prompts');

      // 准备记忆数据
      const memoriesData = memories.map(m => ({
        id: m.id,
        content: m.content,
        keywords: m.keywords,
        importance: m.importance,
        importance_level: m.importance_level || 'moderate',
        memory_type: m.memory_type || 'factual',
        memory_subtype: m.memory_subtype,
        created_at: new Date(m.created_at).toISOString(),
        last_accessed: m.last_accessed ? new Date(m.last_accessed).toISOString() : null
      }));

      // 获取记忆复习提示词
      const prompt = promptService.getMemoryReviewPrompt(memoriesData, context);

      // 调用大模型进行评估
      const response = await modelService.generateText(prompt,{
        temperature: 0.3,
        skipSystemPrompt: true,
        model: 'Qwen/Qwen3-30B-A3B-Instruct-2507'
      });

      // 解析大模型返回的JSON
      const { parseJsonFromModelResponse } = require('../../utils/text-processor');

      const result = parseJsonFromModelResponse(response, {
        logPrefix: 'MemoryReview',
        defaultValue: null
      });

      if (!result) {
        throw new Error('无法从模型响应中提取JSON');
      }

      // 将评估结果与原始记忆对象关联，并验证memoryId的有效性
      return result.evaluations
        .filter((evaluation: any) => {
          // 过滤掉无效的memoryId
          if (!evaluation.memoryId || typeof evaluation.memoryId !== 'number' || evaluation.memoryId <= 0) {
            console.error(`评估结果中包含无效的记忆ID: ${evaluation.memoryId}`);
            return false;
          }
          return true;
        })
        .map((evaluation: any) => ({
          ...evaluation,
          memory: memories.find(m => m.id === evaluation.memoryId)
        }));
    } catch (error) {
      console.error('解析记忆评估结果失败:', error);
      // 出错时默认保持所有记忆不变
      return memories.map(memory => ({
        memoryId: memory.id,
        memory,
        action: 'unchanged',
        reason: '评估过程出错，默认保持不变'
      }));
    }
  }

  /**
   * 清理模型响应，移除可能的非JSON内容
   */
  private cleanModelResponse(response: string): string {
    // 移除<think>标签内容
    let cleaned = response.replace(/<think>[\s\S]*?<\/think>/g, '');

    // 移除可能的Markdown代码块标记
    cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '');

    return cleaned;
  }

  /**
   * 获取复习上下文
   */
  private async getReviewContext(): Promise<string> {
    try {
      // 1. 获取用户的核心记忆
      const coreMemories = await this.memoryService.getCoreMemories();
      const coreMemoriesText = coreMemories
        .slice(0, 5) // 限制数量
        .map(m => `- ${m.content} (关键词: ${m.keywords})`)
        .join('\n');

      // 2. 获取最近强化过的记忆
      const recentlyReviewed = await this.getRecentlyReviewedMemories();
      const recentlyReviewedText = recentlyReviewed
        .map(m => `- ${m.content} (ID: ${m.id})`)
        .join('\n');

      return `
用户核心记忆:
${coreMemoriesText}

最近强化过的记忆:
${recentlyReviewedText}
`;
    } catch (error) {
      console.error('获取复习上下文失败:', error);
      return '无法获取上下文信息';
    }
  }

  /**
   * 获取最近复习过的记忆
   */
  private async getRecentlyReviewedMemories(): Promise<Memory[]> {
    try {
      // 获取最近7天内复习过的记忆
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      const reviewedMemoryIds = db.prepare(`
        SELECT DISTINCT memory_id FROM memory_reviews
        WHERE review_time > ?
        ORDER BY review_time DESC
        LIMIT 5
      `).all(sevenDaysAgo) as Array<{memory_id: number}>;

      if (reviewedMemoryIds.length === 0) {
        return [];
      }

      // 获取这些记忆的详细信息
      const memories: Memory[] = [];
      for (const { memory_id } of reviewedMemoryIds) {
        const result = await this.memoryService.getMemoryById(memory_id);
        if (result && result.memory) {
          memories.push(result.memory);
        }
      }

      return memories;
    } catch (error) {
      console.error('获取最近复习记忆失败:', error);
      return [];
    }
  }

  /**
   * 记录复习历史
   */
  private async recordReviewHistory(history: {
    timestamp: number;
    reviewed_count: number;
    forgotten_count: number;
    unchanged_count: number;
    details: string;
    trigger_type: string;
  }): Promise<void> {
    try {
      db.prepare(`
        INSERT INTO memory_review_sessions (
          timestamp, reviewed_count, forgotten_count, unchanged_count, details, trigger_type
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        history.timestamp,
        history.reviewed_count,
        history.forgotten_count,
        history.unchanged_count,
        history.details,
        history.trigger_type
      );

      console.log('记忆复习历史记录已保存');
    } catch (error) {
      console.error('记录复习历史失败:', error);
    }
  }
}
