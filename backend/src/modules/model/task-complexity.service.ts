/**
 * 任务复杂度判断服务
 * 根据用户输入判断任务复杂度，决定使用哪种模型
 */

export interface TaskComplexityResult {
  isComplex: boolean;
  reason: string;
  confidence: number; // 0-1之间的置信度
}

export class TaskComplexityService {
  /**
   * 判断任务是否复杂
   * @param userMessage 用户消息
   * @param hasTools 是否需要使用工具
   * @returns 复杂度判断结果
   */
  analyzeTaskComplexity(userMessage: string, hasTools: boolean = false): TaskComplexityResult {
    const message = userMessage.toLowerCase().trim();
    
    // 基本任务的特征
    const simplePatterns = [
      // 简单问候和基础对话
      /^(你好|hi|hello|嗨|早上好|下午好|晚上好)$/,
      /^(谢谢|感谢|再见|拜拜|bye)$/,
      
      // 简单的事实性问题
      /^(什么是|定义|解释).{1,20}[？?]?$/,
      /^(今天|现在|当前)(时间|日期|天气)/,
      /^(怎么|如何).{1,15}[？?]?$/,
      
      // 简单的数学计算
      /^\d+\s*[+\-*/]\s*\d+/,
      /^计算\s*\d+/,
      
      // 简单的翻译请求
      /^(翻译|translate).{1,30}$/,
      
      // 简单的格式转换
      /^(转换|convert).{1,20}$/,
    ];

    // 复杂任务的特征
    const complexPatterns = [
      // 代码相关
      /(写|编写|生成|创建).*(代码|程序|脚本|函数|类|方法)/,
      /(调试|debug|修复|优化).*(代码|程序|bug|错误)/,
      /(重构|refactor|改进).*(代码|架构)/,
      
      // 分析和推理
      /(分析|analysis|评估|评价|比较|对比)/,
      /(设计|design|规划|plan|策略|方案)/,
      /(总结|summarize|概括|归纳)/,
      
      // 创作和生成
      /(写|创作|生成).*(文章|报告|方案|计划|故事|诗歌)/,
      /(制作|创建).*(表格|图表|文档|PPT)/,
      
      // 复杂的技术问题
      /(部署|deploy|配置|config|安装|install)/,
      /(性能|performance|优化|optimization)/,
      /(架构|architecture|系统|system)/,
      
      // 多步骤任务
      /(步骤|流程|过程|教程|指南)/,
      /(详细|深入|全面|完整).*(介绍|说明|解释)/,
      
      // 用户表示回答不满意、错误或者带有负面情绪等词汇，则认为任务复杂
      /(错误|不对|不满意|麻烦|问题|困难|挑战)/,
      /(需要|想要|需要|需要|需要).*(帮助|支持|解答|建议)/,
      /(如何|怎么|怎样).*(解决|完成|处理|实现)/,
      /(复杂|困难|挑战)/,
      /生气|愤怒|焦虑|沮丧|无语/,
    ];

    let complexityScore = 0;
    let reason = '';

    // 检查简单任务模式
    for (const pattern of simplePatterns) {
      if (pattern.test(message)) {
        return {
          isComplex: false,
          reason: '匹配简单任务模式',
          confidence: 0.9
        };
      }
    }

    // 检查复杂任务模式
    for (const pattern of complexPatterns) {
      if (pattern.test(message)) {
        complexityScore += 0.3;
        reason = '匹配复杂任务模式';
      }
    }

    // 基于消息长度判断
    if (message.length > 100) {
      complexityScore += 0.2;
      reason += (reason ? ', ' : '') + '消息较长';
    }

    // 基于工具使用判断
    if (hasTools) {
      complexityScore += 0.3;
      reason += (reason ? ', ' : '') + '需要使用工具';
    }

    // 检查是否包含技术关键词
    const techKeywords = [
      'api', 'database', 'sql', 'json', 'xml', 'html', 'css', 'javascript', 'python',
      'java', 'react', 'vue', 'node', 'express', 'mongodb', 'mysql', 'redis',
      'docker', 'kubernetes', 'aws', 'azure', 'git', 'github', 'ci/cd'
    ];

    const techKeywordCount = techKeywords.filter(keyword => 
      message.includes(keyword)
    ).length;

    if (techKeywordCount > 0) {
      complexityScore += techKeywordCount * 0.1;
      reason += (reason ? ', ' : '') + `包含${techKeywordCount}个技术关键词`;
    }

    // 检查是否包含复杂的标点符号和结构
    const complexStructures = [
      /[；;]/g, // 分号
      /[：:].+[：:]/g, // 多个冒号
      /\d+[\.、]\s/g, // 编号列表
      /[（(].+[）)]/g, // 括号说明
    ];

    let structureCount = 0;
    for (const pattern of complexStructures) {
      const matches = message.match(pattern);
      if (matches) {
        structureCount += matches.length;
      }
    }

    if (structureCount > 2) {
      complexityScore += 0.2;
      reason += (reason ? ', ' : '') + '包含复杂结构';
    }

    // 最终判断
    const isComplex = complexityScore >= 0.4;
    const confidence = Math.min(0.95, Math.max(0.6, complexityScore));

    return {
      isComplex,
      reason: reason || '基于综合评分判断',
      confidence
    };
  }

  /**
   * 获取推荐的模型类型
   * @param userMessage 用户消息
   * @param hasTools 是否需要使用工具
   * @returns 'basic' | 'advanced'
   */
  getRecommendedModelType(userMessage: string, hasTools: boolean = false): 'basic' | 'advanced' {
    const result = this.analyzeTaskComplexity(userMessage, hasTools);
    return result.isComplex ? 'advanced' : 'basic';
  }

  /**
   * 获取任务复杂度的详细信息（用于调试）
   * @param userMessage 用户消息
   * @param hasTools 是否需要使用工具
   * @returns 详细的分析结果
   */
  getDetailedAnalysis(userMessage: string, hasTools: boolean = false): TaskComplexityResult & {
    messageLength: number;
    hasTools: boolean;
    recommendedModel: 'basic' | 'advanced';
  } {
    const result = this.analyzeTaskComplexity(userMessage, hasTools);
    return {
      ...result,
      messageLength: userMessage.length,
      hasTools,
      recommendedModel: result.isComplex ? 'advanced' : 'basic'
    };
  }
}

// 创建任务复杂度服务实例
export const taskComplexityService = new TaskComplexityService();
