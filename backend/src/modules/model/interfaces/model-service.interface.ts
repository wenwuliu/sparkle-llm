import { ModelProvider, ModelProviderType } from './model-provider.interface';

/**
 * 模型服务接口
 * 定义了模型服务的方法，作为应用程序与不同模型提供商之间的抽象层
 */
export interface ModelService {
  /**
   * 获取当前模型提供商类型
   * @returns 模型提供商类型
   */
  getModelProvider(): ModelProviderType;

  /**
   * 获取当前模型提供商实例
   * @returns 模型提供商实例
   */
  getModelProviderInstance(): ModelProvider;

  /**
   * 生成文本
   * @param prompt 提示词
   * @param options 生成选项
   * @returns 生成的文本
   */
  generateText(prompt: string, options?: any): Promise<string>;



  /**
   * 生成记忆
   * @param context 上下文
   * @param options 生成选项
   * @returns 生成的记忆数据
   */
  generateMemory(context: string, options?: any): Promise<any>;

  /**
   * 使用工具生成回答
   * @param prompt 提示词
   * @param options 生成选项
   * @returns 生成结果
   */
  generateWithTools(prompt: string, options?: any): Promise<any>;

  /**
   * 获取模型配置
   * @returns 模型配置
   */
  getModelConfig(): any;
}
