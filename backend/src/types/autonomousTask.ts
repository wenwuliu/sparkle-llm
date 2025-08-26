/**
 * 自主任务执行框架的类型定义
 */

// 任务步骤
export interface TaskStep {
  type: string;
  description: string;
  params: any;
  expected_output?: string;
  possible_errors?: string[];
  fallback_strategies?: string[];
  output?: string;
}

// 任务计划
export interface TaskPlan {
  summary: string;
  steps: TaskStep[];
}

// 步骤执行结果
export interface StepResult {
  success: boolean;
  output?: string;
  error?: any;
}

// 任务执行结果
export interface TaskResult {
  success: boolean;
  message: string;
  details: string;
}

// 问题解决方案
export interface ProblemSolution {
  hasSolution: boolean;
  summary?: string;
  details?: string;
  steps?: TaskStep[];
  reason?: string;
}

// 任务进度事件
export interface TaskProgress {
  type: string;
  message: string;
  details?: string;
  stepIndex?: number;
  steps?: string[];
}

// 任务进度事件（带有任务ID和时间戳）
export interface TaskProgressEvent extends TaskProgress {
  taskId: string;
  timestamp: number;
}
