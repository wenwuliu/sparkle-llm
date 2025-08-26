/**
 * 模块索引
 * 导出所有模块，方便在应用中统一导入
 */

// 导出API模块
import * as apiModule from './api';
export { apiModule };

// 导出模型模块
import { modelService, promptService, ModelService, PromptService, ModelConfig } from './model';
export { modelService, promptService, ModelService, PromptService, ModelConfig };

// 导出记忆模块
import {
  memoryService,
  memoryOrganizationService,
  autoMemoryReviewService,
  MemoryService,
  MemoryOrganizationService,
  AutoMemoryReviewService,
  MemoryType,
  MemorySubType,
  ImportanceLevel
} from './memory';
export {
  memoryService,
  memoryOrganizationService,
  autoMemoryReviewService,
  MemoryService,
  MemoryOrganizationService,
  AutoMemoryReviewService,
  MemoryType,
  MemorySubType,
  ImportanceLevel
};

// 导出对话模块
import { conversationService, ConversationService } from './conversation';
export { conversationService, ConversationService };

// 导出工具模块
import { toolManager, toolService } from './tools';
export { toolManager, toolService };

// 导出设置模块
import { settingService } from './settings';
export { settingService };

// 导出Socket模块
import { socketService } from './socket';
export { socketService };

// 导出向量数据库模块
import { VectorDbService } from './vector-db';
const vectorDbService = new VectorDbService();
export { vectorDbService };

// 导出操作模块
import {
  operationService,
  operationExecutor,
  OperationService,
  OperationExecutorService
} from './operation';
export {
  operationService,
  operationExecutor,
  OperationService,
  OperationExecutorService
};

// 导出审计模块
import { auditService, AuditService } from './audit';
export { auditService, AuditService };

// 导出快照模块
import { snapshotService, SnapshotService } from './snapshot';
export { snapshotService, SnapshotService };

// 导出用户模块
import { userPreferenceService, UserPreferenceService } from './user';
export { userPreferenceService, UserPreferenceService };

// 导出应用模块
import { AppStartupService } from './app';
export { AppStartupService };

// 导出Agent模块
import { agentService, AgentService } from './agent';
export { agentService, AgentService };




