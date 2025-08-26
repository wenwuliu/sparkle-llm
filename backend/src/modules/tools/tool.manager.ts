/**
 * 工具管理器
 */
import { Tool } from './interfaces/tool.interface';
import { ToolCall, ToolCallResult } from './tools.types';

/**
 * 工具管理类
 * 负责注册、获取和执行工具
 */
export class ToolManager {
  /**
   * 工具映射表
   */
  private tools: Map<string, Tool> = new Map();



  /**
   * 当前任务流层级
   */
  private taskFlowDepth: number = 0;

  /**
   * 任务流会话跟踪
   */
  private taskFlowSessions: Set<string> = new Set();

  /**
   * 最大任务流层级限制
   */
  private readonly MAX_TASK_FLOW_DEPTH = 1;

  /**
   * 注册工具
   * @param tool 工具对象
   */
  registerTool(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`工具 ${tool.name} 已存在，将被覆盖`);
    }
    this.tools.set(tool.name, tool);
    console.log(`工具 ${tool.name} 已注册`);
  }

  /**
   * 获取工具
   * @param name 工具名称
   * @returns 工具对象或undefined
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有工具
   * @returns 工具数组
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 获取工具描述（用于大模型API）- 传统格式
   * @returns 工具描述数组
   */
  getToolDescriptions(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
    }));
  }

  /**
   * 获取OpenAI兼容的函数调用格式工具描述
   * @returns OpenAI兼容的函数调用格式工具描述
   */
  getOpenAIFunctionTools(): any[] {
    let toolsToUse = Array.from(this.tools.values());



    // 过滤掉任务流工具，如果当前任务流层级大于等于1
    if (this.taskFlowDepth >= 1) {
      toolsToUse = toolsToUse.filter(tool => tool.name !== 'task_flow');
    }

    return toolsToUse.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          ...tool.input_schema,
          // 确保有type字段
          type: tool.input_schema.type || 'object'
        }
      }
    }));
  }

  /**
   * 执行工具
   * @param name 工具名称
   * @param input 工具输入参数
   * @returns 工具调用结果
   */
  async executeTool(name: string, input: any): Promise<ToolCallResult> {


    // 安全检查：防止任务流工具的递归调用
    if (name === 'task_flow' && this.taskFlowDepth >= this.MAX_TASK_FLOW_DEPTH) {
      console.warn(`拒绝执行任务流工具：当前层级 ${this.taskFlowDepth} 已达到最大限制 ${this.MAX_TASK_FLOW_DEPTH}`);
      return {
        tool_name: name,
        tool_input: input,
        tool_output: {
          success: false,
          message: `已达到最大任务流层级限制（${this.MAX_TASK_FLOW_DEPTH}层），无法启动新的任务流以防止递归调用`,
          current_depth: this.taskFlowDepth,
          security_note: '此限制是为了防止无限递归调用，确保系统稳定性'
        },
        error: null,
      };
    }

    const tool = this.tools.get(name);
    if (!tool) {
      return {
        tool_name: name,
        tool_input: input,
        tool_output: null,
        error: `工具 ${name} 不存在`,
      };
    }

    try {
      const output = await tool.handler(input);
      return {
        tool_name: name,
        tool_input: input,
        tool_output: output,
      };
    } catch (error) {
      console.error(`执行工具 ${name} 错误:`, error);
      return {
        tool_name: name,
        tool_input: input,
        tool_output: null,
        error: `执行工具错误: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * 批量执行工具
   * @param toolCalls 工具调用数组
   * @returns 工具调用结果数组
   */
  async executeTools(toolCalls: ToolCall[]): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];

    for (const call of toolCalls) {
      const result = await this.executeTool(call.name, call.input);
      results.push(result);
    }

    return results;
  }



  // ===== 任务流相关方法 =====

  /**
   * 增加任务流层级
   */
  incrementTaskFlowDepth(): void {
    this.taskFlowDepth++;
    console.log(`任务流层级增加到: ${this.taskFlowDepth}`);
  }

  /**
   * 减少任务流层级
   */
  decrementTaskFlowDepth(): void {
    if (this.taskFlowDepth > 0) {
      this.taskFlowDepth--;
      console.log(`任务流层级减少到: ${this.taskFlowDepth}`);
    }
  }

  /**
   * 重置任务流层级
   */
  resetTaskFlowDepth(): void {
    this.taskFlowDepth = 0;
    console.log('任务流层级已重置');
  }

  /**
   * 获取当前任务流层级
   * @returns 当前任务流层级
   */
  getTaskFlowDepth(): number {
    return this.taskFlowDepth;
  }

  /**
   * 添加任务流会话
   * @param sessionId 会话ID
   */
  addTaskFlowSession(sessionId: string): void {
    this.taskFlowSessions.add(sessionId);
    console.log(`添加任务流会话: ${sessionId}, 当前活跃会话数: ${this.taskFlowSessions.size}`);
  }

  /**
   * 移除任务流会话
   * @param sessionId 会话ID
   */
  removeTaskFlowSession(sessionId: string): void {
    this.taskFlowSessions.delete(sessionId);
    console.log(`移除任务流会话: ${sessionId}, 当前活跃会话数: ${this.taskFlowSessions.size}`);
  }

  /**
   * 获取活跃的任务流会话数量
   * @returns 活跃会话数量
   */
  getActiveTaskFlowSessionCount(): number {
    return this.taskFlowSessions.size;
  }

  /**
   * 检查是否可以启动新的任务流会话
   * @returns 是否可以启动
   */
  canStartNewTaskFlowSession(): boolean {
    return this.taskFlowDepth < this.MAX_TASK_FLOW_DEPTH && this.taskFlowSessions.size === 0;
  }

  /**
   * 清理所有任务流会话（用于紧急情况）
   */
  clearAllTaskFlowSessions(): void {
    console.warn('清理所有任务流会话');
    this.taskFlowSessions.clear();
    this.taskFlowDepth = 0;
  }
}

// 创建工具管理器实例
export const toolManager = new ToolManager();
