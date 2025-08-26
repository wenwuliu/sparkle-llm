/**
 * 向量数据库服务
 */

import fs from 'fs';
import path from 'path';
// 使用动态导入替代静态导入
// import { pipeline } from '@xenova/transformers';
import HNSWLib from 'hnswlib-node';
import { db } from '../../config/database';
import dotenv from 'dotenv';
import config from '../../config/environment';

// 加载环境变量
dotenv.config();

// 设置代理和缓存路径
const cacheDir = process.env.TRANSFORMERS_CACHE || './models';
// 确保缓存目录存在
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
  console.log(`创建模型缓存目录: ${cacheDir}`);
}

console.log(`使用模型缓存目录: ${cacheDir}`);
console.log(`HTTP代理: ${process.env.HTTP_PROXY || '未设置'}`);
console.log(`HTTPS代理: ${process.env.HTTPS_PROXY || '未设置'}`);

// 向量数据库路径
const VECTOR_DB_PATH = config.vectorDb.path || './data/vector_db';
// 向量维度
const VECTOR_DIMENSION = 384; // 使用all-MiniLM-L6-v2模型，维度为384
// 最大元素数量
const MAX_ELEMENTS = 10000;

// 确保向量数据库目录存在
const vectorDbDir = path.dirname(VECTOR_DB_PATH);
if (!fs.existsSync(vectorDbDir)) {
  fs.mkdirSync(vectorDbDir, { recursive: true });
}

/**
 * 向量数据库服务类
 */
export class VectorDbService {
  private index: HNSWLib.HierarchicalNSW;
  private embedder: any;
  private initialized: boolean = false;
  private initPromise: Promise<void>;

  /**
   * 构造函数
   */
  constructor() {
    // 创建索引
    this.index = new HNSWLib.HierarchicalNSW('cosine', VECTOR_DIMENSION);

    // 初始化
    this.initPromise = this.init();
  }

  /**
   * 初始化向量数据库
   * @private
   */
  private async init(): Promise<void> {
    try {
      // 尝试加载现有索引
      if (fs.existsSync(`${VECTOR_DB_PATH}.bin`)) {
        this.index.readIndex(`${VECTOR_DB_PATH}.bin`);
        console.log('向量数据库索引加载成功');
      } else {
        // 创建新索引
        this.index.initIndex(MAX_ELEMENTS);
        console.log('向量数据库索引初始化成功');
      }

      // 动态导入并加载嵌入模型
      try {
        console.log('正在加载transformers模型...');
        const transformers = await import('@xenova/transformers');

        // 设置更长的超时时间
        const timeout = parseInt(process.env.TRANSFORMERS_REQUEST_TIMEOUT || '60000');
        const retryCount = parseInt(process.env.TRANSFORMERS_RETRY_COUNT || '3');

        console.log(`模型加载配置: 超时=${timeout}ms, 重试次数=${retryCount}`);

        this.embedder = await transformers.pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2',
          {
            cache_dir: process.env.TRANSFORMERS_CACHE,
            progress_callback: (progress: any) => {
              if (progress.status) {
                console.log(`模型加载进度: ${progress.status} ${progress.file || ''} ${Math.round(progress.progress * 100)}%`);
              }
            },
            config: {
              request: {
                timeout: timeout,
                retry_count: retryCount
              }
            }
          }
        );

        console.log('transformers模型加载成功');
        this.initialized = true;
      } catch (importError) {
        console.error('导入transformers模块失败:', importError);
        console.log('向量数据库将使用模拟模式运行');
        this.initialized = true;
      }
    } catch (error) {
      console.error('向量数据库初始化失败:', error);
      console.log('向量数据库将使用模拟模式运行');
      this.initialized = true;
    }
  }

  /**
   * 等待初始化完成
   */
  async waitForInit(): Promise<void> {
    return this.initPromise;
  }

  /**
   * 生成文本嵌入
   * @param text 文本内容
   * @returns 嵌入向量
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.initialized) {
      await this.waitForInit();
    }

    try {
      // 如果embedder存在，使用它生成嵌入
      if (this.embedder) {
        const output = await this.embedder(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
      } else {
        // 否则返回模拟的嵌入向量
        console.log('使用模拟嵌入向量');
        return Array.from({ length: VECTOR_DIMENSION }, () => Math.random());
      }
    } catch (error) {
      console.error('生成嵌入失败:', error);
      // 出错时返回模拟的嵌入向量
      console.log('出错，使用模拟嵌入向量');
      return Array.from({ length: VECTOR_DIMENSION }, () => Math.random());
    }
  }

  /**
   * 添加记忆到向量数据库
   * @param memoryId 记忆ID
   * @param content 记忆内容
   */
  async addMemory(memoryId: number, content: string): Promise<void> {
    if (!this.initialized) {
      await this.waitForInit();
    }

    try {
      const embedding = await this.generateEmbedding(content);
      this.index.addPoint(embedding, memoryId);

      // 保存索引
      this.index.writeIndex(`${VECTOR_DB_PATH}.bin`);

      console.log(`添加记忆到向量数据库: ID=${memoryId}`);
    } catch (error) {
      console.error('添加记忆到向量数据库失败:', error);
      throw error;
    }
  }

  /**
   * 搜索相似记忆
   * @param query 查询内容
   * @param k 返回结果数量
   * @returns 相似记忆ID和分数
   */
  async searchSimilarMemories(query: string, k: number = 5): Promise<{ id: number; score: number }[]> {
    if (!this.initialized) {
      await this.waitForInit();
    }

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const result = this.index.searchKnn(queryEmbedding, k);

      // 转换结果格式
      const ids: number[] = Array.isArray(result.neighbors) ? result.neighbors : Array.from(result.neighbors);
      const distances: number[] = Array.isArray(result.distances) ? result.distances : Array.from(result.distances);

      return ids.map((id, i) => ({
        id,
        score: 1 - distances[i], // 转换距离为相似度分数
      }));
    } catch (error) {
      console.error('搜索相似记忆失败:', error);
      return [];
    }
  }

  /**
   * 更新记忆
   * @param memoryId 记忆ID
   * @param content 记忆内容
   */
  async updateMemory(memoryId: number, content: string): Promise<void> {
    if (!this.initialized) {
      await this.waitForInit();
    }

    try {
      // 先标记为已删除
      this.index.markDelete(memoryId);

      // 生成新的嵌入并添加
      const embedding = await this.generateEmbedding(content);
      this.index.addPoint(embedding, memoryId);

      // 保存索引
      this.index.writeIndex(`${VECTOR_DB_PATH}.bin`);

      console.log(`更新记忆向量: ID=${memoryId}`);
    } catch (error) {
      console.error('更新记忆向量失败:', error);
      throw error;
    }
  }

  /**
   * 删除记忆
   * @param memoryId 记忆ID
   */
  async deleteMemory(memoryId: number): Promise<void> {
    if (!this.initialized) {
      await this.waitForInit();
    }

    try {
      // 标记为已删除（HNSW不支持直接删除，只能标记）
      this.index.markDelete(memoryId);

      // 保存索引
      this.index.writeIndex(`${VECTOR_DB_PATH}.bin`);

      console.log(`删除记忆: ID=${memoryId}`);
    } catch (error) {
      console.error('删除记忆失败:', error);
      throw error;
    }
  }

  /**
   * 初始化向量数据库
   */
  async initialize(): Promise<void> {
    return this.waitForInit();
  }

  /**
   * 语义搜索记忆
   * @param query 查询内容
   * @param limit 结果数量限制
   * @returns 相似记忆列表
   */
  async semanticSearchMemories(query: string, limit: number = 5): Promise<any[]> {
    try {
      // 搜索相似记忆
      const similarMemories = await this.searchSimilarMemories(query, limit);

      // 获取记忆详情
      const memories = [];
      for (const { id, score } of similarMemories) {
        const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(id);
        if (memory) {
          memories.push({
            ...(memory as object),
            similarity_score: score,
          });
        }
      }

      return memories;
    } catch (error) {
      console.error('语义搜索记忆失败:', error);
      return [];
    }
  }

  /**
   * 重建索引
   */
  async rebuildIndex(): Promise<void> {
    if (!this.initialized) {
      await this.waitForInit();
    }

    try {
      // 创建新索引
      this.index = new HNSWLib.HierarchicalNSW('cosine', VECTOR_DIMENSION);
      this.index.initIndex(MAX_ELEMENTS);

      // 获取所有记忆
      const memories = db.prepare('SELECT id, content FROM memories').all() as { id: number, content: string }[];

      // 添加到索引
      for (const memory of memories) {
        const embedding = await this.generateEmbedding(memory.content);
        this.index.addPoint(embedding, memory.id);
      }

      // 保存索引
      this.index.writeIndex(`${VECTOR_DB_PATH}.bin`);

      console.log(`向量数据库重建成功，共处理${memories.length}条记忆`);
    } catch (error) {
      console.error('重建索引失败:', error);
      throw error;
    }
  }
}



// 创建单例
export const vectorDb = new VectorDbService();

/**
 * 初始化向量数据库
 */
export async function initVectorDatabase(): Promise<void> {
  try {
    await vectorDb.waitForInit();
    console.log('向量数据库初始化完成');
  } catch (error) {
    console.error('向量数据库初始化失败:', error);
  }
}
