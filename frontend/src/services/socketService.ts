import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { Operation } from '../components/ConfirmationDialog';
import { Conversation, FrontendMessage as ChatMessage, ToolCall, ToolCallResult } from '../types/conversation';

// 思考步骤类型
export interface ThinkingStep {
  id: string;
  content: string;
  status: 'pending' | 'process' | 'completed' | 'error' | 'waiting_for_user';
  result?: string;
  has_tools?: boolean; // 是否包含工具调用
  question?: string; // 向用户提出的问题
  user_answer?: string; // 用户的回答
  images?: string[]; // 图片链接数组
  objective?: string; // 步骤的详细目标
  tool_calls?: ToolCall[]; // 工具调用列表
  tool_results?: ToolCallResult[]; // 工具调用结果
  operations_log?: string[]; // 操作日志，记录步骤内的各种操作
  current_operation?: string; // 当前正在执行的操作
}

// 思考步骤操作更新类型
export interface ThinkingStepOperation {
  stepId: string;
  operationLog: string;
  operations_log: string[];
  current_operation: string;
}

// 思考请求类型
export interface ThinkingRequest {
  message: string;
  useTools: boolean;
  level?: number;
  trigger?: 'user' | 'auto';
  reason?: string;
  parentSessionId?: string;
}

// Agent相关类型
export interface AgentStartEvent {
  sessionId: string;
  task: string;
  goal: string;
  useTools: boolean;
  enableReflection: boolean;
  maxSteps: number;
  confidenceThreshold: number;
  timestamp: string;
}

export interface AgentProgressEvent {
  type: 'step_start' | 'step_complete' | 'step_error' | 'progress_update' | 'status_change';
  agentId: string;
  sessionId: string;
  stepId?: string;
  status: 'idle' | 'planning' | 'reasoning' | 'acting' | 'observing' | 'reflecting' | 'completed' | 'failed' | 'paused';
  progress: number;
  message: string;
  data?: any;
  timestamp: number;
}

export interface AgentErrorEvent {
  sessionId: string;
  error: {
    type: 'tool_error' | 'reasoning_error' | 'planning_error' | 'execution_error' | 'validation_error';
    message: string;
    details: string;
    stepId?: string;
    recoverable: boolean;
    suggestions: string[];
    timestamp: number;
  };
}

export interface AgentCompleteEvent {
  sessionId: string;
  result: {
    success: boolean;
    result: any;
    summary: string;
    steps: any[];
    history: any[];
    executionTime: number;
    errorCount: number;
    confidence: number;
    recommendations: string[];
    metadata: Record<string, any>;
  };
  timestamp: string;
}

export interface AgentStopEvent {
  sessionId: string;
  timestamp: string;
}

// 记忆重要性级别
export enum ImportanceLevel {
  IMPORTANT = 'important',    // 重要记忆
  MODERATE = 'moderate',      // 一般记忆
  UNIMPORTANT = 'unimportant' // 不重要记忆
}

// 记忆类型
export interface Memory {
  id: number;
  timestamp: number;
  keywords: string;
  context: string;
  content: string;
  importance: number;
  importance_level?: string;  // 重要性级别：'important', 'moderate', 'unimportant'
  memory_type?: string;       // 记忆类型：'core' 或 'factual'
  memory_subtype?: string;    // 记忆子类型
  is_pinned?: number;         // 是否固定显示（1表示固定，0表示不固定）
  last_accessed?: number;
  created_at: number;
  strength?: number;
  stage?: number;
  nextReviewTime?: number;
  similarity_score?: number;  // 相似度分数，用于语义搜索
}

// 任务进度事件类型
export interface TaskProgressEvent {
  taskId: string;
  timestamp: number;
  type: string;
  message: string;
  details?: string;
  stepIndex?: number;
  steps?: string[];
}

// 思考状态事件类型
export enum ThinkingStatusEvent {
  START = 'thinking:start',
  END = 'thinking:end'
}

class SocketService {
  // 将socket改为public，以便其他服务可以直接访问
  public socket: Socket | null = null;
  private messageListeners: ((message: ChatMessage) => void)[] = [];
  private thinkingStepListeners: ((steps: ThinkingStep[]) => void)[] = [];
  private thinkingStepOperationListeners: ((operation: ThinkingStepOperation) => void)[] = [];

  // 任务流事件监听器
  private agentStartListeners: ((event: AgentStartEvent) => void)[] = [];
  private agentProgressListeners: ((event: AgentProgressEvent) => void)[] = [];
  private agentErrorListeners: ((event: AgentErrorEvent) => void)[] = [];
  private agentCompleteListeners: ((event: AgentCompleteEvent) => void)[] = [];
  private agentStopListeners: ((event: AgentStopEvent) => void)[] = [];
  private memoryListeners: ((memory: Memory) => void)[] = [];
  private errorListeners: ((error: any) => void)[] = [];
  private conversationCreatedListeners: ((conversation: Conversation) => void)[] = [];
  private conversationActivatedListeners: ((conversation: Conversation) => void)[] = [];
  private conversationUpdatedListeners: ((conversation: Conversation) => void)[] = [];
  private taskProgressListeners: ((event: TaskProgressEvent) => void)[] = [];
  private toolCallingListeners: ((message: ChatMessage) => void)[] = [];
  private toolCalledListeners: ((message: ChatMessage) => void)[] = [];
  private thinkingStartListeners: (() => void)[] = [];
  private thinkingEndListeners: (() => void)[] = [];
  private apiUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  private isInitialized: boolean = false;

  // 初始化Socket连接
  public init(): void {
    // 如果已经初始化且连接正常，则不再重复初始化
    if (this.socket && this.socket.connected) {
      return;
    }

    // 如果已初始化但连接断开，尝试重新连接
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
      return;
    }

    this.socket = io(this.apiUrl, {
      reconnection: true,       // 启用自动重连
      reconnectionAttempts: 5,  // 最大重连次数
      reconnectionDelay: 1000,  // 重连延迟（毫秒）
      timeout: 10000            // 连接超时时间（毫秒）
    });
    this.isInitialized = true;

    this.socket.on('connect', () => {
      console.log('Socket.IO连接成功');
    });

    this.socket.on('connect_error', (error) => {
      console.error('连接错误:', error);
    });

    this.socket.on('reconnect', () => {
      // 重连成功，无需日志
    });

    this.socket.on('reconnect_attempt', () => {
      // 尝试重连，无需日志
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('重连错误:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('重连失败，已达到最大尝试次数');
    });

    this.socket.on('chat:message', (message: ChatMessage) => {
      this.messageListeners.forEach(listener => listener(message));
    });

    // 工具调用中状态
    this.socket.on('chat:tool_calling', (message: ChatMessage) => {
      this.toolCallingListeners.forEach(listener => listener(message));
    });

    // 工具调用完成状态
    this.socket.on('chat:tool_called', (message: ChatMessage) => {
      this.toolCalledListeners.forEach(listener => listener(message));
    });

    this.socket.on('thinking:steps', (steps: ThinkingStep[]) => {
      this.thinkingStepListeners.forEach(listener => listener(steps));
    });

    // 思考步骤操作更新
    this.socket.on('thinking:step_operation', (operation: ThinkingStepOperation) => {
      this.thinkingStepOperationListeners.forEach(listener => listener(operation));
    });

    // 任务流事件监听
    this.socket.on('agent:start', (event: AgentStartEvent) => {
      this.agentStartListeners.forEach(listener => listener(event));
    });

    this.socket.on('agent:progress', (event: AgentProgressEvent) => {
      this.agentProgressListeners.forEach(listener => listener(event));
    });

    this.socket.on('agent:error', (event: AgentErrorEvent) => {
      this.agentErrorListeners.forEach(listener => listener(event));
    });

    this.socket.on('agent:complete', (event: AgentCompleteEvent) => {
      this.agentCompleteListeners.forEach(listener => listener(event));
    });

    this.socket.on('agent:stop', (event: AgentStopEvent) => {
      this.agentStopListeners.forEach(listener => listener(event));
    });

    this.socket.on('memory:created', (memory: Memory) => {
      this.memoryListeners.forEach(listener => listener(memory));
    });

    this.socket.on('conversation:created', (conversation: Conversation) => {
      this.conversationCreatedListeners.forEach(listener => listener(conversation));
    });

    this.socket.on('conversation:activated', (conversation: Conversation) => {
      this.conversationActivatedListeners.forEach(listener => listener(conversation));
    });

    this.socket.on('conversation:updated', (conversation: Conversation) => {
      this.conversationUpdatedListeners.forEach(listener => listener(conversation));
    });

    this.socket.on('task:progress', (event: TaskProgressEvent) => {
      this.taskProgressListeners.forEach(listener => listener(event));
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket错误:', error);
      this.errorListeners.forEach(listener => listener(error));
    });

    this.socket.on('disconnect', () => {
      // 断开连接，无需日志
    });

    // 思考开始事件
    this.socket.on('chat:thinking_start', () => {
      this.thinkingStartListeners.forEach(listener => listener());
    });

    // 思考结束事件
    this.socket.on('chat:thinking_end', () => {
      this.thinkingEndListeners.forEach(listener => listener());
    });
  }

  // 发送聊天消息
  public sendMessage(content: string): void {
    // 确保Socket已初始化
    if (!this.isInitialized || !this.socket) {
      this.init();
    }

    if (!this.socket) {
      console.error('Socket初始化失败');
      return;
    }

    this.socket.emit('chat:message', content);
  }

  // 发送Agent消息
  public sendAgentMessage(
    content: string,
    useTools: boolean = false,
    options?: {
      enableReflection?: boolean;
      maxSteps?: number;
      confidenceThreshold?: number;
    }
  ): void {
    // 确保Socket已初始化
    if (!this.isInitialized || !this.socket) {
      this.init();
    }

    if (!this.socket) {
      console.error('Socket初始化失败');
      return;
    }

    const request = {
      message: content,
      useTools,
      enableReflection: options?.enableReflection ?? true,
      maxSteps: options?.maxSteps ?? 10,
      confidenceThreshold: options?.confidenceThreshold ?? 0.7
    };

    console.log('发送Agent消息:', request);
    console.log('Socket连接状态:', this.socket?.connected);
    this.socket.emit('agent:start', request);
  }

  // 兼容性方法（保留旧的方法名）
  public sendThinkingMessage(
    content: string,
    useTools: boolean = false,
    options?: {
      level?: number;
      trigger?: 'user' | 'auto';
      reason?: string;
      parentSessionId?: string;
    }
  ): void {
    // 转换为Agent消息格式
    const agentOptions = {
      enableReflection: true,
      maxSteps: 10,
      confidenceThreshold: 0.7
    };
    this.sendAgentMessage(content, useTools, agentOptions);
  }

  // 发送用户对思考步骤的回答
  public sendThinkingUserAnswer(stepId: string, answer: string): void {
    // 确保Socket已初始化
    if (!this.isInitialized || !this.socket) {
      this.init();
    }

    if (!this.socket) {
      console.error('Socket初始化失败');
      return;
    }

    this.socket.emit('thinking:user_answer', { stepId, answer });
  }

  // 创建记忆
  public createMemory(content: string, keywords: string, context: string): void {
    // 确保Socket已初始化
    if (!this.isInitialized || !this.socket) {
      this.init();
    }

    if (!this.socket) {
      console.error('Socket初始化失败');
      return;
    }

    this.socket.emit('memory:create', { content, keywords, context });
  }

  // 添加消息监听器
  public onMessage(listener: (message: ChatMessage) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }

  // 添加思考步骤监听器
  public onThinkingSteps(listener: (steps: ThinkingStep[]) => void): () => void {
    this.thinkingStepListeners.push(listener);
    return () => {
      this.thinkingStepListeners = this.thinkingStepListeners.filter(l => l !== listener);
    };
  }

  // 添加思考步骤操作更新监听器
  public onThinkingStepOperation(listener: (operation: ThinkingStepOperation) => void): () => void {
    this.thinkingStepOperationListeners.push(listener);
    return () => {
      this.thinkingStepOperationListeners = this.thinkingStepOperationListeners.filter(l => l !== listener);
    };
  }

  // 添加记忆监听器
  public onMemoryCreated(listener: (memory: Memory) => void): () => void {
    this.memoryListeners.push(listener);
    return () => {
      this.memoryListeners = this.memoryListeners.filter(l => l !== listener);
    };
  }

  // 添加错误监听器
  public onError(listener: (error: any) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      this.errorListeners = this.errorListeners.filter(l => l !== listener);
    };
  }

  // 创建新对话（会先对当前对话进行反省）
  public createConversation(): void {
    // 确保Socket已初始化
    if (!this.isInitialized || !this.socket) {
      this.init();
    }

    if (!this.socket) {
      console.error('Socket初始化失败');
      return;
    }

    // 创建新对话时会自动对当前对话进行反省
    // 不传递标题，让后端自动生成
    this.socket.emit('conversation:create', { reflectOnCurrent: true });
  }

  // 切换对话
  public activateConversation(conversationId: number): void {
    // 确保Socket已初始化
    if (!this.isInitialized || !this.socket) {
      this.init();
    }

    if (!this.socket) {
      console.error('Socket初始化失败');
      return;
    }

    this.socket.emit('conversation:activate', conversationId);
  }

  // 添加对话创建监听器
  public onConversationCreated(listener: (conversation: Conversation) => void): () => void {
    this.conversationCreatedListeners.push(listener);
    return () => {
      this.conversationCreatedListeners = this.conversationCreatedListeners.filter(l => l !== listener);
    };
  }

  // 添加对话激活监听器
  public onConversationActivated(listener: (conversation: Conversation) => void): () => void {
    this.conversationActivatedListeners.push(listener);
    return () => {
      this.conversationActivatedListeners = this.conversationActivatedListeners.filter(l => l !== listener);
    };
  }

  // 添加对话更新监听器
  public onConversationUpdated(listener: (conversation: Conversation) => void): () => void {
    this.conversationUpdatedListeners.push(listener);
    return () => {
      this.conversationUpdatedListeners = this.conversationUpdatedListeners.filter(l => l !== listener);
    };
  }

  // 添加任务进度监听器
  public onTaskProgress(listener: (event: TaskProgressEvent) => void): () => void {
    this.taskProgressListeners.push(listener);
    return () => {
      this.taskProgressListeners = this.taskProgressListeners.filter(l => l !== listener);
    };
  }

  // 移除任务进度监听器
  public offTaskProgress(listener: (event: TaskProgressEvent) => void): void {
    this.taskProgressListeners = this.taskProgressListeners.filter(l => l !== listener);
  }

  // 添加工具调用中监听器
  public onToolCalling(listener: (message: ChatMessage) => void): () => void {
    this.toolCallingListeners.push(listener);
    return () => {
      this.toolCallingListeners = this.toolCallingListeners.filter(l => l !== listener);
    };
  }

  // 添加工具调用完成监听器
  public onToolCalled(listener: (message: ChatMessage) => void): () => void {
    this.toolCalledListeners.push(listener);
    return () => {
      this.toolCalledListeners = this.toolCalledListeners.filter(l => l !== listener);
    };
  }

  // 添加思考开始监听器
  public onThinkingStart(listener: () => void): () => void {
    this.thinkingStartListeners.push(listener);
    return () => {
      this.thinkingStartListeners = this.thinkingStartListeners.filter(l => l !== listener);
    };
  }

  // 添加思考结束监听器
  public onThinkingEnd(listener: () => void): () => void {
    this.thinkingEndListeners.push(listener);
    return () => {
      this.thinkingEndListeners = this.thinkingEndListeners.filter(l => l !== listener);
    };
  }

  // 断开连接
  public disconnect(): void {
    // 保持连接，不断开
    // 这样可以避免在页面切换时断开连接
  }

  // 强制断开连接（仅在应用退出或用户登出时使用）
  public forceDisconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isInitialized = false;
    }
  }

  // ===== 操作相关方法 =====

  // 创建操作
  public async createOperation(
    type: string,
    description: string,
    details: string[],
    command: string,
    args: any[],
    userId: string = 'anonymous'
  ): Promise<Operation> {
    try {
      const response = await axios.post(`${this.apiUrl}/api/operations/create`, {
        type,
        description,
        details,
        command,
        args,
        userId
      });

      return response.data.operation;
    } catch (error: any) {
      console.error('创建操作失败:', error);
      throw new Error(error.response?.data?.message || '创建操作失败');
    }
  }

  // 执行操作
  public async executeOperation(operation: Operation, confirmed: boolean = false): Promise<any> {
    try {
      const response = await axios.post(`${this.apiUrl}/api/operations/execute`, {
        operation,
        confirmed
      });

      return response.data.result;
    } catch (error: any) {
      console.error('执行操作失败:', error);
      throw new Error(error.response?.data?.message || '执行操作失败');
    }
  }

  // 取消操作
  public async cancelOperation(operation: Operation): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/api/operations/cancel`, {
        operation
      });
    } catch (error: any) {
      console.error('取消操作失败:', error);
      throw new Error(error.response?.data?.message || '取消操作失败');
    }
  }

  // 获取审计日志
  public async getAuditLogs(
    filters: {
      userId?: string;
      operationType?: string;
      riskLevel?: string;
      success?: boolean;
      startTime?: number;
      endTime?: number;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<any[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/operations/audit-logs`, {
        params: filters
      });

      return response.data.logs;
    } catch (error: any) {
      console.error('获取审计日志失败:', error);
      throw new Error(error.response?.data?.message || '获取审计日志失败');
    }
  }

  // 从快照恢复
  public async restoreFromSnapshot(snapshotId: string): Promise<boolean> {
    try {
      const response = await axios.post(`${this.apiUrl}/api/operations/restore`, {
        snapshotId
      });

      return response.data.success;
    } catch (error: any) {
      console.error('从快照恢复失败:', error);
      throw new Error(error.response?.data?.message || '从快照恢复失败');
    }
  }

  // Agent监听器管理方法
  public addAgentStartListener(listener: (event: AgentStartEvent) => void): void {
    this.agentStartListeners.push(listener);
  }

  public removeAgentStartListener(listener: (event: AgentStartEvent) => void): void {
    const index = this.agentStartListeners.indexOf(listener);
    if (index > -1) {
      this.agentStartListeners.splice(index, 1);
    }
  }

  public addAgentProgressListener(listener: (event: AgentProgressEvent) => void): void {
    this.agentProgressListeners.push(listener);
  }

  public removeAgentProgressListener(listener: (event: AgentProgressEvent) => void): void {
    const index = this.agentProgressListeners.indexOf(listener);
    if (index > -1) {
      this.agentProgressListeners.splice(index, 1);
    }
  }

  public addAgentErrorListener(listener: (event: AgentErrorEvent) => void): void {
    this.agentErrorListeners.push(listener);
  }

  public removeAgentErrorListener(listener: (event: AgentErrorEvent) => void): void {
    const index = this.agentErrorListeners.indexOf(listener);
    if (index > -1) {
      this.agentErrorListeners.splice(index, 1);
    }
  }

  public addAgentCompleteListener(listener: (event: AgentCompleteEvent) => void): void {
    this.agentCompleteListeners.push(listener);
  }

  public removeAgentCompleteListener(listener: (event: AgentCompleteEvent) => void): void {
    const index = this.agentCompleteListeners.indexOf(listener);
    if (index > -1) {
      this.agentCompleteListeners.splice(index, 1);
    }
  }

  public addAgentStopListener(listener: (event: AgentStopEvent) => void): void {
    this.agentStopListeners.push(listener);
  }

  public removeAgentStopListener(listener: (event: AgentStopEvent) => void): void {
    const index = this.agentStopListeners.indexOf(listener);
    if (index > -1) {
      this.agentStopListeners.splice(index, 1);
    }
  }
}

// 导出类型
export type { Conversation, ToolCall, ToolCallResult, ChatMessage };

// 导出单例
export const socketService = new SocketService();
