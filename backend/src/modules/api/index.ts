/**
 * API模块入口
 */
import { settingsController } from './controllers/settings.controller';
import { modelController } from './controllers/model.controller';
import { memoryController } from './controllers/memory.controller';
import { conversationController } from './controllers/conversation.controller';
import { toolsController } from './controllers/tools.controller';

import {
  settingsRoutes,
  modelRoutes,
  memoryRoutes,
  conversationRoutes,
  toolsRoutes,
  memoryOrganizationRoutes
} from './routes';

// 导出控制器
export {
  settingsController,
  modelController,
  memoryController,
  conversationController,
  toolsController
};

// 导出路由
export {
  settingsRoutes,
  modelRoutes,
  memoryRoutes,
  conversationRoutes,
  toolsRoutes,
  memoryOrganizationRoutes
};
