/**
 * 应用启动服务
 * 负责应用启动时的初始化工作，包括记忆复习检查
 */

import { MemoryService } from '../memory/memory.service';
import { AutoMemoryReviewService } from '../memory/auto-memory-review.service';

/**
 * 应用启动服务类
 */
export class AppStartupService {
  private memoryService: MemoryService;
  private autoMemoryReviewService: AutoMemoryReviewService;
  private reviewCheckInterval: NodeJS.Timeout | null = null;
  
  /**
   * 构造函数
   * @param memoryService 记忆服务实例
   * @param autoMemoryReviewService 自动记忆复习服务实例
   */
  constructor(
    memoryService: MemoryService,
    autoMemoryReviewService: AutoMemoryReviewService
  ) {
    this.memoryService = memoryService;
    this.autoMemoryReviewService = autoMemoryReviewService;
  }
  
  /**
   * 初始化应用
   */
  async initialize(): Promise<void> {
    try {
      console.log('应用启动服务初始化...');
      
      // 检查是否有需要复习的记忆
      await this.checkAndReviewMemories('startup');
      
      // 设置定期检查
      this.setupPeriodicReviewCheck();
      
      console.log('应用启动服务初始化完成');
    } catch (error) {
      console.error('应用启动服务初始化失败:', error);
    }
  }
  
  /**
   * 检查并复习记忆
   * @param triggerType 触发类型
   */
  private async checkAndReviewMemories(triggerType: string = 'periodic'): Promise<void> {
    try {
      // 获取需要复习的记忆
      const memoriesToReview = await this.memoryService.getMemoriesToReview();
      
      if (memoriesToReview.length > 0) {
        console.log(`发现${memoriesToReview.length}条需要复习的记忆，开始自动复习...`);
        
        // 交给自动记忆复习服务处理
        await this.autoMemoryReviewService.performAutoReview(memoriesToReview, triggerType);
      } else {
        console.log('没有发现需要复习的记忆');
      }
    } catch (error) {
      console.error('记忆复习检查失败:', error);
    }
  }
  
  /**
   * 设置定期检查
   */
  private setupPeriodicReviewCheck(): void {
    // 清除可能存在的旧定时器
    if (this.reviewCheckInterval) {
      clearInterval(this.reviewCheckInterval);
    }
    
    // 设置30分钟定期检查
    this.reviewCheckInterval = setInterval(async () => {
      console.log('执行定期记忆复习检查...');
      await this.checkAndReviewMemories('periodic');
    }, 30 * 60 * 1000); // 30分钟
    
    console.log('已设置30分钟定期记忆复习检查');
  }
  
  /**
   * 停止服务
   */
  shutdown(): void {
    if (this.reviewCheckInterval) {
      clearInterval(this.reviewCheckInterval);
      this.reviewCheckInterval = null;
      console.log('已停止定期记忆复习检查');
    }
  }
}
