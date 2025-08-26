# 设置模块

## 概述

设置模块负责管理系统配置和用户设置，提供统一的设置存储、读取和更新接口。该模块确保设置在应用重启后仍然保持，并支持不同类型的设置值。

## 目录结构

```
settings/
├── interfaces/                # 接口定义目录
│   └── settings.interface.ts  # 设置接口定义
├── settings.service.ts        # 设置服务实现
├── settings.types.ts          # 设置相关类型定义
├── index.ts                   # 模块入口文件
└── README.md                  # 模块文档
```

## 主要功能

- 设置存储和检索
- 设置默认值管理
- 设置更新和验证
- 支持不同类型的设置值（字符串、数字、布尔值、JSON对象）

## 核心类型

### Setting

```typescript
interface Setting {
  key: string;           // 设置键
  value: string;         // 设置值（JSON字符串）
  updated_at: number;    // 更新时间
}
```

### SettingCategory

```typescript
enum SettingCategory {
  GENERAL = 'general',       // 通用设置
  MODEL = 'model',           // 模型设置
  MEMORY = 'memory',         // 记忆设置
  TOOLS = 'tools',           // 工具设置
  APPEARANCE = 'appearance', // 外观设置
  ADVANCED = 'advanced'      // 高级设置
}
```

## 核心接口

### ISettingsService

```typescript
interface ISettingsService {
  // 获取设置值
  getSetting<T>(key: string, defaultValue?: T): T;
  
  // 保存设置值
  saveSetting<T>(key: string, value: T): boolean;
  
  // 获取所有设置
  getAllSettings(): Record<string, any>;
  
  // 获取指定类别的设置
  getCategorySettings(category: SettingCategory): Record<string, any>;
  
  // 重置设置为默认值
  resetToDefault(key?: string): boolean;
  
  // 导入设置
  importSettings(settings: Record<string, any>): boolean;
  
  // 导出设置
  exportSettings(): Record<string, any>;
}
```

## 使用示例

```typescript
import { settingService, SettingCategory } from '../modules/settings';

// 获取和保存设置
function manageSettings() {
  try {
    // 获取模型设置
    const modelName = settingService.getSetting<string>('model.name', 'qwen2.5:3b');
    const temperature = settingService.getSetting<number>('model.temperature', 0.7);
    
    console.log(`当前模型: ${modelName}, 温度: ${temperature}`);
    
    // 更新设置
    settingService.saveSetting('model.temperature', 0.8);
    console.log('温度设置已更新');
    
    // 获取所有模型设置
    const modelSettings = settingService.getCategorySettings(SettingCategory.MODEL);
    console.log('所有模型设置:', modelSettings);
    
    // 导出设置
    const allSettings = settingService.exportSettings();
    console.log('所有设置已导出');
    
    return allSettings;
  } catch (error) {
    console.error('管理设置时出错:', error);
    throw error;
  }
}

// 重置设置
function resetSettings() {
  try {
    // 重置所有设置
    const allReset = settingService.resetToDefault();
    
    if (allReset) {
      console.log('所有设置已重置为默认值');
    } else {
      console.error('重置设置失败');
    }
    
    return allReset;
  } catch (error) {
    console.error('重置设置时出错:', error);
    throw error;
  }
}

// 导入设置
function importUserSettings(settings: Record<string, any>) {
  try {
    const imported = settingService.importSettings(settings);
    
    if (imported) {
      console.log('设置导入成功');
    } else {
      console.error('设置导入失败');
    }
    
    return imported;
  } catch (error) {
    console.error('导入设置时出错:', error);
    throw error;
  }
}
```
