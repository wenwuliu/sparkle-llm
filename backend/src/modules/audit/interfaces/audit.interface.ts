/**
 * 审计服务接口定义
 */
import { Operation, OperationResult } from '../../operation';
import { AuditLog } from '../audit.types';

/**
 * 审计服务接口
 */
export interface IAuditService {
  /**
   * 记录操作审计日志
   * @param userId 用户ID
   * @param operation 操作对象
   * @param result 操作结果
   * @param snapshotId 快照ID（可选）
   */
  logOperation(
    userId: string,
    operation: Operation,
    result: OperationResult,
    snapshotId?: string
  ): Promise<void>;

  /**
   * 查询审计日志
   * @param filters 过滤条件
   * @returns 审计日志列表
   */
  queryAuditLogs(filters: {
    userId?: string;
    operationType?: string;
    riskLevel?: string;
    success?: boolean;
    startTime?: number;
    endTime?: number;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]>;

  /**
   * 获取单个审计日志
   * @param logId 日志ID
   * @returns 审计日志对象
   */
  getAuditLog(logId: string): Promise<AuditLog | null>;
}
