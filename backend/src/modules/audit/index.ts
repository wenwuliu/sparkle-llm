/**
 * 审计模块入口
 */
import { AuditService, auditService } from './audit.service';
import { IAuditService } from './interfaces/audit.interface';
import { AuditLog } from './audit.types';

// 导出服务实例
export {
  auditService
};

// 导出类和接口
export { AuditService };
export type { IAuditService, AuditLog };
