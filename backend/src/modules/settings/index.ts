/**
 * 设置模块入口
 */
import { settingService } from './settings.service';
import { Setting, ModelConfig, ModelProviderType } from './settings.types';
import { SettingService } from './interfaces/setting.interface';

// 导出设置服务实例
export { settingService };

// 导出设置类型
export type { Setting, ModelConfig, ModelProviderType };

// 导出设置服务接口
export type { SettingService };
