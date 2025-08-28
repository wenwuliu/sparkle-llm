/**
 * 前端Agent类型定义
 * 与后端Agent系统保持一致
 */

// 基础类型
export type AgentStatus = 'idle' | 'planning' | 'reasoning' | 'acting' | 'observing' | 'reflecting' | 'completed' | 'failed' | 'paused';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type StepType = 'reasoning' | 'action' | 'observation' | 'reflection' | 'planning';

// 思考步骤
export interface Thought {
  id: string;
  type: 'analysis' | 'planning' | 'decision' | 'evaluation' | 'reflection';
  content: string;
  confidence: number;
  reasoning: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// 执行步骤
export interface TaskStep {
  id: string;
  type: StepType;
  description: string;
  expectedOutcome: string;
  dependencies: string[];
  status: StepStatus;
  result?: any;
  error?: string;
  thoughts: Thought[];
  startTime?: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

// 执行上下文
export interface ExecutionContext {
  task: string;
  goal: string;
  constraints: string[];
  availableTools: any[];
  memory: any[];
  conversationHistory: any[];
  userPreferences: Record<string, any>;
  environment: Record<string, any>;
}

// Agent状态
export interface AgentState {
  id: string;
  task: string;
  goal: string;
  status: AgentStatus;
  currentStep: number;
  totalSteps: number;
  plan: TaskStep[];
  context: ExecutionContext;
  history: ActionHistory[];
  startTime: number;
  lastUpdateTime: number;
  progress: number;
  confidence: number;
  errorCount: number;
  retryCount: number;
  metadata: Record<string, any>;
}

// 执行历史
export interface ActionHistory {
  id: string;
  stepId: string;
  type: StepType;
  description: string;
  input: any;
  output: any;
  success: boolean;
  error?: string;
  timestamp: number;
  duration: number;
  thoughts: Thought[];
}

// 执行结果
export interface ExecutionResult {
  success: boolean;
  result: any;
  summary: string;
  taskConclusion?: any;  // 新增：任务结论总结
  steps: TaskStep[];
  history: ActionHistory[];
  executionTime: number;
  errorCount: number;
  confidence: number;
  recommendations: string[];
  metadata: Record<string, any>;
}

// 进度事件
export interface ProgressEvent {
  type: 'step_start' | 'step_complete' | 'step_error' | 'progress_update' | 'status_change';
  agentId: string;
  stepId?: string;
  status: AgentStatus;
  progress: number;
  message: string;
  data?: any;
  timestamp: number;
}

// 错误信息
export interface AgentError {
  type: 'tool_error' | 'reasoning_error' | 'planning_error' | 'execution_error' | 'validation_error';
  message: string;
  details: string;
  stepId?: string;
  recoverable: boolean;
  suggestions: string[];
  timestamp: number;
}

// 工具调用结果
export interface ToolCallResult {
  toolName: string;
  input: any;
  output: any;
  success: boolean;
  error?: string;
  executionTime: number;
  metadata?: Record<string, any>;
}

// 推理结果
export interface ReasoningResult {
  thoughts: Thought[];
  nextAction: string;
  confidence: number;
  reasoning: string;
  alternatives: string[];
  metadata?: Record<string, any>;
}

// 观察结果
export interface ObservationResult {
  observations: string[];
  insights: string[];
  implications: string[];
  nextSteps: string[];
  confidence: number;
  metadata?: Record<string, any>;
}

// 反思结果
export interface ReflectionResult {
  whatWorked: string[];
  whatDidntWork: string[];
  lessonsLearned: string[];
  improvements: string[];
  nextTimeStrategy: string;
  confidence: number;
  metadata?: Record<string, any>;
}

// Agent配置
export interface AgentConfig {
  maxSteps: number;
  maxRetries: number;
  timeout: number;
  enableReflection: boolean;
  enableMemory: boolean;
  enableProgressTracking: boolean;
  reasoningModel: string;
  actionModel: string;
  reflectionModel: string;
  confidenceThreshold: number;
  metadata?: Record<string, any>;
}

// Agent会话信息
export interface AgentSession {
  id: string;
  task: string;
  goal: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  startTime: number;
  result?: ExecutionResult;
  error?: AgentError;
  agentState?: AgentState;
}

// Socket事件类型
export interface AgentStartEvent {
  sessionId: string;
  task: string;
  goal: string;
  useTools?: boolean;
  enableReflection?: boolean;
  maxSteps?: number;
  confidenceThreshold?: number;
  timestamp: string;
}

export interface AgentProgressEvent extends ProgressEvent {
  sessionId: string;
}

export interface AgentErrorEvent {
  sessionId: string;
  error: AgentError;
}

export interface AgentCompleteEvent {
  sessionId: string;
  result: ExecutionResult;
  timestamp: string;
}

export interface AgentStopEvent {
  sessionId: string;
  timestamp: string;
}
