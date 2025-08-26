# 记忆模块

## 概述

记忆模块负责管理AI的长期记忆，包括记忆的创建、存储、检索和组织。该模块使AI能够记住过去的交互和重要信息，提供个性化和连续性的用户体验。

## 目录结构

```
memory/
├── interfaces/                # 接口定义目录
│   └── memory.interface.ts    # 记忆接口定义
├── memory.service.ts          # 记忆服务实现
├── memory-organization.service.ts  # 记忆组织服务
├── memory.types.ts            # 记忆相关类型定义
├── index.ts                   # 模块入口文件
└── README.md                  # 模块文档
```

## 主要功能

- 创建和存储记忆
- 基于关键词和语义搜索记忆
- 记忆分类（核心记忆和事实性记忆）
- 记忆重要性评估
- 记忆关联和组织
- 基于艾宾浩斯遗忘曲线的记忆复习

## 核心类型

### Memory

```typescript
interface Memory {
  id: number;                 // 记忆ID
  keywords: string;           // 关键词
  content: string;            // 记忆内容
  context: string;            // 记忆上下文
  created_at: number;         // 创建时间
  last_accessed: number;      // 最后访问时间
  access_count: number;       // 访问次数
  memory_type: MemoryType;    // 记忆类型
  memory_subtype: MemorySubType | null; // 记忆子类型
  importance: ImportanceLevel; // 重要性级别
  is_pinned: boolean;         // 是否置顶
  strength: number;           // 记忆强度
  embedding_id?: string;      // 向量嵌入ID
}
```

### MemoryType

```typescript
enum MemoryType {
  CORE = 'core',           // 核心记忆：用户指令、偏好等
  FACTUAL = 'factual'      // 事实性记忆：项目信息、历史决策等
}
```

### MemorySubType

```typescript
enum MemorySubType {
  // 核心记忆子类型
  INSTRUCTION = 'instruction',    // 用户指令
  PREFERENCE = 'preference',      // 用户偏好
  REFLECTION = 'reflection',      // 反省记忆

  // 事实性记忆子类型
  PROJECT_INFO = 'project_info',  // 项目信息
  DECISION = 'decision',          // 历史决策
  SOLUTION = 'solution',          // 解决方案
  KNOWLEDGE = 'knowledge'         // 领域知识
}
```

### ImportanceLevel

```typescript
enum ImportanceLevel {
  IMPORTANT = 'important',    // 重要记忆
  MODERATE = 'moderate',      // 一般记忆
  UNIMPORTANT = 'unimportant' // 不重要记忆
}
```

## 核心接口

### IMemoryService

```typescript
interface IMemoryService {
  // 初始化记忆服务
  initialize(): Promise<void>;
  
  // 创建记忆
  createMemory(
    keywords: string,
    content: string,
    context: string,
    importance?: ImportanceLevel,
    relatedMemoryIds?: number[],
    memoryType?: MemoryType,
    memorySubtype?: MemorySubType | null,
    isPinned?: boolean
  ): Promise<Memory>;
  
  // 获取记忆
  getMemoryById(id: number): Promise<{ memory: Memory, relatedMemories: Memory[] } | null>;
  
  // 获取所有记忆
  getAllMemories(): Promise<Memory[]>;
  
  // 获取核心记忆
  getCoreMemories(): Promise<Memory[]>;
  
  // 获取事实性记忆
  getFactualMemories(): Promise<Memory[]>;
  
  // 搜索记忆
  searchMemories(
    query: string,
    limit?: number,
    memoryType?: string,
    memorySubtype?: string,
    importanceLevel?: string
  ): Promise<Memory[]>;
  
  // 查找相关记忆
  findRelatedMemories(query: string, limit?: number): Promise<Memory[]>;
  
  // 更新记忆
  updateMemory(id: number, updates: Partial<Memory>): Promise<Memory>;
  
  // 删除记忆
  deleteMemory(id: number): Promise<boolean>;
  
  // 记录记忆复习
  recordMemoryReview(id: number): Promise<void>;
  
  // 获取需要复习的记忆
  getMemoriesToReview(): Promise<Memory[]>;
  
  // 强化记忆
  reinforceMemory(id: number): Promise<void>;
  
  // 计算记忆强度
  calculateMemoryStrength(memory: Memory): number;
  
  // 获取记忆阶段
  getMemoryStage(memory: Memory): number;
  
  // 获取下次复习时间
  getNextReviewTime(memory: Memory): number;
}
```

### IMemoryOrganizationService

```typescript
interface IMemoryOrganizationService {
  // 创建记忆关联
  createMemoryRelation(memoryId: number, relatedMemoryId: number): Promise<void>;
  
  // 删除记忆关联
  deleteMemoryRelation(memoryId: number, relatedMemoryId: number): Promise<void>;
  
  // 获取相关记忆
  getRelatedMemories(memoryId: number): Promise<Memory[]>;
  
  // 组织记忆
  organizeMemories(): Promise<void>;
  
  // 检测记忆冲突
  detectMemoryConflicts(): Promise<{ memory1: Memory, memory2: Memory, conflictType: string }[]>;
  
  // 合并记忆
  mergeMemories(sourceId: number, targetId: number): Promise<Memory>;
}
```

## 使用示例

```typescript
import { memoryService, memoryOrganizationService, MemoryType, ImportanceLevel } from '../modules/memory';

// 创建新记忆
async function createNewMemory(content: string, context: string) {
  try {
    // 提取关键词
    const keywords = extractKeywords(content);
    
    // 创建记忆
    const memory = await memoryService.createMemory(
      keywords,
      content,
      context,
      ImportanceLevel.MODERATE,
      [],
      MemoryType.FACTUAL
    );
    
    console.log(`创建了新记忆: ${memory.id}`);
    return memory;
  } catch (error) {
    console.error('创建记忆时出错:', error);
    throw error;
  }
}

// 查找相关记忆
async function findRelevantMemories(query: string, limit: number = 5) {
  try {
    const memories = await memoryService.findRelatedMemories(query, limit);
    return memories;
  } catch (error) {
    console.error('查找相关记忆时出错:', error);
    throw error;
  }
}

// 辅助函数：提取关键词
function extractKeywords(text: string): string {
  // 简单实现，实际应使用NLP技术提取关键词
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 5)
    .join(',');
}
```
