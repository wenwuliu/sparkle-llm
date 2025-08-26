/**
 * 操作执行器服务
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { IOperationExecutor } from './interfaces/operation.interface';
import { Operation, OperationResult } from './operation.types';
import { snapshotService } from '../snapshot';
import { auditService } from '../audit';

const execPromise = promisify(exec);

export class OperationExecutorService implements IOperationExecutor {
  /**
   * 执行操作
   * @param operation 操作对象
   * @returns 操作结果
   */
  async executeOperation(operation: Operation): Promise<OperationResult> {
    try {
      // 对于高风险操作，创建快照
      let snapshotId: string | undefined;
      if (operation.riskLevel === 'high') {
        const snapshot = await snapshotService.createSnapshot(operation);
        snapshotId = snapshot.id;
      }

      // 执行操作
      const result = await this.runCommand(operation);

      // 记录审计日志
      const operationResult: OperationResult = {
        success: true,
        operation,
        result,
        timestamp: Date.now()
      };
      
      await auditService.logOperation(
        operation.userId,
        operation,
        operationResult,
        snapshotId
      );

      return operationResult;
    } catch (error: any) {
      // 记录失败的操作
      const operationResult: OperationResult = {
        success: false,
        operation,
        error: error.message,
        timestamp: Date.now()
      };
      
      await auditService.logOperation(
        operation.userId,
        operation,
        operationResult
      );

      return operationResult;
    }
  }

  /**
   * 运行命令
   * @param operation 操作对象
   * @returns 命令执行结果
   */
  private async runCommand(operation: Operation): Promise<any> {
    switch (operation.command) {
      case 'shell':
        return this.executeShellCommand(operation.args[0]);
      case 'deleteFile':
        return this.deleteFile(operation.args[0]);
      case 'deleteDirectory':
        return this.deleteDirectory(operation.args[0]);
      case 'createFile':
        return this.createFile(operation.args[0], operation.args[1]);
      case 'readFile':
        return this.readFile(operation.args[0]);
      // 其他命令...
      default:
        throw new Error(`未知命令: ${operation.command}`);
    }
  }

  /**
   * 执行Shell命令
   * @param command Shell命令
   * @returns 命令执行结果
   */
  private async executeShellCommand(command: string): Promise<string> {
    const { stdout, stderr } = await execPromise(command);
    if (stderr) {
      console.warn('Shell命令警告:', stderr);
    }
    return stdout;
  }

  /**
   * 删除文件
   * @param filePath 文件路径
   * @returns 是否删除成功
   */
  private async deleteFile(filePath: string): Promise<boolean> {
    await fs.unlink(filePath);
    return true;
  }

  /**
   * 删除目录
   * @param dirPath 目录路径
   * @returns 是否删除成功
   */
  private async deleteDirectory(dirPath: string): Promise<boolean> {
    await fs.rm(dirPath, { recursive: true, force: true });
    return true;
  }

  /**
   * 创建文件
   * @param filePath 文件路径
   * @param content 文件内容
   * @returns 是否创建成功
   */
  private async createFile(filePath: string, content: string): Promise<boolean> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    return true;
  }

  /**
   * 读取文件
   * @param filePath 文件路径
   * @returns 文件内容
   */
  private async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }
}

// 创建操作执行器实例
export const operationExecutor = new OperationExecutorService();
