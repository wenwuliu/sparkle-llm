/**
 * 提示词服务索引
 * 导出所有提示词服务
 */
import { BasePromptService } from './base-prompt.service';
import { SystemPromptService } from './system-prompt.service';
import { MemoryPromptService } from './memory-prompt.service';
import { TaskFlowPromptService } from './task-flow-prompt.service';
import { ToolPromptService } from './tool-prompt.service';
import { PromptService } from './prompt.service';

// 创建提示词服务实例
const basePromptService = new BasePromptService();
const systemPromptService = new SystemPromptService();
const memoryPromptService = new MemoryPromptService();
const taskFlowPromptService = new TaskFlowPromptService();
const toolPromptService = new ToolPromptService();

// 创建主提示词服务实例
export const promptService = new PromptService(
  basePromptService,
  systemPromptService,
  memoryPromptService,
  taskFlowPromptService,
  toolPromptService
);

// 导出所有提示词服务类型
export {
  BasePromptService,
  SystemPromptService,
  MemoryPromptService,
  TaskFlowPromptService,
  ToolPromptService,
  PromptService
};
