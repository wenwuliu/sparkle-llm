/**
 * 任务流提示词服务
 * 为任务流功能提供专门的提示词模板
 */

/**
 * 任务流提示词服务类
 */
export class TaskFlowPromptService {
  
  /**
   * 获取任务执行提示词
   * @param task 任务描述
   * @param goal 任务目标
   * @param availableTools 可用工具列表
   * @param toolCallHistory 工具调用历史
   * @returns 任务执行提示词
   */
  getTaskExecutionPrompt(
    task: string,
    goal: string,
    availableTools: any[] = [],
    toolCallHistory: any[] = []
  ): string {
    // 构建工具列表文本
    let toolsText = '';
    if (availableTools.length > 0) {
      toolsText = '\n\n可用工具:\n';
      availableTools.forEach((tool: any) => {
        toolsText += `- ${tool.name}: ${tool.description}\n`;
        toolsText += `  输入参数: ${JSON.stringify(tool.input_schema, null, 2)}\n`;
      });
    }

    // 构建工具调用历史文本
    let historyText = '';
    if (toolCallHistory.length > 0) {
      historyText = '\n\n之前的工具调用历史:\n';
      toolCallHistory.forEach((record: any, index: number) => {
        historyText += `${index + 1}. 工具: ${record.toolName}\n`;
        historyText += `   输入: ${JSON.stringify(record.input)}\n`;
        if (record.success) {
          historyText += `   结果: ${JSON.stringify(record.output)}\n`;
        } else {
          historyText += `   错误: ${record.error}\n`;
        }
      });
    }

    return `你是Sparkle的任务执行引擎，负责完成用户指定的复杂任务。

任务描述: ${task}

最终目标: ${goal}

执行原则:
1. 专注于达成最终目标，不要偏离任务主线
2. 根据需要主动调用工具获取信息或执行操作
3. 基于已获取的信息进行分析和决策
4. 保持连续的上下文，充分利用之前获得的所有信息
5. 当目标达成时，明确说明"任务完成"

工作流程:
1. 分析任务需求，确定需要什么信息或操作
2. 调用相应工具获取信息或执行操作
3. 基于工具结果继续分析和执行
4. 重复上述过程直到目标达成
5. 提供最终结果并说明任务完成

${toolsText}

${historyText}

请开始分析任务并执行。如果需要获取信息或执行操作，请调用相应的工具。记住要始终围绕最终目标进行工作。`;
  }

  /**
   * 获取工具结果处理提示词
   * @param previousContent 之前的内容
   * @param toolResults 工具执行结果
   * @param goal 任务目标
   * @returns 工具结果处理提示词
   */
  getToolResultPrompt(
    previousContent: string,
    toolResults: any[],
    goal: string
  ): string {
    // 构建工具结果文本
    let resultsText = '\n\n工具执行结果:\n';
    toolResults.forEach((result: any, index: number) => {
      resultsText += `${index + 1}. 工具: ${result.tool_name}\n`;
      resultsText += `   输入: ${JSON.stringify(result.tool_input)}\n`;
      if (result.success) {
        resultsText += `   输出: ${JSON.stringify(result.tool_output)}\n`;
      } else {
        resultsText += `   错误: ${result.error}\n`;
      }
    });

    return `${previousContent}

${resultsText}

基于上述工具执行结果，请继续分析并朝着目标前进: ${goal}

如果还需要更多信息或操作，请继续调用相应的工具。
如果已经获得足够信息可以达成目标，请提供最终结果并说明"任务完成"。`;
  }

  /**
   * 获取任务完成确认提示词
   * @param task 任务描述
   * @param goal 任务目标
   * @param executionSummary 执行摘要
   * @returns 任务完成确认提示词
   */
  getTaskCompletionPrompt(
    task: string,
    goal: string,
    executionSummary: string
  ): string {
    return `任务执行摘要:

原始任务: ${task}
目标: ${goal}

执行过程:
${executionSummary}

请确认任务是否已经完成，目标是否达成。如果是，请说明"任务完成"并提供最终结果。如果还需要进一步操作，请说明需要做什么。`;
  }

  /**
   * 获取错误处理提示词
   * @param task 任务描述
   * @param goal 任务目标
   * @param error 错误信息
   * @param previousAttempts 之前的尝试
   * @returns 错误处理提示词
   */
  getErrorHandlingPrompt(
    task: string,
    goal: string,
    error: string,
    previousAttempts: string[]
  ): string {
    let attemptsText = '';
    if (previousAttempts.length > 0) {
      attemptsText = '\n\n之前的尝试:\n';
      previousAttempts.forEach((attempt: string, index: number) => {
        attemptsText += `${index + 1}. ${attempt}\n`;
      });
    }

    return `任务执行遇到错误:

任务: ${task}
目标: ${goal}
错误: ${error}

${attemptsText}

请分析错误原因，调整策略，尝试其他方法继续完成任务。可以:
1. 使用不同的工具或参数
2. 分解任务为更小的步骤
3. 寻找替代方案
4. 基于已有信息给出最佳结果

请继续执行任务，朝着目标前进。`;
  }

  /**
   * 获取用户交互提示词
   * @param task 任务描述
   * @param goal 任务目标
   * @param question 需要询问用户的问题
   * @param context 当前上下文
   * @returns 用户交互提示词
   */
  getUserInteractionPrompt(
    task: string,
    goal: string,
    question: string,
    context: string
  ): string {
    return `任务执行过程中需要用户输入:

任务: ${task}
目标: ${goal}
当前情况: ${context}

需要询问用户: ${question}

请等待用户回答后继续执行任务。`;
  }

  /**
   * 获取任务超时处理提示词
   * @param task 任务描述
   * @param goal 任务目标
   * @param executedSteps 已执行的步骤
   * @returns 任务超时处理提示词
   */
  getTimeoutHandlingPrompt(
    task: string,
    goal: string,
    executedSteps: string[]
  ): string {
    let stepsText = '';
    if (executedSteps.length > 0) {
      stepsText = '\n\n已执行的步骤:\n';
      executedSteps.forEach((step: string, index: number) => {
        stepsText += `${index + 1}. ${step}\n`;
      });
    }

    return `任务执行超时，需要总结当前进展:

任务: ${task}
目标: ${goal}

${stepsText}

请基于已完成的工作，提供当前能够给出的最佳结果。如果目标已部分达成，请说明完成的部分。如果需要继续，请说明剩余的工作。`;
  }
}

// 导出单例实例
export const taskFlowPromptService = new TaskFlowPromptService();
