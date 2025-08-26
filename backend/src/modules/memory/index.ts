/**
 * 记忆模块入口
 */

import { MemoryService } from './memory.service';
import { MemoryOrganizationService } from './memory-organization.service';
import { AutoMemoryReviewService } from './auto-memory-review.service';
import { smartMemoryRetrievalService } from './smart-memory-retrieval.service';
import { IMemoryService, IMemoryOrganizationService } from './interfaces/memory.interface';
import {
  Memory,
  MemoryRelation,
  MemoryType,
  MemorySubType,
  ImportanceLevel,
  ImportanceLevelString,
  MEMORY_IMPORTANCE_CRITERIA
} from './memory.types';

// 创建记忆服务实例
const memoryService = new MemoryService();
const memoryOrganizationService = new MemoryOrganizationService(memoryService);
const autoMemoryReviewService = new AutoMemoryReviewService(memoryService);

// 导出记忆服务实例和类型
export {
  memoryService,
  memoryOrganizationService,
  autoMemoryReviewService,
  smartMemoryRetrievalService,
  MemoryService,
  MemoryOrganizationService,
  AutoMemoryReviewService,
  MemoryType,
  MemorySubType,
  ImportanceLevel,
  ImportanceLevelString,
  MEMORY_IMPORTANCE_CRITERIA
};

export type {
  IMemoryService,
  IMemoryOrganizationService,
  Memory,
  MemoryRelation
};

// 初始化记忆服务
export function initMemoryModule(): void {
  memoryService.initMemoryService();
  console.log('记忆模块初始化完成');
}
