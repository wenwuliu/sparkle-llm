/**
 * 记忆服务
 * 负责记忆的创建、查询、更新和删除
 */

import { db } from '../../config/database';
import { modelService } from '../model';
import { vectorDb } from '../vector-db';
import { DEFAULT_MODEL_CONFIG } from '../../config/model.config';
import { IMemoryService } from './interfaces/memory.interface';
import { memoryOrganizationService } from './index';
import {
  Memory,
  MemoryRelation,
  MemoryType,
  MemorySubType,
  ImportanceLevel,
  ImportanceLevelString,
  MemoryUpdateParams
} from './memory.types';
import { calculateMemoryStrength, getImportanceLevelFromValue, formatMemoryForResponse } from '../../utils/memory-utils';

// 艾宾浩斯遗忘曲线间隔（单位：毫秒）
const FORGETTING_INTERVALS = [
  1000 * 60 * 60 * 24,       // 1天
  1000 * 60 * 60 * 24 * 2,   // 2天
  1000 * 60 * 60 * 24 * 4,   // 4天
  1000 * 60 * 60 * 24 * 7,   // 7天
  1000 * 60 * 60 * 24 * 15,  // 15天
  1000 * 60 * 60 * 24 * 30,  // 30天
  1000 * 60 * 60 * 24 * 60,  // 60天
  1000 * 60 * 60 * 24 * 120, // 120天
];

/**
 * 记忆服务类
 */
export class MemoryService implements IMemoryService {
  /**
   * 计算记忆强度
   * @param memory 记忆对象
   * @returns 记忆强度
   */
  calculateMemoryStrength(memory: Memory): number {
    // 使用工具函数计算记忆强度
    return calculateMemoryStrength(memory);
  }

  /**
   * 获取所有记忆
   * @returns 记忆列表
   */
  async getAllMemories(): Promise<Memory[]> {
    try {
      const memories = db.prepare('SELECT * FROM memories ORDER BY timestamp DESC').all() as Memory[];

      // 计算每个记忆的强度
      return memories.map(memory => ({
        ...memory,
        strength: this.calculateMemoryStrength(memory),
      }));
    } catch (error) {
      console.error('获取记忆失败:', error);
      throw error;
    }
  }

  /**
   * 获取记忆详情
   * @param id 记忆ID
   * @returns 记忆详情和关联记忆
   */
  async getMemoryById(id: number): Promise<{ memory: Memory, relatedMemories: Memory[] }> {
    try {
      // 获取记忆
      const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(id) as Memory;

      if (!memory) {
        throw new Error('记忆不存在');
      }

      // 获取关联记忆
      const relatedMemories = db.prepare(`
        SELECT m.* FROM memories m
        JOIN memory_relations mr ON m.id = mr.related_memory_id
        WHERE mr.memory_id = ?
      `).all(id) as Memory[];

      // 更新最后访问时间
      db.prepare('UPDATE memories SET last_accessed = ? WHERE id = ?').run(Date.now(), id);

      // 计算记忆强度
      const memoryWithStrength: Memory = {
        ...memory,
        strength: this.calculateMemoryStrength(memory),
      };

      // 计算关联记忆强度
      const relatedMemoriesWithStrength = relatedMemories.map(related => ({
        ...related,
        strength: this.calculateMemoryStrength(related),
      }));

      return {
        memory: memoryWithStrength,
        relatedMemories: relatedMemoriesWithStrength,
      };
    } catch (error) {
      console.error('获取记忆详情失败:', error);
      throw error;
    }
  }

  /**
   * 搜索记忆
   * @param query 搜索关键词
   * @param limit 结果数量限制
   * @param memoryType 记忆类型
   * @param memorySubtype 记忆子类型
   * @param importanceLevel 重要性级别
   * @returns 记忆列表
   */
  async searchMemories(
    query: string,
    limit: number = 10,
    memoryType?: string,
    memorySubtype?: string,
    importanceLevel?: string
  ): Promise<Memory[]> {
    try {
      // 构建查询条件
      let sqlQuery = `
        SELECT * FROM memories
      `;

      const params: any[] = [];

      // 如果查询不是通配符，添加关键词和内容筛选
      if (query !== '*') {
        sqlQuery += ` WHERE (keywords LIKE ? OR content LIKE ?)`;
        params.push(`%${query}%`, `%${query}%`);
      } else {
        sqlQuery += ` WHERE 1=1`; // 添加一个始终为真的条件，方便后续添加AND条件
      }

      // 添加记忆类型筛选
      if (memoryType) {
        sqlQuery += ` AND memory_type = ?`;
        params.push(memoryType);
      }

      // 添加记忆子类型筛选
      if (memorySubtype) {
        sqlQuery += ` AND memory_subtype = ?`;
        params.push(memorySubtype);
      }

      // 添加重要性级别筛选
      if (importanceLevel) {
        sqlQuery += ` AND importance_level = ?`;
        params.push(importanceLevel);
      }

      // 添加排序和限制
      sqlQuery += ` ORDER BY timestamp DESC LIMIT ?`;
      params.push(limit);

      // 执行查询
      const memories = db.prepare(sqlQuery).all(...params) as Memory[];

      // 计算每个记忆的强度
      return memories.map(memory => ({
        ...memory,
        strength: this.calculateMemoryStrength(memory),
      }));
    } catch (error) {
      console.error('搜索记忆失败:', error);
      throw error;
    }
  }

  /**
   * 创建记忆
   * @param keywords 关键词
   * @param content 内容
   * @param context 上下文
   * @param importance 重要性
   * @param relatedMemoryIds 关联记忆ID
   * @param memory_type 记忆类型
   * @param memory_subtype 记忆子类型
   * @param is_pinned 是否固定
   * @param importance_level 重要性级别
   * @returns 创建的记忆
   */
  async createMemory(
    keywords: string,
    content: string,
    context: string,
    importance: number = 0.5,
    relatedMemoryIds: number[] = [],
    memory_type: string = MemoryType.FACTUAL,
    memory_subtype: string | null = null,
    is_pinned: boolean = false,
    importance_level: string = ImportanceLevelString[ImportanceLevel.MODERATE]
  ): Promise<Memory> {
    try {
      const timestamp = Date.now();

      // 如果没有提供 importance_level，根据 importance 值确定
      if (!importance_level) {
        importance_level = getImportanceLevelFromValue(importance);
      }

      // 插入记忆
      const result = db.prepare(`
        INSERT INTO memories (
          timestamp, keywords, context, content, importance,
          memory_type, memory_subtype, is_pinned, created_at, importance_level
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        timestamp, keywords, context, content, importance,
        memory_type, memory_subtype, is_pinned ? 1 : 0, timestamp, importance_level
      );

      const memoryId = result.lastInsertRowid as number;

      // 插入关联记忆
      if (relatedMemoryIds.length > 0) {
        const insertRelation = db.prepare(`
          INSERT INTO memory_relations (memory_id, related_memory_id, relation_strength, created_at)
          VALUES (?, ?, ?, ?)
        `);

        for (const relatedId of relatedMemoryIds) {
          insertRelation.run(memoryId, relatedId, 1.0, timestamp);
        }
      }

      // 添加到向量数据库
      await vectorDb.addMemory(memoryId, content);

      // 获取创建的记忆
      const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(memoryId) as Memory;

      console.log(`创建${memory_type}记忆成功: ID=${memoryId}, 内容=${content}`);

      // 增加记忆计数器，当达到阈值时会自动触发记忆整理
      try {
        await memoryOrganizationService.incrementMemoryCounter();
        console.log('记忆计数器已增加');
      } catch (counterError) {
        console.error('增加记忆计数器失败:', counterError);
        // 不影响主流程，继续返回创建的记忆
      }

      return {
        ...memory,
        strength: this.calculateMemoryStrength(memory),
      };
    } catch (error) {
      console.error('创建记忆失败:', error);
      throw error;
    }
  }

  /**
   * 自动生成记忆
   * @param context 上下文
   * @returns 生成的记忆
   */
  async autoGenerateMemory(context: string): Promise<Memory | null> {
    try {
      // 使用模型生成记忆
      const memoryData = await modelService.generateMemory(context);

      if (!memoryData) {
        return null;
      }

      // 创建记忆
      return await this.createMemory(
        memoryData.keywords,
        memoryData.content,
        memoryData.context,
        memoryData.importance,
        [], // 关联记忆IDs
        memoryData.memory_type || MemoryType.FACTUAL,
        memoryData.memory_subtype || null,
        memoryData.is_pinned || false,
        memoryData.importance_level || getImportanceLevelFromValue(memoryData.importance)
      );
    } catch (error) {
      console.error('自动生成记忆失败:', error);
      return null;
    }
  }

  /**
   * 获取所有核心记忆
   * @returns 核心记忆列表
   */
  async getCoreMemories(): Promise<Memory[]> {
    try {
      // 获取所有核心记忆，按固定状态和重要性排序
      const memories = db.prepare(`
        SELECT * FROM memories
        WHERE memory_type = ?
        ORDER BY is_pinned DESC, importance DESC
      `).all(MemoryType.CORE) as Memory[];

      return memories.map(memory => ({
        ...memory,
        strength: this.calculateMemoryStrength(memory),
      }));
    } catch (error) {
      console.error('获取核心记忆失败:', error);
      return [];
    }
  }

  /**
   * 获取所有事实性记忆
   * @returns 事实性记忆列表
   */
  async getFactualMemories(): Promise<Memory[]> {
    try {
      // 获取所有事实性记忆，按重要性排序
      const memories = db.prepare(`
        SELECT * FROM memories
        WHERE memory_type = ? OR memory_type IS NULL
        ORDER BY importance DESC, timestamp DESC
      `).all(MemoryType.FACTUAL) as Memory[];

      return memories.map(memory => ({
        ...memory,
        strength: this.calculateMemoryStrength(memory),
      }));
    } catch (error) {
      console.error('获取事实性记忆失败:', error);
      return [];
    }
  }

  /**
   * 查找相关事实性记忆
   * @param query 查询内容
   * @param limit 结果数量限制
   * @returns 相关事实性记忆列表
   */
  async findRelatedFactualMemories(query: string, limit: number = 5): Promise<Memory[]> {
    try {
      // 使用向量数据库的语义搜索方法
      const memories = await vectorDb.semanticSearchMemories(query, limit);

      // 只保留事实性记忆
      const factualMemories = memories.filter(memory =>
        memory.memory_type === MemoryType.FACTUAL || !memory.memory_type
      );

      // 计算每个记忆的强度
      return factualMemories.map(memory => ({
        ...memory,
        strength: this.calculateMemoryStrength(memory),
      }));
    } catch (error) {
      console.error('查找相关事实性记忆失败:', error);
      return [];
    }
  }

  /**
   * 查找相关记忆（支持三级重要性）
   * @param query 查询内容
   * @param limit 结果数量限制
   * @returns 相关记忆列表
   */
  async findRelatedMemories(query: string, limit: number = 5): Promise<Memory[]> {
    try {
      // 1. 获取所有核心记忆（每次对话都携带）
      const coreMemories = await this.getCoreMemories();

      // 2. 查找相关的事实性记忆
      const factualMemories = await this.findRelatedFactualMemories(query, limit);

      // 3. 根据重要性级别分类事实性记忆
      const importantFactualMemories = factualMemories.filter(
        m => m.importance_level === ImportanceLevelString[ImportanceLevel.IMPORTANT]
      );

      const moderateFactualMemories = factualMemories.filter(
        m => m.importance_level === ImportanceLevelString[ImportanceLevel.MODERATE]
      );

      const unimportantFactualMemories = factualMemories.filter(
        m => m.importance_level === ImportanceLevelString[ImportanceLevel.UNIMPORTANT] || !m.importance_level
      );

      // 4. 合并结果，按优先级排序：核心记忆 > 重要事实记忆 > 一般事实记忆 > 不重要事实记忆
      const combinedMemories = [...coreMemories];

      // 添加重要事实记忆，避免重复
      for (const memory of importantFactualMemories) {
        if (!combinedMemories.some(m => m.id === memory.id)) {
          combinedMemories.push(memory);
        }
      }

      // 添加一般事实记忆，避免重复
      for (const memory of moderateFactualMemories) {
        if (!combinedMemories.some(m => m.id === memory.id)) {
          combinedMemories.push(memory);
        }
      }

      // 添加不重要事实记忆，避免重复（如果还有空间）
      if (combinedMemories.length < limit) {
        for (const memory of unimportantFactualMemories) {
          if (!combinedMemories.some(m => m.id === memory.id)) {
            combinedMemories.push(memory);
            if (combinedMemories.length >= limit) break;
          }
        }
      }

      // 5. 限制总数量，但确保至少包含所有核心记忆和重要事实记忆
      const minMemories = coreMemories.length + importantFactualMemories.length;
      const finalMemories = combinedMemories.slice(0, Math.max(limit, minMemories));

      return finalMemories;
    } catch (error) {
      console.error('查找相关记忆失败:', error);
      return [];
    }
  }

  /**
   * 获取记忆阶段（艾宾浩斯遗忘曲线）
   * @param memory 记忆对象
   * @returns 记忆阶段
   */
  getMemoryStage(memory: Memory): number {
    // 如果没有访问记录，则阶段为0
    if (!memory.last_accessed) {
      return 0;
    }

    // 计算复习次数
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM memory_reviews
      WHERE memory_id = ?
    `).get(memory.id) as { count: number } | undefined;

    const reviewCount = result?.count || 0;

    // 阶段不超过最大间隔数
    return Math.min(reviewCount, FORGETTING_INTERVALS.length - 1);
  }

  /**
   * 获取下次复习时间
   * @param memory 记忆对象
   * @returns 下次复习时间
   */
  getNextReviewTime(memory: Memory): number {
    const stage = this.getMemoryStage(memory);
    const lastAccessed = memory.last_accessed || memory.created_at;

    // 根据阶段计算下次复习时间
    return lastAccessed + FORGETTING_INTERVALS[stage];
  }

  /**
   * 获取需要复习的记忆
   * @returns 需要复习的记忆列表
   */
  async getMemoriesToReview(): Promise<Memory[]> {
    try {
      const now = Date.now();
      const memories = await this.getAllMemories();

      // 筛选需要复习的记忆
      return memories.filter(memory => {
        // 计算下次复习时间
        const nextReviewTime = this.getNextReviewTime(memory);

        // 如果当前时间已经超过下次复习时间，则需要复习
        return now >= nextReviewTime;
      });
    } catch (error) {
      console.error('获取需要复习的记忆失败:', error);
      return [];
    }
  }

  /**
   * 记录记忆复习
   * @param memoryId 记忆ID
   */
  async recordMemoryReview(memoryId: number): Promise<void> {
    try {
      // 验证memoryId是否有效
      if (!memoryId || typeof memoryId !== 'number' || memoryId <= 0) {
        throw new Error(`无效的记忆ID: ${memoryId}`);
      }

      // 检查记忆是否存在
      const memory = db.prepare('SELECT id FROM memories WHERE id = ?').get(memoryId);
      if (!memory) {
        throw new Error(`记忆ID ${memoryId} 不存在`);
      }

      const now = Date.now();

      // 更新记忆的最后访问时间
      db.prepare('UPDATE memories SET last_accessed = ? WHERE id = ?').run(now, memoryId);

      // 记录复习历史
      db.prepare(`
        INSERT INTO memory_reviews (memory_id, review_time)
        VALUES (?, ?)
      `).run(memoryId, now);
    } catch (error) {
      console.error('记录记忆复习失败:', error);
      throw error;
    }
  }

  /**
   * 删除记忆
   * @param id 记忆ID
   * @returns 是否删除成功
   */
  async deleteMemory(id: number): Promise<boolean> {
    try {
      // 首先检查记忆是否存在
      const memory = await this.getMemoryById(id);
      if (!memory) {
        console.error(`记忆 ID ${id} 不存在`);
        return false;
      }

      // 开始事务
      db.transaction(() => {
        // 删除记忆关联
        db.prepare('DELETE FROM memory_relations WHERE memory_id = ? OR related_memory_id = ?').run(id, id);

        // 删除记忆复习记录
        db.prepare('DELETE FROM memory_reviews WHERE memory_id = ?').run(id);

        // 删除记忆
        db.prepare('DELETE FROM memories WHERE id = ?').run(id);
      })();

      // 从向量数据库中删除记忆
      try {
        await vectorDb.deleteMemory(id);
      } catch (e) {
        // 向量数据库删除失败不影响主流程
        // 只记录日志，不抛出异常，不显示警告
        console.log(`向量数据库删除记忆 ID ${id} 时出现非关键错误，不影响记忆删除操作`);
      }

      console.log(`记忆 ID ${id} 已成功删除`);
      return true;
    } catch (error) {
      console.error('删除记忆失败:', error);
      return false;
    }
  }

  /**
   * 更新记忆
   * @param id 记忆ID
   * @param updates 更新内容
   * @returns 更新后的记忆
   */
  async updateMemory(
    id: number,
    updates: MemoryUpdateParams
  ): Promise<Memory> {
    try {
      const timestamp = Date.now();
      const updateFields: string[] = [];
      const values: any[] = [];

      // 构建更新字段
      if (updates.content !== undefined) {
        updateFields.push('content = ?');
        values.push(updates.content);
      }
      if (updates.keywords !== undefined) {
        updateFields.push('keywords = ?');
        values.push(updates.keywords);
      }
      if (updates.importance !== undefined) {
        updateFields.push('importance = ?');
        values.push(updates.importance);
      }
      if (updates.memory_type !== undefined) {
        updateFields.push('memory_type = ?');
        values.push(updates.memory_type);
      }
      if (updates.memory_subtype !== undefined) {
        updateFields.push('memory_subtype = ?');
        values.push(updates.memory_subtype);
      }
      if (updates.is_pinned !== undefined) {
        updateFields.push('is_pinned = ?');
        values.push(updates.is_pinned ? 1 : 0);
      }

      // 添加最后更新时间
      updateFields.push('last_accessed = ?');
      values.push(timestamp);

      // 如果没有要更新的字段，直接返回
      if (updateFields.length === 0) {
        throw new Error('没有提供要更新的字段');
      }

      // 添加ID
      values.push(id);

      // 执行更新
      db.prepare(`
        UPDATE memories
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `).run(...values);

      // 如果内容更新了，更新向量数据库
      if (updates.content !== undefined) {
        const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(id) as Memory;
        await vectorDb.updateMemory(id, memory.content);
      }

      // 获取更新后的记忆
      const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(id) as Memory;

      return {
        ...memory,
        strength: this.calculateMemoryStrength(memory),
      };
    } catch (error) {
      console.error('更新记忆失败:', error);
      throw error;
    }
  }

  /**
   * 强化记忆
   * @param id 记忆ID
   */
  async reinforceMemory(id: number): Promise<void> {
    try {
      // 验证id是否有效
      if (!id || typeof id !== 'number' || id <= 0) {
        throw new Error(`无效的记忆ID: ${id}`);
      }

      // 检查记忆是否存在
      const memory = db.prepare('SELECT id FROM memories WHERE id = ?').get(id);
      if (!memory) {
        throw new Error(`记忆ID ${id} 不存在`);
      }

      const timestamp = Date.now();

      // 更新记忆的最后访问时间
      db.prepare('UPDATE memories SET last_accessed = ? WHERE id = ?').run(timestamp, id);

      // 记录复习历史
      db.prepare(`
        INSERT INTO memory_reviews (memory_id, review_time)
        VALUES (?, ?)
      `).run(id, timestamp);

      console.log(`记忆 ${id} 已强化`);
    } catch (error) {
      console.error('强化记忆失败:', error);
      throw error;
    }
  }

  /**
   * 生成反省记忆
   * @param conversation 对话内容
   * @param model 模型名称
   * @returns 生成的反省记忆
   */
  async generateReflectionMemory(
    conversation: string,
    model: string = DEFAULT_MODEL_CONFIG.OLLAMA.MODEL
  ): Promise<Memory | null> {
    try {
      // 导入提示词服务
      const { promptService } = require('../model/prompts');

      // 获取反省记忆生成提示词
      const prompt = promptService.getReflectionMemoryPrompt(conversation);

      const response = await modelService.generateText(prompt, {
        temperature: 0.3,
        skipSystemPrompt: true,
        model: 'this-is-sparkle-llm-force-default-model'
      });

      // 如果没有需要反省的内容
      if (response.includes('NO_REFLECTION')) {
        return null;
      }

      // 尝试解析JSON
      try {
        // 导入文本处理工具
        const { removeThinkTags, fixJsonString } = require('../../utils/text-processor');

        // 移除<think>标签，避免JSON解析错误
        const cleanedResponse = removeThinkTags(response);

        // 提取JSON部分
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          // 修复JSON字符串中的特殊字符
          const fixedJsonStr = fixJsonString(jsonMatch[0]);

          // 解析修复后的JSON
          const memoryData = JSON.parse(fixedJsonStr);

          // 创建反省记忆
          return await this.createMemory(
            memoryData.keywords || "反省,错误,改进",
            memoryData.content,
            memoryData.context || conversation.substring(0, 500),
            memoryData.importance || 0.8,
            [], // 关联记忆IDs
            MemoryType.CORE,
            MemorySubType.REFLECTION,
            memoryData.is_pinned || true,
            ImportanceLevelString[ImportanceLevel.IMPORTANT]
          );
        }
        return null;
      } catch (error) {
        console.error('解析反省记忆JSON错误:', error);
        // 在catch块中不能访问try块中的变量，所以不能直接使用jsonMatch
        return null;
      }
    } catch (error) {
      console.error('生成反省记忆失败:', error);
      return null;
    }
  }

  /**
   * 从对话中生成多种类型的多条记忆
   * @param conversation 对话内容
   * @param model 模型名称
   * @returns 生成的多条记忆
   */
  async generateMultipleMemories(
    conversation: string,
    model: string = DEFAULT_MODEL_CONFIG.OLLAMA.MODEL
  ): Promise<Memory[]> {
    try {
      console.log('开始从对话中生成多种类型的记忆...');

      // 导入提示词服务
      const { promptService } = require('../model/prompts');

      // 获取多种类型记忆生成提示词
      const prompt = promptService.getMultipleMemoriesPrompt(conversation);

      const response = await modelService.generateText(prompt, {
        temperature: 0.3,
        skipSystemPrompt: true,
        model: 'this-is-sparkle-llm-force-default-model'
      });

      // 尝试解析JSON
      try {
        // 导入文本处理工具
        const { removeThinkTags, fixJsonString } = require('../../utils/text-processor');

        // 移除<think>标签，避免JSON解析错误
        const cleanedResponse = removeThinkTags(response);

        // 提取JSON部分
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          // 修复JSON字符串中的特殊字符
          const fixedJsonStr = fixJsonString(jsonMatch[0]);

          // 解析修复后的JSON
          const result = JSON.parse(fixedJsonStr);

          if (!result.memories || !Array.isArray(result.memories) || result.memories.length === 0) {
            console.log('对话中没有发现值得记忆的内容');
            return [];
          }

          console.log(`从对话中提取出 ${result.memories.length} 条记忆`);

          // 创建所有记忆
          const memories: Memory[] = [];

          for (const memoryData of result.memories) {
            try {
              // 设置默认值
              const memory = await this.createMemory(
                memoryData.keywords || "自动生成",
                memoryData.content,
                memoryData.context || conversation.substring(0, 500),
                memoryData.importance || 0.5,
                [], // 关联记忆IDs
                memoryData.memory_type || MemoryType.FACTUAL,
                memoryData.memory_subtype || null,
                memoryData.is_pinned || false,
                memoryData.importance_level || (
                  memoryData.importance >= 0.7 ? ImportanceLevelString[ImportanceLevel.IMPORTANT] :
                  memoryData.importance >= 0.4 ? ImportanceLevelString[ImportanceLevel.MODERATE] :
                  ImportanceLevelString[ImportanceLevel.UNIMPORTANT]
                )
              );

              memories.push(memory);
              console.log(`创建记忆成功: ${memory.content}`);
            } catch (memoryError) {
              console.error('创建单条记忆失败:', memoryError);
              // 继续处理下一条记忆
            }
          }

          return memories;
        }

        console.log('无法从响应中提取JSON数据');
        return [];
      } catch (error) {
        console.error('解析记忆JSON错误:', error);
        // 在catch块中不能访问try块中的变量，所以不能直接使用jsonMatch
        return [];
      }
    } catch (error) {
      console.error('生成多条记忆失败:', error);
      return [];
    }
  }

  /**
   * 初始化记忆服务
   */
  initMemoryService(): void {
    // 创建记忆复习表（如果不存在）
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_id INTEGER NOT NULL,
        review_time INTEGER NOT NULL,
        FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
      );
    `);

    console.log('记忆服务初始化完成');
  }

  /**
   * 初始化记忆服务（异步版本）
   */
  async initialize(): Promise<void> {
    this.initMemoryService();
    return Promise.resolve();
  }
}
