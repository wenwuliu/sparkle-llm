/**
 * 工具提示词服务
 * 管理工具相关的提示词
 */
import { BasePromptService } from './base-prompt.service';

export class ToolPromptService {
  private basePromptService = new BasePromptService();

  /**
   * 获取工具提示词
   * @param tools 工具列表
   * @param enableSearch 是否启用联网搜索
   * @returns 工具提示词
   */
  getToolsPrompt(tools: any[], enableSearch: boolean = false): string {
    // 构建工具描述为function call格式
    const toolsDescription = this.basePromptService.buildToolsAsFunctions(tools);

    // 基础提示词
    let prompt = `你是Sparkle，能使用工具的AI助手。\n\n`;

    // 联网搜索提示
    if (enableSearch) {
      prompt += `已启用联网搜索，处理优先级：1.最新网络信息用内置搜索 2.本地资源用工具 3.特定操作用工具 4.混合需求先搜索再用工具。搜索时告知用户并引用来源。\n\n`;
    }

    prompt += `可用工具（以函数形式表示）：\n\n${toolsDescription}\n\n`;

    // 工具分类
    const toolsByCategory = tools.reduce((acc: Record<string, string[]>, tool) => {
      const category = tool.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(tool.name);
      return acc;
    }, {});

    prompt += `工具分类：\n`;
    Object.entries(toolsByCategory).forEach(([category, toolNames], index) => {
      const categoryName = this.basePromptService.getCategoryDisplayName(category);
      const toolList = Array.isArray(toolNames) ? toolNames.join('、') : toolNames;
      prompt += `${index + 1}.${categoryName}：${toolList}\n`;
    });

    prompt += `\n工具调用格式(必须严格遵守)：
{
  "thoughts": "思考过程",
  "tool_calls": [
    {
      "name": "工具名称",
      "input": {/*符合函数参数的JSON对象*/}
    }
  ]
}

规则：工具名称必须匹配函数名；参数必须符合函数参数要求；一次可调多个工具；不添加JSON外内容；错误时检查参数。

${this.basePromptService.getChartPromptSection()}

重要：使用工具时只返回JSON；不用工具直接回答；工具JSON中不加图表；先获取数据再生成图表；可用图表展示数据。不遵守规则会导致系统错误。`;

    return prompt;
  }

  /**
   * 获取工具结果提示词
   * 整合了原来的getToolResultsPrompt和getToolResultsSystemPrompt
   * @param toolCalls 工具调用列表
   * @param toolCallResults 工具调用结果
   * @param format 格式类型 (traditional|openai)
   * @returns 工具结果提示词
   */
  getToolResultsPrompt(toolCalls: any[], toolCallResults: any[], format: 'traditional' | 'openai' = 'traditional'): string {
    if (format === 'openai') {
      return this.getToolResultsSystemPrompt();
    }

    // 构建工具结果文本，使用函数调用格式
    let toolResultsText = '';
    for (let i = 0; i < toolCalls.length; i++) {
      const toolCall = toolCalls[i];
      const result = toolCallResults[i];

      // 构建函数调用格式的参数字符串
      const paramsStr = Object.entries(toolCall.input)
        .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
        .join(',\n');

      toolResultsText += `\n// 函数调用\n${toolCall.name}({\n${paramsStr}\n})`;

      if (result.error) {
        toolResultsText += `\n// 调用失败\n// 错误: ${result.error}`;
      } else {
        toolResultsText += `\n// 调用成功\n// 返回值: \n${JSON.stringify(result.tool_output, null, 2)}`;
      }
      toolResultsText += '\n';
    }

    return `你是Sparkle，刚使用工具帮助回答问题，现在根据结果给出完整回答。

工具结果:${toolResultsText}

处理指南:分析提取关键信息；失败时解释原因并提供解决方案；整合多工具结果；直接解决原问题；适当使用表格图表展示数据。

${this.basePromptService.getDataVisualizationGuideSection()}

${this.basePromptService.getChartPromptSection()}

请提供全面准确有用的回答，直接解决用户问题。`;
  }

  /**
   * 获取工具结果系统提示词（OpenAI兼容格式）
   * @returns 工具结果系统提示词
   */
  private getToolResultsSystemPrompt(): string {
    return `你是Sparkle，刚使用工具帮助回答问题，现在根据工具调用结果给出完整回答。

处理指南:
1. 分析提取工具返回的关键信息
2. 如果工具调用失败，解释原因并提供解决方案
3. 整合多个工具的结果，提供综合分析
4. 直接解决用户的原始问题
5. 适当使用表格和图表展示数据

${this.basePromptService.getDataVisualizationGuideSection()}

${this.basePromptService.getChartPromptSection()}

请提供全面准确有用的回答，直接解决用户问题。`;
  }
}
