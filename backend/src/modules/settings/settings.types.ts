/**
 * 设置类型定义
 */

/**
 * 设置项类型
 */
export interface Setting {
  key: string;
  value: string;
  updated_at: number;
}

/**
 * 模型提供商类型（简化版，只保留主要的两个）
 */
export type ModelProviderType = 'ollama' | 'siliconflow';

/**
 * 模型配置类型
 */
export interface ModelConfig {
  provider: string;
  temperature: number;
  maxTokens: number;
  ollama?: {
    apiUrl: string;
    model: string;
    advancedModel?: string;  // 复杂任务使用的高级模型
  };
  qwen?: {
    apiUrl: string;
    apiKey: string;
    model: string;
    enableSearch?: boolean;
  };
  deepseek?: {
    apiUrl: string;
    apiKey: string;
    model: string;
  };
  siliconflow?: {
    apiUrl: string;
    apiKey: string;
    model: string;
    advancedModel?: string;  // 复杂任务使用的高级模型
  };
}
