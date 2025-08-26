import { Request, Response } from 'express';
import { settingService } from '../../settings';

/**
 * 设置控制器
 * 处理设置相关的API请求
 */
export class SettingsController {
  /**
   * 获取所有设置
   * @param req 请求对象
   * @param res 响应对象
   */
  getAllSettings = (req: Request, res: Response): void => {
    try {
      const settings = settingService.getAllSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      console.error('获取设置失败:', error);
      res.status(500).json({ success: false, message: '获取设置失败' });
    }
  }

  /**
   * 获取指定设置
   * @param req 请求对象
   * @param res 响应对象
   */
  getSetting = (req: Request, res: Response): Response | void => {
    try {
      const { key } = req.params;
      const value = settingService.getSetting(key);

      if (value === null) {
        return res.status(404).json({ success: false, message: '设置不存在' });
      }

      res.json({ success: true, data: { value } });
    } catch (error) {
      console.error('获取设置失败:', error);
      res.status(500).json({ success: false, message: '获取设置失败' });
    }
  }

  /**
   * 保存设置
   * @param req 请求对象
   * @param res 响应对象
   */
  saveSetting = (req: Request, res: Response): Response | void => {
    try {
      const { key } = req.params;
      const { value } = req.body;

      if (value === undefined) {
        return res.status(400).json({ success: false, message: '缺少必要参数' });
      }

      const success = settingService.saveSetting(key, String(value));

      if (!success) {
        return res.status(500).json({ success: false, message: '保存设置失败' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('保存设置失败:', error);
      res.status(500).json({ success: false, message: '保存设置失败' });
    }
  }

  /**
   * 批量保存设置
   * @param req 请求对象
   * @param res 响应对象
   */
  saveSettings = (req: Request, res: Response): Response | void => {
    try {
      const { settings } = req.body;

      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ success: false, message: '缺少必要参数' });
      }

      const success = settingService.saveSettings(settings);

      if (!success) {
        return res.status(500).json({ success: false, message: '保存设置失败' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('保存设置失败:', error);
      res.status(500).json({ success: false, message: '保存设置失败' });
    }
  }

  /**
   * 获取模型配置
   * @param req 请求对象
   * @param res 响应对象
   */
  getModelConfig = (req: Request, res: Response): void => {
    try {
      const config = settingService.getModelConfig();
      res.json({ success: true, data: config });
    } catch (error) {
      console.error('获取模型配置失败:', error);
      res.status(500).json({ success: false, message: '获取模型配置失败' });
    }
  }
}

// 创建设置控制器实例
export const settingsController = new SettingsController();
