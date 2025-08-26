/**
 * 操作服务
 */
import { v4 as uuidv4 } from 'uuid';
import { IOperationService } from './interfaces/operation.interface';
import { Operation, OperationType, RiskLevel } from './operation.types';

export class OperationService implements IOperationService {
  // 风险等级映射
  private static riskLevelMap: Record<OperationType, RiskLevel> = {
    deleteFile: 'high',
    deleteDirectory: 'high',
    modifyFile: 'medium',
    modifyConfig: 'high',
    executeScript: 'high',
    installSoftware: 'high',
    uninstallSoftware: 'high',
    createFile: 'medium',
    createDirectory: 'medium',
    moveFile: 'medium',
    renameFile: 'medium',
    readFile: 'low',
    listFiles: 'low',
    getSystemInfo: 'low'
  };

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
  ): Operation {
    const riskLevel = OperationService.riskLevelMap[type] || 'medium';
    
    return {
      id: uuidv4(),
      type,
      description,
      riskLevel,
      details,
      command,
      args,
      requiresConfirmation: riskLevel !== 'low',
      userId,
      timestamp: Date.now()
    };
  }

  /**
   * 评估操作风险
   * @param operation 操作对象
   * @returns 评估后的操作对象
   */
  assessRisk(operation: Operation): Operation {
    // 可以根据具体参数进一步调整风险等级
    // 例如，删除系统关键文件比删除临时文件风险更高
    
    if (operation.type === 'deleteDirectory') {
      const path = operation.args[0] as string;
      
      // 检查是否删除重要目录
      if (path.includes('/etc') || path.includes('/usr') || path.includes('/var')) {
        operation.riskLevel = 'high';
        operation.details.push('⚠️ 警告：正在删除系统关键目录');
      }
    } else if (operation.type === 'deleteFile') {
      const path = operation.args[0] as string;
      
      // 检查是否删除重要文件
      if (path.includes('/etc') || path.includes('/usr/bin') || path.includes('/var/lib')) {
        operation.riskLevel = 'high';
        operation.details.push('⚠️ 警告：正在删除系统关键文件');
      }
    } else if (operation.type === 'modifyFile') {
      const path = operation.args[0] as string;
      
      // 检查是否修改重要文件
      if (path.includes('/etc') || path.includes('/usr/bin')) {
        operation.riskLevel = 'high';
        operation.details.push('⚠️ 警告：正在修改系统关键文件');
      }
    }
    
    return operation;
  }
}

// 创建操作服务实例
export const operationService = new OperationService();
