/**
 * 快照服务接口定义
 */
import { Operation } from '../../operation';
import { Snapshot } from '../snapshot.types';

/**
 * 快照服务接口
 */
export interface ISnapshotService {
  /**
   * 创建操作快照
   * @param operation 操作对象
   * @returns 快照对象
   */
  createSnapshot(operation: Operation): Promise<Snapshot>;

  /**
   * 获取快照
   * @param snapshotId 快照ID
   * @returns 快照对象
   */
  getSnapshot(snapshotId: string): Promise<Snapshot | null>;

  /**
   * 从快照恢复
   * @param snapshotId 快照ID
   * @returns 是否恢复成功
   */
  restoreFromSnapshot(snapshotId: string): Promise<boolean>;

  /**
   * 清理过期快照
   * @returns 清理的快照数量
   */
  cleanupExpiredSnapshots(): Promise<number>;
}
