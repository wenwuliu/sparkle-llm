# ReAct Agent 系统

## 概述

ReAct Agent 是一个基于 ReAct（Reasoning + Acting）框架的智能任务执行系统，用于替换原有的任务流功能。新系统提供了更强大的推理能力、更清晰的执行流程和更好的用户体验。

## 核心特性

### 🧠 结构化推理
- **推理引擎**: 基于大模型的智能推理，支持多步骤思考
- **决策制定**: 自动分析任务需求并制定执行策略
- **置信度评估**: 每个决策都有置信度评分，确保执行质量

### 🛠️ 智能行动执行
- **工具调用**: 自动选择合适的工具并准备参数
- **错误处理**: 智能重试机制和错误恢复策略
- **执行监控**: 实时监控工具执行状态和结果

### 👁️ 结果观察分析
- **洞察提取**: 从执行结果中提取关键信息和洞察
- **影响分析**: 评估结果对后续步骤的影响
- **问题识别**: 自动识别执行过程中的问题和风险

### 🔄 执行反思优化
- **过程反思**: 对整个执行过程进行深入反思
- **经验总结**: 提取成功经验和失败教训
- **策略优化**: 基于反思结果优化后续执行策略

## 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ReAct Agent   │    │  Agent Service  │    │  Agent Tools    │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │  Reasoning  │ │    │ │ Session Mgmt│ │    │ │ agent_task  │ │
│ │   Engine    │ │    │ │             │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │   Action    │ │    │ │ Progress    │ │    │ │agent_status │ │
│ │ Executor    │ │    │ │ Tracking    │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Observation  │ │    │ │ Error       │ │    │ │ agent_stop  │ │
│ │   Engine    │ │    │ │ Handling    │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 核心组件

### 1. ReActAgent
主要的Agent类，负责协调整个执行过程：
- 任务分析和规划
- ReAct循环执行
- 状态管理和进度跟踪
- 结果生成和总结

### 2. ReasoningEngine
推理引擎，负责智能推理和决策：
- 结构化思考过程
- 决策制定和评估
- 置信度计算
- 备选方案生成

### 3. ActionExecutor
行动执行器，负责工具调用和行动执行：
- 工具选择和参数准备
- 执行计划生成
- 工具调用执行
- 错误处理和重试

### 4. ObservationEngine
观察引擎，负责结果分析和洞察提取：
- 执行结果分析
- 关键信息提取
- 影响评估
- 问题识别

### 5. AgentService
Agent服务，提供会话管理和服务接口：
- 会话生命周期管理
- 进度事件处理
- 错误处理和恢复
- 结果保存和查询

## 使用方式

### 1. 通过工具调用
```typescript
// 启动Agent任务
const result = await toolManager.executeTool('agent_task', {
  task: '分析系统性能',
  goal: '生成性能优化建议',
  enable_reflection: true,
  max_steps: 10,
  confidence_threshold: 0.7
});
```

### 2. 通过服务接口
```typescript
// 启动Agent任务
const sessionId = await agentService.startAgentTask(
  '分析系统性能',
  '生成性能优化建议',
  conversationId,
  {
    onProgress: (event) => {
      console.log('进度:', event.message);
    },
    onComplete: (result) => {
      console.log('完成:', result.summary);
    }
  }
);
```

### 3. 直接使用Agent
```typescript
// 创建Agent实例
const agent = new ReActAgent({
  maxSteps: 10,
  enableReflection: true,
  confidenceThreshold: 0.7
});

// 执行任务
const result = await agent.executeTask(
  '分析系统性能',
  '生成性能优化建议',
  context,
  {
    onProgress: (event) => console.log(event.message),
    onError: (error) => console.error(error.message)
  }
);
```

## 配置选项

### AgentConfig
```typescript
interface AgentConfig {
  maxSteps: number;              // 最大执行步骤数
  maxRetries: number;            // 最大重试次数
  timeout: number;               // 超时时间（毫秒）
  enableReflection: boolean;     // 是否启用反思
  enableMemory: boolean;         // 是否启用记忆
  enableProgressTracking: boolean; // 是否启用进度跟踪
  reasoningModel: string;        // 推理模型
  actionModel: string;           // 行动模型
  reflectionModel: string;       // 反思模型
  confidenceThreshold: number;   // 置信度阈值
}
```

## 事件系统

### 进度事件
- `step_start`: 步骤开始
- `step_complete`: 步骤完成
- `step_error`: 步骤错误
- `progress_update`: 进度更新
- `status_change`: 状态变化

### 错误事件
- `tool_error`: 工具调用错误
- `reasoning_error`: 推理错误
- `planning_error`: 规划错误
- `execution_error`: 执行错误
- `validation_error`: 验证错误

## 与旧系统的对比

| 特性 | 旧任务流 | 新Agent系统 |
|------|----------|-------------|
| 架构 | 简单的循环执行 | ReAct框架 |
| 推理 | 基础提示词 | 结构化推理引擎 |
| 错误处理 | 简单重试 | 智能错误恢复 |
| 进度跟踪 | 基础状态 | 详细进度事件 |
| 反思能力 | 无 | 内置反思机制 |
| 可扩展性 | 有限 | 高度可扩展 |
| 用户体验 | 一般 | 优秀 |

## 迁移指南

### 从任务流迁移到Agent

1. **替换工具调用**
   ```typescript
   // 旧方式
   await toolManager.executeTool('task_flow', { task, goal });
   
   // 新方式
   await toolManager.executeTool('agent_task', { task, goal });
   ```

2. **更新事件监听**
   ```typescript
   // 旧事件
   socket.on('task_flow:start', handler);
   socket.on('task_flow:status', handler);
   
   // 新事件
   socket.on('agent:start', handler);
   socket.on('agent:progress', handler);
   ```

3. **更新状态管理**
   ```typescript
   // 旧状态
   const taskFlowSession = global.taskFlowHandler.taskFlowSession;
   
   // 新状态
   const agentSession = agentService.getSession(sessionId);
   ```

## 测试

运行Agent系统测试：
```bash
cd backend/src/modules/agent
npx ts-node test-agent.ts
```

## 注意事项

1. **性能考虑**: Agent系统比旧任务流更复杂，需要更多计算资源
2. **模型依赖**: 需要确保推理、行动、反思模型都可用
3. **错误处理**: 新系统有更完善的错误处理，但仍需要监控
4. **配置调优**: 根据实际使用情况调整配置参数

## 未来计划

- [ ] 支持并行执行多个Agent
- [ ] 添加Agent间通信机制
- [ ] 实现Agent知识库
- [ ] 支持自定义推理策略
- [ ] 添加可视化调试界面
