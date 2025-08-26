import React from 'react';
import { Card, Typography, Space, Tag, Progress, Timeline } from 'antd';
import {
  RobotOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { ProgressEvent, AgentStatus } from '../types/agent.types';

const { Text, Paragraph } = Typography;

interface AgentProgressProps {
  events: ProgressEvent[];
  style?: React.CSSProperties;
}

/**
 * Agent进度组件
 * 显示Agent执行的详细进度信息
 */
const AgentProgress: React.FC<AgentProgressProps> = ({ events, style }) => {
  if (!events || events.length === 0) {
    return null;
  }

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'planning':
      case 'reasoning':
      case 'acting':
      case 'observing':
      case 'reflecting':
        return <LoadingOutlined />;
      case 'completed':
        return <CheckCircleOutlined />;
      case 'failed':
        return <CloseCircleOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'planning':
      case 'reasoning':
      case 'acting':
      case 'observing':
      case 'reflecting':
        return 'blue';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: AgentStatus) => {
    switch (status) {
      case 'planning': return '规划中';
      case 'reasoning': return '推理中';
      case 'acting': return '执行中';
      case 'observing': return '观察中';
      case 'reflecting': return '反思中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      case 'paused': return '已暂停';
      default: return '未知';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <RobotOutlined />
          <Text strong>执行进度</Text>
          <Tag color="blue">{events.length} 个事件</Tag>
        </Space>
      }
      style={{ marginBottom: '16px', ...style }}
    >
      <Timeline>
        {events.map((event, index) => (
          <Timeline.Item
            key={index}
            dot={getStatusIcon(event.status)}
            color={getStatusColor(event.status)}
          >
            <div style={{ marginBottom: '8px' }}>
              <Space>
                <Tag color={getStatusColor(event.status)}>
                  {getStatusText(event.status)}
                </Tag>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {formatTimestamp(event.timestamp)}
                </Text>
              </Space>
            </div>
            
            <Paragraph style={{ margin: '4px 0', fontSize: '14px' }}>
              {event.message}
            </Paragraph>

            {event.progress !== undefined && (
              <Progress
                percent={event.progress}
                size="small"
                status={event.status === 'failed' ? 'exception' : 'active'}
                style={{ marginTop: '8px' }}
              />
            )}

            {event.data && (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  详细信息: {JSON.stringify(event.data, null, 2)}
                </Text>
              </div>
            )}
          </Timeline.Item>
        ))}
      </Timeline>
    </Card>
  );
};

export default AgentProgress;
