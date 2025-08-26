/**
 * 用户模块入口
 */
import { UserPreferenceService, userPreferenceService } from './user-preference.service';
import { IUserPreferenceService } from './interfaces/user.interface';

// 导出服务实例
export {
  userPreferenceService
};

// 导出类和接口
export { UserPreferenceService };
export type { IUserPreferenceService };
