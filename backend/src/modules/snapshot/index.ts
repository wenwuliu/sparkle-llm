/**
 * 快照模块入口
 */
import { SnapshotService, snapshotService } from './snapshot.service';
import { ISnapshotService } from './interfaces/snapshot.interface';
import { Snapshot } from './snapshot.types';

// 导出服务实例
export {
  snapshotService
};

// 导出类和接口
export { SnapshotService };
export type { ISnapshotService, Snapshot };
