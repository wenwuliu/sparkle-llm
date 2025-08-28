/**
 * 任务流提示词服务
 * 为Agent系统提供任务流相关的提示词模板
 */

export class TaskFlowPromptService {
  /**
   * 获取任务规划提示词
   */
  getTaskPlanningPrompt(task: string, goal: string, context: any): string {
    return `你是一个专业的任务规划专家。请为以下任务制定详细的执行计划：

任务：${task}
目标：${goal}

可用工具：${context.availableTools?.map((tool: any) => tool.name).join(', ') || '无'}
约束条件：${context.constraints?.join(', ') || '无'}
相关记忆：${context.memory?.length || 0} 条

请制定一个详细的执行计划，包括：
1. 任务分解：将任务分解为具体的执行步骤
2. 步骤顺序：确定步骤的执行顺序和依赖关系
3. 工具选择：为每个步骤选择合适的工具
4. 预期结果：每个步骤的预期输出

请以JSON格式输出：
{
  "steps": [
    {
      "id": "step_1",
      "type": "reasoning|action|observation",
      "description": "步骤描述",
      "expectedOutcome": "预期结果",
      "dependencies": ["依赖的步骤ID"],
      "tools": ["需要的工具名称"]
    }
  ],
  "estimatedSteps": 5,
  "confidence": 0.8
}`;
  }

  /**
   * 获取推理提示词
   */
  getReasoningPrompt(step: any, context: any): string {
    return `你是一个专业的推理专家。请分析当前步骤并制定下一步行动计划：

当前步骤：${step.description}
预期结果：${step.expectedOutcome}
可用工具：${context.availableTools?.map((tool: any) => tool.name).join(', ') || '无'}

请进行深入分析并制定行动计划：

请以JSON格式输出：
{
  "thoughts": [
    {
      "type": "analysis|planning|decision",
      "content": "思考内容",
      "confidence": 0.8,
      "reasoning": "推理过程"
    }
  ],
  "nextAction": "下一步行动计划",
  "confidence": 0.8,
  "reasoning": "决策理由",
  "alternatives": ["备选方案"]
}`;
  }

  /**
   * 获取行动执行提示词
   */
  getActionExecutionPrompt(step: any, reasoningResult: any, context: any): string {
    return `你是一个专业的行动执行专家。请根据推理结果执行具体的工具调用：

推理结果：${JSON.stringify(reasoningResult, null, 2)}
可用工具：${context.availableTools?.map((tool: any) => `${tool.name}: ${tool.description}`).join('\n') || '无'}

请制定具体的工具调用计划：

请以JSON格式输出：
{
  "toolCalls": [
    {
      "toolName": "工具名称",
      "input": {
        "参数名": "参数值"
      },
      "reasoning": "为什么选择这个工具和参数"
    }
  ],
  "executionOrder": ["工具调用顺序"],
  "expectedResults": ["预期结果"]
}`;
  }

  /**
   * 获取观察分析提示词
   */
  getObservationPrompt(step: any, actionResults: any[], context: any): string {
    return `你是一个专业的观察分析专家。请分析工具执行结果并提取关键信息：

执行结果：${JSON.stringify(actionResults, null, 2)}
预期结果：${step.expectedOutcome}

请进行深入分析：

请以JSON格式输出：
{
  "observations": [
    "观察到的关键信息"
  ],
  "insights": [
    "洞察和发现"
  ],
  "implications": [
    "影响和含义"
  ],
  "nextSteps": [
    "建议的下一步行动"
  ],
  "confidence": 0.8
}`;
  }

  /**
   * 获取反思提示词
   */
  getReflectionPrompt(executionHistory: any[], finalResult: any): string {
    return `你是一个专业的反思专家。请对整个执行过程进行反思和总结：

执行历史：${JSON.stringify(executionHistory, null, 2)}
最终结果：${JSON.stringify(finalResult, null, 2)}

请进行深入反思：

请以JSON格式输出：
{
  "whatWorked": [
    "成功的方面"
  ],
  "whatDidntWork": [
    "失败的方面"
  ],
  "lessonsLearned": [
    "学到的经验"
  ],
  "improvements": [
    "改进建议"
  ],
  "nextTimeStrategy": "下次执行的策略",
  "confidence": 0.8
}`;
  }

  /**
   * 获取任务执行提示词
   */
  getTaskExecutionPrompt(
    task: string,
    goal: string,
    availableTools: any[] = [],
    toolCallHistory: any[] = []
  ): string {
    return `你是一个专业的任务执行专家。请根据任务目标和可用工具制定执行计划：

任务：${task}
目标：${goal}
可用工具：${availableTools.map((tool: any) => tool.name).join(', ') || '无'}
工具调用历史：${toolCallHistory.length > 0 ? JSON.stringify(toolCallHistory, null, 2) : '无'}

请制定详细的执行计划：

请以JSON格式输出：
{
  "executionPlan": [
    {
      "step": "步骤描述",
      "tool": "工具名称",
      "parameters": "参数",
      "expectedResult": "预期结果"
    }
  ],
  "confidence": 0.8
}`;
  }

  /**
   * 获取工具结果提示词
   */
  getToolResultPrompt(
    previousContent: string,
    toolResults: any[],
    goal: string
  ): string {
    return `你是一个专业的工具结果分析专家。请分析工具执行结果并生成用户友好的回复：

之前内容：${previousContent}
工具执行结果：${JSON.stringify(toolResults, null, 2)}
目标：${goal}

请分析结果并生成回复：

请以JSON格式输出：
{
  "analysis": "结果分析",
  "response": "用户友好的回复",
  "confidence": 0.8
}`;
  }
}

// 创建服务实例
export const taskFlowPromptService = new TaskFlowPromptService();
