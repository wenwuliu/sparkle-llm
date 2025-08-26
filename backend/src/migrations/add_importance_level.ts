import { db } from '../config/database';
import { ImportanceLevel, ImportanceLevelString } from '../modules/memory/memory.types';

// 添加记忆重要性级别字段
export function migrateImportanceLevel(): boolean {
  try {
    // 检查字段是否已存在
    const tableInfo = db.prepare("PRAGMA table_info(memories)").all() as any[];
    const hasImportanceLevel = tableInfo.some(column => column.name === 'importance_level');

    if (!hasImportanceLevel) {
      console.log('开始添加 importance_level 字段...');

      // 添加 importance_level 字段
      db.exec(`
        ALTER TABLE memories ADD COLUMN importance_level TEXT;
      `);

      // 更新现有记录的 importance_level 字段
      // 根据 importance 值设置 importance_level
      db.exec(`
        UPDATE memories SET importance_level =
          CASE
            WHEN importance >= 0.7 THEN '${ImportanceLevelString[ImportanceLevel.IMPORTANT]}'
            WHEN importance >= 0.4 THEN '${ImportanceLevelString[ImportanceLevel.MODERATE]}'
            ELSE '${ImportanceLevelString[ImportanceLevel.UNIMPORTANT]}'
          END
      `);

      console.log('importance_level 字段添加成功');
      return true;
    } else {
      console.log('importance_level 字段已存在，无需迁移');
      return true;
    }
  } catch (error) {
    console.error('添加 importance_level 字段失败:', error);
    return false;
  }
}

// 更新现有记忆的重要性级别
export function updateExistingImportanceLevels(): boolean {
  try {
    // 获取所有没有设置 importance_level 的记忆
    const memories = db.prepare(`
      SELECT id, importance FROM memories
      WHERE importance_level IS NULL
    `).all() as { id: number, importance: number }[];

    if (memories.length === 0) {
      console.log('所有记忆已设置 importance_level，无需更新');
      return true;
    }

    console.log(`开始更新 ${memories.length} 条记忆的重要性级别...`);

    // 使用事务批量更新
    const updateStmt = db.prepare(`
      UPDATE memories SET importance_level = ? WHERE id = ?
    `);

    db.transaction(() => {
      for (const memory of memories) {
        let importanceLevel: string;

        if (memory.importance >= 0.7) {
          importanceLevel = ImportanceLevelString[ImportanceLevel.IMPORTANT];
        } else if (memory.importance >= 0.4) {
          importanceLevel = ImportanceLevelString[ImportanceLevel.MODERATE];
        } else {
          importanceLevel = ImportanceLevelString[ImportanceLevel.UNIMPORTANT];
        }

        updateStmt.run(importanceLevel, memory.id);
      }
    })();

    console.log('记忆重要性级别更新成功');
    return true;
  } catch (error) {
    console.error('更新记忆重要性级别失败:', error);
    return false;
  }
}
