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

  
}

// 导出单例实例
export const taskFlowPromptService = new TaskFlowPromptService();
