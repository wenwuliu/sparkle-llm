/**
 * 记忆整理路由
 * 提供记忆整理状态查看和管理功能
 */

import { Router } from 'express';
import { memoryOrganizationService } from '../modules/memory';

const router = Router();

/**
 * 获取记忆整理状态
 * GET /api/memory-organization/status
 */
router.get('/status', (req, res) => {
  try {
    const status = memoryOrganizationService.getOrganizationStatus();
    
    // 计算一些友好的显示信息
    const daysUntilTimeBasedOrganization = Math.ceil(status.nextOrganizationIn / (24 * 60 * 60 * 1000));
    const daysSinceLastOrganization = Math.floor((Date.now() - status.lastOrganizationTime) / (24 * 60 * 60 * 1000));
    
    res.json({
      success: true,
      data: {
        ...status,
        // 添加友好的显示信息
        memoriesUntilOrganization: status.threshold - status.currentCounter,
        progressPercentage: Math.round((status.currentCounter / status.threshold) * 100),
        daysUntilTimeBasedOrganization: Math.max(0, daysUntilTimeBasedOrganization),
        daysSinceLastOrganization,
        lastOrganizationDate: status.lastOrganizationTime > 0 ? new Date(status.lastOrganizationTime).toISOString() : null
      }
    });
  } catch (error) {
    console.error('获取记忆整理状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取记忆整理状态失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * 手动触发记忆整理
 * POST /api/memory-organization/trigger
 */
router.post('/trigger', async (req, res) => {
  try {
    const result = await memoryOrganizationService.triggerMemoryOrganization();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('手动触发记忆整理失败:', error);
    res.status(500).json({
      success: false,
      message: '手动触发记忆整理失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * 重置记忆计数器
 * POST /api/memory-organization/reset-counter
 */
router.post('/reset-counter', (req, res) => {
  try {
    const result = memoryOrganizationService.resetMemoryCounter();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('重置记忆计数器失败:', error);
    res.status(500).json({
      success: false,
      message: '重置记忆计数器失败',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
