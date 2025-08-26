/**
 * 快照服务
 */
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { db } from '../../config/database';
import { ISnapshotService } from './interfaces/snapshot.interface';
import { Snapshot } from './snapshot.types';
import { Operation } from '../operation';

export class SnapshotService implements ISnapshotService {
  private snapshotDir: string;

  constructor(snapshotDir: string = path.join(process.cwd(), 'backend/snapshots')) {
    this.snapshotDir = snapshotDir;
    this.ensureSnapshotDir();
  }

  /**
   * 确保快照目录存在
   */
  private async ensureSnapshotDir(): Promise<void> {
    try {
      await fs.mkdir(this.snapshotDir, { recursive: true });
    } catch (error) {
      console.error('创建快照目录失败:', error);
    }
  }

  /**
   * 创建操作快照
   * @param operation 操作对象
   * @returns 快照对象
   */
  async createSnapshot(operation: Operation): Promise<Snapshot> {
    const snapshot: Snapshot = {
      id: uuidv4(),
      operationId: operation.id,
      timestamp: Date.now(),
      data: {},
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天后过期
    };

    // 根据操作类型收集不同的快照数据
    switch (operation.type) {
      case 'deleteFile':
        snapshot.data = await this.captureFileSnapshot(operation.args[0]);
        break;
      case 'deleteDirectory':
        snapshot.data = await this.captureDirectorySnapshot(operation.args[0]);
        break;
      case 'modifyFile':
        snapshot.data = await this.captureFileSnapshot(operation.args[0]);
        break;
      case 'modifyConfig':
        snapshot.data = await this.captureFileSnapshot(operation.args[0]);
        break;
      // 其他操作类型...
    }

    // 保存快照
    await this.saveSnapshot(snapshot);

    return snapshot;
  }

  /**
   * 捕获文件快照
   * @param filePath 文件路径
   * @returns 文件快照数据
   */
  private async captureFileSnapshot(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      
      return {
        type: 'file',
        path: filePath,
        content,
        stats: {
          size: stats.size,
          mtime: stats.mtime.getTime(),
          mode: stats.mode
        }
      };
    } catch (error: any) {
      console.error(`捕获文件快照失败: ${filePath}`, error);
      return {
        type: 'file',
        path: filePath,
        error: error.message
      };
    }
  }

  /**
   * 捕获目录快照
   * @param dirPath 目录路径
   * @returns 目录快照数据
   */
  private async captureDirectorySnapshot(dirPath: string): Promise<any> {
    try {
      const files = await this.listFilesRecursive(dirPath);
      const fileSnapshots = [];
      
      for (const file of files) {
        try {
          const snapshot = await this.captureFileSnapshot(file);
          fileSnapshots.push(snapshot);
        } catch (error: any) {
          console.error(`捕获文件快照失败: ${file}`, error);
        }
      }
      
      return {
        type: 'directory',
        path: dirPath,
        files: fileSnapshots
      };
    } catch (error: any) {
      console.error(`捕获目录快照失败: ${dirPath}`, error);
      return {
        type: 'directory',
        path: dirPath,
        error: error.message
      };
    }
  }

  /**
   * 递归列出目录中的所有文件
   * @param dirPath 目录路径
   * @returns 文件路径列表
   */
  private async listFilesRecursive(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    async function traverse(currentPath: string) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    }
    
    await traverse(dirPath);
    return files;
  }

  /**
   * 保存快照
   * @param snapshot 快照对象
   */
  private async saveSnapshot(snapshot: Snapshot): Promise<void> {
    // 保存快照元数据到数据库
    db.prepare(`
      INSERT INTO snapshots (id, operation_id, timestamp, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(snapshot.id, snapshot.operationId, snapshot.timestamp, snapshot.expiresAt);
    
    // 保存快照数据到文件
    const snapshotPath = path.join(this.snapshotDir, `${snapshot.id}.json`);
    await fs.writeFile(snapshotPath, JSON.stringify(snapshot.data, null, 2));
  }

  /**
   * 获取快照
   * @param snapshotId 快照ID
   * @returns 快照对象
   */
  async getSnapshot(snapshotId: string): Promise<Snapshot | null> {
    try {
      // 从数据库获取快照元数据
      const metadata = db.prepare(`
        SELECT * FROM snapshots WHERE id = ?
      `).get(snapshotId) as any;
      
      if (!metadata) return null;
      
      // 从文件读取快照数据
      const snapshotPath = path.join(this.snapshotDir, `${snapshotId}.json`);
      const data = JSON.parse(await fs.readFile(snapshotPath, 'utf-8'));
      
      return {
        id: metadata.id,
        operationId: metadata.operation_id,
        timestamp: metadata.timestamp,
        expiresAt: metadata.expires_at,
        data
      };
    } catch (error: any) {
      console.error(`获取快照失败: ${snapshotId}`, error);
      return null;
    }
  }

  /**
   * 从快照恢复
   * @param snapshotId 快照ID
   * @returns 是否恢复成功
   */
  async restoreFromSnapshot(snapshotId: string): Promise<boolean> {
    const snapshot = await this.getSnapshot(snapshotId);
    if (!snapshot) return false;
    
    try {
      // 根据快照类型执行恢复
      if (snapshot.data.type === 'file') {
        await this.restoreFile(snapshot.data);
      } else if (snapshot.data.type === 'directory') {
        await this.restoreDirectory(snapshot.data);
      }
      
      return true;
    } catch (error: any) {
      console.error(`从快照恢复失败: ${snapshotId}`, error);
      return false;
    }
  }

  /**
   * 恢复文件
   * @param fileSnapshot 文件快照数据
   */
  private async restoreFile(fileSnapshot: any): Promise<void> {
    const { path: filePath, content } = fileSnapshot;
    
    // 确保目录存在
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // 写入文件内容
    await fs.writeFile(filePath, content);
    
    // 如果有文件权限信息，也恢复它
    if (fileSnapshot.stats && fileSnapshot.stats.mode) {
      await fs.chmod(filePath, fileSnapshot.stats.mode);
    }
  }

  /**
   * 恢复目录
   * @param dirSnapshot 目录快照数据
   */
  private async restoreDirectory(dirSnapshot: any): Promise<void> {
    const { files } = dirSnapshot;
    
    // 恢复目录中的所有文件
    for (const fileSnapshot of files) {
      await this.restoreFile(fileSnapshot);
    }
  }

  /**
   * 清理过期快照
   * @returns 清理的快照数量
   */
  async cleanupExpiredSnapshots(): Promise<number> {
    const now = Date.now();
    
    // 获取过期的快照
    const expiredSnapshots = db.prepare(`
      SELECT id FROM snapshots WHERE expires_at < ?
    `).all(now) as any[];
    
    let count = 0;
    
    for (const snapshot of expiredSnapshots) {
      try {
        // 删除快照文件
        const snapshotPath = path.join(this.snapshotDir, `${snapshot.id}.json`);
        await fs.unlink(snapshotPath);
        
        // 从数据库删除快照记录
        db.prepare(`DELETE FROM snapshots WHERE id = ?`).run(snapshot.id);
        
        count++;
      } catch (error: any) {
        console.error(`删除过期快照失败: ${snapshot.id}`, error);
      }
    }
    
    return count;
  }
}

// 创建快照服务实例
export const snapshotService = new SnapshotService();
