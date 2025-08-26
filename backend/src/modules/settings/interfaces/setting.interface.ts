/**
 * 设置服务接口
 * 定义设置服务的功能接口
 */
export interface SettingService {
  /**
   * 获取所有设置
   * @returns 所有设置的数组
   */
  getAllSettings(): Setting[];

  /**
   * 获取设置值
   * @param key 设置键名
   * @returns 设置值或null
   */
  getSetting(key: string): string | null;

  /**
   * 获取多个设置值
   * @param keys 设置键名数组
   * @returns 设置键值对对象
   */
  getSettings(keys: string[]): Record<string, string>;

  /**
   * 保存设置
   * @param key 设置键名
   * @param value 设置值
   * @returns 是否保存成功
   */
  saveSetting(key: string, value: string): boolean;

  /**
   * 批量保存设置
   * @param settings 设置键值对对象
   * @returns 是否保存成功
   */
  saveSettings(settings: Record<string, string>): boolean;

  /**
   * 获取当前模型提供商
   * @returns 模型提供商名称
   */
  getModelProvider(): string;

  /**
   * 获取当前模型
   * @returns 当前模型名称
   */
  getCurrentModel(): string;

  /**
   * 获取模型API URL
   * @returns 模型API URL
   */
  getModelApiUrl(): string;

  /**
   * 获取模型API密钥
   * @returns 模型API密钥
   */
  getModelApiKey(): string;

  /**
   * 获取温度设置
   * @returns 温度值
   */
  getTemperature(): number;

  /**
   * 获取最大Token数
   * @returns 最大Token数
   */
  getMaxTokens(): number;

  /**
   * 获取是否启用记忆
   * @returns 是否启用记忆
   */
  isMemoryEnabled(): boolean;

  /**
   * 获取记忆重要性阈值
   * @returns 记忆重要性阈值
   */
  getMemoryImportanceThreshold(): number;

  /**
   * 获取是否启用任务流
   * @returns 是否启用任务流
   */
  isTaskFlowEnabled(): boolean;

  /**
   * 获取对话历史窗口大小
   * @returns 对话历史窗口大小
   */
  getHistoryWindowSize(): number;

  /**
   * 获取完整的模型配置
   * @returns 模型配置对象
   */
  getModelConfig(): any;

  /**
   * 更新模型配置
   * @param config 新的配置
   * @returns 是否更新成功
   */
  updateModelConfig(config: any): boolean;
}

/**
 * 设置类型
 */
export interface Setting {
  key: string;
  value: string;
  updated_at: number;
}
