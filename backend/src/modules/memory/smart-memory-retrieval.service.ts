/**
 * 智能记忆检索服务
 * 优化记忆检索策略，减少不必要的检索和token消耗
 */

import { Memory } from './memory.types';
import { memoryService } from './index';

// 扩展Memory类型以包含相关性分数
interface MemoryWithRelevance extends Memory {
  relevance_score?: number;
}

export class SmartMemoryRetrievalService {
  private static instance: SmartMemoryRetrievalService;

  private constructor() {}

  static getInstance(): SmartMemoryRetrievalService {
    if (!SmartMemoryRetrievalService.instance) {
      SmartMemoryRetrievalService.instance = new SmartMemoryRetrievalService();
    }
    return SmartMemoryRetrievalService.instance;
  }

  /**
   * 判断是否需要检索记忆
   * @param userMessage 用户消息
   * @returns 是否需要检索记忆
   */
  shouldRetrieveMemory(userMessage: string): boolean {
    const message = userMessage.toLowerCase().trim();

    // 1. 简单问候和礼貌用语 - 不需要记忆
    const greetingPatterns = [
      /^(你好|hi|hello|嗨|早上好|下午好|晚上好)[\s！!。.]*$/,
      /^(谢谢|感谢|再见|拜拜|bye)[\s！!。.]*$/,
    ];

    if (greetingPatterns.some(pattern => pattern.test(message))) {
      return false;
    }

    // 2. 简单计算和数学问题 - 不需要记忆
    const mathPatterns = [
      /^\d+[\s]*[\+\-\*\/×÷]\s*\d+[\s]*[=＝]?[\s]*$/,
      /^计算[\s]*\d+/,
      /^[\d\s\+\-\*\/×÷\(\)\.]+[=＝]?[\s]*$/,
    ];

    if (mathPatterns.some(pattern => pattern.test(message))) {
      return false;
    }

    // 3. 简单定义和解释类问题 - 不需要记忆
    const definitionPatterns = [
      /^(什么是|定义|解释)[\s]*[^，,。.！!？?]*[？?。.！!]*$/,
      /^[^，,。.！!？?]*是什么[？?。.！!]*$/,
      /^如何理解[\s]*[^，,。.！!？?]*[？?。.！!]*$/,
    ];

    if (definitionPatterns.some(pattern => pattern.test(message))) {
      return false;
    }

    // 4. 时间日期查询 - 不需要记忆
    const timePatterns = [
      /^(现在|当前|今天|明天|昨天)[\s]*(时间|日期|几点)/,
      /^(几点|什么时候|多少号)/,
    ];

    if (timePatterns.some(pattern => pattern.test(message))) {
      return false;
    }

    // 5. 上下文依赖查询 - 需要记忆（看似简单但需要个人信息的查询）
    const contextDependentPatterns = [
      // 天气查询（可能需要地理位置记忆）
      /^(天气|气温|下雨|晴天|阴天|雪|风|湿度)[\s]*[怎么样如何]*[？?。.！!]*$/,
      /^(现在|今天|明天|昨天)[\s]*(天气|气温|下雨|晴天|阴天|雪|风|湿度)/,
      /^(会不会|是否|要不要)[\s]*(下雨|晴天|阴天|雪)/,

      // 交通查询（可能需要地理位置记忆）
      /^(交通|路况|堵车|地铁|公交|打车)[\s]*[怎么样如何]*[？?。.！!]*$/,
      /^(怎么去|如何到|路线|导航)/,

      // 生活服务查询（可能需要地理位置或偏好记忆）
      /^(附近|周边)[\s]*(餐厅|商店|医院|银行|超市|加油站)/,
      /^(推荐|介绍)[\s]*(餐厅|美食|景点|酒店)/,

      // 个人状态查询（可能需要个人信息记忆）
      /^(我|咱们|我们)[\s]*(应该|需要|要不要|可以)/,
      /^(适合|建议|推荐)[\s]*[我咱们我们]*/,

      // 时间安排查询（可能需要日程或偏好记忆）
      /^(今天|明天|这周|下周)[\s]*(安排|计划|日程|会议)/,
      /^(什么时候|几点)[\s]*(开始|结束|到|去)/,
    ];

    if (contextDependentPatterns.some(pattern => pattern.test(message))) {
      console.log('[智能记忆] 检测到上下文依赖查询，需要检索相关记忆');
      return true;
    }

    // 6. 包含记忆检索相关关键词 - 需要记忆
    // 注意：这里只包含"检索历史记忆"的关键词，不包含"创建新记忆"的关键词
    const memoryRetrievalKeywords = [
      '之前', '上次', '记得', '还记得', '前面', '刚才',
      '我的', '我们的', '项目', '偏好', '习惯', '设置',
      '继续', '接着', '基于', '根据之前', '按照之前',
      '像之前', '和之前', '按之前', '参考之前'
    ];

    if (memoryRetrievalKeywords.some(keyword => message.includes(keyword))) {
      return true;
    }

    // 7. 检查是否包含记忆创建关键词 - 这种情况下也需要检索记忆来避免重复
    const memoryCreationKeywords = ['记住', '别忘了', '不要忘记', '必须', '应该', '不能', '禁止'];
    const containsCreationKeywords = memoryCreationKeywords.some(keyword => message.includes(keyword));

    if (containsCreationKeywords) {
      // 如果包含创建关键词，需要检索现有记忆来避免重复创建
      console.log('[智能记忆] 检测到记忆创建关键词，检索现有记忆以避免重复');
      return true;
    }

    // 8. 复杂问题和上下文相关问题 - 需要记忆
    const contextualPatterns = [
      /帮我.*分析/,
      /根据.*情况/,
      /结合.*来看/,
      /考虑到.*因素/,
      /在.*基础上/,
      /针对.*问题/,
      /关于.*的建议/,
    ];

    if (contextualPatterns.some(pattern => pattern.test(message))) {
      return true;
    }

    // 9. 默认情况：消息长度超过20字符且包含复杂句式 - 可能需要记忆
    if (message.length > 20 && (message.includes('，') || message.includes('。') || message.includes('？') || message.includes('！'))) {
      return true;
    }

    // 10. 其他简单问题 - 不需要记忆
    return false;
  }

  /**
   * 获取相关记忆（带相关性阈值过滤，但保证核心记忆不被过滤）
   * @param query 查询内容
   * @param threshold 相关性阈值 (0-1)
   * @param maxCount 最大返回数量
   * @returns 相关记忆列表
   */
  async getRelevantMemories(query: string, threshold: number = 0.6, maxCount: number = 5): Promise<MemoryWithRelevance[]> {
    try {
      // 获取更多候选记忆用于过滤
      const candidateMemories = await memoryService.findRelatedMemories(query, maxCount * 2);

      if (candidateMemories.length === 0) {
        return [];
      }

      // 计算相关性分数
      const scoredMemories = candidateMemories.map(memory => ({
        ...memory,
        relevance_score: this.calculateRelevanceScore(query, memory)
      }));

      // 分离核心记忆和其他记忆
      const coreMemories = scoredMemories.filter(memory => memory.memory_type === 'core');
      const otherMemories = scoredMemories.filter(memory => memory.memory_type !== 'core');

      // 核心记忆永远保留，不受相关性阈值限制
      const selectedCoreMemories = coreMemories;

      // 其他记忆按相关性阈值过滤
      const relevantOtherMemories = otherMemories.filter(memory =>
        memory.relevance_score >= threshold
      );

      // 合并核心记忆和相关的其他记忆
      const allRelevantMemories = [...selectedCoreMemories, ...relevantOtherMemories];

      // 按相关性和重要性排序，但核心记忆优先
      allRelevantMemories.sort((a, b) => {
        // 核心记忆优先级最高
        if (a.memory_type === 'core' && b.memory_type !== 'core') return -1;
        if (a.memory_type !== 'core' && b.memory_type === 'core') return 1;

        // 同类型记忆按综合分数排序
        const scoreA = a.relevance_score * 0.7 + (a.importance || 0.5) * 0.3;
        const scoreB = b.relevance_score * 0.7 + (b.importance || 0.5) * 0.3;
        return scoreB - scoreA;
      });

      // 返回前N条记忆，但确保所有核心记忆都包含
      const finalMemories = allRelevantMemories.slice(0, Math.max(maxCount, coreMemories.length));

      console.log(`[智能记忆] 核心记忆: ${coreMemories.length}条, 相关其他记忆: ${relevantOtherMemories.length}条, 最终返回: ${finalMemories.length}条`);

      return finalMemories;
    } catch (error) {
      console.error('获取相关记忆失败:', error);
      return [];
    }
  }

  /**
   * 改进的记忆相关性分数计算
   * @param query 查询内容
   * @param memory 记忆对象
   * @returns 相关性分数 (0-1)
   */
  private calculateRelevanceScore(query: string, memory: Memory): number {
    const queryLower = query.toLowerCase();
    const contentLower = memory.content.toLowerCase();
    const keywordsLower = (memory.keywords || '').toLowerCase();

    let score = 0;

    // 改进的中文分词（简化版）
    const queryWords = this.extractChineseWords(queryLower);
    const keywordWords = this.extractChineseWords(keywordsLower);
    const contentWords = this.extractChineseWords(contentLower);

    // 1. 关键词精确匹配 (权重: 0.35)
    if (queryWords.length > 0 && keywordWords.length > 0) {
      const exactMatches = queryWords.filter(word => keywordWords.includes(word)).length;
      const partialMatches = queryWords.filter(word =>
        !keywordWords.includes(word) &&
        keywordWords.some(keyword => keyword.includes(word) || word.includes(keyword))
      ).length;

      const keywordScore = (exactMatches * 1.0 + partialMatches * 0.5) / queryWords.length;
      score += keywordScore * 0.35;
    }

    // 2. 内容语义匹配 (权重: 0.25)
    if (queryWords.length > 0 && contentWords.length > 0) {
      const exactContentMatches = queryWords.filter(word => contentWords.includes(word)).length;
      const partialContentMatches = queryWords.filter(word =>
        !contentWords.includes(word) &&
        contentWords.some(contentWord => contentWord.includes(word) || word.includes(contentWord))
      ).length;

      const contentScore = (exactContentMatches * 1.0 + partialContentMatches * 0.3) / queryWords.length;
      score += contentScore * 0.25;
    }

    // 3. 记忆类型和重要性 (权重: 0.25)
    if (memory.memory_type === 'core') {
      score += 0.25; // 核心记忆基础分数
    } else {
      // 根据重要性级别调整分数
      const importanceBonus = {
        'important': 0.2,
        'moderate': 0.15,
        'unimportant': 0.1
      };
      score += importanceBonus[memory.importance_level as keyof typeof importanceBonus] || 0.1;

      // 根据子类型调整相关性
      if (memory.memory_subtype) {
        const subtypeBonus = {
          'instruction': 0.05,
          'preference': 0.03,
          'project_info': 0.03,
          'solution': 0.02
        };
        score += subtypeBonus[memory.memory_subtype as keyof typeof subtypeBonus] || 0;
      }
    }

    // 4. 改进的时间衰减 (权重: 0.15)
    if (memory.created_at) {
      const daysSinceCreated = (Date.now() - memory.created_at) / (1000 * 60 * 60 * 24);

      let timeDecay;
      if (memory.memory_type === 'core') {
        // 核心记忆不受时间衰减影响
        timeDecay = 1.0;
      } else if (daysSinceCreated <= 7) {
        // 7天内的记忆保持满分
        timeDecay = 1.0;
      } else if (daysSinceCreated <= 30) {
        // 7-30天线性衰减到0.7
        timeDecay = 1.0 - (daysSinceCreated - 7) / 23 * 0.3;
      } else if (daysSinceCreated <= 90) {
        // 30-90天缓慢衰减到0.3
        timeDecay = 0.7 - (daysSinceCreated - 30) / 60 * 0.4;
      } else {
        // 90天后保持0.3的基础分数
        timeDecay = 0.3;
      }

      score += timeDecay * 0.15;
    }

    return Math.min(1, score); // 确保分数不超过1
  }

  /**
   * 提取中文词汇（简化版分词）
   * @param text 文本内容
   * @returns 词汇数组
   */
  private extractChineseWords(text: string): string[] {
    // 移除标点符号和特殊字符
    const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ');

    // 分割中英文混合文本
    const words: string[] = [];

    // 提取英文单词和数字
    const englishWords = cleanText.match(/[a-zA-Z0-9]+/g) || [];
    words.push(...englishWords.filter(word => word.length > 1));

    // 简化的中文分词：提取2-4字的中文词组
    const chineseText = cleanText.replace(/[a-zA-Z0-9\s]/g, '');
    for (let i = 0; i < chineseText.length; i++) {
      // 提取2字词
      if (i + 1 < chineseText.length) {
        words.push(chineseText.substring(i, i + 2));
      }
      // 提取3字词
      if (i + 2 < chineseText.length) {
        words.push(chineseText.substring(i, i + 3));
      }
      // 提取4字词
      if (i + 3 < chineseText.length) {
        words.push(chineseText.substring(i, i + 4));
      }
    }

    // 去重并过滤过短的词
    return [...new Set(words)].filter(word => word.length >= 2);
  }

  /**
   * 压缩记忆内容
   * @param memories 记忆列表
   * @returns 压缩后的记忆提示词
   */
  compressMemoryContent(memories: MemoryWithRelevance[]): string {
    if (memories.length === 0) {
      return '';
    }

    // 按重要性和相关性排序，只取前3条最重要的
    const topMemories = memories
      .sort((a, b) => {
        const scoreA = (a.relevance_score || 0.5) * 0.6 + (a.importance || 0.5) * 0.4;
        const scoreB = (b.relevance_score || 0.5) * 0.6 + (b.importance || 0.5) * 0.4;
        return scoreB - scoreA;
      })
      .slice(0, 3);

    // 压缩格式：只保留核心信息，去除冗余描述
    const compressedMemories = topMemories.map(memory => {
      let content = memory.content;
      
      // 移除常见的冗余前缀
      content = content.replace(/^(用户|我|你|系统)[\s]*[:：]?\s*/, '');
      content = content.replace(/^(记住|需要记住|应该记住)[\s]*[:：]?\s*/, '');
      
      // 限制长度，保留核心信息
      if (content.length > 80) {
        content = content.substring(0, 77) + '...';
      }
      
      return content;
    });

    return `相关记忆:\n${compressedMemories.map(content => `• ${content}`).join('\n')}`;
  }

  /**
   * 判断是否需要创建记忆（分离的逻辑）
   * @param userMessage 用户消息
   * @returns 是否需要创建记忆
   */
  shouldCreateMemory(userMessage: string): boolean {
    const message = userMessage.toLowerCase().trim();

    // 记忆创建关键词 - 明确表示要保存信息的关键词
    const memoryCreationKeywords = [
      '记住', '请记住', '别忘了', '不要忘记',
      '必须', '应该', '不能', '禁止',
      '重要', '关键', '注意', '牢记'
    ];

    return memoryCreationKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * 智能记忆检索主入口
   * @param userMessage 用户消息
   * @returns 压缩后的记忆提示词，如果不需要记忆则返回空字符串
   */
  async smartRetrieveMemories(userMessage: string): Promise<string> {
    // 1. 判断是否需要检索记忆
    if (!this.shouldRetrieveMemory(userMessage)) {
      console.log('[智能记忆] 跳过记忆检索 - 简单问题');
      return '';
    }

    // 2. 检测查询类型并调整检索策略
    const queryType = this.detectQueryType(userMessage);
    let relevantMemories: any[];

    if (queryType === 'location_dependent') {
      // 对于位置依赖的查询，优先检索地理位置相关记忆
      relevantMemories = await this.getLocationRelevantMemories(userMessage);
    } else {
      // 常规记忆检索
      relevantMemories = await this.getRelevantMemories(userMessage, 0.4, 5);
    }

    if (relevantMemories.length === 0) {
      console.log('[智能记忆] 未找到相关记忆');
      return '';
    }
    console.log(`[智能记忆] 检索到 ${relevantMemories.length} 条相关记忆`);

    // 3. 压缩记忆内容
    const compressedContent = this.compressMemoryContent(relevantMemories);

    console.log(`[智能记忆] 检索到 ${relevantMemories.length} 条相关记忆，压缩后长度: ${compressedContent.length} 字符`);

    return compressedContent;
  }

  /**
   * 检测查询类型
   * @param userMessage 用户消息
   * @returns 查询类型
   */
  private detectQueryType(userMessage: string): string {
    const message = userMessage.toLowerCase().trim();

    // 天气和地理位置相关查询
    const locationPatterns = [
      /^(天气|气温|下雨|晴天|阴天|雪|风|湿度)/,
      /^(现在|今天|明天|昨天)[\s]*(天气|气温)/,
      /^(交通|路况|堵车|地铁|公交)/,
      /^(附近|周边)[\s]*(餐厅|商店|医院|银行)/,
      /^(推荐|介绍)[\s]*(餐厅|美食|景点)/,
    ];

    if (locationPatterns.some(pattern => pattern.test(message))) {
      return 'location_dependent';
    }

    return 'general';
  }

  /**
   * 获取地理位置相关记忆
   * @param userMessage 用户消息
   * @returns 相关记忆列表
   */
  private async getLocationRelevantMemories(userMessage: string): Promise<any[]> {
    try {
      // 地理位置相关关键词
      const locationKeywords = [
        '地址', '位置', '城市', '地区', '住址', '家', '公司', '办公室',
        '成都', '北京', '上海', '广州', '深圳', '杭州', '南京', '武汉',
        '经度', '纬度', '坐标', '区域', '街道', '小区', '社区' ,'所在地'  
      ];

      // 首先尝试通过地理位置关键词检索
      let memories = [];
      for (const keyword of locationKeywords) {
        const keywordMemories = await this.getRelevantMemories(keyword, 0.3, 3);
        memories = memories.concat(keywordMemories);
      }

      // 去重
      const uniqueMemories = memories.filter((memory, index, self) =>
        index === self.findIndex(m => m.id === memory.id)
      );

      // 如果没找到地理位置记忆，回退到常规检索
      if (uniqueMemories.length === 0) {
        console.log('[智能记忆] 未找到地理位置记忆，回退到常规检索');
        return await this.getRelevantMemories(userMessage, 0.4, 5);
      }

      // 如果找到地理记忆，则按照与locationKeywords相关性的高低排序,优先返回相关性高的记忆
      uniqueMemories.sort((a, b) => {
        const scoreA = locationKeywords.filter(keyword => a.content.includes(keyword)).length;
        const scoreB = locationKeywords.filter(keyword => b.content.includes(keyword)).length;
        return scoreB - scoreA;
      })
      console.log(`[智能记忆] 找到 ${uniqueMemories.length} 条地理位置相关记忆`);
      console.log(`[智能记忆] 前5条地理位置相关记忆为： ${JSON.stringify(uniqueMemories.slice(0, 5))}`);
      return uniqueMemories.slice(0, 5); // 限制最多5条
    } catch (error) {
      console.error('[智能记忆] 获取地理位置记忆失败:', error);
      // 出错时回退到常规检索
      return await this.getRelevantMemories(userMessage, 0.4, 5);
    }
  }
}

// 导出单例实例
export const smartMemoryRetrievalService = SmartMemoryRetrievalService.getInstance();

// 导出类型
export type { MemoryWithRelevance };
