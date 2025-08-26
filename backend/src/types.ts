// 聊天消息类型
export interface ChatMessage {
  id?: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: number;
  tool_calls?: any[];
  tool_results?: any[];
}

// 模型提供商接口
export interface ModelProvider {
  generateChatCompletion(
    messages: ChatMessage[],
    systemPrompt?: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<string>;

  generateText(
    prompt: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<string>;

  streamChatCompletion(
    messages: ChatMessage[],
    callback: (text: string, done: boolean) => void,
    systemPrompt?: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<void>;
}

// 工具调用结果类型
export interface ToolCallResult {
  tool_name: string;
  tool_input: any;
  tool_output: any;
  error?: string;
}
