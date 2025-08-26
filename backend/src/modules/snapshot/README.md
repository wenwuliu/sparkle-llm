# 快照模块

## 概述

快照模块负责在执行高风险操作前创建系统状态快照，支持在操作失败或产生意外结果时进行回滚。该模块提高了系统的安全性和可恢复性。

## 目录结构

```
snapshot/
├── interfaces/                # 接口定义目录
│   └── snapshot.interface.ts  # 快照接口定义
├── snapshot.service.ts        # 快照服务实现
├── snapshot.types.ts          # 快照相关类型定义
├── index.ts                   # 模块入口文件
└── README.md                  # 模块文档
```

## 主要功能

- 创建文件和目录快照
- 存储快照元数据和数据
- 从快照恢复
- 管理快照生命周期
- 清理过期快照

## 核心类型

### Snapshot

```typescript
interface Snapshot {
  id: string;           // 快照ID
  operationId: string;  // 操作ID
  timestamp: number;    // 创建时间
  data: any;            // 快照数据
  expiresAt: number;    // 过期时间
}
```

## 核心接口

### ISnapshotService

```typescript
interface ISnapshotService {
  // 创建操作快照
  createSnapshot(operation: Operation): Promise<Snapshot>;
  
  // 获取快照
  getSnapshot(snapshotId: string): Promise<Snapshot | null>;
  
  // 从快照恢复
  restoreFromSnapshot(snapshotId: string): Promise<boolean>;
  
  // 清理过期快照
  cleanupExpiredSnapshots(): Promise<number>;
}
```

## 使用示例

```typescript
import { snapshotService } from '../modules/snapshot';
import { Operation } from '../modules/operation';

// 创建快照并在需要时恢复
async function safelyExecuteOperation(operation: Operation, executeFunc: () => Promise<any>) {
  try {
    // 创建快照
    console.log(`为操作 ${operation.id} 创建快照...`);
    const snapshot = await snapshotService.createSnapshot(operation);
    console.log(`快照创建成功: ${snapshot.id}`);
    
    try {
      // 执行操作
      const result = await executeFunc();
      console.log('操作执行成功');
      return result;
    } catch (operationError) {
      // 操作失败，从快照恢复
      console.error('操作执行失败，正在从快照恢复:', operationError);
      
      const restored = await snapshotService.restoreFromSnapshot(snapshot.id);
      
      if (restored) {
        console.log('从快照恢复成功');
      } else {
        console.error('从快照恢复失败');
      }
      
      throw operationError;
    }
  } catch (error) {
    console.error('快照操作失败:', error);
    throw error;
  }
}

// 清理过期快照
async function cleanupSnapshots() {
  try {
    const count = await snapshotService.cleanupExpiredSnapshots();
    console.log(`清理了 ${count} 个过期快照`);
    return count;
  } catch (error) {
    console.error('清理过期快照时出错:', error);
    throw error;
  }
}
```
