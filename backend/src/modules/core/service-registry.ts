/**
 * 服务注册表
 * 统一管理所有服务的注册和初始化
 */

import { container } from './dependency-injection';
import { ModelService } from '../model/model.service';
import { MemoryService } from '../memory/memory.service';
import { ToolService } from '../tools/tool.service';
import { VectorDbService } from '../vector-db/vector-db.service';
import { SocketService } from '../socket/socket.service';
import { SettingService } from '../settings/settings.service';
import { ApplicationService } from './application.service';

/**
 * 服务注册表类
 */
export class ServiceRegistry {
  private initialized = false;

  /**
   * 注册所有服务
   */
  registerServices(): void {
    if (this.initialized) {
      return;
    }

    // 注册基础设施服务
    container.registerSingleton('vectorDbService', () => new VectorDbService());
    container.registerSingleton('settingService', () => new SettingService());

    // 注册领域服务
    container.registerSingleton('modelService', () => new ModelService());
    container.registerSingleton('memoryService', () => new MemoryService(), ['vectorDbService']);
    container.registerSingleton('toolService', () => new ToolService());
    container.registerSingleton('socketService', () => new SocketService());

    // 注册应用服务协调器
    container.registerSingleton('applicationService', async () => {
      const modelService = await container.resolve<ModelService>('modelService');
      const memoryService = await container.resolve<MemoryService>('memoryService');
      const toolService = await container.resolve<ToolService>('toolService');

      return new ApplicationService({
        modelService,
        memoryService,
        toolService
      });
    }, ['modelService', 'memoryService', 'toolService']);

    this.initialized = true;
  }

  /**
   * 初始化所有服务
   */
  async initializeServices(io?: any): Promise<void> {
    try {
      console.log('🔧 开始初始化服务...');

      // 1. 初始化基础设施服务
      const vectorDbService = await container.resolve<VectorDbService>('vectorDbService');
      await vectorDbService.initialize();
      console.log('✅ 向量数据库服务初始化成功');

      // 2. 初始化Socket服务
      if (io) {
        const socketService = await container.resolve<SocketService>('socketService');
        socketService.initialize(io);
        console.log('✅ Socket服务初始化成功');
      }

      // 3. 初始化工具服务
      const toolService = await container.resolve<ToolService>('toolService');
      await toolService.initialize();
      console.log('✅ 工具服务初始化成功');

      // 4. 初始化模型服务
      const modelService = await container.resolve<ModelService>('modelService');
      await modelService.initialize();
      console.log('✅ 模型服务初始化成功');

      // 5. 初始化记忆服务
      const memoryService = await container.resolve<MemoryService>('memoryService');
      await memoryService.initialize();
      console.log('✅ 记忆服务初始化成功');

      // 6. 初始化应用服务协调器
      const applicationService = await container.resolve<ApplicationService>('applicationService');
      console.log('✅ 应用服务协调器初始化成功');

      // 7. 设置服务间的依赖关系
      const { smartMemoryRetrievalService } = await import('../memory/index.js');
      modelService.setMemoryRetrievalService(smartMemoryRetrievalService);
      console.log('✅ 服务依赖关系设置完成');

      console.log('🚀 所有服务初始化完成');
    } catch (error) {
      console.error('❌ 服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取服务实例
   */
  async getService<T>(name: string): Promise<T> {
    return container.resolve<T>(name);
  }

  /**
   * 检查服务是否已注册
   */
  hasService(name: string): boolean {
    return container.has(name);
  }

  /**
   * 获取所有服务名称
   */
  getServiceNames(): string[] {
    return container.getServiceNames();
  }
}

// 创建全局服务注册表实例
export const serviceRegistry = new ServiceRegistry();
