/**
 * 用户偏好服务
 */
import { db } from '../../config/database';
import { IUserPreferenceService } from './interfaces/user.interface';
import { Operation } from '../operation';

export class UserPreferenceService implements IUserPreferenceService {
  /**
   * 记录用户决策
   * @param userId 用户ID
   * @param operation 操作对象
   * @param decision 决策（确认/取消）
   */
  async recordDecision(
    userId: string,
    operation: Operation,
    decision: 'confirm' | 'cancel'
  ): Promise<void> {
    const timestamp = Date.now();
    
    // 保存用户决策到数据库
    db.prepare(`
      INSERT INTO user_decisions (
        user_id, operation_type, risk_level, decision, timestamp
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId,
      operation.type,
      operation.riskLevel,
      decision,
      timestamp
    );
  }

  /**
   * 预测用户偏好
   * @param userId 用户ID
   * @param operationType 操作类型
   * @param riskLevel 风险等级
   * @returns 用户偏好值（0-1之间，越高表示越可能确认）
   */
  async predictPreference(
    userId: string,
    operationType: string,
    riskLevel: string
  ): Promise<number> {
    // 获取用户对此类操作的历史决策
    const decisions = db.prepare(`
      SELECT decision FROM user_decisions
      WHERE user_id = ? AND operation_type = ? AND risk_level = ?
      ORDER BY timestamp DESC
      LIMIT 10
    `).all(userId, operationType, riskLevel) as any[];
    
    if (decisions.length === 0) {
      // 没有历史数据，返回默认值
      return 0.5;
    }
    
    // 计算确认率
    const confirmCount = decisions.filter(d => d.decision === 'confirm').length;
    return confirmCount / decisions.length;
  }

  /**
   * 根据用户偏好调整操作建议
   * @param userId 用户ID
   * @param operation 操作对象
   * @returns 调整后的操作对象
   */
  async adjustOperationProposal(
    userId: string,
    operation: Operation
  ): Promise<Operation> {
    const preference = await this.predictPreference(
      userId,
      operation.type,
      operation.riskLevel
    );
    
    // 根据用户偏好调整操作描述和细节
    if (preference > 0.8) {
      // 用户通常接受此类操作，可以简化描述
      operation.description = `${operation.description} (根据您的使用习惯推荐)`;
    } else if (preference < 0.3) {
      // 用户通常拒绝此类操作，添加更多警告
      operation.details.push('注意：您过去通常不执行此类操作');
    }
    
    return operation;
  }
}

// 创建用户偏好服务实例
export const userPreferenceService = new UserPreferenceService();
