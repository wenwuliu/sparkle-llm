/**
 * 审计模块类型定义
 */

// 审计日志定义
export interface AuditLog {
  id: string;
  userId: string;
  operationId: string;
  operationType: string;
  riskLevel: string;
  success: boolean;
  error?: string;
  snapshotId?: string;
  timestamp: number;
  details: string;
}
