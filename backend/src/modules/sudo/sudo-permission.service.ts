/**
 * sudo权限管理服务
 * 处理sudo权限请求、确认和记忆功能
 */
import { v4 as uuidv4 } from 'uuid';
import { socketService } from '../socket/socket.service';
import { db } from '../../config/database';

/**
 * sudo权限请求接口
 */
export interface SudoPermissionRequest {
  /**
   * 请求ID
   */
  requestId: string;

  /**
   * 命令
   */
  command: string;

  /**
   * 风险等级
   */
  riskLevel: string;
}

/**
 * sudo权限结果接口
 */
export interface SudoPermissionResult {
  /**
   * 是否授权
   */
  granted: boolean;

  /**
   * 是否记住决定
   */
  remember: boolean;
}

/**
 * sudo权限管理服务类
 */
export class SudoPermissionService {
  /**
   * 权限请求超时时间（毫秒）
   */
  private readonly REQUEST_TIMEOUT = 60000;

  /**
   * 权限请求映射
   */
  private permissionRequests: Map<string, {
    resolve: (result: SudoPermissionResult) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }> = new Map();

  /**
   * 初始化服务
   */
  initialize(): void {
    console.log('初始化sudo权限管理服务...');

    // 创建权限记忆表（如果不存在）
    db.exec(`
      CREATE TABLE IF NOT EXISTS sudo_permissions (
        request_id TEXT PRIMARY KEY,
        command_hash TEXT NOT NULL,
        granted INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    // 设置WebSocket事件监听
    const io = socketService.getIO();
    if (io) {
      io.on('connection', (socket) => {
        // 监听sudo权限响应
        socket.on('sudo:permission:response', (data: {
          requestId: string;
          granted: boolean;
          remember: boolean;
        }) => {
          this.handlePermissionResponse(data);
        });

        // 监听sudo密码
        socket.on('sudo:password', (data: {
          requestId: string;
          password: string;
        }) => {
          this.handleSudoPassword(data);
        });

        // 监听清除权限记忆请求
        socket.on('sudo:clear-permissions', () => {
          this.clearAllPermissions();
          socket.emit('sudo:permissions-cleared');
        });
      });
    }

    console.log('sudo权限管理服务初始化完成');
  }

  /**
   * 生成命令哈希
   * @param command 命令
   * @returns 命令哈希
   */
  private generateCommandHash(command: string): string {
    // 简单实现，实际应用中可以使用更复杂的哈希算法
    return Buffer.from(command).toString('base64');
  }

  /**
   * 检查是否已有权限记忆
   * @param command 命令
   * @returns 是否已授权
   */
  async checkPermission(command: string): Promise<boolean> {
    const commandHash = this.generateCommandHash(command);

    const permission = db.prepare(`
      SELECT granted FROM sudo_permissions WHERE command_hash = ?
    `).get(commandHash) as { granted: number } | undefined;

    return permission ? Boolean(permission.granted) : false;
  }

  /**
   * 请求sudo权限
   * @param request 权限请求
   * @returns 权限结果
   */
  async requestPermission(request: SudoPermissionRequest): Promise<SudoPermissionResult> {
    const io = socketService.getIO();
    if (!io) {
      throw new Error('WebSocket服务未初始化');
    }

    return new Promise<SudoPermissionResult>((resolve, reject) => {
      // 设置超时定时器
      const timer = setTimeout(() => {
        this.permissionRequests.delete(request.requestId);
        reject(new Error('sudo权限请求超时'));
      }, this.REQUEST_TIMEOUT);

      // 保存请求
      this.permissionRequests.set(request.requestId, {
        resolve,
        reject,
        timer
      });

      // 发送权限请求
      io.emit('sudo:permission:request', {
        requestId: request.requestId,
        command: request.command,
        riskLevel: request.riskLevel
      });
    });
  }

  /**
   * 处理权限响应
   * @param response 权限响应
   */
  private handlePermissionResponse(response: {
    requestId: string;
    granted: boolean;
    remember: boolean;
  }): void {
    const { requestId, granted, remember } = response;

    // 获取请求
    const request = this.permissionRequests.get(requestId);
    if (!request) {
      console.warn(`未找到sudo权限请求: ${requestId}`);
      return;
    }

    // 清除超时定时器
    clearTimeout(request.timer);

    // 解析请求
    request.resolve({
      granted,
      remember
    });

    // 删除请求
    this.permissionRequests.delete(requestId);
  }

  // 存储sudo密码（临时，仅在内存中）
  private sudoPasswords: Map<string, string> = new Map();

  /**
   * 处理sudo密码
   * @param data 密码数据
   */
  private handleSudoPassword(data: {
    requestId: string;
    password: string;
  }): void {
    const { requestId, password } = data;

    // 临时存储密码（仅在内存中）
    this.sudoPasswords.set(requestId, password);

    // 设置定时器，一段时间后自动清除密码
    setTimeout(() => {
      this.sudoPasswords.delete(requestId);
    }, 60000); // 1分钟后自动清除

    console.log(`收到sudo密码请求: ${requestId}`);
  }

  /**
   * 获取sudo密码
   * @param requestId 请求ID
   * @returns sudo密码或undefined
   */
  getSudoPassword(requestId: string): string | undefined {
    return this.sudoPasswords.get(requestId);
  }

  /**
   * 清除sudo密码
   * @param requestId 请求ID
   */
  clearSudoPassword(requestId: string): void {
    this.sudoPasswords.delete(requestId);
  }

  /**
   * 保存权限记忆
   * @param command 命令
   * @param granted 是否授权
   */
  savePermission(command: string, granted: boolean): void {
    const commandHash = this.generateCommandHash(command);

    // 保存权限记忆
    db.prepare(`
      INSERT OR REPLACE INTO sudo_permissions (
        request_id, command_hash, granted, created_at
      ) VALUES (?, ?, ?, ?)
    `).run(
      uuidv4(),
      commandHash,
      granted ? 1 : 0,
      Date.now()
    );
  }

  /**
   * 清除所有权限记忆
   */
  clearAllPermissions(): void {
    db.prepare('DELETE FROM sudo_permissions').run();
  }
}

// 创建服务实例
export const sudoPermissionService = new SudoPermissionService();
