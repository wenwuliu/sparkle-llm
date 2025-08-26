import { db } from '../../config/database';
import { Setting, ModelConfig } from './settings.types';
import { SettingService as ISettingService } from './interfaces/setting.interface';
import { DEFAULT_MODEL_CONFIG } from '../../config/model.config';

/**
 * 设置服务类
 * 提供应用设置的管理功能
 */
export class SettingService implements ISettingService {
  /**
   * 获取所有设置
   * @returns 所有设置的数组
   */
  getAllSettings(): Setting[] {
    try {
      return db.prepare('SELECT * FROM settings').all() as Setting[];
    } catch (error) {
      console.error('获取所有设置失败:', error);
      return [];
    }
  }

  /**
   * 获取设置值
   * @param key 设置键名
   * @returns 设置值或null
   */
  getSetting(key: string): string | null {
    try {
      const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
      return setting ? setting.value : null;
    } catch (error) {
      console.error(`获取设置 ${key} 失败:`, error);
      return null;
    }
  }

  /**
   * 获取多个设置值
   * @param keys 设置键名数组
   * @returns 设置键值对对象
   */
  getSettings(keys: string[]): Record<string, string> {
    try {
      const result: Record<string, string> = {};

      for (const key of keys) {
        const value = this.getSetting(key);
        if (value !== null) {
          result[key] = value;
        }
      }

      return result;
    } catch (error) {
      console.error('获取多个设置失败:', error);
      return {};
    }
  }

  /**
   * 保存设置
   * @param key 设置键名
   * @param value 设置值
   * @returns 是否保存成功
   */
  saveSetting(key: string, value: string): boolean {
    try {
      const timestamp = Date.now();

      // 检查设置是否存在
      const exists = db.prepare('SELECT 1 FROM settings WHERE key = ?').get(key);

      if (exists) {
        // 更新设置
        db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?').run(value, timestamp, key);
      } else {
        // 插入设置
        db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run(key, value, timestamp);
      }

      return true;
    } catch (error) {
      console.error(`保存设置 ${key} 失败:`, error);
      return false;
    }
  }

  /**
   * 批量保存设置
   * @param settings 设置键值对对象
   * @returns 是否保存成功
   */
  saveSettings(settings: Record<string, string>): boolean {
    try {
      const timestamp = Date.now();

      // 使用事务批量保存设置
      db.transaction(() => {
        const updateStmt = db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?');
        const insertStmt = db.prepare('INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)');

        for (const [key, value] of Object.entries(settings)) {
          updateStmt.run(value, timestamp, key);
          insertStmt.run(key, value, timestamp);
        }
      })();

      return true;
    } catch (error) {
      console.error('批量保存设置失败:', error);
      return false;
    }
  }

  /**
   * 获取当前模型提供商
   * @returns 模型提供商名称
   */
  getModelProvider(): string {
    return this.getSetting('model_provider') || DEFAULT_MODEL_CONFIG.DEFAULT_PROVIDER;
  }

  /**
   * 获取当前模型
   * @returns 当前模型名称
   */
  getCurrentModel(): string {
    const provider = this.getModelProvider();

    if (provider === 'ollama') {
      return this.getSetting('ollama_model') || DEFAULT_MODEL_CONFIG.OLLAMA.MODEL;
    } else if (provider === 'siliconflow') {
      return this.getSetting('siliconflow_model') || DEFAULT_MODEL_CONFIG.SILICONFLOW.MODEL;
    }

    return DEFAULT_MODEL_CONFIG.OLLAMA.MODEL;
  }

  /**
   * 根据任务复杂度智能选择模型
   * @param isComplexTask 是否为复杂任务
   * @returns 推荐的模型名称
   */
  getSmartModel(isComplexTask: boolean = false): string {
    const provider = this.getModelProvider();

    if (provider === 'ollama') {
      if (isComplexTask) {
        // 复杂任务使用用户配置的高级模型
        return this.getSetting('ollama_advanced_model') ||
               this.getSetting('ollama_model') ||
               DEFAULT_MODEL_CONFIG.OLLAMA.ADVANCED_MODEL;
      } else {
        // 基础任务使用轻量模型
        return DEFAULT_MODEL_CONFIG.OLLAMA.BASIC_MODEL;
      }
    } else if (provider === 'siliconflow') {
      if (isComplexTask) {
        // 复杂任务使用用户配置的高级模型
        return this.getSetting('siliconflow_advanced_model') ||
               this.getSetting('siliconflow_model') ||
               DEFAULT_MODEL_CONFIG.SILICONFLOW.ADVANCED_MODEL;
      } else {
        // 基础任务使用免费模型
        return DEFAULT_MODEL_CONFIG.SILICONFLOW.BASIC_MODEL;
      }
    }

    // 其他提供商暂时使用原有逻辑
    return this.getCurrentModel();
  }

  /**
   * 获取基础模型名称（用于轻量任务）
   * @returns 基础模型名称
   */
  getBasicModel(): string {
    const provider = this.getModelProvider();

    if (provider === 'ollama') {
      return DEFAULT_MODEL_CONFIG.OLLAMA.BASIC_MODEL;
    } else if (provider === 'siliconflow') {
      return DEFAULT_MODEL_CONFIG.SILICONFLOW.BASIC_MODEL;
    }

    return this.getCurrentModel();
  }

  /**
   * 获取高级模型名称（用于复杂任务）
   * @returns 高级模型名称
   */
  getAdvancedModel(): string {
    const provider = this.getModelProvider();

    if (provider === 'ollama') {
      return this.getSetting('ollama_advanced_model') ||
             this.getSetting('ollama_model') ||
             DEFAULT_MODEL_CONFIG.OLLAMA.ADVANCED_MODEL;
    } else if (provider === 'siliconflow') {
      return this.getSetting('siliconflow_advanced_model') ||
             this.getSetting('siliconflow_model') ||
             DEFAULT_MODEL_CONFIG.SILICONFLOW.ADVANCED_MODEL;
    }

    return this.getCurrentModel();
  }

  /**
   * 获取模型API URL
   * @returns 模型API URL
   */
  getModelApiUrl(): string {
    const provider = this.getModelProvider();

    if (provider === 'ollama') {
      return this.getSetting('ollama_api_url') || DEFAULT_MODEL_CONFIG.OLLAMA.API_URL;
    } else if (provider === 'siliconflow') {
      return this.getSetting('siliconflow_api_url') || DEFAULT_MODEL_CONFIG.SILICONFLOW.API_URL;
    }

    return DEFAULT_MODEL_CONFIG.OLLAMA.API_URL;
  }

  /**
   * 获取模型API密钥
   * @returns 模型API密钥
   */
  getModelApiKey(): string {
    const provider = this.getModelProvider();

    if (provider === 'siliconflow') {
      return this.getSetting('siliconflow_api_key') || '';
    }

    return '';
  }

  /**
   * 获取温度设置
   * @returns 温度值
   */
  getTemperature(): number {
    const value = this.getSetting('temperature');
    return value ? parseFloat(value) : DEFAULT_MODEL_CONFIG.PARAMETERS.TEMPERATURE;
  }

  /**
   * 获取最大Token数
   * @returns 最大Token数
   */
  getMaxTokens(): number {
    const value = this.getSetting('max_tokens');
    return value ? parseInt(value) : DEFAULT_MODEL_CONFIG.PARAMETERS.MAX_TOKENS;
  }

  /**
   * 获取是否启用记忆
   * @returns 是否启用记忆
   */
  isMemoryEnabled(): boolean {
    const value = this.getSetting('enable_memory');
    return value ? value === 'true' : true;
  }

  /**
   * 获取记忆重要性阈值
   * @returns 记忆重要性阈值
   */
  getMemoryImportanceThreshold(): number {
    const value = this.getSetting('memory_importance_threshold');
    return value ? parseFloat(value) : 0.5;
  }

  /**
   * 获取是否启用任务流
   * @returns 是否启用任务流
   */
  isTaskFlowEnabled(): boolean {
    const value = this.getSetting('enable_task_flow');
    return value ? value === 'true' : true;
  }



  /**
   * 获取对话历史窗口大小
   * @returns 对话历史窗口大小
   */
  getHistoryWindowSize(): number {
    const value = this.getSetting('history_window_size');
    return value ? parseInt(value) : 5; // 默认为5条消息
  }

  /**
   * 获取模型配置
   * @returns 模型配置
   */
  getModelConfig(): ModelConfig {
    const provider = this.getModelProvider();
    const temperature = this.getTemperature();
    const maxTokens = this.getMaxTokens();

    const config: ModelConfig = {
      provider,
      temperature,
      maxTokens,
    };

    if (provider === 'ollama') {
      config.ollama = {
        apiUrl: this.getModelApiUrl(),
        model: this.getCurrentModel(),
      };
    } else if (provider === 'siliconflow') {
      config.siliconflow = {
        apiUrl: this.getModelApiUrl(),
        apiKey: this.getModelApiKey(),
        model: this.getCurrentModel(),
      };
    }

    return config;
  }

  /**
   * 更新模型配置
   * @param config 新的配置
   * @returns 是否更新成功
   */
  updateModelConfig(config: any): boolean {
    try {
      const settings: Record<string, string> = {};

      // 更新提供商
      if (config.provider) {
        settings['model_provider'] = config.provider;
      }

      // 更新温度
      if (config.temperature !== undefined) {
        settings['temperature'] = config.temperature.toString();
      }

      // 更新最大Token数
      if (config.maxTokens !== undefined) {
        settings['max_tokens'] = config.maxTokens.toString();
      }

      // 更新Ollama配置
      if (config.ollama) {
        if (config.ollama.apiUrl) {
          settings['ollama_api_url'] = config.ollama.apiUrl;
        }
        if (config.ollama.model) {
          settings['ollama_model'] = config.ollama.model;
        }
        if (config.ollama.advancedModel) {
          settings['ollama_advanced_model'] = config.ollama.advancedModel;
        }
      }



      // 更新硅基流动配置
      if (config.siliconflow) {
        if (config.siliconflow.apiUrl) {
          settings['siliconflow_api_url'] = config.siliconflow.apiUrl;
        }
        if (config.siliconflow.apiKey) {
          settings['siliconflow_api_key'] = config.siliconflow.apiKey;
        }
        if (config.siliconflow.model) {
          settings['siliconflow_model'] = config.siliconflow.model;
        }
        if (config.siliconflow.advancedModel) {
          settings['siliconflow_advanced_model'] = config.siliconflow.advancedModel;
        }
      }

      // 保存设置
      return this.saveSettings(settings);
    } catch (error) {
      console.error('更新模型配置失败:', error);
      return false;
    }
  }
}

// 创建设置服务实例
export const settingService = new SettingService();
