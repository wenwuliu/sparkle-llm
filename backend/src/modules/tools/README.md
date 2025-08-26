# 工具模块

## 概述

工具模块负责管理和执行各种工具，使AI能够与外部系统交互，执行文件操作、系统命令等任务。该模块提供统一的工具注册、调用和结果处理接口。

## 目录结构

```
tools/
├── interfaces/                # 接口定义目录
│   └── tool.interface.ts      # 工具接口定义
├── builtin/                   # 内置工具目录
│   ├── file-tools.ts          # 文件操作工具
│   ├── system-tools.ts        # 系统操作工具
│   └── ...                    # 其他内置工具
├── tool-manager.service.ts    # 工具管理器服务
├── tool.service.ts            # 工具服务
├── tool.types.ts              # 工具相关类型定义
├── index.ts                   # 模块入口文件
└── README.md                  # 模块文档
```

## 主要功能

- 工具注册和管理
- 工具执行和结果处理
- 工具权限控制
- 内置工具集合
- 支持自定义工具扩展

## 核心类型

### Tool

```typescript
interface Tool {
  name: string;          // 工具名称
  description: string;   // 工具描述
  category: string;      // 工具类别
  input_schema: any;     // 输入模式（JSON Schema）
  requires_auth: boolean; // 是否需要认证
  execute: (input: any) => Promise<any>; // 执行函数
}
```

### ToolCategory

```typescript
enum ToolCategory {
  FILE = 'file',           // 文件操作
  SYSTEM = 'system',       // 系统操作
  NETWORK = 'network',     // 网络操作
  DATABASE = 'database',   // 数据库操作
  UTILITY = 'utility'      // 实用工具
}
```

### ToolResult

```typescript
interface ToolResult {
  success: boolean;      // 是否成功
  data?: any;            // 结果数据
  error?: string;        // 错误信息
  metadata?: any;        // 元数据
}
```

## 核心接口

### IToolService

```typescript
interface IToolService {
  // 初始化工具服务
  initialize(): Promise<void>;
  
  // 注册工具
  registerTool(tool: Tool): boolean;
  
  // 注销工具
  unregisterTool(toolName: string): boolean;
  
  // 获取所有工具
  getAllTools(): Tool[];
  
  // 获取指定工具
  getTool(toolName: string): Tool | null;
  
  // 执行工具
  executeTool(toolName: string, input: any): Promise<ToolResult>;
  
  // 获取工具输入模式
  getToolSchema(toolName: string): any | null;
}
```

## 使用示例

```typescript
import { toolManager } from '../modules/tools';

// 初始化工具服务
async function initializeToolService() {
  try {
    await toolManager.initialize();
    console.log('工具服务初始化成功');
    
    // 获取所有工具
    const tools = toolManager.getAllTools();
    console.log(`已加载 ${tools.length} 个工具`);
    
    // 按类别分组工具
    const toolsByCategory = tools.reduce((acc, tool) => {
      if (!acc[tool.category]) {
        acc[tool.category] = [];
      }
      acc[tool.category].push(tool.name);
      return acc;
    }, {});
    
    console.log('工具类别:', toolsByCategory);
  } catch (error) {
    console.error('初始化工具服务时出错:', error);
    throw error;
  }
}

// 执行文件读取工具
async function readFile(filePath: string) {
  try {
    const result = await toolManager.executeTool('file_read', { path: filePath });
    
    if (result.success) {
      console.log(`文件内容: ${result.data.content}`);
      return result.data.content;
    } else {
      console.error(`读取文件失败: ${result.error}`);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('执行文件读取工具时出错:', error);
    throw error;
  }
}

// 执行系统命令工具
async function executeCommand(command: string) {
  try {
    const result = await toolManager.executeTool('system_exec', { command });
    
    if (result.success) {
      console.log(`命令输出: ${result.data.output}`);
      return result.data.output;
    } else {
      console.error(`执行命令失败: ${result.error}`);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('执行系统命令工具时出错:', error);
    throw error;
  }
}

// 注册自定义工具
function registerCustomTool() {
  try {
    const customTool = {
      name: 'custom_greeting',
      description: '生成自定义问候语',
      category: 'utility',
      input_schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: '要问候的人名'
          },
          language: {
            type: 'string',
            enum: ['en', 'zh', 'ja', 'fr'],
            default: 'en',
            description: '问候语言'
          }
        },
        required: ['name']
      },
      requires_auth: false,
      execute: async (input: { name: string, language?: string }) => {
        const { name, language = 'en' } = input;
        
        const greetings = {
          en: `Hello, ${name}!`,
          zh: `你好，${name}！`,
          ja: `こんにちは、${name}さん！`,
          fr: `Bonjour, ${name}!`
        };
        
        return {
          greeting: greetings[language] || greetings.en
        };
      }
    };
    
    const registered = toolManager.registerTool(customTool);
    
    if (registered) {
      console.log('自定义工具注册成功');
    } else {
      console.error('自定义工具注册失败');
    }
    
    return registered;
  } catch (error) {
    console.error('注册自定义工具时出错:', error);
    throw error;
  }
}
```
