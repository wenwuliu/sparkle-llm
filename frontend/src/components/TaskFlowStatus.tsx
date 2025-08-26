import React from 'react';
import { Typography, Progress, Tag } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TaskFlowStatusProps {
  visible: boolean;
  status?: 'starting' | 'executing' | 'processing' | 'completed' | 'error' | 'stopped';
  message?: string;
  iteration?: number;
  maxIterations?: number;
}

/**
 * 任务流状态组件
 * 显示任务流的执行状态和进度
 */
const TaskFlowStatus: React.FC<TaskFlowStatusProps> = ({ 
  visible, 
  status = 'executing',
  message = '正在执行任务...',
  iteration,
  maxIterations = 20
}) => {
  if (!visible) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'starting':
        return <LoadingOutlined style={{ fontSize: 20, color: '#1890ff' }} spin />;
      case 'executing':
      case 'processing':
        return <LoadingOutlined style={{ fontSize: 20, color: '#1890ff' }} spin />;
      case 'completed':
        return <CheckCircleOutlined style={{ fontSize: 20, color: '#52c41a' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />;
      case 'stopped':
        return <ExclamationCircleOutlined style={{ fontSize: 20, color: '#faad14' }} />;
      default:
        return <LoadingOutlined style={{ fontSize: 20, color: '#1890ff' }} spin />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'starting':
      case 'executing':
      case 'processing':
        return '#1890ff';
      case 'completed':
        return '#52c41a';
      case 'error':
        return '#ff4d4f';
      case 'stopped':
        return '#faad14';
      default:
        return '#1890ff';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'starting':
        return '启动中';
      case 'executing':
        return '执行中';
      case 'processing':
        return '处理中';
      case 'completed':
        return '已完成';
      case 'error':
        return '执行错误';
      case 'stopped':
        return '已停止';
      default:
        return '执行中';
    }
  };

  const getBackgroundColor = () => {
    switch (status) {
      case 'starting':
      case 'executing':
      case 'processing':
        return '#f0f5ff';
      case 'completed':
        return '#f6ffed';
      case 'error':
        return '#fff2f0';
      case 'stopped':
        return '#fffbe6';
      default:
        return '#f0f5ff';
    }
  };

  const getBorderColor = () => {
    switch (status) {
      case 'starting':
      case 'executing':
      case 'processing':
        return '#91d5ff';
      case 'completed':
        return '#b7eb8f';
      case 'error':
        return '#ffccc7';
      case 'stopped':
        return '#ffe58f';
      default:
        return '#91d5ff';
    }
  };

  return (
    <div className="task-flow-status">
      <div 
        className="task-flow-status-content"
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: getBackgroundColor(),
          border: `1px solid ${getBorderColor()}`,
          borderRadius: '8px',
          padding: '12px 16px',
          margin: '16px 0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
          borderLeft: `3px solid ${getStatusColor()}`
        }}
      >
        {getStatusIcon()}
        
        <div style={{ marginLeft: '12px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text 
              style={{ 
                color: getStatusColor(), 
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              任务流 - {getStatusText()}
            </Text>
            
            {iteration && (
              <Tag color={getStatusColor()}>
                第 {iteration} 轮
              </Tag>
            )}
          </div>
          
          <Text 
            type="secondary" 
            style={{ 
              fontSize: '14px',
              display: 'block',
              marginTop: '4px'
            }}
          >
            {message}
          </Text>
          
          {iteration && maxIterations && status !== 'completed' && status !== 'error' && status !== 'stopped' && (
            <div style={{ marginTop: '8px' }}>
              <Progress
                percent={Math.round((iteration / maxIterations) * 100)}
                size="small"
                strokeColor={getStatusColor()}
                showInfo={false}
              />
              <Text 
                type="secondary" 
                style={{ fontSize: '12px' }}
              >
                进度: {iteration}/{maxIterations}
              </Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskFlowStatus;
