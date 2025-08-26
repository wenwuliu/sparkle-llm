/**
 * 工具调用函数类型
 */
export interface ToolCallFunction {
  name: string;
  arguments: string;
}

/**
 * 工具调用类型
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: ToolCallFunction;
}

/**
 * 消息类型
 */
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

/**
 * 模型提供商接口
 * 定义了与特定模型提供商（如Ollama、通义千问等）交互的方法
 */
export interface ModelProvider {
  /**
   * 获取可用模型列表
   * @returns 可用模型列表
   */
  getModels?(): Promise<any[]>;

  /**
   * 搜索模型
   * @param query 搜索关键词
   * @returns 匹配的模型列表
   */
  searchModels?(query: string): Promise<any[]>;

  /**
   * 使用消息数组生成文本
   * @param messages 消息数组
   * @param options 生成选项
   * @returns 生成的文本
   */
  generateTextWithMessages(messages: Message[], options?: any): Promise<string>;

  /**
   * 生成文本（兼容旧接口）
   * @param prompt 提示词
   * @param options 生成选项
   * @returns 生成的文本
   */
  generateText(prompt: string, options?: any): Promise<string>;

  /**
   * 使用消息数组生成文本流
   * @param messages 消息数组
   * @param options 生成选项
   * @returns 文本流
   */
  generateTextStreamWithMessages?(messages: Message[], options?: any): AsyncGenerator<string>;

  /**
   * 生成文本流（兼容旧接口）
   * @param prompt 提示词
   * @param options 生成选项
   * @returns 文本流
   */
  generateTextStream?(prompt: string, options?: any): AsyncGenerator<string>;



  /**
   * 生成记忆
   * @param context 上下文
   * @param options 生成选项
   * @returns 生成的记忆数据
   */
  generateMemory(context: string, options?: any): Promise<any>;

  /**
   * 使用工具生成回答
   * @param messages 消息数组
   * @param tools 可用工具列表
   * @param options 生成选项
   * @returns 工具调用结果
   */
  generateWithToolsUsingMessages(messages: Message[], tools: any[], options?: any): Promise<any>;

  /**
   * 重试工具调用（兼容旧接口）
   * @param prompt 提示词
   * @param tools 可用工具列表
   * @param options 生成选项
   * @param maxRetries 最大重试次数
   * @returns 工具调用结果
   */
  retryToolCall(prompt: string, tools: any[], options?: any, maxRetries?: number): Promise<any>;

  /**
   * 继续处理工具调用结果
   * @param messages 消息数组
   * @param toolCalls 工具调用列表
   * @param toolCallResults 工具调用结果
   * @param options 生成选项
   * @returns 生成的文本
   */
  continueWithToolResultsUsingMessages(
    messages: Message[],
    toolCalls: any[],
    toolCallResults: any[],
    options?: any
  ): Promise<string>;

  /**
   * 继续处理工具调用结果（兼容旧接口）
   * @param prompt 原始提示词
   * @param previousResponse 之前的响应
   * @param toolCalls 工具调用列表
   * @param toolCallResults 工具调用结果
   * @param options 生成选项
   * @returns 生成的文本
   */
  continueWithToolResults(
    prompt: string,
    previousResponse: string,
    toolCalls: any[],
    toolCallResults: any[],
    options?: any
  ): Promise<string>;
}

/**
 * 模型提供商类型
 */
export type ModelProviderType = 'ollama' | 'siliconflow';
