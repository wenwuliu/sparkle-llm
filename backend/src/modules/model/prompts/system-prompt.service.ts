/**
 * 系统提示词服务
 * 管理系统提示词和通用提示词
 */
import { db } from '../../../config/database';
import { BasePromptService } from './base-prompt.service';

export class SystemPromptService {
  private basePromptService = new BasePromptService();

  /**
   * 获取系统提示词
   * @returns 系统提示词
   */
  getSystemPrompt(): string {
    try {
      const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('system_prompt') as { value: string } | undefined;
      return setting ? setting.value : this.getDefaultSystemPrompt();
    } catch (error) {
      console.error('获取系统提示词失败:', error);
      return this.getDefaultSystemPrompt();
    }
  }

  /**
   * 获取默认系统提示词
   * @returns 默认系统提示词
   */
  private getDefaultSystemPrompt(): string {
    return `你是Sparkle，AI助手，有记忆和任务流能力。遵循原则：提供准确具体信息；不确定时坦诚说明；避免有害内容；尊重隐私；保持客观；用中文回答中文问题。

特殊能力：长期记忆(记住用户偏好指令)；任务流(处理复杂任务)；工具使用；数据可视化。

${this.basePromptService.getChartPromptSection()}

结构化流程用Mermaid，数据可视化用ECharts。`;
  }

  /**
   * 保存系统提示词
   * @param prompt 系统提示词
   * @returns 是否保存成功
   */
  saveSystemPrompt(prompt: string): boolean {
    try {
      const timestamp = Date.now();

      // 检查设置是否存在
      const exists = db.prepare('SELECT 1 FROM settings WHERE key = ?').get('system_prompt');

      if (exists) {
        // 更新设置
        db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?').run(prompt, timestamp, 'system_prompt');
      } else {
        // 插入设置
        db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run('system_prompt', prompt, timestamp);
      }

      return true;
    } catch (error) {
      console.error('保存系统提示词失败:', error);
      return false;
    }
  }

  /**
   * 获取通用系统提示词（适用于所有模型）
   * @returns 通用系统提示词
   */
  getUniversalSystemPrompt(): string {
    return `你是Sparkle，AI助手，有记忆和任务流能力。遵循原则：提供准确具体信息；不确定时坦诚说明；避免有害内容；尊重隐私；保持客观；用中文回答中文问题。

特殊能力：长期记忆(记住用户偏好指令)；任务流(处理复杂任务)；工具使用；数据可视化。

${this.basePromptService.getChartPromptSection()}`;
  }

  /**
   * 获取工具调用系统提示词（适用于支持OpenAI函数调用格式的模型）
   * @returns 工具调用系统提示词
   */
  getToolSystemPrompt(): string {
    return `你是Sparkle，能使用工具的AI助手。请根据用户需求，使用提供的工具来解决问题。

使用工具时的原则：
1. 只在必要时使用工具，简单问题直接回答
2. 使用工具前，清晰说明你将使用什么工具及原因
3. 工具调用失败时，尝试理解错误原因并修正或尝试其他方法
4. 工具返回结果后，提供清晰的解释和分析

${this.basePromptService.getDataVisualizationGuideSection()}

${this.basePromptService.getChartPromptSection()}`;
  }
}
