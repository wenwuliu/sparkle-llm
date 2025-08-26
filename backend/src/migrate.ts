import { migrateMemoryTypes, updateExistingMemories } from './migrations/add_memory_types';
import { migrateImportanceLevel, updateExistingImportanceLevels } from './migrations/add_importance_level';


// 运行迁移
async function runMigrations() {
  try {
    console.log('开始运行数据库迁移...');
    
    // 迁移记忆表结构
    const structureMigrated = migrateMemoryTypes();
    if (structureMigrated) {
      console.log('记忆表结构迁移成功');
      
      // 更新现有记忆
      const memoriesUpdated = updateExistingMemories();
      if (memoriesUpdated) {
        console.log('现有记忆更新成功');
      } else {
        console.error('现有记忆更新失败');
      }
    } else {
      console.error('记忆表结构迁移失败');
    }
    
    // 迁移重要性级别
    const importanceMigrated = migrateImportanceLevel();
    if (importanceMigrated) {
      console.log('重要性级别迁移成功');
      
      // 更新现有重要性级别
      const importanceUpdated = updateExistingImportanceLevels();
      if (importanceUpdated) {
        console.log('现有重要性级别更新成功');
      } else {
        console.error('现有重要性级别更新失败');
      }
    } else {
      console.error('重要性级别迁移失败');
    }
    

    
    console.log('数据库迁移完成');
  } catch (error) {
    console.error('数据库迁移失败:', error);
  }
}

// 运行迁移
runMigrations();
