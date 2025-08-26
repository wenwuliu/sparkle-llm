import React from 'react';
import { Modal, Alert, List, Divider, Typography } from 'antd';
import { WarningOutlined, ExclamationCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

export interface Operation {
  id: string;
  type: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  details: string[];
  confirmButtonText?: string;
}

interface ConfirmationDialogProps {
  operation: Operation;
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  operation,
  visible,
  onConfirm,
  onCancel
}) => {
  // 根据风险等级获取图标和颜色
  const getRiskIcon = () => {
    switch (operation.riskLevel) {
      case 'high':
        return <WarningOutlined style={{ color: '#ff4d4f' }} />;
      case 'medium':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  // 根据风险等级获取标题
  const getTitle = () => {
    const icon = getRiskIcon();
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon} 确认{operation.type}操作
      </div>
    );
  };

  return (
    <Modal
      title={getTitle()}
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      okText={operation.confirmButtonText || `确认${operation.type}`}
      cancelText="取消"
      okButtonProps={{ 
        danger: operation.riskLevel === 'high',
        type: operation.riskLevel === 'high' ? 'primary' : 'default'
      }}
      width={500}
      centered
    >
      <Typography.Paragraph>{operation.description}</Typography.Paragraph>
      
      <Divider />
      
      <List
        size="small"
        header={<Typography.Text strong>操作详情：</Typography.Text>}
        dataSource={operation.details}
        renderItem={item => <List.Item>{item}</List.Item>}
      />
      
      {operation.riskLevel === 'high' && (
        <Alert
          message="高风险操作警告"
          description="此操作可能无法撤销，请确认您了解所有可能的影响。"
          type="error"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
      
      {operation.riskLevel === 'medium' && (
        <Alert
          message="注意"
          description="此操作将修改系统状态，请确认操作内容。"
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Modal>
  );
};

export default ConfirmationDialog;
