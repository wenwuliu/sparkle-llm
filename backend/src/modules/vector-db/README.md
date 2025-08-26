# 向量数据库模块

## 概述

向量数据库模块负责管理文本嵌入和语义搜索功能，将文本转换为向量表示，并支持基于语义相似度的搜索。该模块是记忆语义搜索的核心组件。

## 目录结构

```
vector-db/
├── interfaces/                # 接口定义目录
│   └── vector-db.interface.ts # 向量数据库接口定义
├── vector-db.service.ts       # 向量数据库服务实现
├── embedding.service.ts       # 嵌入服务实现
├── index.ts                   # 模块入口文件
└── README.md                  # 模块文档
```

## 主要功能

- 文本嵌入生成
- 向量存储和索引
- 语义相似度搜索
- 记忆向量化
- 支持多种嵌入模型

## 核心接口

### IVectorDbService

```typescript
interface IVectorDbService {
  // 初始化向量数据库
  initialize(): Promise<void>;
  
  // 创建文本嵌入
  createEmbedding(text: string): Promise<number[]>;
  
  // 添加向量
  addVector(id: string, vector: number[], metadata?: any): Promise<void>;
  
  // 更新向量
  updateVector(id: string, vector: number[], metadata?: any): Promise<void>;
  
  // 删除向量
  deleteVector(id: string): Promise<void>;
  
  // 语义搜索
  semanticSearch(query: string, limit?: number): Promise<Array<{ id: string, score: number, metadata?: any }>>;
  
  // 向量相似度搜索
  similaritySearch(vector: number[], limit?: number): Promise<Array<{ id: string, score: number, metadata?: any }>>;
  
  // 语义搜索记忆
  semanticSearchMemories(query: string, limit?: number): Promise<any[]>;
}
```

## 使用示例

```typescript
import { vectorDbService } from '../modules/vector-db';

// 初始化向量数据库
async function initializeVectorDb() {
  try {
    await vectorDbService.initialize();
    console.log('向量数据库初始化成功');
  } catch (error) {
    console.error('初始化向量数据库时出错:', error);
    throw error;
  }
}

// 创建文本嵌入并存储
async function embedAndStoreText(id: string, text: string, metadata?: any) {
  try {
    // 创建文本嵌入
    const vector = await vectorDbService.createEmbedding(text);
    console.log(`已为文本创建 ${vector.length} 维向量`);
    
    // 存储向量
    await vectorDbService.addVector(id, vector, metadata);
    console.log(`向量已存储，ID: ${id}`);
  } catch (error) {
    console.error('嵌入和存储文本时出错:', error);
    throw error;
  }
}

// 语义搜索
async function semanticSearch(query: string, limit: number = 5) {
  try {
    const results = await vectorDbService.semanticSearch(query, limit);
    
    console.log(`找到 ${results.length} 个相关结果:`);
    results.forEach((result, index) => {
      console.log(`${index + 1}. ID: ${result.id}, 相似度: ${result.score.toFixed(4)}`);
      if (result.metadata) {
        console.log(`   元数据: ${JSON.stringify(result.metadata)}`);
      }
    });
    
    return results;
  } catch (error) {
    console.error('语义搜索时出错:', error);
    throw error;
  }
}

// 语义搜索记忆
async function searchMemories(query: string, limit: number = 5) {
  try {
    const memories = await vectorDbService.semanticSearchMemories(query, limit);
    
    console.log(`找到 ${memories.length} 个相关记忆:`);
    memories.forEach((memory, index) => {
      console.log(`${index + 1}. ID: ${memory.id}, 内容: ${memory.content.substring(0, 50)}...`);
    });
    
    return memories;
  } catch (error) {
    console.error('搜索记忆时出错:', error);
    throw error;
  }
}
```
