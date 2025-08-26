import React, { createContext, useState, useContext, ReactNode } from 'react';
import ConfirmationDialog, { Operation } from '../components/ConfirmationDialog';

interface OperationConfirmContextType {
  confirmOperation: (operation: Operation) => Promise<boolean>;
}

const OperationConfirmContext = createContext<OperationConfirmContextType | undefined>(undefined);

export const useOperationConfirm = () => {
  const context = useContext(OperationConfirmContext);
  if (!context) {
    throw new Error('useOperationConfirm must be used within an OperationConfirmProvider');
  }
  return context;
};

interface OperationConfirmProviderProps {
  children: ReactNode;
}

export const OperationConfirmProvider: React.FC<OperationConfirmProviderProps> = ({ children }) => {
  const [pendingOperation, setPendingOperation] = useState<Operation | null>(null);
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [resolveConfirm, setResolveConfirm] = useState<((value: boolean) => void) | null>(null);

  const confirmOperation = (operation: Operation): Promise<boolean> => {
    // 低风险操作不需要确认
    if (operation.riskLevel === 'low') {
      return Promise.resolve(true);
    }

    return new Promise<boolean>((resolve) => {
      setPendingOperation(operation);
      setIsDialogVisible(true);
      setResolveConfirm(() => resolve);
    });
  };

  const handleConfirm = () => {
    setIsDialogVisible(false);
    if (resolveConfirm) {
      resolveConfirm(true);
    }
    setPendingOperation(null);
    setResolveConfirm(null);
  };

  const handleCancel = () => {
    setIsDialogVisible(false);
    if (resolveConfirm) {
      resolveConfirm(false);
    }
    setPendingOperation(null);
    setResolveConfirm(null);
  };

  return (
    <OperationConfirmContext.Provider value={{ confirmOperation }}>
      {children}
      {pendingOperation && (
        <ConfirmationDialog
          operation={pendingOperation}
          visible={isDialogVisible}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </OperationConfirmContext.Provider>
  );
};
