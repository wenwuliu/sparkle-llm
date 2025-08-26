# 对话模块

## 概述

对话模块负责管理用户与AI之间的对话，包括对话创建、消息存储、对话历史查询等功能。该模块是用户与AI交互的核心组件。

## 目录结构

```
conversation/
├── interfaces/                # 接口定义目录
│   └── conversation.interface.ts  # 对话接口定义
├── conversation.service.ts    # 对话服务实现
├── conversation.types.ts      # 对话相关类型定义
├── index.ts                   # 模块入口文件
└── README.md                  # 模块文档
```

## 主要功能

- 创建和管理对话
- 存储对话消息
- 提供对话历史查询
- 支持对话标题生成
- 管理活动对话

## 核心类型

### Conversation

```typescript
interface Conversation {
  id: number;           // 对话ID
  title: string;        // 对话标题
  created_at: number;   // 创建时间
  updated_at: number;   // 更新时间
  messages?: Message[]; // 对话消息
}
```

### Message

```typescript
interface Message {
  id: number;           // 消息ID
  conversation_id: number; // 对话ID
  role: 'user' | 'assistant' | 'system'; // 消息角色
  content: string;      // 消息内容
  timestamp: number;    // 时间戳
  tool_calls?: any[];   // 工具调用（如果有）
  tool_results?: any[]; // 工具结果（如果有）
}
```

## 核心接口

### IConversationService

```typescript
interface IConversationService {
  // 创建新对话
  createConversation(title: string): Promise<Conversation>;
  
  // 获取所有对话
  getAllConversations(): Promise<Conversation[]>;
  
  // 获取对话详情
  getConversationById(id: number): Promise<Conversation>;
  
  // 获取活动对话
  getActiveConversation(): Promise<Conversation>;
  
  // 设置活动对话
  setActiveConversation(id: number): Promise<Conversation>;
  
  // 添加消息到对话
  addMessageToConversation(
    conversationId: number, 
    role: 'user' | 'assistant' | 'system', 
    content: string,
    toolCalls?: any[],
    toolResults?: any[]
  ): Promise<Message>;
  
  // 生成对话标题
  generateConversationTitle(conversationId: number): Promise<string>;
  
  // 删除对话
  deleteConversation(id: number): Promise<boolean>;
}
```

## 使用示例

```typescript
import { conversationService } from '../modules/conversation';

// 创建新对话并添加消息
async function startNewConversation(userMessage: string) {
  try {
    // 创建新对话
    const conversation = await conversationService.createConversation('新对话');
    console.log(`创建了新对话: ${conversation.title} (ID: ${conversation.id})`);
    
    // 设置为活动对话
    await conversationService.setActiveConversation(conversation.id);
    
    // 添加用户消息
    const message = await conversationService.addMessageToConversation(
      conversation.id,
      'user',
      userMessage
    );
    
    // 添加AI回复
    const aiResponse = "我是AI助手，很高兴为您服务！";
    await conversationService.addMessageToConversation(
      conversation.id,
      'assistant',
      aiResponse
    );
    
    // 生成对话标题
    const title = await conversationService.generateConversationTitle(conversation.id);
    console.log(`对话标题已生成: ${title}`);
    
    return conversation;
  } catch (error) {
    console.error('创建对话时出错:', error);
    throw error;
  }
}

// 获取对话历史
async function getConversationHistory(conversationId: number) {
  try {
    const conversation = await conversationService.getConversationById(conversationId);
    return conversation.messages || [];
  } catch (error) {
    console.error('获取对话历史时出错:', error);
    throw error;
  }
}
```
