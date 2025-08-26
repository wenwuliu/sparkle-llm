import { db } from '../config/database';

/**
 * 更新记忆表结构，添加记忆类型相关字段
 */
export function migrateMemoryTypes() {
  try {
    console.log('开始迁移记忆表结构...');

    // 检查memory_type列是否存在
    const tableInfo = db.prepare("PRAGMA table_info(memories)").all() as any[];
    const hasMemoryType = tableInfo.some(column => column.name === 'memory_type');
    const hasMemorySubtype = tableInfo.some(column => column.name === 'memory_subtype');
    const hasPinned = tableInfo.some(column => column.name === 'is_pinned');

    // 开始事务
    db.exec('BEGIN TRANSACTION;');

    // 添加memory_type列
    if (!hasMemoryType) {
      console.log('添加memory_type列...');
      db.exec('ALTER TABLE memories ADD COLUMN memory_type TEXT DEFAULT "factual";');
    }

    // 添加memory_subtype列
    if (!hasMemorySubtype) {
      console.log('添加memory_subtype列...');
      db.exec('ALTER TABLE memories ADD COLUMN memory_subtype TEXT DEFAULT NULL;');
    }

    // 添加is_pinned列
    if (!hasPinned) {
      console.log('添加is_pinned列...');
      db.exec('ALTER TABLE memories ADD COLUMN is_pinned INTEGER DEFAULT 0;');
    }

    // 提交事务
    db.exec('COMMIT;');

    console.log('记忆表结构迁移完成');
    return true;
  } catch (error) {
    // 回滚事务
    db.exec('ROLLBACK;');
    console.error('记忆表结构迁移失败:', error);
    return false;
  }
}

// 更新现有记忆，将用户指令设置为核心记忆，用户偏好设置为事实性记忆
export function updateExistingMemories() {
  try {
    console.log('开始更新现有记忆...');

    // 获取所有记忆
    const memories = db.prepare('SELECT id, content, keywords FROM memories').all() as any[];

    // 指令关键词
    const instructionKeywords = ['必须', '应该', '不能', '禁止', '记住', '要求'];
    // 偏好关键词
    const preferenceKeywords = ['偏好', '喜欢', '习惯', '风格', '使用'];

    // 更新语句
    const updateMemory = db.prepare(`
      UPDATE memories
      SET memory_type = ?, memory_subtype = ?, is_pinned = ?
      WHERE id = ?
    `);

    // 开始事务
    db.exec('BEGIN TRANSACTION;');

    // 遍历所有记忆
    for (const memory of memories) {
      let memoryType = 'factual';
      let memorySubtype = null;
      let isPinned = 0;

      // 检查内容是否包含指令关键词
      if (instructionKeywords.some(keyword => memory.content.includes(keyword))) {
        memoryType = 'core';
        memorySubtype = 'instruction';
        isPinned = 1;
      }
      // 检查内容是否包含偏好关键词
      else if (preferenceKeywords.some(keyword => memory.content.includes(keyword))) {
        memoryType = 'factual';
        memorySubtype = 'preference';
        isPinned = 0;
      }
      // 检查关键词是否包含指令或偏好相关词
      else if (memory.keywords && (
        instructionKeywords.some(keyword => memory.keywords.includes(keyword)) ||
        preferenceKeywords.some(keyword => memory.keywords.includes(keyword))
      )) {
        // 如果包含指令关键词，设为核心记忆
        if (instructionKeywords.some(keyword => memory.keywords.includes(keyword))) {
          memoryType = 'core';
          memorySubtype = 'instruction';
          isPinned = 1;
        }
        // 如果包含偏好关键词，设为事实性记忆
        else {
          memoryType = 'factual';
          memorySubtype = 'preference';
          isPinned = 0;
        }
      }

      // 更新记忆
      updateMemory.run(memoryType, memorySubtype, isPinned, memory.id);
    }

    // 提交事务
    db.exec('COMMIT;');

    console.log(`已更新 ${memories.length} 条记忆`);
    return true;
  } catch (error) {
    // 回滚事务
    db.exec('ROLLBACK;');
    console.error('更新现有记忆失败:', error);
    return false;
  }
}
