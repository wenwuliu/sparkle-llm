/**
 * Agent提示词系统
 * 基于ReAct框架的结构化提示词模板
 */

import { ExecutionContext, TaskStep, Thought } from '../types/agent.types';

/**
 * 提示词构建器类
 */
export class AgentPromptBuilder {
  
  /**
   * 构建任务分析提示词
   */
  static buildTaskAnalysisPrompt(task: string, goal: string, context: ExecutionContext): string {
    return `你是一个智能任务分析专家。请仔细分析以下任务，并提供详细的分析和规划建议。

## 任务信息
**任务描述**: ${task}
**目标**: ${goal}

## 可用资源
**可用工具**: ${context.availableTools.map(t => t.name).join(', ')}
**约束条件**: ${context.constraints.join(', ') || '无特殊约束'}

## 分析要求
请从以下角度进行分析：

1. **任务复杂度评估**
   - 任务类型（简单查询/复杂操作/多步骤流程）
   - 预计所需步骤数量
   - 关键依赖关系

2. **资源需求分析**
   - 需要哪些工具
   - 需要什么信息
   - 可能的瓶颈点

3. **执行策略建议**
   - 最佳执行顺序
   - 风险点识别
   - 备选方案

4. **成功标准**
   - 如何判断任务完成
   - 质量检查点
   - 验收标准

请提供结构化的分析结果，包括：
- 任务分解建议
- 执行步骤规划
- 风险评估
- 成功标准定义

分析格式：
\`\`\`json
{
  "complexity": "high|medium|low",
  "estimatedSteps": 5,
  "requiredTools": ["tool1", "tool2"],
  "keyDependencies": ["step1", "step2"],
  "riskPoints": ["risk1", "risk2"],
  "successCriteria": ["criteria1", "criteria2"],
  "executionStrategy": "详细描述执行策略"
}
\`\`\``;
  }

  /**
   * 构建推理提示词
   */
  static buildReasoningPrompt(
    currentStep: TaskStep,
    context: ExecutionContext,
    history: any[]
  ): string {
    const recentHistory = history.slice(-5); // 最近5个步骤
    
    return `你是一个智能推理引擎。基于当前状态和历史信息，请进行深入思考并决定下一步行动。

## 当前状态
**当前步骤**: ${currentStep.description}
**期望结果**: ${currentStep.expectedOutcome}
**步骤类型**: ${currentStep.type}

## 执行上下文
**任务**: ${context.task}
**目标**: ${context.goal}
**可用工具**: ${context.availableTools.map(t => t.name).join(', ')}

## 最近历史
${recentHistory.map(h => `- ${h.description} (${h.success ? '成功' : '失败'})`).join('\n')}

## 推理要求
请进行以下思考：

1. **现状分析**
   - 当前进展如何？
   - 遇到了什么问题？
   - 还需要什么信息？

2. **下一步决策**
   - 应该采取什么行动？
   - 为什么选择这个行动？
   - 预期结果是什么？

3. **风险评估**
   - 可能遇到什么困难？
   - 如何应对？
   - 备选方案是什么？

4. **信心评估**
   - 对当前决策的信心程度（0-1）
   - 不确定性的来源
   - 需要验证的假设

请提供结构化的推理结果：

\`\`\`json
{
  "thoughts": [
    {
      "type": "analysis",
      "content": "分析当前状况",
      "confidence": 0.8,
      "reasoning": "详细推理过程"
    }
  ],
  "nextAction": "具体行动描述",
  "confidence": 0.7,
  "reasoning": "决策理由",
  "alternatives": ["备选方案1", "备选方案2"],
  "risks": ["风险1", "风险2"],
  "expectedOutcome": "预期结果"
}
\`\`\``;
  }

  /**
   * 构建行动执行提示词
   */
  static buildActionPrompt(
    action: string,
    tools: any[],
    context: ExecutionContext
  ): string {
    return `你是一个智能行动执行器。请根据以下信息执行指定的行动。

## 行动要求
**行动描述**: ${action}

## 可用工具
${tools.map(tool => `
**${tool.name}**
- 描述: ${tool.description}
- 参数: ${JSON.stringify(tool.input_schema, null, 2)}
`).join('\n')}

## 执行要求
1. **工具选择**: 根据行动需求选择合适的工具
2. **参数准备**: 准备正确的输入参数
3. **执行计划**: 制定详细的执行步骤
4. **结果预期**: 明确期望的输出结果

## 执行格式
请按以下格式提供执行计划：

\`\`\`json
{
  "toolCalls": [
    {
      "toolName": "工具名称",
      "input": {
        "参数1": "值1",
        "参数2": "值2"
      },
      "reasoning": "为什么选择这个工具和参数"
    }
  ],
  "executionPlan": "详细的执行步骤",
  "expectedResults": "期望的结果",
  "fallbackPlan": "如果失败时的备选方案"
}
\`\`\``;
  }

  /**
   * 构建观察分析提示词
   */
  static buildObservationPrompt(
    actionResult: any,
    expectedOutcome: string,
    context: ExecutionContext
  ): string {
    return `你是一个智能观察分析器。请分析以下行动结果，并提供深入的观察和洞察。

## 行动结果
**执行结果**: ${JSON.stringify(actionResult, null, 2)}
**期望结果**: ${expectedOutcome}

## 分析要求
请从以下角度进行分析：

1. **结果评估**
   - 结果是否符合预期？
   - 质量如何？
   - 有什么异常？

2. **洞察提取**
   - 发现了什么新信息？
   - 有什么重要发现？
   - 对后续行动有什么启示？

3. **影响分析**
   - 这个结果对任务进展有什么影响？
   - 是否需要调整计划？
   - 下一步应该做什么？

4. **问题识别**
   - 遇到了什么问题？
   - 原因是什么？
   - 如何解决？

请提供结构化的观察结果：

\`\`\`json
{
  "observations": [
    "观察1",
    "观察2"
  ],
  "insights": [
    "洞察1",
    "洞察2"
  ],
  "implications": [
    "影响1",
    "影响2"
  ],
  "nextSteps": [
    "下一步1",
    "下一步2"
  ],
  "confidence": 0.8,
  "issues": [
    {
      "type": "问题类型",
      "description": "问题描述",
      "severity": "high|medium|low",
      "suggestions": ["建议1", "建议2"]
    }
  ]
}
\`\`\``;
  }

  /**
   * 构建反思提示词
   */
  static buildReflectionPrompt(
    steps: TaskStep[],
    history: any[],
    context: ExecutionContext
  ): string {
    const completedSteps = steps.filter(s => s.status === 'completed');
    const failedSteps = steps.filter(s => s.status === 'failed');
    
    return `你是一个智能反思分析器。请对整个执行过程进行深入反思和总结。

## 执行概况
**总步骤数**: ${steps.length}
**成功步骤**: ${completedSteps.length}
**失败步骤**: ${failedSteps.length}
**任务**: ${context.task}
**目标**: ${context.goal}

## 执行历史
${history.map(h => `- ${h.description} (${h.success ? '成功' : '失败'}) - ${h.duration}ms`).join('\n')}

## 反思要求
请从以下角度进行反思：

1. **成功因素**
   - 哪些做法是有效的？
   - 为什么这些做法有效？
   - 可以如何复制这些成功？

2. **问题分析**
   - 遇到了什么困难？
   - 失败的原因是什么？
   - 如何避免类似问题？

3. **学习收获**
   - 学到了什么？
   - 有什么新发现？
   - 对类似任务有什么启示？

4. **改进建议**
   - 下次如何做得更好？
   - 需要什么改进？
   - 有什么新的策略？

请提供结构化的反思结果：

\`\`\`json
{
  "whatWorked": [
    "成功因素1",
    "成功因素2"
  ],
  "whatDidntWork": [
    "问题1",
    "问题2"
  ],
  "lessonsLearned": [
    "学习1",
    "学习2"
  ],
  "improvements": [
    "改进1",
    "改进2"
  ],
  "nextTimeStrategy": "下次的策略",
  "confidence": 0.8,
  "overallAssessment": "整体评估"
}
\`\`\``;
  }

  /**
   * 构建任务完成验证提示词
   */
  static buildCompletionValidationPrompt(
    result: any,
    goal: string,
    successCriteria: string[]
  ): string {
    return `你是一个智能任务完成验证器。请验证任务是否真正完成。

## 任务信息
**目标**: ${goal}
**执行结果**: ${JSON.stringify(result, null, 2)}
**成功标准**: ${successCriteria.join(', ')}

## 验证要求
请从以下角度进行验证：

1. **目标达成度**
   - 目标是否完全达成？
   - 达成程度如何？
   - 还有什么遗漏？

2. **质量标准**
   - 结果质量如何？
   - 是否满足所有要求？
   - 有什么不足？

3. **完整性检查**
   - 是否完成了所有必要步骤？
   - 是否处理了所有关键点？
   - 还有什么需要补充？

4. **最终评估**
   - 任务是否真正完成？
   - 是否可以结束？
   - 需要什么后续行动？

请提供结构化的验证结果：

\`\`\`json
{
  "isCompleted": true,
  "completionRate": 0.95,
  "goalAchievement": "目标达成情况",
  "qualityAssessment": "质量评估",
  "missingItems": ["遗漏项1", "遗漏项2"],
  "recommendations": ["建议1", "建议2"],
  "confidence": 0.9,
  "finalVerdict": "最终结论"
}
\`\`\``;
  }
}
