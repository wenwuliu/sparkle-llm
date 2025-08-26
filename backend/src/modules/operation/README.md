# 操作模块

## 概述

操作模块负责管理和执行系统操作，特别是高风险操作，提供风险评估、操作确认和审计日志记录功能。该模块确保系统操作的安全性和可追溯性。

## 目录结构

```
operation/
├── interfaces/                # 接口定义目录
│   └── operation.interface.ts # 操作接口定义
├── operation.service.ts       # 操作服务实现
├── operation-executor.service.ts  # 操作执行器服务
├── operation.types.ts         # 操作相关类型定义
├── index.ts                   # 模块入口文件
└── README.md                  # 模块文档
```

## 主要功能

- 操作定义和创建
- 风险评估
- 操作执行
- 与审计模块集成，记录操作日志
- 与快照模块集成，支持高风险操作的回滚

## 核心类型

### OperationType

```typescript
type OperationType = 
  | 'deleteFile' 
  | 'deleteDirectory' 
  | 'modifyFile' 
  | 'modifyConfig' 
  | 'executeScript'
  | 'installSoftware'
  | 'uninstallSoftware'
  | 'createFile'
  | 'createDirectory'
  | 'moveFile'
  | 'renameFile'
  | 'readFile'
  | 'listFiles'
  | 'getSystemInfo';
```

### RiskLevel

```typescript
type RiskLevel = 'low' | 'medium' | 'high';
```

### Operation

```typescript
interface Operation {
  id: string;                  // 操作ID
  type: OperationType;         // 操作类型
  description: string;         // 操作描述
  riskLevel: RiskLevel;        // 风险等级
  details: string[];           // 操作详情
  command: string;             // 命令
  args: any[];                 // 参数
  requiresConfirmation: boolean; // 是否需要确认
  userId: string;              // 用户ID
  timestamp: number;           // 时间戳
}
```

### OperationResult

```typescript
interface OperationResult {
  success: boolean;            // 是否成功
  operation: Operation;        // 操作对象
  result?: any;                // 操作结果
  error?: string;              // 错误信息（如果有）
  timestamp: number;           // 时间戳
}
```

## 核心接口

### IOperationService

```typescript
interface IOperationService {
  // 创建操作
  createOperation(
    type: OperationType,
    description: string,
    details: string[],
    command: string,
    args: any[],
    userId: string
  ): Operation;
  
  // 评估操作风险
  assessRisk(operation: Operation): Operation;
}
```

### IOperationExecutor

```typescript
interface IOperationExecutor {
  // 执行操作
  executeOperation(operation: Operation): Promise<OperationResult>;
}
```

## 使用示例

```typescript
import { operationService, operationExecutor } from '../modules/operation';
import { OperationType } from '../modules/operation';

// 创建并执行文件操作
async function createAndExecuteFileOperation(
  type: OperationType,
  filePath: string,
  userId: string,
  description: string
) {
  try {
    // 创建操作
    const operation = operationService.createOperation(
      type,
      description,
      [`文件路径: ${filePath}`],
      type, // 命令与操作类型相同
      [filePath],
      userId
    );
    
    // 评估风险
    const assessedOperation = operationService.assessRisk(operation);
    
    // 如果需要确认且风险等级为高，可以在这里添加确认逻辑
    if (assessedOperation.requiresConfirmation && assessedOperation.riskLevel === 'high') {
      console.log('高风险操作，需要用户确认');
      // 在实际应用中，这里应该等待用户确认
    }
    
    // 执行操作
    const result = await operationExecutor.executeOperation(assessedOperation);
    
    if (result.success) {
      console.log(`操作执行成功: ${assessedOperation.description}`);
    } else {
      console.error(`操作执行失败: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error('执行操作时出错:', error);
    throw error;
  }
}

// 示例：删除文件
async function deleteFile(filePath: string, userId: string) {
  return await createAndExecuteFileOperation(
    'deleteFile',
    filePath,
    userId,
    `删除文件: ${filePath}`
  );
}

// 示例：创建文件
async function createFile(filePath: string, content: string, userId: string) {
  try {
    const operation = operationService.createOperation(
      'createFile',
      `创建文件: ${filePath}`,
      [`文件路径: ${filePath}`, `文件大小: ${content.length} 字节`],
      'createFile',
      [filePath, content],
      userId
    );
    
    const assessedOperation = operationService.assessRisk(operation);
    const result = await operationExecutor.executeOperation(assessedOperation);
    
    return result;
  } catch (error) {
    console.error('创建文件时出错:', error);
    throw error;
  }
}
```
