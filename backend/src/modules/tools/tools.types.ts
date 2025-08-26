/**
 * 工具相关类型定义
 */

/**
 * 工具调用结果类型
 */
export interface ToolCallResult {
  /**
   * 工具名称
   */
  tool_name: string;

  /**
   * 工具输入参数
   */
  tool_input: any;

  /**
   * 工具输出结果
   */
  tool_output: any;

  /**
   * 错误信息（如果有）
   */
  error?: string;
}

/**
 * 工具调用类型
 */
export interface ToolCall {
  /**
   * 工具名称
   */
  name: string;

  /**
   * 工具输入参数
   */
  input: any;
}

/**
 * 工具风险等级
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * 工具类别
 */
export enum ToolCategory {
  SYSTEM = 'system',
  MEMORY = 'memory',
  FILE = 'file',
  NETWORK = 'network',
  UTILITY = 'utility',
  THINKING = 'thinking'
}
