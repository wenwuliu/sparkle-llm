import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import SudoPermissionDialog from '../components/SudoPermissionDialog';
import { 
  useSudoPermissionStore, 
  initializeSudoPermissionService,
  confirmSudoPermission,
  cancelSudoPermission
} from '../services/sudoPermissionService';

// 创建上下文
const SudoPermissionContext = createContext<null>(null);

interface SudoPermissionProviderProps {
  children: ReactNode;
}

/**
 * sudo权限提供者组件
 */
export const SudoPermissionProvider: React.FC<SudoPermissionProviderProps> = ({ children }) => {
  const { currentRequest, showDialog } = useSudoPermissionStore();
  
  // 初始化sudo权限服务
  useEffect(() => {
    initializeSudoPermissionService();
  }, []);
  
  // 处理确认
  const handleConfirm = (password: string, remember: boolean) => {
    if (currentRequest) {
      confirmSudoPermission(currentRequest.requestId, password, remember);
    }
  };
  
  // 处理取消
  const handleCancel = () => {
    if (currentRequest) {
      cancelSudoPermission(currentRequest.requestId);
    }
  };
  
  return (
    <SudoPermissionContext.Provider value={null}>
      {children}
      
      {currentRequest && (
        <SudoPermissionDialog
          open={showDialog}
          requestId={currentRequest.requestId}
          command={currentRequest.command}
          riskLevel={currentRequest.riskLevel}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </SudoPermissionContext.Provider>
  );
};

// 导出上下文钩子
export const useSudoPermission = () => useContext(SudoPermissionContext);
