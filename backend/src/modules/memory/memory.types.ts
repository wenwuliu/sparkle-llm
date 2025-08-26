/**
 * 记忆服务类型定义
 */

// 记忆类型枚举
export enum MemoryType {
  CORE = 'core',           // 核心记忆：用户指令等
  FACTUAL = 'factual'      // 事实性记忆：项目信息、历史决策、用户偏好等
}

// 记忆子类型枚举
export enum MemorySubType {
  // 核心记忆子类型
  INSTRUCTION = 'instruction',    // 用户指令（如"回答必须基于事实"、"总是用中文回答"等长期有效的规则）
  REFLECTION = 'reflection',      // 反省记忆（记录对话中的不足和改进点）

  // 事实性记忆子类型
  PREFERENCE = 'preference',      // 用户偏好（如"使用中文对话"）
  PROJECT_INFO = 'project_info',  // 项目信息
  DECISION = 'decision',          // 历史决策
  SOLUTION = 'solution',          // 解决方案
  KNOWLEDGE = 'knowledge'         // 领域知识
}

// 记忆重要性级别枚举
export enum ImportanceLevel {
  IMPORTANT = 1,    // 重要记忆
  MODERATE = 2,     // 一般记忆
  UNIMPORTANT = 3   // 不重要记忆
}

// 记忆重要性级别字符串映射
export const ImportanceLevelString = {
  [ImportanceLevel.IMPORTANT]: 'important',
  [ImportanceLevel.MODERATE]: 'moderate',
  [ImportanceLevel.UNIMPORTANT]: 'unimportant'
};

// 记忆接口
export interface Memory {
  id: number;
  timestamp: number;
  keywords: string;
  context: string;
  content: string;
  importance: number;
  importance_level?: string;      // 重要性级别：'important', 'moderate', 'unimportant'
  memory_type?: string;           // 记忆类型：'core' 或 'factual'
  memory_subtype?: string;        // 记忆子类型
  is_pinned?: number;             // 是否固定显示（1表示固定，0表示不固定）
  last_accessed?: number;
  created_at: number;
  strength?: number;              // 记忆强度，用于遗忘曲线
  similarity_score?: number;      // 相似度分数，用于语义搜索
}

// 关联记忆类型
export interface MemoryRelation {
  id: number;
  memory_id: number;
  related_memory_id: number;
  relation_strength: number;
  created_at: number;
}

// 记忆冲突分析结果
export interface MemoryConflictAnalysis {
  conflicts: Array<{
    description: string;
    conflicting_ids: number[];
    keep_id: number;
    reason: string;
  }>;
}

// 记忆更新参数
export interface MemoryUpdateParams {
  content?: string;
  keywords?: string;
  importance?: number;
  importance_level?: string;
  memory_type?: string;
  memory_subtype?: string;
  is_pinned?: boolean;
}

// 记忆重要性标准
export const MEMORY_IMPORTANCE_CRITERIA = {
  important: [
    "用户指令：用户明确的长期有效要求、持久性规则、全局限制等（如'总是用中文回答'、'回答必须基于事实'）",
    "项目相关信息：项目结构、技术栈、架构设计等基本信息",
    "长期任务进展：正在进行的长期任务的状态和进展",
    "重要决策：用户做出的重要决策和选择",
    "用户明确要求记住的内容：用户明确表示'记住这个'的内容",
    "反省记忆：对话中发现的不足、错误或导致用户不满意的原因"
  ],
  moderate: [
    "用户偏好和设置：用户的个人偏好、设置选项、使用习惯等",
    "常用命令和操作：用户经常使用的命令和操作方式",
    "错误和解决方案：曾经遇到的错误及其解决方案",
    "知识性内容：对话中学到的新知识或技术信息",
    "上下文关键信息：对理解当前任务或项目有帮助的信息",
    "可能需要再次使用的信息：未来可能有用的参考信息",
    "改进建议：用户提出的改进建议或反馈"
  ],
  unimportant: [
    "已完成的简单任务：已经完成且不需要后续跟进的简单任务",
    "过时信息：已经不再适用的旧信息",
    "细节实现：具体的代码实现细节（除非用户特别要求记住）",
    "无关上下文：与项目或用户需求无关的闲聊内容"
  ]
};
