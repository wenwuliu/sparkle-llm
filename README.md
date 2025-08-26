# Sparkle LLM 平台

Sparkle是一个强大、能独立完成任务、具备记忆能力的LLM平台。

## 项目概述

Sparkle平台旨在提供一个全面的大语言模型应用环境，支持插件式工具集成、多模式对话以及长期记忆能力，使AI能够更加智能地完成复杂任务。

## 技术架构

- **前端**：React + Vite + TypeScript + Ant Design + Socket
- **后端**：Node.js + Express 4.18.2 + TypeScript + WebSocket
- **数据库**：SQLite
- **部署**：独立可执行文件
- **大模型集成**：Ollama、通义千问、DeepSeek、硅基流动

## 核心功能

### 1. 模块化架构
- 基于模块化设计，每个功能模块独立封装
- 清晰的接口定义，便于扩展和维护
- 支持多种大语言模型集成

### 2. 插件式工具集成
- 支持大模型调用各种工具的能力
- 模块化工具系统，易于扩展
- 文件操作、系统命令等内置工具

### 3. 对话双模式切换
- **普通模式**：支持大模型调用工具后回答或直接回答
- **任务流模式**：支持大模型将复杂任务通过连续上下文执行，可以调用多个工具并保持任务目标一致

### 4. 长期记忆能力
- 大模型自主判断是否增加记忆词条到记忆库
- 通过RAG技术将长期记忆提供到单次对话中
- 支持大模型在对话中查询任意记忆片段
- 基于艾宾浩斯遗忘曲线管理记忆
- 支持关联记忆功能
- 记忆分类（核心记忆和事实性记忆）
- 记忆重要性评估

### 5. 安全操作机制
- 高风险操作风险评估
- 操作执行前自动创建快照
- 完整的操作审计日志
- 支持从快照恢复

## 开发规范
- 使用Git进行版本控制
- 后端功能开发完成后编写测试用例
- 遵循功能清单计划进行开发

## 项目状态
- 开发中

## 运行项目

### 环境配置说明

本项目支持三种环境配置，通过环境变量`NODE_ENV`来区分：

1. **开发环境 (Development)**
   - 用于本地开发和调试
   - 详细的日志输出
   - 热重载支持
   - 配置文件：`.env.development`
   - 启动命令：`npm run dev`

2. **生产环境 (Production)**
   - 用于部署到生产服务器
   - 优化的性能设置
   - 安全增强
   - 配置文件：`.env.production`
   - 启动命令：`NODE_ENV=production npm run start:prod`

3. **测试环境 (Test)**
   - 用于运行自动化测试
   - 内存数据库
   - 模拟的外部服务
   - 配置文件：`.env.test`
   - 启动命令：`NODE_ENV=test npm test`

### 环境变量配置

各环境的主要配置项：

| 配置项 | 说明 | 默认值(开发环境) | 默认值(生产环境) |
|--------|------|-----------------|-----------------|
| PORT | 后端服务器端口 | 8080 | 3001 |
| HOST | 主机地址 | localhost | 0.0.0.0 |
| DATABASE_PATH | 数据库文件路径 | ./data/database.sqlite | ./data/database.sqlite |
| DEFAULT_MODEL | 默认使用的大模型 | ollama | ollama |
| OLLAMA_ENDPOINT | Ollama API地址 | http://localhost:11434 | http://localhost:11434 |
| VECTOR_DB_ENABLED | 是否启用向量数据库 | true | true |
| LOG_LEVEL | 日志级别 | debug | info |

### 开发环境

1. 克隆仓库
```bash
git clone https://github.com/yourusername/sparkle-llm.git
cd sparkle-llm
```

2. 安装后端依赖
```bash
cd backend
npm install
```

3. 安装前端依赖
```bash
cd ../frontend
npm install
```

4. 启动后端服务
```bash
cd ../backend
npm run dev
```

5. 启动前端服务
```bash
cd ../frontend
npm run dev
```

6. 确保Ollama已安装并运行
```bash
# 安装Ollama (Linux)
curl -fsSL https://ollama.com/install.sh | sh

# 拉取模型
ollama pull llama3
```

7. 访问应用
```
前端: http://localhost:5173
后端API: http://localhost:8080
API文档: http://localhost:8080/api-docs
```

### 生产环境构建

1. 构建前端
```bash
cd frontend
npm run build
```

2. 构建后端
```bash
cd ../backend
npm run build
```

3. 启动生产服务
```bash
cd ../backend
NODE_ENV=production npm run start:prod
```

4. 访问应用
```
http://localhost:3001
```

### 应用分发与部署

我们正在开发新的应用分发与部署方式，将提供以下几种方式：

1. **独立可执行文件**
   - 无需安装Node.js环境
   - 支持Windows、Linux和macOS平台
   - 一键启动，简单易用

2. **桌面应用**
   - 提供图形化界面
   - 支持Windows、Linux和macOS平台
   - 标准安装包体验

3. **系统服务**
   - 作为系统服务运行
   - 支持开机自启动
   - 提供标准的服务管理命令

#### 数据存储

应用数据将存储在以下位置：

- **Windows**: `%APPDATA%\sparkle-llm`
- **Linux**: `~/.sparkle-llm`
- **macOS**: `~/Library/Application Support/sparkle-llm`

包含以下内容：
- `data`：数据库和向量数据库
- `logs`：日志文件
- `snapshots`：快照文件
- `models`：模型缓存
- `config`：配置文件

### 项目目录结构

```
sparkle-llm/
├── .env.development    # 开发环境配置
├── .env.production     # 生产环境配置
├── .env.test           # 测试环境配置
├── backend/            # 后端代码
│   ├── src/            # 源代码
│   │   ├── app.ts      # 应用入口
│   │   ├── index.ts    # 服务器入口
│   │   ├── config/     # 配置文件
│   │   ├── middlewares/# 中间件
│   │   ├── migrations/ # 数据库迁移
│   │   ├── modules/    # 模块化组件
│   │   │   ├── api/            # API模块
│   │   │   ├── audit/          # 审计模块
│   │   │   ├── autonomous-task/# 自主任务模块
│   │   │   ├── conversation/   # 对话模块
│   │   │   ├── memory/         # 记忆模块
│   │   │   ├── model/          # 模型模块
│   │   │   ├── operation/      # 操作模块
│   │   │   ├── settings/       # 设置模块
│   │   │   ├── snapshot/       # 快照模块
│   │   │   ├── socket/         # Socket模块
│   │   │   ├── tools/          # 工具模块
│   │   │   ├── user/           # 用户模块
│   │   │   ├── vector-db/      # 向量数据库模块
│   │   │   └── index.ts        # 模块索引
│   │   ├── types/      # 类型定义
│   │   └── utils/      # 工具函数
│   ├── dist/           # 编译后的代码（不包含在版本控制中）
│   ├── logs/           # 日志文件（不包含在版本控制中）
│   └── .eslintrc.json  # ESLint配置
├── frontend/           # 前端代码
│   ├── src/            # 源代码
│   ├── dist/           # 编译后的代码（不包含在版本控制中）
│   ├── .env.development# 前端开发环境配置
│   └── .env.production # 前端生产环境配置
└── scripts/               # 构建和部署脚本
```

### 开发工具

1. **构建与清理**
```bash
# 清理构建产物（在backend目录下执行）
cd backend
npm run clean

# 构建项目（在backend目录下执行）
npm run build

# 类型检查（在backend或frontend目录下执行）
npm run typecheck
```

2. **代码质量**
```bash
# 运行ESLint检查（在backend或frontend目录下执行）
npm run lint

# 自动修复ESLint问题（在backend或frontend目录下执行）
npm run lint:fix
```



## 许可证
- MIT
