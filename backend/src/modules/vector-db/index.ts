/**
 * 向量数据库模块入口
 */

import { VectorDbService, vectorDb, initVectorDatabase } from './vector-db.service';

// 导出向量数据库服务实例和类型
export {
  vectorDb,
  VectorDbService,
  initVectorDatabase
};

// 初始化向量数据库模块
export function initVectorDbModule(): void {
  initVectorDatabase();
  console.log('向量数据库模块初始化完成');
}
