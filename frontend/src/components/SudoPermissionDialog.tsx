import React, { useState } from 'react';
import { Modal, Input, Button, Checkbox, Typography, Alert, Space } from 'antd';
import { SafetyOutlined } from '@ant-design/icons';

interface SudoPermissionDialogProps {
  open: boolean;
  requestId: string; // 保留以符合接口要求，但在组件内部不使用
  command: string;
  riskLevel: string;
  onConfirm: (password: string, remember: boolean) => void;
  onCancel: () => void;
}

/**
 * sudo权限确认对话框组件
 */
const SudoPermissionDialog: React.FC<SudoPermissionDialogProps> = ({
  open,
  // requestId 参数在组件内部不使用，但保留在接口中以符合调用要求
  command,
  riskLevel,
  onConfirm,
  onCancel
}) => {
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!password) {
      setError('请输入密码');
      return;
    }

    onConfirm(password, remember);
    resetForm();
  };

  const handleCancel = () => {
    onCancel();
    resetForm();
  };

  const resetForm = () => {
    setPassword('');
    setRemember(false);
    setError(null);
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SafetyOutlined style={{ color: '#faad14', marginRight: 8 }} />
          <Typography.Title level={5} style={{ margin: 0 }}>
            需要sudo权限
          </Typography.Title>
        </div>
      }
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          拒绝
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm}>
          授权
        </Button>
      ]}
      width={500}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Paragraph>
          大模型请求执行以下命令，需要sudo权限：
        </Typography.Paragraph>

        <pre style={{
          backgroundColor: '#f5f5f5',
          padding: 12,
          borderRadius: 4,
          fontFamily: 'monospace',
          overflowX: 'auto',
          marginBottom: 16
        }}>
          <code>{command}</code>
        </pre>

        {riskLevel === 'high' && (
          <Alert
            message="此命令具有高风险级别，请确保您了解其影响。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Input.Password
          placeholder="请输入sudo密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          status={error ? 'error' : ''}
          autoFocus
        />
        {error && <Typography.Text type="danger">{error}</Typography.Text>}

        <Checkbox
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          style={{ marginTop: 16 }}
        >
          记住此决定（本次会话内有效）
        </Checkbox>
      </Space>
    </Modal>
  );
};

export default SudoPermissionDialog;
