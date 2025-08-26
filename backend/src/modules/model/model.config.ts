import { settingService } from '../../modules/settings';
import { ModelProviderType } from './interfaces/model-provider.interface';

/**
 * 模型配置
 * 提供模型相关的配置信息
 */
export class ModelConfig {
  /**
   * 获取当前模型提供商类型
   * @returns 模型提供商类型
   */
  static getModelProvider(): ModelProviderType {
    return settingService.getModelProvider() as ModelProviderType;
  }

  /**
   * 获取当前模型名称
   * @returns 当前模型名称
   */
  static getCurrentModel(): string {
    return settingService.getCurrentModel();
  }

  /**
   * 获取模型API URL
   * @returns 模型API URL
   */
  static getModelApiUrl(): string {
    return settingService.getModelApiUrl();
  }

  /**
   * 获取模型API密钥
   * @returns 模型API密钥
   */
  static getModelApiKey(): string {
    return settingService.getModelApiKey();
  }

  /**
   * 获取温度设置
   * @returns 温度值
   */
  static getTemperature(): number {
    return settingService.getTemperature();
  }

  /**
   * 获取最大Token数
   * @returns 最大Token数
   */
  static getMaxTokens(): number {
    return settingService.getMaxTokens();
  }

  /**
   * 获取完整的模型配置
   * @returns 模型配置对象
   */
  static getModelConfig(): any {
    return settingService.getModelConfig();
  }

  /**
   * 加载模型配置
   */
  static async loadConfig(): Promise<void> {
    // 从设置服务加载配置
    console.log('加载模型配置...');
    return Promise.resolve();
  }

  /**
   * 更新模型配置
   * @param config 新的配置
   */
  static updateConfig(config: any): void {
    // 更新设置服务中的配置
    settingService.updateModelConfig(config);
    console.log('模型配置已更新');
  }
}
