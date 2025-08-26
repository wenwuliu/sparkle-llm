/**
 * 主提示词服务
 * 整合所有提示词服务，提供统一的接口
 */
import { BasePromptService } from './base-prompt.service';
import { SystemPromptService } from './system-prompt.service';
import { MemoryPromptService } from './memory-prompt.service';
import { TaskFlowPromptService } from './task-flow-prompt.service';
import { optimizedPromptService } from './optimized-prompt.service';
import { ToolPromptService } from './tool-prompt.service';

export class PromptService {
  constructor(
    private basePromptService: BasePromptService,
    private systemPromptService: SystemPromptService,
    private memoryPromptService: MemoryPromptService,
    private taskFlowPromptService: TaskFlowPromptService,
    private toolPromptService: ToolPromptService
  ) {}

  // 系统提示词相关方法
  getSystemPrompt(): string {
    return this.systemPromptService.getSystemPrompt();
  }

  saveSystemPrompt(prompt: string): boolean {
    return this.systemPromptService.saveSystemPrompt(prompt);
  }

  getUniversalSystemPrompt(): string {
    return this.systemPromptService.getUniversalSystemPrompt();
  }

  getToolSystemPrompt(): string {
    return this.systemPromptService.getToolSystemPrompt();
  }

  // 优化的动态系统提示词方法
  getDynamicSystemPrompt(context: {
    needsTools: boolean;
    needsMemory: boolean;
    needsVisualization: boolean;
    userMessage: string;
    messageLength: number;
    isSimpleQuery: boolean;
  }): string {
    return optimizedPromptService.buildDynamicSystemPrompt(context);
  }

  // 提示词长度优化方法
  optimizePromptLength(prompt: string, maxTokens?: number): string {
    return optimizedPromptService.optimizePromptLength(prompt, maxTokens);
  }

  // 工具提示词相关方法
  getToolsPrompt(tools: any[], enableSearch: boolean = false): string {
    return this.toolPromptService.getToolsPrompt(tools, enableSearch);
  }

  // 优化的工具提示词方法
  getOptimizedToolsPrompt(tools: any[], userMessage: string): string {
    return optimizedPromptService.getCompactToolDescription(tools, userMessage);
  }

  getToolResultsPrompt(toolCalls: any[], toolCallResults: any[], format: 'traditional' | 'openai' = 'traditional'): string {
    return this.toolPromptService.getToolResultsPrompt(toolCalls, toolCallResults, format);
  }

  getToolResultsSystemPrompt(): string {
    return this.toolPromptService.getToolResultsPrompt([], [], 'openai');
  }

  // 记忆提示词相关方法
  getMemoriesPrompt(memories: any[]): string {
    return this.memoryPromptService.getMemoriesPrompt(memories);
  }

  getMemoryGenerationPrompt(context: string, type: 'general' | 'reflection' | 'multiple' = 'general'): string {
    return this.memoryPromptService.getMemoryGenerationPrompt(context, type);
  }

  getReflectionMemoryPrompt(conversation: string): string {
    return this.memoryPromptService.getMemoryGenerationPrompt(conversation, 'reflection');
  }

  getMultipleMemoriesPrompt(conversation: string): string {
    return this.memoryPromptService.getMemoryGenerationPrompt(conversation, 'multiple');
  }

  getMemoryConflictAnalysisPrompt(memories: any[]): string {
    return this.memoryPromptService.getMemoryConflictAnalysisPrompt(memories);
  }

  getMemoryReviewPrompt(memories: any[], context: string): string {
    return this.memoryPromptService.getMemoryReviewPrompt(memories, context);
  }

  // 任务流提示词相关方法
  getTaskExecutionPrompt(
    task: string,
    goal: string,
    availableTools: any[] = [],
    toolCallHistory: any[] = []
  ): string {
    return this.taskFlowPromptService.getTaskExecutionPrompt(task, goal, availableTools, toolCallHistory);
  }

  getToolResultPrompt(
    previousContent: string,
    toolResults: any[],
    goal: string
  ): string {
    return this.taskFlowPromptService.getToolResultPrompt(previousContent, toolResults, goal);
  }



  // 图表生成相关方法
  getChartPromptSection(): string {
    return this.basePromptService.getChartPromptSection();
  }

  getDataVisualizationGuideSection(): string {
    return this.basePromptService.getDataVisualizationGuideSection();
  }

  getJsonReturnFormatSection(): string {
    return this.basePromptService.getJsonReturnFormatSection();
  }

  buildToolsAsFunctions(tools: any[]): string {
    return this.basePromptService.buildToolsAsFunctions(tools);
  }

  getCategoryDisplayName(category: string): string {
    return this.basePromptService.getCategoryDisplayName(category);
  }
}
