/**
 * 记忆服务接口定义
 */

import { Memory, MemoryRelation } from '../memory.types';

/**
 * 记忆服务接口
 */
export interface IMemoryService {
  /**
   * 获取所有记忆
   */
  getAllMemories(): Promise<Memory[]>;

  /**
   * 获取记忆详情
   * @param id 记忆ID
   */
  getMemoryById(id: number): Promise<{ memory: Memory, relatedMemories: Memory[] }>;

  /**
   * 搜索记忆
   * @param query 搜索关键词
   * @param limit 结果数量限制
   * @param memoryType 记忆类型
   * @param memorySubtype 记忆子类型
   * @param importanceLevel 重要性级别
   */
  searchMemories(
    query: string,
    limit?: number,
    memoryType?: string,
    memorySubtype?: string,
    importanceLevel?: string
  ): Promise<Memory[]>;

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
   */
  createMemory(
    keywords: string,
    content: string,
    context: string,
    importance?: number,
    relatedMemoryIds?: number[],
    memory_type?: string,
    memory_subtype?: string | null,
    is_pinned?: boolean,
    importance_level?: string
  ): Promise<Memory>;

  /**
   * 自动生成记忆
   * @param context 上下文
   */
  autoGenerateMemory(context: string): Promise<Memory | null>;

  /**
   * 获取核心记忆
   */
  getCoreMemories(): Promise<Memory[]>;

  /**
   * 获取事实性记忆
   */
  getFactualMemories(): Promise<Memory[]>;

  /**
   * 查找相关事实性记忆
   * @param query 查询内容
   * @param limit 结果数量限制
   */
  findRelatedFactualMemories(query: string, limit?: number): Promise<Memory[]>;

  /**
   * 查找相关记忆
   * @param query 查询内容
   * @param limit 结果数量限制
   */
  findRelatedMemories(query: string, limit?: number): Promise<Memory[]>;

  /**
   * 获取需要复习的记忆
   */
  getMemoriesToReview(): Promise<Memory[]>;

  /**
   * 记录记忆复习
   * @param memoryId 记忆ID
   */
  recordMemoryReview(memoryId: number): Promise<void>;

  /**
   * 删除记忆
   * @param id 记忆ID
   */
  deleteMemory(id: number): Promise<boolean>;

  /**
   * 更新记忆
   * @param id 记忆ID
   * @param updates 更新内容
   */
  updateMemory(
    id: number,
    updates: {
      content?: string;
      keywords?: string;
      importance?: number;
      memory_type?: string;
      memory_subtype?: string;
      is_pinned?: boolean;
    }
  ): Promise<Memory>;

  /**
   * 强化记忆
   * @param id 记忆ID
   */
  reinforceMemory(id: number): Promise<void>;

  /**
   * 生成反省记忆
   * @param conversation 对话内容
   * @param model 模型名称
   */
  generateReflectionMemory(conversation: string, model?: string): Promise<Memory | null>;

  /**
   * 从对话中生成多种类型的多条记忆
   * @param conversation 对话内容
   * @param model 模型名称
   */
  generateMultipleMemories(conversation: string, model?: string): Promise<Memory[]>;

  /**
   * 初始化记忆服务
   */
  initMemoryService(): void;

  /**
   * 计算记忆强度
   * @param memory 记忆对象
   */
  calculateMemoryStrength(memory: Memory): number;

  /**
   * 获取记忆阶段
   * @param memory 记忆对象
   */
  getMemoryStage(memory: Memory): number;

  /**
   * 获取下次复习时间
   * @param memory 记忆对象
   */
  getNextReviewTime(memory: Memory): number;

  /**
   * 初始化记忆服务
   */
  initialize(): Promise<void>;
}

/**
 * 记忆组织服务接口
 */
export interface IMemoryOrganizationService {
  /**
   * 增加记忆计数器
   */
  incrementMemoryCounter(): Promise<void>;

  /**
   * 组织记忆
   */
  organizeMemories(): Promise<void>;

  /**
   * 手动触发记忆组织
   */
  triggerMemoryOrganization(): Promise<{
    success: boolean;
    message: string;
  }>;

  /**
   * 创建记忆关系
   * @param memoryId 记忆ID
   * @param relatedMemoryId 关联记忆ID
   */
  createMemoryRelation(memoryId: number, relatedMemoryId: number): Promise<void>;

  /**
   * 删除记忆关系
   * @param memoryId 记忆ID
   * @param relatedMemoryId 关联记忆ID
   */
  deleteMemoryRelation(memoryId: number, relatedMemoryId: number): Promise<void>;

  /**
   * 获取关联记忆
   * @param memoryId 记忆ID
   */
  getRelatedMemories(memoryId: number): Promise<Memory[]>;
}
