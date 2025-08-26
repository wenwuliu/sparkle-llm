/**
 * 核心模块导出
 */

export { ApplicationService, createApplicationService } from './application.service';
export type { ApplicationContext } from './application.service';

export { DIContainer, container } from './dependency-injection';
export { ServiceRegistry, serviceRegistry } from './service-registry';
