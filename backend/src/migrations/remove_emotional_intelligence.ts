/**
 * 移除情感智能系统数据库迁移
 */

import { db } from '../config/database';
import fs from 'fs';
import path from 'path';

export async function removeEmotionalIntelligenceTables(): Promise<void> {
  try {
    console.log('开始移除情感智能系统数据库表...');

    // 读取SQL文件
    const sqlPath = path.join(__dirname, 'remove_emotional_intelligence.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // 分割SQL语句并执行
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      try {
        db.exec(statement);
        console.log(`执行成功: ${statement.substring(0, 50)}...`);
      } catch (error) {
        console.warn(`执行警告 (可能表不存在): ${statement.substring(0, 50)}...`, error);
      }
    }

    console.log('情感智能系统数据库表移除完成');
  } catch (error) {
    console.error('移除情感智能系统数据库表失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，执行迁移
if (require.main === module) {
  removeEmotionalIntelligenceTables()
    .then(() => {
      console.log('迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移失败:', error);
      process.exit(1);
    });
}
