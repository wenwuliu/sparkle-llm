import { ModelService as IModelService } from './interfaces/model-service.interface';
import { ModelProvider, ModelProviderType, Message } from './interfaces/model-provider.interface';
import { OllamaProvider } from './providers/ollama.provider';

import { SiliconFlowProvider } from './providers/siliconflow.provider';
import { ModelConfig } from './model.config';
import { toolManager } from '../tools';

import { conversationService } from '../conversation';
import { settingService } from '../settings';
import { promptService } from './prompts';
import { taskComplexityService } from './task-complexity.service';
import { SocketEventType } from '../socket/socket.types';

/**
 * 模型服务
 * 提供与大语言模型交互的服务
 */
export class ModelService implements IModelService {
  private ollamaProvider: ModelProvider;
  private siliconflowProvider: ModelProvider;
  private memoryRetrievalService?: any; // 可选的记忆检索服务

  /**
   * 构造函数
   */
  constructor() {
    this.ollamaProvider = new OllamaProvider();
    this.siliconflowProvider = new SiliconFlowProvider();
  }

  /**
   * 设置记忆检索服务（依赖注入）
   */
  setMemoryRetrievalService(service: any): void {
    this.memoryRetrievalService = service;
  }

  /**
   * 获取当前模型提供商类型
   * @returns 模型提供商类型
   */
  getModelProvider(): ModelProviderType {
    return ModelConfig.getModelProvider();
  }

  /**
   * 获取当前模型提供商实例
   * @returns 模型提供商实例
   */
  getModelProviderInstance(): ModelProvider {
    const provider = this.getModelProvider();

    if (provider === 'ollama') {
      return this.ollamaProvider;
    } else if (provider === 'siliconflow') {
      return this.siliconflowProvider;
    }

    // 默认返回Ollama提供商
    return this.ollamaProvider;
  }

  /**
   * 获取默认模型名称
   * @returns 默认模型名称
   */
  private getDefaultModel(): string {
    return ModelConfig.getCurrentModel();
  }

  /**
   * 智能选择模型（根据任务复杂度）
   * @param userMessage 用户消息
   * @param hasTools 是否使用工具
   * @param forceModel 强制使用的模型（可选）
   * @returns 推荐的模型名称
   */
  private getSmartModel(userMessage: string, hasTools: boolean = false, forceModel?: string): string {
    // 如果强制指定模型，直接返回
    if (forceModel) {
      return forceModel;
    }

    // 检查是否在任务流模式下（通过检查全局变量）
    const isTaskFlowMode = (global as any).taskFlowHandler && (global as any).taskFlowHandler.taskFlowSession;

    if (isTaskFlowMode) {
      // 任务流模式强制使用高级模型
      const provider = this.getModelProvider();
      let advancedModel: string;

      if (provider === 'ollama') {
        advancedModel = settingService.getSetting('ollama_advanced_model') ||
                       settingService.getSetting('ollama_model') ||
                       'qwen3:7b';
      } else if (provider === 'siliconflow') {
        advancedModel = settingService.getSetting('siliconflow_advanced_model') ||
                       settingService.getSetting('siliconflow_model') ||
                       'Qwen/Qwen2.5-32B-Instruct';
      } else {
        advancedModel = settingService.getSmartModel(true); // 强制使用复杂任务模型
      }

      console.log(`🤖 任务流模式强制使用高级模型: ${advancedModel}`);
      return advancedModel;
    }

    // 分析任务复杂度
    const complexityResult = taskComplexityService.analyzeTaskComplexity(userMessage, hasTools);

    // 获取智能推荐的模型
    const recommendedModel = settingService.getSmartModel(complexityResult.isComplex);

    // 记录模型选择日志
    console.log(`🤖 智能模型选择:`, {
      userMessage: userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : ''),
      hasTools,
      isComplex: complexityResult.isComplex,
      reason: complexityResult.reason,
      confidence: complexityResult.confidence,
      selectedModel: recommendedModel,
      provider: this.getModelProvider()
    });

    return recommendedModel;
  }

  /**
   * 使用消息数组生成文本
   * @param messages 消息数组
   * @param options 生成选项
   * @returns 生成的文本
   */
  async generateTextWithMessages(messages: Message[], options: any = {}): Promise<string> {
    const modelProvider = this.getModelProviderInstance();
    const providerType = this.getModelProvider();

    // 获取用户消息用于智能模型选择
    const userMessages = messages.filter(msg => msg.role === 'user');
    const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

    // 智能选择模型
    let model = this.getSmartModel(lastUserMessage, false, options.model);

    // 确保使用正确的模型名称格式
    // 如果当前提供商是硅基流动，但模型名称是Ollama格式（包含冒号），则使用默认的硅基流动模型名称
    if (providerType === 'siliconflow' && (model.includes(':') || model.includes('sparkle-llm-force-default-model'))) {
      console.log(`当前提供商是硅基流动，但检测到Ollama格式的模型名称: ${model}，将使用默认硅基流动模型: Qwen/Qwen2.5-7B-Instruct`);
      model = 'Qwen/Qwen2.5-7B-Instruct';
    }
    // 如果当前提供商是Ollama，但模型名称是非Ollama格式（不包含冒号），则使用默认的Ollama模型名称
    else if (providerType === 'ollama' && (!model.includes(':')  || model.includes('sparkle-llm-force-default-model'))) {
      const defaultOllamaModel = settingService.getSetting('ollama_model') || 'qwen3:1.7b';
      console.log(`当前提供商是Ollama，但检测到非Ollama格式的模型名称: ${model}，将使用默认Ollama模型: ${defaultOllamaModel}`);
      model = defaultOllamaModel;
    }

    try {
      // 创建消息数组的副本，避免修改原始数组
      let messagesCopy = [...messages];

      // 如果指定了对话ID，则添加对话历史
      if (options.conversationId) {
        const { messages: conversationMessages } = await conversationService.getConversationById(options.conversationId);

        // 获取历史窗口大小
        const historyWindowSize = settingService.getHistoryWindowSize();

        // 获取最近的消息
        const recentMessages = conversationMessages.slice(-historyWindowSize);

        // 将对话历史转换为消息数组格式
        const historyMessagesArray: Message[] = recentMessages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

        // 将历史消息添加到消息数组前面
        messagesCopy = [...historyMessagesArray, ...messagesCopy];
      }

      // 如果启用了记忆，则使用智能记忆检索
      if (options.enableMemory !== false) {
        // 获取用户最后一条消息的内容用于智能记忆检索
        // 从后向前查找用户消息
        const userMessages = messagesCopy.filter(msg => msg.role === 'user');
        const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

        // 使用智能记忆检索服务（如果可用）
        const memoryContent = this.memoryRetrievalService
          ? await this.memoryRetrievalService.smartRetrieveMemories(lastUserMessage)
          : null;

        if (memoryContent) {
          // 检查是否已有系统消息
          const hasSystemMessage = messagesCopy.some(msg => msg.role === 'system');

          if (hasSystemMessage) {
            // 如果已有系统消息，则更新第一条系统消息
            const systemIndex = messagesCopy.findIndex(msg => msg.role === 'system');
            messagesCopy[systemIndex].content += '\n\n' + memoryContent;
          } else {
            // 如果没有系统消息，则添加到消息数组前面
            const systemMessage: Message = {
              role: 'system',
              content: memoryContent
            };
            messagesCopy = [systemMessage, ...messagesCopy];
          }
        }
      }

      // 调用模型提供商生成文本
      return await modelProvider.generateTextWithMessages(messagesCopy, {
        ...options,
        model
      });
    } catch (error) {
      console.error('生成文本错误:', error);
      throw error;
    }
  }

  /**
   * 生成文本（兼容旧接口）
   * @param prompt 提示词
   * @param options 生成选项
   * @returns 生成的文本
   */
  async generateText(prompt: string, options: any = {}): Promise<string> {
    // 将提示词转换为消息数组格式
    const messages: Message[] = [
      {
        role: 'user',
        content: prompt
      }
    ];

    // 获取系统提示词，除非明确指定跳过
    if (!options.skipSystemPrompt) {
      const systemPrompt = promptService.getSystemPrompt();
      if (systemPrompt) {
        messages.unshift({
          role: 'system',
          content: systemPrompt
        });
      }
    }

    return this.generateTextWithMessages(messages, options);
  }

  /**
   * 生成文本并支持工具调用（用于任务流）
   * @param prompt 提示词
   * @param options 生成选项
   * @returns 生成结果，包含内容和工具调用
   */
  async generateTextWithTools(prompt: string, options: any = {}): Promise<any> {
    // 将提示词转换为消息数组格式
    const messages: Message[] = [
      {
        role: 'user',
        content: prompt
      }
    ];

    // 如果有工具，使用工具调用模式
    if (options.tools && options.tools.length > 0) {
      const result = await this.generateWithToolsUsingMessages(messages, options);
      return {
        content: result.content,
        tool_calls: result.toolCalls || []
      };
    } else {
      // 没有工具，使用普通文本生成
      const content = await this.generateTextWithMessages(messages, options);
      return {
        content,
        tool_calls: []
      };
    }
  }












  /**
   * 生成记忆
   * @param context 上下文
   * @param options 生成选项
   * @returns 生成的记忆数据
   */
  async generateMemory(context: string, options: any = {}): Promise<any> {
    const modelProvider = this.getModelProviderInstance();
    const model = options.model || this.getDefaultModel();

    try {
      console.log('开始分析对话内容，判断是否生成记忆...');
      const memoryData = await modelProvider.generateMemory(context, {
        ...options,
        model
      });

      if (memoryData) {
        console.log('生成记忆成功:', memoryData.keywords);
      } else {
        console.log('对话内容不包含重要记忆，不生成记忆');
      }

      return memoryData;
    } catch (error) {
      console.error('生成记忆错误:', error);
      throw error;
    }
  }

  /**
   * 使用工具生成回答（使用消息数组）
   * @param messages 消息数组
   * @param options 生成选项
   * @returns 生成结果
   */
  async generateWithToolsUsingMessages(messages: Message[], options: any = {}): Promise<any> {
    const modelProvider = this.getModelProviderInstance();
    const providerType = this.getModelProvider();

    // 获取用户消息用于智能模型选择
    const userMessages = messages.filter(msg => msg.role === 'user');
    const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

    // 智能选择模型（工具调用通常是复杂任务）
    let model = this.getSmartModel(lastUserMessage, true, options.model);

    // 确保使用正确的模型名称格式
    // 如果当前提供商是硅基流动，但模型名称是Ollama格式（包含冒号），则使用默认的硅基流动模型名称
    if (providerType === 'siliconflow' && model.includes(':')) {
      console.log(`工具调用: 当前提供商是硅基流动，但检测到Ollama格式的模型名称: ${model}，将使用默认硅基流动模型: Qwen/Qwen2.5-7B-Instruct`);
      model = 'Qwen/Qwen2.5-7B-Instruct';
    }
    // 如果当前提供商是Ollama，但模型名称是非Ollama格式（不包含冒号），则使用默认的Ollama模型名称
    else if (providerType === 'ollama' && !model.includes(':')) {
      const defaultOllamaModel = settingService.getSetting('ollama_model') || 'qwen3:1.7b';
      console.log(`工具调用: 当前提供商是Ollama，但检测到非Ollama格式的模型名称: ${model}，将使用默认Ollama模型: ${defaultOllamaModel}`);
      model = defaultOllamaModel;
    }

    // 所有模型都使用OpenAI兼容的函数调用格式
    // 获取所有可用工具（任务流工具的排除逻辑在工具管理器内部处理）
    const allTools = toolManager.getOpenAIFunctionTools();

    // 使用优化的工具选择策略
    const userMessage = messages[messages.length - 1]?.content || '';
    const tools = this.selectOptimizedTools(allTools, userMessage);

    try {
      console.log('开始使用工具生成回答...');

      // 创建消息数组的副本，避免修改原始数组
      let messagesCopy = [...messages];

      // 如果指定了对话ID，则添加对话历史
      if (options.conversationId) {
        const { messages: conversationMessages } = await conversationService.getConversationById(options.conversationId);

        // 获取历史窗口大小
        const historyWindowSize = settingService.getHistoryWindowSize();

        // 获取最近的消息
        const recentMessages = conversationMessages.slice(-historyWindowSize);

        // 将对话历史转换为消息数组格式
        const historyMessagesArray: Message[] = recentMessages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

        // 将历史消息添加到消息数组前面
        messagesCopy = [...historyMessagesArray, ...messagesCopy];
      }

      // 如果启用了记忆，则使用智能记忆检索
      if (options.enableMemory !== false) {
        console.log('[模型服务] 记忆功能已启用，开始检索记忆...');

        // 获取用户最后一条消息的内容用于智能记忆检索
        const userMessages = messagesCopy.filter(msg => msg.role === 'user');
        const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

        console.log(`[模型服务] 用于记忆检索的用户消息: "${lastUserMessage}"`);

        // 使用智能记忆检索服务（如果可用）
        let memoryContent = null;
        if (this.memoryRetrievalService) {
          console.log('[模型服务] 智能记忆检索服务可用，开始检索...');
          memoryContent = await this.memoryRetrievalService.smartRetrieveMemories(lastUserMessage);
          console.log(`[模型服务] 记忆检索结果: ${memoryContent ? `找到记忆内容，长度: ${memoryContent.length}` : '未找到相关记忆'}`);
        } else {
          console.log('[模型服务] 智能记忆检索服务不可用');
        }

        if (memoryContent) {
          // 检查是否已有系统消息
          const hasSystemMessage = messagesCopy.some(msg => msg.role === 'system');

          if (hasSystemMessage) {
            // 如果已有系统消息，则更新第一条系统消息
            const systemIndex = messagesCopy.findIndex(msg => msg.role === 'system');
            messagesCopy[systemIndex].content += '\n\n' + memoryContent;
          } else {
            // 如果没有系统消息，则添加到消息数组前面
            const systemMessage: Message = {
              role: 'system',
              content: memoryContent
            };
            messagesCopy = [systemMessage, ...messagesCopy];
          }
        }
      }

      // 调用模型提供商生成工具调用
      const result = await modelProvider.generateWithToolsUsingMessages(messagesCopy, tools, {
        ...options,
        model
      });

      // 如果有工具调用，执行工具并获取结果
      if (result.toolCalls && result.toolCalls.length > 0) {
        console.log('检测到工具调用，执行工具...');

        // 如果提供了socket实例，发送工具调用中的状态
        if (options.socket) {
          const toolCallingMessage: any = {
            content: result.content || "我正在使用工具来回答您的问题...",
            sender: 'ai',
            timestamp: Date.now(),
            tool_calls: result.toolCalls,
            status: 'calling' // 标记为调用中
          };
          options.socket.emit(SocketEventType.CHAT_TOOL_CALLING, toolCallingMessage);
        }

        // 执行所有工具调用
        const toolCallResults = await Promise.all(
          result.toolCalls.map(async (toolCall: any) => {
            return await toolManager.executeTool(toolCall.name, toolCall.input);
          })
        );

        // 将工具调用结果添加到结果对象
        result.toolCallResults = toolCallResults;

        // 如果提供了socket实例，发送工具调用完成的状态
        if (options.socket) {
          const toolCalledMessage: any = {
            content: result.content || "我已经获取了工具的结果，正在思考回答...",
            sender: 'ai',
            timestamp: Date.now(),
            tool_calls: result.toolCalls,
            tool_results: toolCallResults,
            status: 'called' // 标记为调用完成
          };
          options.socket.emit(SocketEventType.CHAT_TOOL_CALLED, toolCalledMessage);
        }

        // 使用工具调用结果生成最终回答
        if (modelProvider.continueWithToolResultsUsingMessages) {
          console.log('使用工具调用结果生成最终回答...');

          // 添加助手消息，包含工具调用的思考内容
          if (result.content) {
            messagesCopy.push({
              role: 'assistant',
              content: result.content
            });
          }

          const finalResponse = await modelProvider.continueWithToolResultsUsingMessages(
            messagesCopy,
            result.toolCalls,
            toolCallResults,
            options
          );

          // 更新结果对象的内容
          result.content = finalResponse;
        }
      }

      return result;
    } catch (error) {
      console.error('使用工具生成回答错误:', error);
      throw error;
    }
  }

  /**
   * 使用工具生成回答（兼容旧接口）
   * @param prompt 提示词
   * @param options 生成选项
   * @returns 生成结果
   */
  async generateWithTools(prompt: string, options: any = {}): Promise<any> {
    // 将提示词转换为消息数组格式
    const messages: Message[] = [
      {
        role: 'user',
        content: prompt
      }
    ];

    // 使用优化的动态系统提示词
    const userMessage = prompt;
    const isSimpleQuery = this.isSimpleQuery(userMessage);

    const dynamicSystemPrompt = promptService.getDynamicSystemPrompt({
      needsTools: true,
      needsMemory: false,
      needsVisualization: userMessage.includes('图表') || userMessage.includes('可视化'),
      userMessage,
      messageLength: userMessage.length,
      isSimpleQuery
    });

    if (dynamicSystemPrompt) {
      // 优化提示词长度
      const optimizedPrompt = promptService.optimizePromptLength(dynamicSystemPrompt, 800);

      messages.unshift({
        role: 'system',
        content: optimizedPrompt
      });
    }

    return this.generateWithToolsUsingMessages(messages, options);
  }

  /**
   * 获取模型配置
   * @returns 模型配置
   */
  getModelConfig(): any {
    return ModelConfig.getModelConfig();
  }

  /**
   * 选择优化的工具集
   * @param allTools 所有可用工具
   * @param userMessage 用户消息
   * @returns 优化后的工具列表
   */
  private selectOptimizedTools(allTools: any[], userMessage: string): any[] {
    // 判断是否为简单查询
    const isSimpleQuery = this.isSimpleQuery(userMessage);

    if (isSimpleQuery) {
      // 简单查询只提供核心工具
      const coreToolNames = ['safe_shell', 'web_search'];
      return allTools.filter(tool => coreToolNames.includes(tool.name));
    }

    // 复杂查询使用智能工具选择
    const message = userMessage.toLowerCase();
    const relevantTools = [];

    // 工具相关性检测
    const toolPatterns = {
      'safe_shell': ['文件', '执行', '运行', '命令', '脚本', 'shell'],
      'web_search': ['搜索', '查找', '最新', '网上', 'google'],
      'task_flow': ['分析', '思考', '复杂', '深入', '详细', '任务', '流程'],
      'memory': ['记住', '记忆', '保存'],
      'screenshot': ['截图', '屏幕', '界面'],
      'file_operations': ['文件', '读取', '写入', '保存']
    };

    // 计算工具相关性
    for (const tool of allTools) {
      const patterns = toolPatterns[tool.name as keyof typeof toolPatterns] || [];
      const relevance = patterns.filter(pattern => message.includes(pattern)).length;

      if (relevance > 0) {
        relevantTools.push({ tool, relevance });
      }
    }

    // 如果没有明确相关的工具，返回核心工具集
    if (relevantTools.length === 0) {
      const coreToolNames = ['safe_shell', 'web_search', 'task_flow'];
      return allTools.filter(tool => coreToolNames.includes(tool.name));
    }

    // 按相关性排序，返回前6个最相关的工具
    return relevantTools
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 6)
      .map(item => item.tool);
  }

  /**
   * 判断是否为简单查询
   * @param message 用户消息
   * @returns 是否为简单查询
   */
  private isSimpleQuery(message: string): boolean {
    const simplePatterns = [
      /^(你好|hi|hello)/i,
      /^(什么是|定义|解释).*[？?]?$/,
      /^(时间|日期|今天)/,
      /^\d+[+\-*/]\d+/,
    ];

    return simplePatterns.some(pattern => pattern.test(message.trim())) || message.length < 20;
  }

  /**
   * 获取Ollama模型列表
   * @returns Ollama模型列表
   */
  async getOllamaModels(): Promise<any[]> {
    try {
      return await this.ollamaProvider.getModels();
    } catch (error) {
      console.error('获取Ollama模型列表错误:', error);
      throw error;
    }
  }

  /**
   * 获取硅基流动模型列表
   * @returns 硅基流动模型列表
   */
  async getSiliconFlowModels(): Promise<any[]> {
    try {
      return await this.siliconflowProvider.getModels();
    } catch (error) {
      console.error('获取硅基流动模型列表错误:', error);
      throw error;
    }
  }

  /**
   * 搜索模型
   * @param query 搜索关键词
   * @param provider 指定的模型提供商，如果不指定则使用当前设置的提供商
   * @returns 匹配的模型列表
   */
  async searchModels(query: string, provider?: string): Promise<any[]> {
    const targetProvider = provider || this.getModelProvider();

    try {
      if (targetProvider === 'siliconflow') {
        // 硅基流动支持模型搜索
        return await this.siliconflowProvider.searchModels(query);
      } else {
        // 其他提供商使用本地搜索
        const allModels = await this.getAvailableModels(targetProvider);
        
        if (!query || query.trim() === '') {
          return allModels;
        }

        const searchTerm = query.toLowerCase().trim();
        
        return allModels.filter(model => {
          const modelName = model.name.toLowerCase();
          return modelName.includes(searchTerm) || 
                 model.id.toLowerCase().includes(searchTerm);
        });
      }
    } catch (error) {
      console.error('搜索模型错误:', error);
      return [];
    }
  }

  /**
   * 初始化模型服务
   */
  async initialize(): Promise<void> {
    console.log('初始化模型服务...');
    // 加载模型配置
    await ModelConfig.loadConfig();
    console.log('模型服务初始化完成');
    return Promise.resolve();
  }

  /**
   * 获取可用模型列表
   * @param specificProvider 指定的模型提供商，如果不指定则使用当前设置的提供商
   * @returns 模型列表
   */
  async getAvailableModels(specificProvider?: string): Promise<any[]> {
    // 如果指定了提供商，则使用指定的提供商，否则使用当前设置的提供商
    const provider = specificProvider || this.getModelProvider();

    try {
      if (provider === 'ollama') {
        return await this.getOllamaModels();
      } else if (provider === 'siliconflow') {
        // 硅基流动模型从API动态获取
        return await this.getSiliconFlowModels();
      }

      return [];
    } catch (error) {
      console.error('获取可用模型列表错误:', error);
      return [];
    }
  }

  /**
   * 更新模型配置
   * @param config 新的配置
   */
  updateModelConfig(config: any): boolean {
    try {
      ModelConfig.updateConfig(config);
      return true;
    } catch (error) {
      console.error('更新模型配置错误:', error);
      return false;
    }
  }

  /**
   * 使用消息数组生成文本流
   * @param messages 消息数组
   * @param options 生成选项
   */
  async *generateTextStreamWithMessages(messages: Message[], options: any = {}): AsyncGenerator<string> {
    const modelProvider = this.getModelProviderInstance();
    const providerType = this.getModelProvider();

    // 获取用户消息用于智能模型选择
    const userMessages = messages.filter(msg => msg.role === 'user');
    const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

    // 智能选择模型
    let model = this.getSmartModel(lastUserMessage, false, options.model);

    // 确保使用正确的模型名称格式
    // 如果当前提供商是硅基流动，但模型名称是Ollama格式（包含冒号），则使用默认的硅基流动模型名称
    if (providerType === 'siliconflow' && model.includes(':')) {
      console.log(`文本流: 当前提供商是硅基流动，但检测到Ollama格式的模型名称: ${model}，将使用默认硅基流动模型: Qwen/Qwen2.5-7B-Instruct`);
      model = 'Qwen/Qwen2.5-7B-Instruct';
    }
    // 如果当前提供商是Ollama，但模型名称是非Ollama格式（不包含冒号），则使用默认的Ollama模型名称
    else if (providerType === 'ollama' && !model.includes(':')) {
      const defaultOllamaModel = settingService.getSetting('ollama_model') || 'qwen3:1.7b';
      console.log(`文本流: 当前提供商是Ollama，但检测到非Ollama格式的模型名称: ${model}，将使用默认Ollama模型: ${defaultOllamaModel}`);
      model = defaultOllamaModel;
    }

    try {
      // 创建消息数组的副本，避免修改原始数组
      let messagesCopy = [...messages];

      // 如果指定了对话ID，则添加对话历史
      if (options.conversationId) {
        const { messages: conversationMessages } = await conversationService.getConversationById(options.conversationId);

        // 获取历史窗口大小
        const historyWindowSize = settingService.getHistoryWindowSize();

        // 获取最近的消息
        const recentMessages = conversationMessages.slice(-historyWindowSize);

        // 将对话历史转换为消息数组格式
        const historyMessagesArray: Message[] = recentMessages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

        // 将历史消息添加到消息数组前面
        messagesCopy = [...historyMessagesArray, ...messagesCopy];
      }

      // 如果启用了记忆，则使用智能记忆检索
      if (options.enableMemory !== false) {
        // 获取用户最后一条消息的内容用于智能记忆检索
        const userMessages = messagesCopy.filter(msg => msg.role === 'user');
        const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

        // 使用智能记忆检索服务（如果可用）
        const memoryContent = this.memoryRetrievalService
          ? await this.memoryRetrievalService.smartRetrieveMemories(lastUserMessage)
          : null;

        if (memoryContent) {
          // 检查是否已有系统消息
          const hasSystemMessage = messagesCopy.some(msg => msg.role === 'system');

          if (hasSystemMessage) {
            // 如果已有系统消息，则更新第一条系统消息
            const systemIndex = messagesCopy.findIndex(msg => msg.role === 'system');
            messagesCopy[systemIndex].content += '\n\n' + memoryContent;
          } else {
            // 如果没有系统消息，则添加到消息数组前面
            const systemMessage: Message = {
              role: 'system',
              content: memoryContent
            };
            messagesCopy = [systemMessage, ...messagesCopy];
          }
        }
      }

      // 检查模型提供商是否支持文本流
      if (modelProvider.generateTextStreamWithMessages) {
        // 调用模型提供商生成文本流
        const stream = modelProvider.generateTextStreamWithMessages(messagesCopy, {
          ...options,
          model
        });

        for await (const chunk of stream) {
          yield chunk;
        }
      } else {
        // 如果不支持流式生成，则使用普通生成并一次性返回
        const text = await modelProvider.generateTextWithMessages(messagesCopy, {
          ...options,
          model
        });
        yield text;
      }
    } catch (error) {
      console.error('生成文本流错误:', error);
      throw error;
    }
  }

  /**
   * 生成文本流（兼容旧接口）
   * @param prompt 提示词
   * @param options 生成选项
   */
  async *generateTextStream(prompt: string, options: any = {}): AsyncGenerator<string> {
    // 将提示词转换为消息数组格式
    const messages: Message[] = [
      {
        role: 'user',
        content: prompt
      }
    ];

    // 所有模型都使用通用系统提示词
    const systemPrompt = promptService.getUniversalSystemPrompt();

    if (systemPrompt) {
      messages.unshift({
        role: 'system',
        content: systemPrompt
      });
    }

    // 使用消息数组生成文本流
    const stream = this.generateTextStreamWithMessages(messages, options);

    for await (const chunk of stream) {
      yield chunk;
    }
  }

}
