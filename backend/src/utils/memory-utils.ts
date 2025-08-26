/**
 * 记忆相关工具函数
 */
import { Memory } from '../modules/memory/memory.types';

/**
 * 计算记忆强度
 * @param memory 记忆对象
 * @returns 记忆强度
 */
export function calculateMemoryStrength(memory: Memory): number {
  const now = Date.now();
  const age = now - memory.created_at;
  const lastAccessed = memory.last_accessed || memory.created_at;
  const timeSinceLastAccess = now - lastAccessed;

  // 基础强度：基于重要性
  let strength = memory.importance;

  // 年龄衰减：随着记忆年龄增长，强度降低
  const ageDecay = Math.min(1, age / (1000 * 60 * 60 * 24 * 365)); // 最多1年的衰减
  strength *= (1 - ageDecay * 0.3); // 最多减少30%

  // 访问增强：最近访问过的记忆强度增加
  const accessBoost = Math.max(0, 1 - timeSinceLastAccess / (1000 * 60 * 60 * 24 * 30)); // 30天内访问过的有提升
  strength *= (1 + accessBoost * 0.5); // 最多增加50%

  // 记忆类型增强：核心记忆的强度更高
  if (memory.memory_type === 'core') {
    strength *= 1.2; // 核心记忆强度提高20%
  }

  // 固定记忆增强：固定显示的记忆强度更高
  if (memory.is_pinned) {
    strength *= 1.3; // 固定记忆强度提高30%
  }

  // 确保强度在0-1之间
  return Math.max(0, Math.min(1, strength));
}

/**
 * 根据记忆重要性获取重要性级别
 * @param importance 重要性值（0-1之间）
 * @returns 重要性级别字符串
 */
export function getImportanceLevelFromValue(importance: number): string {
  if (importance >= 0.7) {
    return 'important';
  } else if (importance >= 0.4) {
    return 'moderate';
  } else {
    return 'unimportant';
  }
}

/**
 * 格式化记忆数据用于API响应
 * @param memory 记忆对象
 * @returns 格式化后的记忆对象
 */
export function formatMemoryForResponse(memory: Memory): any {
  return {
    ...memory,
    strength: calculateMemoryStrength(memory),
    created_at_formatted: new Date(memory.created_at).toLocaleString(),
    last_accessed_formatted: memory.last_accessed 
      ? new Date(memory.last_accessed).toLocaleString() 
      : null
  };
}
