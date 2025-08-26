/**
 * 操作服务接口定义
 */

import { Operation, OperationResult, OperationType, RiskLevel } from '../operation.types';

/**
 * 操作服务接口
 */
export interface IOperationService {
  /**
   * 创建操作
   * @param type 操作类型
   * @param description 操作描述
   * @param details 操作详情
   * @param command 命令
   * @param args 参数
   * @param userId 用户ID
   * @returns 操作对象
   */
  createOperation(
    type: OperationType,
    description: string,
    details: string[],
    command: string,
    args: any[],
    userId: string
  ): Operation;

  /**
   * 评估操作风险
   * @param operation 操作对象
   * @returns 评估后的操作对象
   */
  assessRisk(operation: Operation): Operation;
}

/**
 * 操作执行器接口
 */
export interface IOperationExecutor {
  /**
   * 执行操作
   * @param operation 操作对象
   * @returns 操作结果
   */
  executeOperation(operation: Operation): Promise<OperationResult>;
}
