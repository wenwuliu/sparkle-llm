/**
 * 操作模块入口
 */
import { OperationService, operationService } from './operation.service';
import { OperationExecutorService, operationExecutor } from './operation-executor.service';
import { IOperationService, IOperationExecutor } from './interfaces/operation.interface';
import { Operation, OperationResult, OperationType, RiskLevel } from './operation.types';

// 导出服务实例
export {
  operationService,
  operationExecutor
};

// 导出类和接口
export {
  OperationService,
  OperationExecutorService
};

export type {
  OperationType,
  RiskLevel
};

export type {
  IOperationService,
  IOperationExecutor,
  Operation,
  OperationResult
};
