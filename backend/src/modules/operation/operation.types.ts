/**
 * 操作模块类型定义
 */

// 操作类型定义
export type OperationType = 
  | 'deleteFile' 
  | 'deleteDirectory' 
  | 'modifyFile' 
  | 'modifyConfig' 
  | 'executeScript'
  | 'installSoftware'
  | 'uninstallSoftware'
  | 'createFile'
  | 'createDirectory'
  | 'moveFile'
  | 'renameFile'
  | 'readFile'
  | 'listFiles'
  | 'getSystemInfo';

// 风险等级定义
export type RiskLevel = 'low' | 'medium' | 'high';

// 操作定义
export interface Operation {
  id: string;
  type: OperationType;
  description: string;
  riskLevel: RiskLevel;
  details: string[];
  command: string;
  args: any[];
  requiresConfirmation: boolean;
  userId: string;
  timestamp: number;
}

// 操作结果定义
export interface OperationResult {
  success: boolean;
  operation: Operation;
  result?: any;
  error?: string;
  timestamp: number;
}
