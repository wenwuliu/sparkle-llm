/**
 * 审计服务
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database';
import { IAuditService } from './interfaces/audit.interface';
import { AuditLog } from './audit.types';
import { Operation, OperationResult } from '../operation';

export class AuditService implements IAuditService {
  /**
   * 记录操作审计日志
   * @param userId 用户ID
   * @param operation 操作对象
   * @param result 操作结果
   * @param snapshotId 快照ID（可选）
   */
  async logOperation(
    userId: string,
    operation: Operation,
    result: OperationResult,
    snapshotId?: string
  ): Promise<void> {
    const auditLog: AuditLog = {
      id: uuidv4(),
      userId,
      operationId: operation.id,
      operationType: operation.type,
      riskLevel: operation.riskLevel,
      success: result.success,
      error: result.error,
      snapshotId,
      timestamp: Date.now(),
      details: JSON.stringify({
        operation: {
          description: operation.description,
          details: operation.details,
          command: operation.command,
          args: operation.args
        },
        result: result.result
      })
    };
    
    // 保存审计日志到数据库
    db.prepare(`
      INSERT INTO audit_logs (
        id, user_id, operation_id, operation_type, risk_level,
        success, error, snapshot_id, timestamp, details
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      auditLog.id,
      auditLog.userId,
      auditLog.operationId,
      auditLog.operationType,
      auditLog.riskLevel,
      auditLog.success ? 1 : 0,
      auditLog.error || null,
      auditLog.snapshotId || null,
      auditLog.timestamp,
      auditLog.details
    );
  }

  /**
   * 查询审计日志
   * @param filters 过滤条件
   * @returns 审计日志列表
   */
  async queryAuditLogs(filters: {
    userId?: string;
    operationType?: string;
    riskLevel?: string;
    success?: boolean;
    startTime?: number;
    endTime?: number;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    let query = `
      SELECT * FROM audit_logs
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (filters.userId) {
      query += ` AND user_id = ?`;
      params.push(filters.userId);
    }
    
    if (filters.operationType) {
      query += ` AND operation_type = ?`;
      params.push(filters.operationType);
    }
    
    if (filters.riskLevel) {
      query += ` AND risk_level = ?`;
      params.push(filters.riskLevel);
    }
    
    if (filters.success !== undefined) {
      query += ` AND success = ?`;
      params.push(filters.success ? 1 : 0);
    }
    
    if (filters.startTime) {
      query += ` AND timestamp >= ?`;
      params.push(filters.startTime);
    }
    
    if (filters.endTime) {
      query += ` AND timestamp <= ?`;
      params.push(filters.endTime);
    }
    
    query += ` ORDER BY timestamp DESC`;
    
    if (filters.limit) {
      query += ` LIMIT ?`;
      params.push(filters.limit);
      
      if (filters.offset) {
        query += ` OFFSET ?`;
        params.push(filters.offset);
      }
    }
    
    const rows = db.prepare(query).all(...params) as any[];
    
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      operationId: row.operation_id,
      operationType: row.operation_type,
      riskLevel: row.risk_level,
      success: !!row.success,
      error: row.error,
      snapshotId: row.snapshot_id,
      timestamp: row.timestamp,
      details: row.details
    }));
  }

  /**
   * 获取单个审计日志
   * @param logId 日志ID
   * @returns 审计日志对象
   */
  async getAuditLog(logId: string): Promise<AuditLog | null> {
    const row = db.prepare(`
      SELECT * FROM audit_logs WHERE id = ?
    `).get(logId) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      userId: row.user_id,
      operationId: row.operation_id,
      operationType: row.operation_type,
      riskLevel: row.risk_level,
      success: !!row.success,
      error: row.error,
      snapshotId: row.snapshot_id,
      timestamp: row.timestamp,
      details: row.details
    };
  }
}

// 创建审计服务实例
export const auditService = new AuditService();
