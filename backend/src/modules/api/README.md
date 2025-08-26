# API模块

## 概述

API模块负责处理HTTP请求和响应，提供RESTful API接口，是前端与后端服务之间的桥梁。该模块包含控制器和路由定义，用于处理各种API请求。

## 目录结构

```
api/
├── controllers/        # 控制器目录，处理请求逻辑
│   ├── conversation.controller.ts  # 对话控制器
│   ├── memory.controller.ts        # 记忆控制器
│   ├── model.controller.ts         # 模型控制器
│   ├── settings.controller.ts      # 设置控制器
│   └── tools.controller.ts         # 工具控制器
├── routes/             # 路由目录，定义API路径
│   ├── conversation.routes.ts      # 对话路由
│   ├── index.ts                    # 路由索引
│   ├── memory.routes.ts            # 记忆路由
│   ├── model.routes.ts             # 模型路由
│   ├── settings.routes.ts          # 设置路由
│   └── tools.routes.ts             # 工具路由
├── index.ts            # 模块入口文件
└── README.md           # 模块文档
```

## 主要功能

- 提供RESTful API接口
- 处理HTTP请求和响应
- 路由请求到相应的控制器
- 实现API参数验证和错误处理

## 控制器

- **ConversationController**: 处理对话相关的API请求
- **MemoryController**: 处理记忆相关的API请求
- **ModelController**: 处理模型相关的API请求
- **SettingsController**: 处理设置相关的API请求
- **ToolsController**: 处理工具相关的API请求

## 路由

- **/api/conversations**: 对话管理API
- **/api/memories**: 记忆管理API
- **/api/model**: 模型管理API
- **/api/settings**: 设置管理API
- **/api/tools**: 工具管理API

## 使用示例

```typescript
// 在app.ts中注册API路由
import { apiModule } from './modules';

// 注册API路由
app.use('/api/settings', apiModule.settingsRoutes);
app.use('/api/model', apiModule.modelRoutes);
app.use('/api/memories', apiModule.memoryRoutes);
app.use('/api/conversations', apiModule.conversationRoutes);
app.use('/api/tools', apiModule.toolsRoutes);
```
