# 审计模块

## 概述

审计模块负责记录系统中的重要操作和事件，提供操作日志记录和查询功能，用于系统监控、安全审计和问题排查。

## 目录结构

```
audit/
├── interfaces/         # 接口定义目录
│   └── audit.interface.ts  # 审计服务接口定义
├── audit.service.ts    # 审计服务实现
├── audit.types.ts      # 审计相关类型定义
├── index.ts            # 模块入口文件
└── README.md           # 模块文档
```

## 主要功能

- 记录系统操作日志
- 提供操作日志查询功能
- 支持按用户、操作类型、风险级别等条件过滤日志
- 与操作模块集成，记录高风险操作的执行情况

## 核心类型

### AuditLog

```typescript
interface AuditLog {
  id: string;            // 日志ID
  userId: string;        // 用户ID
  operationId: string;   // 操作ID
  operationType: string; // 操作类型
  riskLevel: string;     // 风险级别
  success: boolean;      // 是否成功
  error?: string;        // 错误信息（如果有）
  snapshotId?: string;   // 快照ID（如果有）
  timestamp: number;     // 时间戳
  details: string;       // 详细信息（JSON字符串）
}
```

## 核心接口

### IAuditService

```typescript
interface IAuditService {
  // 记录操作审计日志
  logOperation(
    userId: string,
    operation: Operation,
    result: OperationResult,
    snapshotId?: string
  ): Promise<void>;

  // 查询审计日志
  queryAuditLogs(filters: {
    userId?: string;
    operationType?: string;
    riskLevel?: string;
    success?: boolean;
    startTime?: number;
    endTime?: number;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]>;

  // 获取单个审计日志
  getAuditLog(logId: string): Promise<AuditLog | null>;
}
```

## 使用示例

```typescript
import { auditService } from '../modules/audit';
import { Operation, OperationResult } from '../modules/operation';

// 记录操作日志
async function executeAndLogOperation(userId: string, operation: Operation): Promise<OperationResult> {
  try {
    // 执行操作
    const result: OperationResult = {
      success: true,
      operation,
      result: { data: 'some result' },
      timestamp: Date.now()
    };
    
    // 记录审计日志
    await auditService.logOperation(userId, operation, result);
    
    return result;
  } catch (error) {
    // 记录失败的操作
    const failedResult: OperationResult = {
      success: false,
      operation,
      error: error.message,
      timestamp: Date.now()
    };
    
    await auditService.logOperation(userId, operation, failedResult);
    
    return failedResult;
  }
}

// 查询审计日志
async function getUserOperationLogs(userId: string, limit: number = 10): Promise<AuditLog[]> {
  return await auditService.queryAuditLogs({
    userId,
    limit,
    startTime: Date.now() - 7 * 24 * 60 * 60 * 1000 // 过去7天
  });
}
```
