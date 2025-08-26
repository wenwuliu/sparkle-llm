import { app } from './app';
import { initDatabase } from './config/database';
import { migrateMemoryTypes, updateExistingMemories } from './migrations/add_memory_types';
import { migrateImportanceLevel, updateExistingImportanceLevels } from './migrations/add_importance_level';
import logger from './utils/logger';
import environment from './config/environment';

/**
 * 应用入口文件
 * 负责初始化应用并启动服务器
 */
async function bootstrap() {
  try {
    logger.info(`正在启动应用，环境: ${environment.env}`);

    // 初始化数据库
    initDatabase();
    logger.info('数据库初始化成功');

    // 运行数据库迁移
    logger.info('开始运行数据库迁移...');

    // 迁移记忆类型
    const structureMigrated = migrateMemoryTypes();
    if (structureMigrated) {
      logger.info('记忆表结构迁移成功');
      const memoriesUpdated = updateExistingMemories();
      if (memoriesUpdated) {
        logger.info('现有记忆类型更新成功');
      } else {
        logger.error('现有记忆类型更新失败');
      }
    } else {
      logger.error('记忆表结构迁移失败');
    }

    // 迁移记忆重要性级别
    const importanceLevelMigrated = migrateImportanceLevel();
    if (importanceLevelMigrated) {
      logger.info('记忆重要性级别字段添加成功');
      const importanceLevelsUpdated = updateExistingImportanceLevels();
      if (importanceLevelsUpdated) {
        logger.info('现有记忆重要性级别更新成功');
      } else {
        logger.error('现有记忆重要性级别更新失败');
      }
    } else {
      logger.error('记忆重要性级别字段添加失败');
    }

    // 初始化应用服务
    await app.initialize();

    // 启动服务器
    app.start();
  } catch (error) {
    logger.error('应用初始化失败:', error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  // 在生产环境中，我们可能希望优雅地关闭服务器
  if (environment.isProduction) {
    logger.error('发生致命错误，正在关闭服务器...');
    app.server.close(() => {
      process.exit(1);
    });
    // 如果服务器在一定时间内没有关闭，强制退出
    setTimeout(() => {
      process.exit(1);
    }, 10000);
  }
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason) => {
  logger.error('未处理的Promise拒绝:', reason);
});

// 启动应用
bootstrap();

export { app };
