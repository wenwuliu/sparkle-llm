# 用户模块

## 概述

用户模块负责管理用户偏好和决策历史，记录用户对不同操作的决策模式，并根据历史数据预测用户偏好，提供个性化的操作建议。

## 目录结构

```
user/
├── interfaces/                # 接口定义目录
│   └── user.interface.ts      # 用户接口定义
├── user-preference.service.ts # 用户偏好服务
├── index.ts                   # 模块入口文件
└── README.md                  # 模块文档
```

## 主要功能

- 记录用户决策历史
- 分析用户决策模式
- 预测用户偏好
- 根据用户偏好调整操作建议
- 提供个性化的用户体验

## 核心接口

### IUserPreferenceService

```typescript
interface IUserPreferenceService {
  // 记录用户决策
  recordDecision(
    userId: string,
    operation: Operation,
    decision: 'confirm' | 'cancel'
  ): Promise<void>;
  
  // 预测用户偏好
  predictPreference(
    userId: string,
    operationType: string,
    riskLevel: string
  ): Promise<number>;
  
  // 根据用户偏好调整操作建议
  adjustOperationProposal(
    userId: string,
    operation: Operation
  ): Promise<Operation>;
}
```

## 使用示例

```typescript
import { userPreferenceService } from '../modules/user';
import { Operation } from '../modules/operation';

// 记录用户决策
async function recordUserDecision(
  userId: string,
  operation: Operation,
  decision: 'confirm' | 'cancel'
) {
  try {
    await userPreferenceService.recordDecision(userId, operation, decision);
    console.log(`用户决策已记录: ${decision}`);
  } catch (error) {
    console.error('记录用户决策时出错:', error);
    throw error;
  }
}

// 预测用户偏好
async function predictUserPreference(
  userId: string,
  operationType: string,
  riskLevel: string
) {
  try {
    const preference = await userPreferenceService.predictPreference(
      userId,
      operationType,
      riskLevel
    );
    
    console.log(`用户偏好预测: ${preference.toFixed(2)}`);
    
    // 解释预测结果
    if (preference > 0.8) {
      console.log('用户很可能会确认此操作');
    } else if (preference > 0.5) {
      console.log('用户可能会确认此操作');
    } else if (preference > 0.3) {
      console.log('用户可能会拒绝此操作');
    } else {
      console.log('用户很可能会拒绝此操作');
    }
    
    return preference;
  } catch (error) {
    console.error('预测用户偏好时出错:', error);
    throw error;
  }
}

// 调整操作建议
async function getAdjustedOperationProposal(userId: string, operation: Operation) {
  try {
    const adjustedOperation = await userPreferenceService.adjustOperationProposal(
      userId,
      operation
    );
    
    console.log('操作建议已根据用户偏好调整');
    
    return adjustedOperation;
  } catch (error) {
    console.error('调整操作建议时出错:', error);
    throw error;
  }
}
```
