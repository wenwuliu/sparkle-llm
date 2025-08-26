/**
 * 模型配置
 * 集中管理所有模型相关的默认配置
 */

/**
 * 默认模型配置
 */
export const DEFAULT_MODEL_CONFIG = {
  // 默认模型提供商
  DEFAULT_PROVIDER: 'ollama',

  // Ollama 默认配置
  OLLAMA: {
    API_URL: 'http://localhost:11434/api',
    BASIC_MODEL: 'qwen3:1.7b',        // 基础任务使用的轻量模型
    ADVANCED_MODEL: 'qwen3:7b',       // 复杂任务使用的高级模型（用户可配置）
    MODEL: 'qwen3:1.7b',              // 保持向后兼容
  },



  // 硅基流动大模型默认配置
  SILICONFLOW: {
    API_URL: 'https://api.siliconflow.cn/v1/chat/completions',
    BASIC_MODEL: 'Qwen/Qwen2.5-7B-Instruct',     // 基础任务使用的免费模型
    ADVANCED_MODEL: 'Qwen/Qwen2.5-32B-Instruct', // 复杂任务使用的高级模型（用户可配置）
    MODEL: 'Qwen/Qwen2.5-7B-Instruct',           // 保持向后兼容
  },

  // 通用模型参数默认值
  PARAMETERS: {
    TEMPERATURE: 0.7,
    MAX_TOKENS: 2048,
  }
};
