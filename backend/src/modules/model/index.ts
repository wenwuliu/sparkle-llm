import { ModelService } from './model.service';
import { ModelConfig } from './model.config';
import { promptService, PromptService } from './prompts';
import { ModelProvider, ModelProviderType } from './interfaces/model-provider.interface';
import { ModelService as IModelService } from './interfaces/model-service.interface';

// 创建模型服务实例
const modelService = new ModelService();

// 导出模型服务实例和类型
export {
  modelService,
  promptService,
  ModelService,
  PromptService,
  ModelConfig
};

export type {
  ModelProvider,
  ModelProviderType,
  IModelService
};
