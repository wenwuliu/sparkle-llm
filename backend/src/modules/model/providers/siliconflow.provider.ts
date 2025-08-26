import fetch from 'node-fetch';
import { ModelProvider, Message } from '../interfaces/model-provider.interface';
import { settingService } from '../../settings';
import { DEFAULT_MODEL_CONFIG } from '../../../config/model.config';

/**
 * 硅基流动模型提供商
 * 实现与硅基流动API的交互
 */
export class SiliconFlowProvider implements ModelProvider {
    /**
     * 获取硅基流动 API URL
     * @returns 硅基流动 API URL
     */
    private getSiliconFlowApiUrl(): string {
        // 优先使用数据库中的设置，如果不存在则使用环境变量，最后使用默认值
        const dbSetting = settingService.getSetting('siliconflow_api_url');
        if (dbSetting) {
            return dbSetting;
        }
        return process.env.SILICONFLOW_API_URL || DEFAULT_MODEL_CONFIG.SILICONFLOW.API_URL;
    }

    /**
     * 获取硅基流动 API Key
     * @returns 硅基流动 API Key
     */
    private getSiliconFlowApiKey(): string {
        // 优先使用数据库中的设置，如果不存在则使用环境变量
        const dbSetting = settingService.getSetting('siliconflow_api_key');
        if (dbSetting) {
            return dbSetting;
        }
        return process.env.SILICONFLOW_API_KEY || '';
    }

    /**
     * 标准化模型名称，确保使用正确的硅基流动模型格式
     * @param model 原始模型名称
     * @returns 标准化后的模型名称
     */
    private normalizeModelName(model: string): string {
        // 检查模型名称是否为Ollama格式（包含冒号），如果是则使用默认的硅基流动模型
        if (model.includes(':')) {
            console.log(`检测到Ollama格式的模型名称: ${model}，将使用默认硅基流动模型: ${DEFAULT_MODEL_CONFIG.SILICONFLOW.MODEL}`);
            return DEFAULT_MODEL_CONFIG.SILICONFLOW.MODEL;
        }
        return model;
    }

    /**
     * 使用消息数组生成文本
     * @param messages 消息数组
     * @param options 生成选项
     * @returns 生成的文本
     */
    async generateTextWithMessages(messages: Message[], options: any = {}): Promise<string> {
        try {
            // 确保使用硅基流动API时使用正确的模型名称
            const model = this.normalizeModelName(options.model || DEFAULT_MODEL_CONFIG.SILICONFLOW.MODEL);

            console.log(`硅基流动API请求: ${this.getSiliconFlowApiUrl()}, 模型: ${model}`);

            // 打印完整的输入内容
            console.log('硅基流动生成文本完整输入(消息数组):');
            console.log('---开始输入---');
            console.log(JSON.stringify(messages, null, 2));
            console.log('---结束输入---');

            const response = await fetch(this.getSiliconFlowApiUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getSiliconFlowApiKey()}`,
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature: options.temperature || 0.7,
                    top_p: options.top_p || 0.9,
                    max_tokens: options.max_tokens || 2048,
                    stream: false,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`硅基流动API错误: ${response.status} ${response.statusText}, 详情: ${errorText}`);
                throw new Error(`硅基流动API错误: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // 打印大模型原始输出到控制台
            console.log('硅基流动大模型原始输出:');
            console.log('---开始输出---');
            console.log(data.choices[0].message.content);
            console.log('---结束输出---');

            return data.choices[0].message.content;
        } catch (error) {
            console.error('硅基流动生成文本错误:', error);
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
        // 将单一提示词转换为消息数组格式
        const messages: Message[] = [
            {
                role: 'user',
                content: prompt,
            },
        ];

        return this.generateTextWithMessages(messages, options);
    }

    /**
     * 生成记忆
     * @param context 上下文
     * @param options 生成选项
     * @returns 生成的记忆数据
     */
    async generateMemory(context: string, options: any = {}): Promise<any> {
        try {
            // 动态导入提示词服务以避免循环依赖
            // eslint-disable-next-line @typescript-eslint/no-var-requires
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
                // 动态导入文本处理工具以避免循环依赖
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { removeThinkTags, fixJsonString } = require('../../../utils/text-processor');

                // 移除<think>标签，避免JSON解析错误
                const cleanedResponse = removeThinkTags(response);

                // 提取JSON部分
                const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    // 修复JSON字符串中的特殊字符
                    const fixedJsonStr = fixJsonString(jsonMatch[0]);

                    // 解析修复后的JSON
                    const memoryData = JSON.parse(fixedJsonStr);

                    // 确认这是重要记忆
                    if (!memoryData.is_important) {
                        console.log('记忆被判断为不重要，不保存');
                        return null;
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
            // 使用传入的工具列表，如果为空则从工具管理器获取
            let functionTools = tools;

            if (!tools || tools.length === 0) {
                // 动态导入工具管理器以避免循环依赖
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { toolManager } = require('../../tools');

                // 获取OpenAI兼容的函数调用格式工具描述
                functionTools = toolManager.getOpenAIFunctionTools();
            }

            // 动态导入提示词服务以避免循环依赖
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { promptService } = require('../prompts');

            // 获取基础系统提示词
            let systemPrompt = promptService.getToolSystemPrompt();

            // 如果启用了记忆，则使用智能记忆检索
            if (options.enableMemory !== false) {
                console.log('[硅基流动] 记忆功能已启用，开始检索记忆...');

                // 获取用户最后一条消息的内容用于智能记忆检索
                const userMessages = messages.filter(msg => msg.role === 'user');
                const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

                console.log(`[硅基流动] 用于记忆检索的用户消息: "${lastUserMessage}"`);

                // 动态导入记忆检索服务以避免循环依赖
                try {
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const { smartMemoryRetrievalService } = require('../../memory');

                    if (smartMemoryRetrievalService) {
                        console.log('[硅基流动] 智能记忆检索服务可用，开始检索...');
                        const memoryContent = await smartMemoryRetrievalService.smartRetrieveMemories(lastUserMessage);
                        console.log(`[硅基流动] 记忆内容为： ${memoryContent}`);
                        console.log(`[硅基流动] 记忆检索结果: ${memoryContent ? `找到记忆内容，长度: ${memoryContent.length}` : '未找到相关记忆'}`);

                        // 如果有记忆内容，添加到系统提示词中
                        if (memoryContent && memoryContent.trim()) {
                            systemPrompt += '\n\n' + memoryContent;
                            console.log('[硅基流动] 记忆内容已添加到系统提示词中');
                        }
                    } else {
                        console.log('[硅基流动] 智能记忆检索服务不可用');
                    }
                } catch (error) {
                    console.error('[硅基流动] 记忆检索失败:', error);
                }
            }

            // 创建系统提示消息，使用专门为工具调用设计的系统提示词
            const systemMessage: Message = {
                role: 'system',
                content: systemPrompt
            };

            // 创建新的消息数组，添加系统提示
            const messagesWithSystem = [systemMessage, ...messages];

            // 打印完整的输入内容
            console.log('硅基流动工具调用完整输入(消息数组):');
            console.log('---开始输入---');
            console.log(JSON.stringify(messagesWithSystem, null, 2));
            console.log('---结束输入---');
            console.log('工具描述:');
            console.log(JSON.stringify(functionTools, null, 2));

            // 准备请求体
            const requestBody: any = {
                model: this.normalizeModelName(options.model || DEFAULT_MODEL_CONFIG.SILICONFLOW.MODEL),
                messages: messagesWithSystem,
                temperature: options.temperature || 0.2,
                max_tokens: options.max_tokens || 4096,
                stream: false,
                tools: functionTools
            };

            // 发送请求
            const response = await fetch(this.getSiliconFlowApiUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getSiliconFlowApiKey()}`,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`硅基流动API错误: ${response.status} ${response.statusText}, 详情: ${errorText}`);
                throw new Error(`硅基流动API错误: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // 打印大模型原始输出到控制台
            console.log('硅基流动大模型原始输出:');
            console.log('---开始输出---');
            console.log(JSON.stringify(data, null, 2));
            console.log('---结束输出---');

            // 检查是否有工具调用
            if (data.choices &&
                data.choices[0].message &&
                data.choices[0].message.tool_calls &&
                data.choices[0].message.tool_calls.length > 0) {

                // 提取工具调用
                const toolCalls = data.choices[0].message.tool_calls.map((toolCall: any) => {
                    try {
                        // 兼容不同返回格式：arguments 可能是字符串或对象
                        const rawArgs = toolCall?.function?.arguments;
                        let args: any = {};

                        if (typeof rawArgs === 'string') {
                            const trimmed = rawArgs.trim();
                            // 优先尝试标准 JSON 解析
                            args = JSON.parse(trimmed);
                        } else if (rawArgs && typeof rawArgs === 'object') {
                            args = rawArgs;
                        } else {
                            args = {};
                        }

                        return {
                            name: toolCall.function.name,
                            input: args
                        };
                    } catch (error) {
                        console.error('解析工具调用参数错误:', error);
                        // 容错：尝试从原始字符串中提取 command 和 risk_level
                        try {
                            const rawArgs = toolCall?.function?.arguments as string;
                            let commandMatch: RegExpMatchArray | null = null;
                            let riskMatch: RegExpMatchArray | null = null;
                            if (typeof rawArgs === 'string') {
                                commandMatch = rawArgs.match(/"command"\s*:\s*"([\s\S]*?)"\s*(,|\})/);
                                riskMatch = rawArgs.match(/"risk_level"\s*:\s*"([^"]*)"/);
                            }

                            const fallbackArgs: any = {};
                            if (commandMatch && commandMatch[1]) {
                                // 还原常见转义
                                const cmd = commandMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
                                fallbackArgs.command = cmd;
                            }
                            if (riskMatch && riskMatch[1]) {
                                fallbackArgs.risk_level = riskMatch[1];
                            }

                            return {
                                name: toolCall?.function?.name || 'unknown_tool',
                                input: Object.keys(fallbackArgs).length > 0 ? fallbackArgs : {}
                            };
                        } catch {
                            return {
                                name: toolCall?.function?.name || 'unknown_tool',
                                input: {}
                            };
                        }
                    }
                });

                // 提取思考内容
                const content = data.choices[0].message.content || "我需要使用工具来回答这个问题。";

                return {
                    content,
                    toolCalls
                };
            }

            // 如果没有工具调用，返回普通回答
            return {
                content: data.choices[0].message.content,
                toolCalls: []
            };
        } catch (error) {
            console.error('使用工具生成回答错误:', error);
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
                return result;
            } catch (err) {
                error = err;
                retries++;
                console.warn(`工具调用失败，重试 ${retries}/${maxRetries}:`, err);
                // 等待一段时间再重试
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.error(`工具调用在 ${maxRetries} 次重试后仍然失败:`, error);
        throw error;
    }

    /**
     * 继续处理工具调用结果
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
            // 动态导入提示词服务以避免循环依赖
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { promptService } = require('../prompts');

            // 构建工具调用结果消息
            const toolCallsMessage: Message = {
                role: 'assistant',
                content: null,
                tool_calls: toolCalls.map((tool, index) => ({
                    id: `call_${index}`,
                    type: 'function',
                    function: {
                        name: tool.name,
                        arguments: JSON.stringify(tool.input)
                    }
                }))
            };

            // 构建工具结果消息
            const toolResultsMessages = toolCallResults.map((result, index) => ({
                role: 'tool' as const,
                tool_call_id: `call_${index}`,
                content: JSON.stringify(result.error ? { error: result.error } : result.tool_output)
            }));

            // 创建系统提示消息，使用专门为工具结果处理设计的系统提示词
            const systemMessage: Message = {
                role: 'system',
                content: promptService.getToolResultsSystemPrompt()
            };

            // 创建新的消息数组，添加系统提示、原始消息、工具调用和结果
            const messagesWithToolResults = [
                systemMessage,
                ...messages,
                toolCallsMessage,
                ...toolResultsMessages
            ];

            // 打印完整的输入内容
            console.log('硅基流动工具结果继续对话完整输入(消息数组):');
            console.log('---开始输入---');
            console.log(JSON.stringify(messagesWithToolResults, null, 2));
            console.log('---结束输入---');

            // 生成回答
            return await this.generateTextWithMessages(messagesWithToolResults, options);
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
            console.error('继续对话错误:', error);
            throw error;
        }
    }

    /**
     * 获取可用模型列表
     * @returns 模型列表
     */
    async getModels(): Promise<any[]> {
        try {
            console.log('获取硅基流动模型列表...');

            const response = await fetch(`${this.getSiliconFlowApiUrl().replace('/chat/completions', '/models')}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getSiliconFlowApiKey()}`,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`硅基流动获取模型列表API错误: ${response.status} ${response.statusText}, 详情: ${errorText}`);
                throw new Error(`硅基流动获取模型列表API错误: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // 转换为统一格式
            const models = data.data?.map((model: any) => ({
                id: model.id,
                name: model.id,
                object: model.object,
                created: model.created,
                owned_by: model.owned_by
            })) || [];

            console.log(`获取到 ${models.length} 个硅基流动模型`);
            return models;
        } catch (error) {
            console.error('获取硅基流动模型列表错误:', error);
            // 返回默认模型列表作为备选
            return [
                { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen/Qwen2.5-7B-Instruct' },
                { id: 'Qwen/Qwen2.5-14B-Instruct', name: 'Qwen/Qwen2.5-14B-Instruct' },
                { id: 'Qwen/Qwen2.5-32B-Instruct', name: 'Qwen/Qwen2.5-32B-Instruct' },
                { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen/Qwen2.5-72B-Instruct' },
                { id: 'deepseek-ai/DeepSeek-V2.5', name: 'deepseek-ai/DeepSeek-V2.5' },
                { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', name: 'meta-llama/Meta-Llama-3.1-8B-Instruct' },
                { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct', name: 'meta-llama/Meta-Llama-3.1-70B-Instruct' }
            ];
        }
    }

    /**
     * 搜索模型
     * @param query 搜索关键词
     * @returns 匹配的模型列表
     */
    async searchModels(query: string): Promise<any[]> {
        try {
            const allModels = await this.getModels();

            if (!query || query.trim() === '') {
                return allModels;
            }

            const searchTerm = query.toLowerCase().trim();

            // 按相关性排序的搜索结果
            const searchResults = allModels
                .map(model => {
                    const modelName = model.name.toLowerCase();
                    let score = 0;

                    // 精确匹配得分最高
                    if (modelName === searchTerm) {
                        score = 100;
                    }
                    // 开头匹配
                    else if (modelName.startsWith(searchTerm)) {
                        score = 80;
                    }
                    // 包含匹配
                    else if (modelName.includes(searchTerm)) {
                        score = 60;
                    }
                    // 模糊匹配（按单词分割）
                    else {
                        const modelWords = modelName.split(/[-_/\s]+/);
                        const queryWords = searchTerm.split(/[-_/\s]+/);

                        let matchCount = 0;
                        for (const queryWord of queryWords) {
                            for (const modelWord of modelWords) {
                                if (modelWord.includes(queryWord) || queryWord.includes(modelWord)) {
                                    matchCount++;
                                    break;
                                }
                            }
                        }

                        if (matchCount > 0) {
                            score = (matchCount / queryWords.length) * 40;
                        }
                    }

                    return { model, score };
                })
                .filter(item => item.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(item => item.model);

            console.log(`搜索 "${query}" 找到 ${searchResults.length} 个匹配的硅基流动模型`);
            return searchResults;
        } catch (error) {
            console.error('搜索硅基流动模型错误:', error);
            return [];
        }
    }

    /**
     * 使用消息数组生成文本流
     * @param messages 消息数组
     * @param options 生成选项
     * @returns 文本流
     */
    async *generateTextStreamWithMessages(messages: Message[], options: any = {}): AsyncGenerator<string> {
        try {
            // 确保使用硅基流动API时使用正确的模型名称
            const model = this.normalizeModelName(options.model || DEFAULT_MODEL_CONFIG.SILICONFLOW.MODEL);

            console.log(`硅基流动流式API请求: ${this.getSiliconFlowApiUrl()}, 模型: ${model}`);

            const response = await fetch(this.getSiliconFlowApiUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getSiliconFlowApiKey()}`,
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature: options.temperature || 0.7,
                    top_p: options.top_p || 0.9,
                    max_tokens: options.max_tokens || 2048,
                    stream: true,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`硅基流动流式API错误: ${response.status} ${response.statusText}, 详情: ${errorText}`);
                throw new Error(`硅基流动流式API错误: ${response.status} ${response.statusText}`);
            }

            if (!response.body) {
                throw new Error('响应体为空');
            }

            const reader = (response.body as any).getReader();
            const decoder = new TextDecoder();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') {
                                return;
                            }

                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices?.[0]?.delta?.content;
                                if (content) {
                                    yield content;
                                }
                            } catch (error) {
                                // 忽略JSON解析错误，继续处理下一行
                                continue;
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
        } catch (error) {
            console.error('硅基流动生成文本流错误:', error);
            throw error;
        }
    }

    /**
     * 生成文本流（兼容旧接口）
     * @param prompt 提示词
     * @param options 生成选项
     * @returns 文本流
     */
    async *generateTextStream(prompt: string, options: any = {}): AsyncGenerator<string> {
        // 将单一提示词转换为消息数组格式
        const messages: Message[] = [
            {
                role: 'user',
                content: prompt,
            },
        ];

        const stream = this.generateTextStreamWithMessages(messages, options);
        for await (const chunk of stream) {
            yield chunk;
        }
    }
}