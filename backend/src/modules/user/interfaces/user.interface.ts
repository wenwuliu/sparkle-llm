/**
 * 用户服务接口定义
 */
import { Operation } from '../../operation';

/**
 * 用户偏好服务接口
 */
export interface IUserPreferenceService {
  /**
   * 记录用户决策
   * @param userId 用户ID
   * @param operation 操作对象
   * @param decision 决策（确认/取消）
   */
  recordDecision(
    userId: string,
    operation: Operation,
    decision: 'confirm' | 'cancel'
  ): Promise<void>;

  /**
   * 预测用户偏好
   * @param userId 用户ID
   * @param operationType 操作类型
   * @param riskLevel 风险等级
   * @returns 用户偏好值（0-1之间，越高表示越可能确认）
   */
  predictPreference(
    userId: string,
    operationType: string,
    riskLevel: string
  ): Promise<number>;

  /**
   * 根据用户偏好调整操作建议
   * @param userId 用户ID
   * @param operation 操作对象
   * @returns 调整后的操作对象
   */
  adjustOperationProposal(
    userId: string,
    operation: Operation
  ): Promise<Operation>;
}
