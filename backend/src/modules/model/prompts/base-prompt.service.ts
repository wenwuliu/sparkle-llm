/**
 * 基础提示词服务
 * 提供通用的提示词模板和工具
 */
export class BasePromptService {
  /**
   * 获取图表生成提示词部分
   * @returns 图表生成提示词部分
   */
  getChartPromptSection(): string {
    return `图表生成:
1.Mermaid(流程图):\`\`\`mermaid
graph TD
    A[开始]-->B[处理]-->C[结束]
\`\`\`

2.ECharts(数据图表):\`\`\`echarts
{"title":{"text":"示例"},"xAxis":{"type":"category","data":["A","B","C"]},"yAxis":{"type":"value"},"series":[{"data":[120,200,150],"type":"bar"}]}
\`\`\`

注意：ECharts配置必须是纯JSON格式，不支持JavaScript函数。使用字符串模板如"{b}: {c}分"代替函数，使用visualMap或固定颜色数组代替动态颜色函数。`;
  }

  /**
   * 获取数据可视化指南提示词部分
   * @returns 数据可视化指南提示词部分
   */
  getDataVisualizationGuideSection(): string {
    return `数据可视化:
- 列表数据用Markdown表格展示
- 结构关系用Mermaid图表展示
- 数值数据用ECharts图表展示`;
  }

  /**
   * 获取JSON格式返回提示词部分
   * @returns JSON格式返回提示词部分
   */
  getJsonReturnFormatSection(): string {
    return `只返回JSON格式结果，无其他文字。`;
  }

  /**
   * 构建工具描述为函数调用格式
   * @param tools 工具列表
   * @returns 函数调用格式的工具描述
   */
  buildToolsAsFunctions(tools: any[]): string {
    return tools.map(tool => {
      // 获取参数描述
      const params = tool.input_schema.properties || {};
      const requiredParams = tool.input_schema.required || [];

      // 构建参数字符串
      const paramsStr = Object.entries(params)
        .map(([paramName, paramInfo]: [string, any]) => {
          const isRequired = requiredParams.includes(paramName) ? '(必填)' : '(可选)';
          const defaultValue = paramInfo.default ? `，默认值: ${paramInfo.default}` : '';
          return `    - ${paramName}: ${paramInfo.type} ${isRequired} - ${paramInfo.description}${defaultValue}`;
        })
        .join('\n');

      // 返回function call格式的工具描述
      return `function ${tool.name}(${requiredParams.join(', ')}) {
  // ${tool.description}
  // 参数:
${paramsStr}
}`;
    }).join('\n\n');
  }

  /**
   * 获取工具分类的显示名称
   * @param category 工具类别
   * @returns 显示名称
   */
  getCategoryDisplayName(category: string): string {
    const categoryMap: Record<string, string> = {
      'system': '系统信息',
      'file': '文件操作',
      'memory': '记忆管理',
      'network': '网络服务',
      'utility': '实用工具',
      'other': '其他工具'
    };

    return categoryMap[category] || category;
  }
}
