/**
 * 记忆组织服务
 * 负责记忆的整理、冲突检测和处理
 */

import { db } from '../../config/database';
import { modelService } from '../model';
import { IMemoryOrganizationService } from './interfaces/memory.interface';
import { MemoryConflictAnalysis } from './memory.types';
import { MemoryService } from './memory.service';

/**
 * 记忆组织服务类
 */
export class MemoryOrganizationService implements IMemoryOrganizationService {
  private memoryService: MemoryService;
  // 整理阈值
  private readonly ORGANIZATION_THRESHOLD: number = 20;
  // 基于时间的备用触发间隔（7天）
  private readonly TIME_BASED_THRESHOLD: number = 7 * 24 * 60 * 60 * 1000;

  /**
   * 构造函数
   * @param memoryService 记忆服务实例
   */
  constructor(memoryService: MemoryService) {
    this.memoryService = memoryService;
    // 初始化时检查是否需要基于时间触发记忆整理
    this.checkTimeBasedOrganization();
  }

  /**
   * 获取持久化的记忆计数器
   * @returns 当前计数器值
   */
  private getMemoryCounter(): number {
    try {
      const result = db.prepare('SELECT value FROM system_config WHERE key = ?').get('memory_counter') as { value: string } | undefined;
      return result ? parseInt(result.value, 10) : 0;
    } catch (error) {
      console.error('获取记忆计数器失败:', error);
      return 0;
    }
  }

  /**
   * 更新持久化的记忆计数器
   * @param value 新的计数器值
   */
  private updateMemoryCounter(value: number): void {
    try {
      const timestamp = Date.now();
      db.prepare(`
        INSERT OR REPLACE INTO system_config (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run('memory_counter', value.toString(), timestamp);
    } catch (error) {
      console.error('更新记忆计数器失败:', error);
    }
  }

  /**
   * 获取上次记忆整理时间
   * @returns 上次整理时间戳
   */
  private getLastOrganizationTime(): number {
    try {
      const result = db.prepare('SELECT value FROM system_config WHERE key = ?').get('last_memory_organization') as { value: string } | undefined;
      return result ? parseInt(result.value, 10) : 0;
    } catch (error) {
      console.error('获取上次记忆整理时间失败:', error);
      return 0;
    }
  }

  /**
   * 更新上次记忆整理时间
   * @param timestamp 时间戳
   */
  private updateLastOrganizationTime(timestamp: number): void {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO system_config (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run('last_memory_organization', timestamp.toString(), timestamp);
    } catch (error) {
      console.error('更新上次记忆整理时间失败:', error);
    }
  }

  /**
   * 检查是否需要基于时间触发记忆整理
   */
  private async checkTimeBasedOrganization(): Promise<void> {
    try {
      const lastOrganizationTime = this.getLastOrganizationTime();
      const currentTime = Date.now();
      const timeSinceLastOrganization = currentTime - lastOrganizationTime;

      // 如果距离上次整理超过阈值时间，且有记忆存在，则触发整理
      if (timeSinceLastOrganization > this.TIME_BASED_THRESHOLD) {
        const memories = await this.memoryService.getAllMemories();
        if (memories.length > 0) {
          console.log(`距离上次记忆整理已过 ${Math.round(timeSinceLastOrganization / (24 * 60 * 60 * 1000))} 天，触发基于时间的记忆整理...`);
          await this.organizeMemories();
          // 重置计数器
          this.updateMemoryCounter(0);
        }
      }
    } catch (error) {
      console.error('检查基于时间的记忆整理失败:', error);
    }
  }

  /**
   * 记忆整理服务
   * 当新记忆创建时调用此函数，增加计数器
   * 当计数器达到阈值时，触发记忆整理
   */
  async incrementMemoryCounter(): Promise<void> {
    try {
      const currentCounter = this.getMemoryCounter();
      const newCounter = currentCounter + 1;
      this.updateMemoryCounter(newCounter);

      console.log(`记忆计数器: ${newCounter}/${this.ORGANIZATION_THRESHOLD}`);

      if (newCounter >= this.ORGANIZATION_THRESHOLD) {
        console.log('达到计数阈值，触发记忆整理...');
        await this.organizeMemories();
        // 重置计数器
        this.updateMemoryCounter(0);
      }
    } catch (error) {
      console.error('增加记忆计数器失败:', error);
    }
  }

  /**
   * 记忆整理主函数
   * 获取所有记忆，调用大模型进行分析，处理冲突记忆
   */
  async organizeMemories(): Promise<void> {
    try {
      // 获取所有记忆
      const memories = await this.memoryService.getAllMemories();

      if (memories.length === 0) {
        console.log('没有记忆需要整理');
        return;
      }

      console.log(`开始整理 ${memories.length} 条记忆...`);

      // 将记忆转换为适合大模型处理的格式
      const memoriesForAnalysis = memories.map(memory => ({
        id: memory.id,
        keywords: memory.keywords,
        content: memory.content,
        timestamp: memory.timestamp,
        created_at: memory.created_at,
        memory_type: memory.memory_type,
        memory_subtype: memory.memory_subtype,
        importance_level: memory.importance_level
      }));

      // 调用大模型分析记忆冲突
      const conflictAnalysis = await this.analyzeMemoryConflicts(memoriesForAnalysis);

      // 处理分析结果
      if (conflictAnalysis.conflicts && conflictAnalysis.conflicts.length > 0) {
        console.log(`发现 ${conflictAnalysis.conflicts.length} 组冲突记忆`);

        // 处理每组冲突
        for (const conflict of conflictAnalysis.conflicts) {
          await this.handleMemoryConflict(conflict);
        }

        console.log('记忆整理完成');
      } else {
        console.log('未发现冲突记忆');
      }

      // 更新上次整理时间
      this.updateLastOrganizationTime(Date.now());
    } catch (error) {
      console.error('记忆整理失败:', error);
    }
  }

  /**
   * 调用大模型分析记忆冲突
   * @param memories 记忆列表
   * @returns 冲突分析结果
   */
  private async analyzeMemoryConflicts(memories: any[]): Promise<MemoryConflictAnalysis> {
    try {
      // 导入提示词服务
      const { promptService } = require('../../modules/model/prompts');

      // 获取记忆整理提示词
      const prompt = promptService.getMemoryConflictAnalysisPrompt(memories);

      // 调用大模型
      const response = await modelService.generateText(prompt);

      // 解析JSON响应
      try {
        // 导入文本处理工具
        const { parseJsonFromModelResponse } = require('../../utils/text-processor');

        // 使用通用的JSON解析函数
        const result = parseJsonFromModelResponse(response, {
          logPrefix: 'MemoryConflict',
          defaultValue: { conflicts: [] }
        });

        return result;
      } catch (parseError) {
        console.error('解析大模型返回的JSON失败:', parseError);
        return { conflicts: [] };
      }
    } catch (error) {
      console.error('调用大模型分析记忆冲突失败:', error);
      return { conflicts: [] };
    }
  }

  /**
   * 处理记忆冲突
   * 保留指定的记忆，删除其他冲突记忆
   * @param conflict 冲突信息
   */
  private async handleMemoryConflict(conflict: {
    description: string;
    conflicting_ids: number[];
    keep_id: number;
    reason: string;
  }): Promise<void> {
    try {
      const { conflicting_ids, keep_id, description, reason } = conflict;

      // 记录冲突处理日志
      console.log(`处理冲突: ${description}`);
      console.log(`保留记忆ID: ${keep_id}, 原因: ${reason}`);

      // 获取要保留的记忆详情
      const keepMemory = db.prepare('SELECT * FROM memories WHERE id = ?').get(keep_id) as {
        id: number;
        content: string;
        created_at: number;
      };
      if (!keepMemory) {
        console.error(`要保留的记忆ID ${keep_id} 不存在`);
        return;
      }

      // 记录整理操作到审计日志
      const timestamp = Date.now();
      const auditLogId = `memory-org-${timestamp}-${Math.random().toString(36).substring(2, 10)}`;

      db.prepare(`
        INSERT INTO audit_logs (
          id, user_id, operation_id, operation_type, risk_level,
          success, timestamp, details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditLogId,
        'system',
        `memory-org-${timestamp}`,
        'memory_organization',
        'low',
        1,
        timestamp,
        JSON.stringify({
          description,
          reason,
          keep_memory: {
            id: keepMemory.id,
            content: keepMemory.content,
            created_at: new Date(keepMemory.created_at).toISOString()
          }
        })
      );

      // 删除冲突记忆（除了要保留的）
      for (const memoryId of conflicting_ids) {
        if (memoryId !== keep_id) {
          console.log(`删除冲突记忆ID: ${memoryId}`);
          await this.memoryService.deleteMemory(memoryId);
        }
      }
    } catch (error) {
      console.error('处理记忆冲突失败:', error);
    }
  }

  /**
   * 手动触发记忆整理
   * @returns 操作结果
   */
  async triggerMemoryOrganization(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.organizeMemories();
      // 重置计数器
      this.updateMemoryCounter(0);
      return {
        success: true,
        message: '记忆整理已完成'
      };
    } catch (error) {
      return {
        success: false,
        message: `记忆整理失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 获取记忆整理状态
   * @returns 整理状态信息
   */
  getOrganizationStatus(): {
    currentCounter: number;
    threshold: number;
    lastOrganizationTime: number;
    nextOrganizationIn: number;
    timeBasedThreshold: number;
  } {
    const currentCounter = this.getMemoryCounter();
    const lastOrganizationTime = this.getLastOrganizationTime();
    const timeSinceLastOrganization = Date.now() - lastOrganizationTime;
    const nextOrganizationIn = Math.max(0, this.TIME_BASED_THRESHOLD - timeSinceLastOrganization);

    return {
      currentCounter,
      threshold: this.ORGANIZATION_THRESHOLD,
      lastOrganizationTime,
      nextOrganizationIn,
      timeBasedThreshold: this.TIME_BASED_THRESHOLD
    };
  }

  /**
   * 重置记忆计数器
   * @returns 操作结果
   */
  resetMemoryCounter(): {
    success: boolean;
    message: string;
  } {
    try {
      this.updateMemoryCounter(0);
      return {
        success: true,
        message: '记忆计数器已重置'
      };
    } catch (error) {
      return {
        success: false,
        message: `重置记忆计数器失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 创建记忆关系
   * @param memoryId 记忆ID
   * @param relatedMemoryId 关联记忆ID
   */
  async createMemoryRelation(memoryId: number, relatedMemoryId: number): Promise<void> {
    try {
      const timestamp = Date.now();

      // 检查记忆是否存在
      const memory = db.prepare('SELECT id FROM memories WHERE id = ?').get(memoryId);
      const relatedMemory = db.prepare('SELECT id FROM memories WHERE id = ?').get(relatedMemoryId);

      if (!memory || !relatedMemory) {
        throw new Error('记忆不存在');
      }

      // 检查关系是否已存在
      const existingRelation = db.prepare(
        'SELECT * FROM memory_relations WHERE memory_id = ? AND related_memory_id = ?'
      ).get(memoryId, relatedMemoryId);

      if (existingRelation) {
        console.log(`记忆关系已存在: ${memoryId} -> ${relatedMemoryId}`);
        return;
      }

      // 创建记忆关系
      db.prepare(`
        INSERT INTO memory_relations (memory_id, related_memory_id, relation_strength, created_at)
        VALUES (?, ?, ?, ?)
      `).run(memoryId, relatedMemoryId, 1.0, timestamp);

      console.log(`创建记忆关系成功: ${memoryId} -> ${relatedMemoryId}`);
    } catch (error) {
      console.error('创建记忆关系失败:', error);
      throw error;
    }
  }

  /**
   * 删除记忆关系
   * @param memoryId 记忆ID
   * @param relatedMemoryId 关联记忆ID
   */
  async deleteMemoryRelation(memoryId: number, relatedMemoryId: number): Promise<void> {
    try {
      // 删除记忆关系
      db.prepare(
        'DELETE FROM memory_relations WHERE memory_id = ? AND related_memory_id = ?'
      ).run(memoryId, relatedMemoryId);

      console.log(`删除记忆关系成功: ${memoryId} -> ${relatedMemoryId}`);
    } catch (error) {
      console.error('删除记忆关系失败:', error);
      throw error;
    }
  }

  /**
   * 获取关联记忆
   * @param memoryId 记忆ID
   * @returns 关联记忆列表
   */
  async getRelatedMemories(memoryId: number): Promise<any[]> {
    try {
      // 获取关联记忆
      const relatedMemories = db.prepare(`
        SELECT m.* FROM memories m
        JOIN memory_relations mr ON m.id = mr.related_memory_id
        WHERE mr.memory_id = ?
      `).all(memoryId);

      return relatedMemories;
    } catch (error) {
      console.error('获取关联记忆失败:', error);
      return [];
    }
  }
}
