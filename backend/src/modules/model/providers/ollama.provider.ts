import fetch from 'node-fetch';
import { ModelProvider, Message } from '../interfaces/model-provider.interface';
import { settingService } from '../../settings';
import { DEFAULT_MODEL_CONFIG } from '../../../config/model.config';
import { removeThinkTags, safeStringify } from '../../../utils/text-processor';

/**
 * Ollama模型提供商
 * 实现与Ollama API的交互
 */
export class OllamaProvider implements ModelProvider {
  /**
   * 获取Ollama API URL
   * @returns Ollama API URL
   */
  private getOllamaApiUrl(): string {
    // 优先使用数据库中的设置，如果不存在则使用环境变量，最后使用默认值
    const dbSetting = settingService.getSetting('ollama_api_url');
    if (dbSetting) {
      return dbSetting;
    }
    return process.env.OLLAMA_API_URL || DEFAULT_MODEL_CONFIG.OLLAMA.API_URL;
  }

  /**
   * 获取可用模型列表
   * @returns 可用模型列表
   */
  async getModels(): Promise<any[]> {
    try {
      const response = await fetch(`${this.getOllamaApiUrl()}/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.models;
    } catch (error) {
      console.error('获取Ollama模型列表错误:', error);
      throw error;
    }
  }

  /**
   * 使用消息数组生成文本
   * @param messages 消息数组
   * @param options 生成选项
   * @returns 生成的文本
   */
  async generateTextWithMessages(messages: Message[], options: any = {}): Promise<string> {
    try {
      const model = options.model || DEFAULT_MODEL_CONFIG.OLLAMA.MODEL;
      console.log(`Ollama API请求: ${this.getOllamaApiUrl()}/chat, 模型: ${model}`);

      // 检查模型是否存在
      try {
        const models = await this.getModels();
        const modelExists = models.some((m: any) => m.name === model);

        if (!modelExists) {
          console.warn(`模型 ${model} 不存在，尝试使用可用模型`);

          if (models.length > 0) {
            options.model = models[0].name;
            console.log(`使用可用模型: ${options.model}`);
          } else {
            throw new Error(`没有可用的Ollama模型`);
          }
        }
      } catch (error) {
        console.warn('检查模型失败，继续使用指定模型:', error);
      }

      // 打印完整的输入内容
      console.log('Ollama 生成文本完整输入(消息数组):');
      console.log('---开始输入---');
      console.log(safeStringify(messages, 2));
      console.log('---结束输入---');

      // 尝试使用chat接口
      try {
        const response = await fetch(`${this.getOllamaApiUrl()}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: safeStringify({
            model: options.model || DEFAULT_MODEL_CONFIG.OLLAMA.MODEL,
            messages: messages.map(msg => ({
              role: msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user',
              content: msg.content
            })),
            stream: false,
            options: {
              temperature: options.temperature || DEFAULT_MODEL_CONFIG.PARAMETERS.TEMPERATURE,
              top_k: options.top_k || 40,
              top_p: options.top_p || 0.9,
              max_tokens: options.max_tokens || DEFAULT_MODEL_CONFIG.PARAMETERS.MAX_TOKENS,
              // 避免循环引用，不直接展开options
              // 只提取需要的属性
              frequency_penalty: options.frequency_penalty,
              presence_penalty: options.presence_penalty,
              stop: options.stop,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();

          // 打印大模型原始输出到控制台
          console.log('Ollama 大模型原始输出:');
          console.log('---开始输出---');
          console.log(data.message?.content);
          console.log('---结束输出---');

          return data.message?.content || '';
        } else {
          // 如果chat接口失败，尝试使用generate接口
          console.warn('Ollama chat接口失败，尝试使用generate接口');
          throw new Error('Chat接口失败');
        }
      } catch (chatError) {
        console.warn('Ollama chat接口错误，回退到generate接口:', chatError);

        // 将消息数组转换为单一提示词
        let prompt = '';

        for (const message of messages) {
          if (message.role === 'system') {
            prompt += `系统: ${message.content}\n\n`;
          } else if (message.role === 'user') {
            prompt += `用户: ${message.content}\n\n`;
          } else if (message.role === 'assistant') {
            prompt += `助手: ${message.content}\n\n`;
          }
        }

        // 使用generate接口
        return this.generateText(prompt, options);
      }
    } catch (error) {
      console.error('Ollama生成文本错误:', error);
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
    try {
      const model = options.model || DEFAULT_MODEL_CONFIG.OLLAMA.MODEL;
      console.log(`Ollama API请求: ${this.getOllamaApiUrl()}/generate, 模型: ${model}`);

      // 检查模型是否存在
      try {
        const models = await this.getModels();
        const modelExists = models.some((m: any) => m.name === model);

        if (!modelExists) {
          console.warn(`模型 ${model} 不存在，尝试使用可用模型`);

          if (models.length > 0) {
            options.model = models[0].name;
            console.log(`使用可用模型: ${options.model}`);
          } else {
            throw new Error(`没有可用的Ollama模型`);
          }
        }
      } catch (error) {
        console.warn('检查模型失败，继续使用指定模型:', error);
      }

      // 打印完整的输入内容
      console.log('Ollama 生成文本完整输入:');
      console.log('---开始输入---');
      console.log(prompt);
      console.log('---结束输入---');
      //在prompt后面增加 /no_think参数
      prompt += ' /no_think';

      const response = await fetch(`${this.getOllamaApiUrl()}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: safeStringify({
          model: options.model || DEFAULT_MODEL_CONFIG.OLLAMA.MODEL,
          prompt,
          stream: false,
          options: {
            temperature: options.temperature || DEFAULT_MODEL_CONFIG.PARAMETERS.TEMPERATURE,
            top_k: options.top_k || 40,
            top_p: options.top_p || 0.9,
            max_tokens: options.max_tokens || DEFAULT_MODEL_CONFIG.PARAMETERS.MAX_TOKENS,
            // 避免循环引用，不直接展开options
            // 只提取需要的属性
            frequency_penalty: options.frequency_penalty,
            presence_penalty: options.presence_penalty,
            stop: options.stop,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ollama API错误: ${response.status} ${response.statusText}, 详情: ${errorText}`);
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // 打印大模型原始输出到控制台
      console.log('Ollama 大模型原始输出:');
      console.log('---开始输出---');
      console.log(data.response);
      console.log('---结束输出---');

      return data.response;
    } catch (error) {
      console.error('Ollama生成文本错误:', error);
      throw error;
    }
  }



  /**
   * 生成记忆
   * @param context 上下文
   * @param options 生成选项
   * @returns 生成的记忆数据
   */
  async generateMemory(context: string, options: any = {}): Promise<any> {
    try {
      // 导入提示词服务
      const { promptService } = require('../prompts');

      // 获取记忆生成提示词
      const prompt = promptService.getMemoryGenerationPrompt(context);

      const response = await this.generateText(prompt, options);

      // 如果没有值得记忆的内容
      if (response.includes('NO_MEMORY')) {
        return null;
      }

      // 尝试解析JSON
      try {
        // 移除<think>标签，避免JSON解析错误
        const cleanedResponse = removeThinkTags(response);

        // 提取JSON部分
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const memoryData = JSON.parse(jsonMatch[0]);

          // 确认这是重要记忆
          if (!memoryData.is_important) {
            console.log('记忆被判断为不重要，不保存');
            return null;
          }

          // 检查是否包含指令关键词，如果包含则设置为核心记忆
          const instructionKeywords = ['必须', '应该', '不能', '禁止', '记住', '要求'];
          if (!memoryData.memory_type &&
              instructionKeywords.some(keyword => memoryData.content.includes(keyword))) {
            memoryData.memory_type = 'core';
            memoryData.memory_subtype = 'instruction';
            memoryData.is_pinned = true;
          }

          return {
            keywords: memoryData.keywords,
            content: memoryData.content,
            memory_type: memoryData.memory_type || 'factual',
            memory_subtype: memoryData.memory_subtype || null,
            importance: memoryData.importance,
            is_pinned: memoryData.is_pinned || false,
            context: context.substring(0, 500), // 保存部分上下文
          };
        }
        return null;
      } catch (error) {
        console.error('解析记忆JSON错误:', error);
        return null;
      }
    } catch (error) {
      console.error('生成记忆错误:', error);
      return null;
    }
  }

  /**
   * 使用工具生成回答（使用消息数组）
   * @param messages 消息数组
   * @param tools 可用工具列表
   * @param options 生成选项
   * @returns 工具调用结果
   */
  async generateWithToolsUsingMessages(messages: Message[], tools: any[], options: any = {}): Promise<any> {
    try {
      // 导入提示词服务
      const { promptService } = require('../prompts');

      // 创建系统提示消息，使用专门为工具调用设计的系统提示词
      const systemMessage: Message = {
        role: 'system',
        content: promptService.getToolSystemPrompt()
      };

      // 创建新的消息数组，添加系统提示
      const messagesWithSystem = [systemMessage, ...messages];

      // 打印完整的输入内容
      console.log('Ollama 工具调用完整输入(消息数组):');
      console.log('---开始输入---');
      console.log(safeStringify(messagesWithSystem, 2));
      console.log('---结束输入---');

      // 生成回答
      const response = await this.generateTextWithMessages(messagesWithSystem, {
        ...options,
        temperature: 0.2,
        max_tokens: 4096
      });

      // 尝试解析JSON
      try {
        // 导入文本处理工具
        const { parseToolCallJson } = require('../../../utils/text-processor');

        // 使用统一的工具调用JSON解析函数
        return parseToolCallJson(response);
      } catch (error) {
        console.error('解析工具调用JSON错误:', error);
        return { content: response, toolCalls: [] };
      }
    } catch (error) {
      console.error('Ollama工具调用错误:', error);
      throw error;
    }
  }

  /**
   * 重试工具调用
   * @param prompt 提示词
   * @param tools 可用工具列表
   * @param options 生成选项
   * @param maxRetries 最大重试次数
   * @returns 工具调用结果
   */
  async retryToolCall(prompt: string, tools: any[], options: any = {}, maxRetries: number = 3): Promise<any> {
    let retries = 0;
    let error = null;

    while (retries < maxRetries) {
      try {
        // 将提示词转换为消息数组
        const messages: Message[] = [
          {
            role: 'user',
            content: prompt
          }
        ];

        const result = await this.generateWithToolsUsingMessages(messages, tools, options);

        // 如果成功解析到工具调用，返回结果
        if (result.toolCalls && result.toolCalls.length > 0) {
          return result;
        }

        // 如果没有工具调用但有内容，可能不需要工具
        if (result.content && result.content.trim().length > 0) {
          return result;
        }

        // 增加重试计数
        retries++;
        console.log(`重试工具调用 (${retries}/${maxRetries})...`);

        // 增加温度以获得不同的结果
        options.temperature = Math.min(1.0, (options.temperature || 0.2) + 0.1 * retries);

      } catch (e) {
        error = e;
        retries++;
        console.error(`工具调用错误 (${retries}/${maxRetries}):`, e);
      }
    }

    // 如果所有重试都失败，返回错误或空结果
    if (error) {
      throw error;
    }

    return { content: `我无法确定如何使用工具来回答您的问题。请尝试重新表述您的问题。`, toolCalls: [] };
  }

  /**
   * 继续处理工具调用结果（使用消息数组）
   * @param messages 消息数组
   * @param toolCalls 工具调用列表
   * @param toolCallResults 工具调用结果
   * @param options 生成选项
   * @returns 生成的文本
   */
  async continueWithToolResultsUsingMessages(
    messages: Message[],
    toolCalls: any[],
    toolCallResults: any[],
    options: any = {}
  ): Promise<string> {
    try {
      // 导入提示词服务
      const { promptService } = require('../prompts');

      // 创建系统提示消息，使用专门为工具结果处理设计的系统提示词
      const systemMessage: Message = {
        role: 'system',
        content: promptService.getToolResultsSystemPrompt()
      };

      // 创建新的消息数组，添加系统提示
      const messagesWithSystem = [systemMessage, ...messages];

      // 打印完整的输入内容
      console.log('Ollama 工具结果继续对话完整输入(消息数组):');
      console.log('---开始输入---');
      console.log(safeStringify(messagesWithSystem, 2));
      console.log('---结束输入---');

      // 生成最终回答
      return await this.generateTextWithMessages(messagesWithSystem, options);
    } catch (error) {
      console.error('继续对话错误:', error);
      throw error;
    }
  }

  /**
   * 继续处理工具调用结果（兼容旧接口）
   * @param prompt 原始提示词
   * @param previousResponse 之前的响应
   * @param toolCalls 工具调用列表
   * @param toolCallResults 工具调用结果
   * @param options 生成选项
   * @returns 生成的文本
   */
  async continueWithToolResults(
    prompt: string,
    previousResponse: string,
    toolCalls: any[],
    toolCallResults: any[],
    options: any = {}
  ): Promise<string> {
    try {
      // 将提示词和回答转换为消息数组
      const messages: Message[] = [
        {
          role: 'user',
          content: prompt
        },
        {
          role: 'assistant',
          content: previousResponse
        }
      ];

      return await this.continueWithToolResultsUsingMessages(
        messages,
        toolCalls,
        toolCallResults,
        options
      );
    } catch (error) {
      console.error('Ollama工具结果继续对话错误:', error);
      throw error;
    }
  }
}
