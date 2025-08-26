# 模型模块

## 概述

模型模块负责管理和调用各种大语言模型，提供统一的接口进行模型调用。该模块支持多种模型提供商，包括Ollama和通义千问等，并提供模型配置管理功能。

## 目录结构

```
model/
├── interfaces/                # 接口定义目录
│   ├── model-provider.interface.ts  # 模型提供商接口
│   └── model-service.interface.ts   # 模型服务接口
├── providers/                 # 模型提供商实现
│   ├── ollama.provider.ts     # Ollama模型提供商
│   ├── qwen.provider.ts       # 通义千问模型提供商
│   └── deepseek.provider.ts   # DeepSeek模型提供商
├── prompts/                   # 提示词服务目录
│   ├── base-prompt.service.ts # 基础提示词服务
│   ├── system-prompt.service.ts # 系统提示词服务
│   ├── memory-prompt.service.ts # 记忆提示词服务
│   ├── thinking-prompt.service.ts # 思考提示词服务
│   ├── tool-prompt.service.ts # 工具提示词服务
│   ├── prompt.service.ts      # 主提示词服务
│   └── index.ts               # 提示词服务入口
├── model.service.ts           # 模型服务实现
├── model.config.ts            # 模型配置
├── index.ts                   # 模块入口文件
└── README.md                  # 模块文档
```

## 主要功能

- 统一的模型调用接口
- 支持多种模型提供商
- 模型配置管理
- 提示词管理
- 模型自动下载和缓存

## 核心类型

### ModelConfig

```typescript
interface ModelConfig {
  provider: string;      // 模型提供商
  model: string;         // 模型名称
  temperature?: number;  // 温度参数
  maxTokens?: number;    // 最大生成token数
  apiKey?: string;       // API密钥（如果需要）
  apiUrl?: string;       // API URL（如果需要）
}
```

### ModelProvider

```typescript
interface ModelProvider {
  name: string;          // 提供商名称
  getAvailableModels(): Promise<{ name: string }[]>;  // 获取可用模型
  generateText(prompt: string, options?: any): Promise<string>;  // 生成文本
  generateStream(prompt: string, options?: any): AsyncGenerator<string, void, unknown>;  // 流式生成
}
```

## 核心接口

### IModelService

```typescript
interface IModelService {
  // 初始化模型服务
  initialize(): Promise<void>;

  // 获取可用模型
  getAvailableModels(): Promise<{ name: string }[]>;

  // 获取模型配置
  getModelConfig(): ModelConfig;

  // 更新模型配置
  updateModelConfig(config: Partial<ModelConfig>): boolean;

  // 生成文本
  generateText(prompt: string, options?: any): Promise<string>;

  // 流式生成文本
  generateTextStream(prompt: string, options?: any): AsyncGenerator<string, void, unknown>;

  // 获取当前模型提供商
  getCurrentProvider(): ModelProvider;
}
```

## 使用示例

```typescript
import { modelService, promptService } from '../modules/model';

// 初始化模型服务
async function initializeModelService() {
  try {
    await modelService.initialize();
    console.log('模型服务初始化成功');

    // 获取可用模型
    const models = await modelService.getAvailableModels();
    console.log('可用模型:', models);

    // 获取当前模型配置
    const config = modelService.getModelConfig();
    console.log('当前模型配置:', config);
  } catch (error) {
    console.error('初始化模型服务时出错:', error);
    throw error;
  }
}

// 生成文本
async function generateResponse(userMessage: string) {
  try {
    // 获取系统提示词
    const systemPrompt = promptService.getSystemPrompt();

    // 构建完整提示词
    const fullPrompt = `${systemPrompt}\n\n用户: ${userMessage}\n\n助手:`;

    // 生成回复
    const response = await modelService.generateText(fullPrompt);
    return response;
  } catch (error) {
    console.error('生成回复时出错:', error);
    throw error;
  }
}

// 流式生成文本
async function streamResponse(userMessage: string, onChunk: (chunk: string) => void) {
  try {
    // 获取系统提示词
    const systemPrompt = promptService.getSystemPrompt();

    // 构建完整提示词
    const fullPrompt = `${systemPrompt}\n\n用户: ${userMessage}\n\n助手:`;

    // 流式生成回复
    const stream = modelService.generateTextStream(fullPrompt);

    let fullResponse = '';
    for await (const chunk of stream) {
      fullResponse += chunk;
      onChunk(chunk);
    }

    return fullResponse;
  } catch (error) {
    console.error('流式生成回复时出错:', error);
    throw error;
  }
}
```
