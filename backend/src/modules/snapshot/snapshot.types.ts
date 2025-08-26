/**
 * 快照模块类型定义
 */

// 快照定义
export interface Snapshot {
  id: string;
  operationId: string;
  timestamp: number;
  data: any;
  expiresAt: number;
}
