/**
 * 记忆提示词服务
 * 管理记忆相关的提示词
 */
import { BasePromptService } from './base-prompt.service';

export class MemoryPromptService {
  private basePromptService = new BasePromptService();

  /**
   * 获取记忆提示词
   * @param memories 记忆列表
   * @returns 记忆提示词
   */
  getMemoriesPrompt(memories: any[]): string {
    if (memories.length === 0) {
      return '';
    }

    let memoryPrompt = '以下是一些你应该记住的信息：\n\n';

    for (const memory of memories) {
      memoryPrompt += `- ${memory.content}\n`;
    }

    return memoryPrompt;
  }

  /**
   * 获取记忆生成提示词
   * 整合了原来的getMemoryGenerationPrompt、getReflectionMemoryPrompt和getMultipleMemoriesPrompt
   * @param context 上下文
   * @param type 记忆类型 (general|reflection|multiple)
   * @returns 记忆生成提示词
   */
  getMemoryGenerationPrompt(context: string, type: 'general' | 'reflection' | 'multiple' = 'general'): string {
    if (type === 'reflection') {
      return this.getReflectionMemoryPrompt(context);
    } else if (type === 'multiple') {
      return this.getMultipleMemoriesPrompt(context);
    } else {
      return this.getGeneralMemoryPrompt(context);
    }
  }

  /**
   * 获取一般记忆生成提示词
   * @param context 上下文
   * @returns 一般记忆生成提示词
   */
  private getGeneralMemoryPrompt(context: string): string {
    return `你是Sparkle的记忆管理系统，从对话提取值得记忆的信息。

记忆分类:
1.核心记忆(每次使用):
  -用户指令:长期有效要求、规则、限制(非一次性查询)
  -反省记忆:系统不足和改进点

2.事实性记忆(相关情境使用):
  -用户偏好:习惯、风格喜好
  -项目信息:结构、技术栈、架构
  -历史决策:重要选择和决定
  -解决方案:问题解决方法和步骤
  -领域知识:专业知识点

重要性评估:
-重要(0.7-1.0):明确指令、关键信息、重大解决方案、强烈偏好
-一般(0.4-0.6):隐含偏好、次要信息、一般解决方案
-不重要(0.1-0.3):闲聊、简单任务、重复信息、临时信息

返回JSON格式:
{
  "keywords": "3-5个关键词,逗号分隔",
  "content": "记忆内容,不超100字",
  "memory_type": "core或factual",
  "memory_subtype": "instruction,reflection,preference,project_info,decision,solution,knowledge",
  "importance": 0.1到1.0数值,
  "importance_level": "important,moderate,unimportant",
  "is_pinned": true或false(特别重要核心记忆),
  "is_important": true或false
}

内容优化:提取关键信息；简洁明确；客观；完整自包含；优先记录明确陈述

无记忆信息时回复"NO_MEMORY"。

对话内容:
${context}

只返回JSON或"NO_MEMORY"，无其他文字。`;
  }

  /**
   * 获取反省记忆生成提示词
   * @param conversation 对话内容
   * @returns 反省记忆生成提示词
   */
  private getReflectionMemoryPrompt(conversation: string): string {
    return `
你是一个反省记忆生成助手。请分析以下对话内容，判断是否存在需要反省的地方。

反省记忆是指：在对话中发现的不足、错误或导致用户不满意的原因，这些记忆可以帮助在未来对话中避免同样的问题。
注意：一次性查询请求（如"帮我查看内存占用"、"帮我查看天气"）不应生成反省记忆，除非在执行这些请求时出现了明显错误。

请特别关注以下情况：
1. 用户表达不满或失望（例如："这不是我想要的"，"你没有理解我的问题"）
2. 用户需要多次重复或澄清同一个问题
3. 用户指出错误或不准确的信息
4. 用户明确表示你的回答不够有帮助
5. 用户中途放弃或改变话题，可能表示对回答不满意
6. 用户使用否定词汇（"不对"，"错了"，"不是这样的"）

如果你发现对话中存在上述情况，请提取出反省记忆，并按照以下JSON格式返回：

{
  "keywords": "反省,错误,改进",
  "content": "简洁描述问题所在和改进方向",
  "memory_type": "core",
  "memory_subtype": "reflection",
  "importance": 0.8,
  "importance_level": "important",
  "is_pinned": true,
  "context": "相关对话片段"
}

如果对话中没有需要反省的地方，请回复"NO_REFLECTION"。

对话内容:
${conversation}

请只返回JSON格式的结果或"NO_REFLECTION"，不要有其他文字。`;
  }

  /**
   * 获取多种类型记忆生成提示词
   * @param conversation 对话内容
   * @returns 多种类型记忆生成提示词
   */
  private getMultipleMemoriesPrompt(conversation: string): string {
    return `
你是Sparkle的记忆管理系统，负责从对话中提取有价值的信息形成记忆。请分析对话内容，提取关键记忆点。必须按下面的要求返回完整可解析的JSON格式。

【记忆分类】
1. 核心记忆(每次对话使用)
   • 用户指令：长期有效的规则和限制（如"总是用中文回答"）
   • 反省记忆：系统不足和改进点

2. 事实性记忆(相关情境使用)
   • 用户偏好：使用习惯、风格喜好
   • 项目信息：结构、技术栈、架构
   • 历史决策：重要选择和决定
   • 解决方案：问题解决方法
   • 领域知识：专业知识点

【提取标准】
• 持久价值：信息在未来对话中仍有用
• 明确性：信息清晰明确，不含模糊表述
• 独特性：避免与已有记忆重复
• 相关性：与用户需求和系统功能相关
• 完整性：信息自包含，无需额外上下文

【重要性评估】
• 重要(0.7-1.0)：用户明确要求记住的内容、关键决策、核心偏好
• 一般(0.4-0.6)：可能在将来有用的信息、次要偏好
• 不重要(0.1-0.3)：临时信息、已完成的简单任务

【返回格式】
{
  "memories": [
    {
      "keywords": "3-5个关键词,逗号分隔",
      "content": "记忆内容,简洁明了,不超100字",
      "memory_type": "core或factual",
      "memory_subtype": "instruction,reflection,preference,project_info,decision,solution,knowledge",
      "importance": 0.1到1.0数值,
      "importance_level": "important,moderate,unimportant",
      "is_pinned": true或false(特别重要核心记忆),
      "context": "相关对话片段"
    }
  ]
}

无记忆信息时返回：{"memories": []}

对话内容:
${conversation}
`;
  }

  /**
   * 获取记忆整理提示词
   * @param memories 记忆列表
   * @returns 记忆整理提示词
   */
  getMemoryConflictAnalysisPrompt(memories: any[]): string {
    return `
你是一个记忆整理专家。请分析以下记忆列表，找出其中存在冲突的记忆。
冲突的定义是：两条或多条记忆包含相互矛盾的信息，或者一条记忆是另一条记忆的过时版本。

请按照以下规则进行分析：
1. 如果发现冲突的记忆，保留创建时间更近的记忆（created_at值更大）
2. 考虑记忆的重要性级别，优先保留重要性更高的记忆（important > moderate > unimportant）
3. 如果时间和重要性相近，考虑内容的完整性和详细程度，保留信息更丰富的记忆

记忆列表：
${JSON.stringify(memories, null, 2)}

请以JSON格式返回分析结果，格式如下：
{
  "conflicts": [
    {
      "description": "冲突描述",
      "conflicting_ids": [记忆ID数组],
      "keep_id": 应保留的记忆ID,
      "reason": "保留该记忆的理由"
    }
  ]
}

如果没有发现冲突，请返回：
{
  "conflicts": []
}

只返回JSON格式的结果，不要有其他文字。
`;
  }

  /**
   * 获取记忆复习提示词
   * @param memories 记忆列表
   * @param context 上下文
   * @returns 记忆复习提示词
   */
  getMemoryReviewPrompt(memories: any[], context: string): string {
    //优化memories内容，提高大模型的分析能力，1、移除列表中所有对象的keywords、
    // 1. replacer参数：过滤冗余+规范格式
    const replacer = (key, value) => {
      // 过滤冗余null：memory_subtype为null时不保留该字段（仅1条有值，其他均为null，无评估价值）
      if (key === "memory_subtype" && value === null) return undefined;
      // 规范keywords格式：去掉关键词间的多余空格（如"章节连贯性, 逻辑链条"→"章节连贯性,逻辑链条"）
      if (key === "keywords") return value.replace(/, /g, ",");
      // 保留所有其他字段（核心评估字段如id、importance、memory_type等不可删）
      return value;
    };

    // 2. space参数：2个空格缩进（兼顾清晰性和简洁性，避免4个空格太占篇幅）
    const optimizedJson = JSON.stringify(memories, replacer, 2);

    
    return `你是记忆管理专家，评估哪些记忆需要保留强化，哪些可以淡忘。分析以下待复习记忆列表，为每条记忆做出决策,必须采用json格式返回。
一、评估标准:
1.相关性:与用户最近对话和长期兴趣的相关度
2.价值:信息的独特性、实用性和不可替代性
3.时间因素:记忆的年龄和使用频率
4.类型和重要性:核心记忆优先保留，按重要性级别排序

二、记忆类型说明:
-核心记忆(core):用户指令、反省记忆等，通常应保留
-事实性记忆(factual):项目信息、决策、解决方案等，根据价值判断

三、重要性级别:
-important:重要记忆，通常应保留
-moderate:一般记忆，根据相关性判断
-unimportant:不重要记忆，可考虑淡忘

四、为每条记忆做出以下三种决策之一:
1."review"-记忆有价值，应保留并强化
2."forget"-记忆价值较低，可以淡忘
3."unchanged"-暂时不做处理

对于"forget"决策，指定遗忘策略:
-"delete"-完全删除记忆
-"downgrade"-降低记忆重要性但保留

五、返回JSON格式规范:
{
  "evaluations": 
  [
    {
      "memoryId": 记忆ID,
      "action": "review|forget|unchanged",
      "forgetStrategy": "delete|downgrade", //仅当action为forget时需要
      "reason": "决策原因简要说明"
    }
  ]
}

六、下面是待评估记忆列表:
${optimizedJson}
`;
  }
}
