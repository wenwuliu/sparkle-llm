/**
 * 优化的提示词管理服务
 * 实现动态系统提示词、工具描述压缩和长度控制
 */

import { BasePromptService } from './base-prompt.service';

interface PromptContext {
  needsTools: boolean;
  needsMemory: boolean;
  needsVisualization: boolean;
  userMessage: string;
  messageLength: number;
  isSimpleQuery: boolean;
}

interface Tool {
  name: string;
  description: string;
  category?: string;
  input_schema: any;
}

export class OptimizedPromptService {
  private basePromptService = new BasePromptService();
  
  // 提示词模板缓存
  private templateCache = new Map<string, string>();
  
  // 工具描述缓存
  private toolDescriptionCache = new Map<string, string>();

  /**
   * 构建动态系统提示词
   * @param context 提示词上下文
   * @returns 优化后的系统提示词
   */
  buildDynamicSystemPrompt(context: PromptContext): string {
    const cacheKey = this.generateContextCacheKey(context);
    
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }

    // 基础提示词 - 始终保持简洁
    let prompt = "你是Sparkle，AI助手。";

    const additions = [];

    // 根据上下文动态添加能力描述
    if (context.needsTools) {
      additions.push("可使用工具解决问题");
    }

    if (context.needsMemory) {
      additions.push("具有长期记忆能力");
    }

    if (context.needsVisualization) {
      additions.push("支持数据可视化");
    }

    // 根据查询复杂度调整指导原则
    if (context.isSimpleQuery) {
      additions.push("保持回答简洁准确");
    } else {
      additions.push("提供详细分析和建议");
    }

    if (additions.length > 0) {
      prompt += '\n\n' + additions.join('；') + '。';
    }

    // 只在需要可视化时添加图表提示
    if (context.needsVisualization) {
      prompt += '\n\n' + this.basePromptService.getChartPromptSection();
    }

    // 缓存结果
    this.templateCache.set(cacheKey, prompt);
    
    return prompt;
  }

  /**
   * 智能选择相关工具
   * @param tools 所有可用工具
   * @param userMessage 用户消息
   * @returns 相关工具列表
   */
  selectRelevantTools(tools: Tool[], userMessage: string): Tool[] {
    const message = userMessage.toLowerCase();
    const relevantTools: Tool[] = [];

    // 工具相关性关键词映射
    const toolKeywords = {
      'file': ['文件', '读取', '写入', '保存', '删除', 'file', 'read', 'write'],
      'search': ['搜索', '查找', '查询', 'search', 'find', 'google'],
      'shell': ['执行', '运行', '命令', 'shell', 'command', '脚本'],
      'task_flow': ['思考', '分析', '深入', '任务', '流程', 'thinking', 'analyze', 'task', 'flow'],
      'memory': ['记住', '记忆', '保存', 'remember', 'memory'],
      'visualization': ['图表', '可视化', '图形', 'chart', 'graph', 'visual'],
      'web': ['网页', '网站', '链接', 'web', 'url', 'http'],
      'image': ['图片', '图像', '截图', 'image', 'picture', 'screenshot']
    };

    // 为每个工具计算相关性分数
    const toolScores = tools.map(tool => {
      let score = 0;
      const toolName = tool.name.toLowerCase();
      const toolDesc = tool.description.toLowerCase();

      // 检查工具名称和描述中的关键词匹配
      for (const [category, keywords] of Object.entries(toolKeywords)) {
        const keywordMatches = keywords.filter(keyword => 
          message.includes(keyword) && (toolName.includes(category) || toolDesc.includes(keyword))
        ).length;
        
        if (keywordMatches > 0) {
          score += keywordMatches * 2; // 关键词匹配权重
        }
      }

      // 工具类别匹配
      if (tool.category) {
        const categoryKeywords = toolKeywords[tool.category.toLowerCase()] || [];
        const categoryMatches = categoryKeywords.filter(keyword => message.includes(keyword)).length;
        score += categoryMatches;
      }

      return { tool, score };
    });

    // 选择分数最高的工具，但限制数量
    const maxTools = message.length > 100 ? 8 : 5; // 复杂查询允许更多工具
    const sortedTools = toolScores
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxTools)
      .map(item => item.tool);

    // 如果没有明确相关的工具，返回核心工具集
    if (sortedTools.length === 0) {
      const coreTools = ['safe_shell', 'web_search', 'thinking'];
      return tools.filter(tool => coreTools.includes(tool.name)).slice(0, 3);
    }

    return sortedTools;
  }

  /**
   * 获取压缩的工具描述
   * @param tools 工具列表
   * @param userMessage 用户消息
   * @returns 压缩后的工具描述
   */
  getCompactToolDescription(tools: Tool[], userMessage: string): string {
    const cacheKey = `tools_${tools.map(t => t.name).join(',')}_${userMessage.substring(0, 50)}`;
    
    if (this.toolDescriptionCache.has(cacheKey)) {
      return this.toolDescriptionCache.get(cacheKey)!;
    }

    // 智能选择相关工具
    const relevantTools = this.selectRelevantTools(tools, userMessage);

    if (relevantTools.length === 0) {
      return '';
    }

    // 压缩工具描述格式
    const compactDescriptions = relevantTools.map(tool => {
      // 截断过长的描述
      let description = tool.description;
      if (description.length > 60) {
        description = description.substring(0, 57) + '...';
      }

      // 简化参数描述
      const params = tool.input_schema?.properties || {};
      const requiredParams = tool.input_schema?.required || [];
      
      const paramCount = Object.keys(params).length;
      const requiredCount = requiredParams.length;
      
      let paramInfo = '';
      if (paramCount > 0) {
        paramInfo = ` (${requiredCount}必填/${paramCount}参数)`;
      }

      return `${tool.name}: ${description}${paramInfo}`;
    });

    const result = `可用工具:\n${compactDescriptions.join('\n')}`;
    
    // 缓存结果
    this.toolDescriptionCache.set(cacheKey, result);
    
    return result;
  }

  /**
   * 优化提示词长度
   * @param prompt 原始提示词
   * @param maxTokens 最大token数量
   * @returns 优化后的提示词
   */
  optimizePromptLength(prompt: string, maxTokens: number = 1500): string {
    const estimatedTokens = prompt.length / 3.5; // 中文token估算
    
    if (estimatedTokens <= maxTokens) {
      return prompt;
    }

    console.log(`[提示词优化] 原始长度: ${prompt.length}字符 (约${Math.round(estimatedTokens)}tokens), 开始压缩...`);

    // 按段落分割
    const sections = prompt.split('\n\n').filter(section => section.trim());
    
    // 段落优先级排序
    const prioritizedSections = this.prioritizeSections(sections);
    
    let optimizedPrompt = '';
    let currentTokens = 0;
    
    for (const section of prioritizedSections) {
      const sectionTokens = section.length / 3.5;
      
      if (currentTokens + sectionTokens <= maxTokens) {
        optimizedPrompt += section + '\n\n';
        currentTokens += sectionTokens;
      } else {
        // 尝试截断当前段落
        const remainingTokens = maxTokens - currentTokens;
        const remainingChars = Math.floor(remainingTokens * 3.5);
        
        if (remainingChars > 50) { // 至少保留50个字符
          const truncatedSection = section.substring(0, remainingChars - 3) + '...';
          optimizedPrompt += truncatedSection + '\n\n';
        }
        break;
      }
    }

    const finalPrompt = optimizedPrompt.trim();
    const finalTokens = finalPrompt.length / 3.5;
    
    console.log(`[提示词优化] 优化后长度: ${finalPrompt.length}字符 (约${Math.round(finalTokens)}tokens), 压缩率: ${Math.round((1 - finalPrompt.length / prompt.length) * 100)}%`);
    
    return finalPrompt;
  }

  /**
   * 段落优先级排序
   * @param sections 段落列表
   * @returns 按优先级排序的段落
   */
  private prioritizeSections(sections: string[]): string[] {
    return sections.sort((a, b) => {
      const priorityA = this.getSectionPriority(a);
      const priorityB = this.getSectionPriority(b);
      return priorityB - priorityA; // 高优先级在前
    });
  }

  /**
   * 获取段落优先级
   * @param section 段落内容
   * @returns 优先级分数 (越高越重要)
   */
  private getSectionPriority(section: string): number {
    const content = section.toLowerCase();
    
    // 核心身份和角色定义 - 最高优先级
    if (content.includes('你是') || content.includes('sparkle') || content.includes('ai助手')) {
      return 10;
    }
    
    // 工具相关 - 高优先级
    if (content.includes('工具') || content.includes('函数') || content.includes('调用')) {
      return 8;
    }
    
    // 记忆相关 - 中高优先级
    if (content.includes('记忆') || content.includes('相关记忆')) {
      return 7;
    }
    
    // 规则和原则 - 中等优先级
    if (content.includes('规则') || content.includes('原则') || content.includes('注意')) {
      return 6;
    }
    
    // 图表和可视化 - 中等优先级
    if (content.includes('图表') || content.includes('echarts') || content.includes('mermaid')) {
      return 5;
    }
    
    // 示例和格式 - 较低优先级
    if (content.includes('示例') || content.includes('格式') || content.includes('例如')) {
      return 3;
    }
    
    // 其他内容 - 最低优先级
    return 1;
  }

  /**
   * 生成上下文缓存键
   * @param context 提示词上下文
   * @returns 缓存键
   */
  private generateContextCacheKey(context: PromptContext): string {
    return `${context.needsTools}_${context.needsMemory}_${context.needsVisualization}_${context.isSimpleQuery}`;
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.templateCache.clear();
    this.toolDescriptionCache.clear();
    console.log('[提示词优化] 缓存已清理');
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { templateCache: number; toolDescriptionCache: number } {
    return {
      templateCache: this.templateCache.size,
      toolDescriptionCache: this.toolDescriptionCache.size
    };
  }
}

// 导出单例实例
export const optimizedPromptService = new OptimizedPromptService();
