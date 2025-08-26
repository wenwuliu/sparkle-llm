import React from 'react';
import { Card, Typography, Space, Tag, List } from 'antd';
import {
  RobotOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  BulbOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { TaskStep } from '../types/agent.types';

const { Text, Paragraph } = Typography;

interface AgentStepsProps {
  steps: TaskStep[];
  style?: React.CSSProperties;
}

/**
 * Agent步骤组件
 * 显示Agent执行的详细步骤信息
 */
const AgentSteps: React.FC<AgentStepsProps> = ({ steps, style }) => {
  if (!steps || steps.length === 0) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockCircleOutlined />;
      case 'running':
        return <LoadingOutlined />;
      case 'completed':
        return <CheckCircleOutlined />;
      case 'failed':
        return <CloseCircleOutlined />;
      case 'skipped':
        return <EyeInvisibleOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'running': return 'blue';
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'skipped': return 'orange';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '等待中';
      case 'running': return '执行中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      case 'skipped': return '已跳过';
      default: return '未知';
    }
  };

  const getStepTypeText = (type: string) => {
    switch (type) {
      case 'reasoning': return '推理';
      case 'action': return '行动';
      case 'observation': return '观察';
      case 'reflection': return '反思';
      case 'planning': return '规划';
      default: return '未知';
    }
  };

  const getStepTypeColor = (type: string) => {
    switch (type) {
      case 'reasoning': return 'purple';
      case 'action': return 'blue';
      case 'observation': return 'cyan';
      case 'reflection': return 'orange';
      case 'planning': return 'green';
      default: return 'default';
    }
  };

  const formatDuration = (ms: number) => {
    if (!ms) return '0ms';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    if (seconds > 0) {
      return `${seconds}秒`;
    }
    return `${ms}ms`;
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <RobotOutlined />
          <Text strong>执行步骤</Text>
          <Tag color="blue">{steps.length} 个步骤</Tag>
        </Space>
      }
      style={{ marginBottom: '16px', ...style }}
    >
      <List
        dataSource={steps}
        renderItem={(step, index) => (
          <List.Item
            key={step.id}
            style={{
              padding: '12px',
              border: '1px solid #f0f0f0',
              borderRadius: '6px',
              marginBottom: '8px',
              backgroundColor: step.status === 'running' ? '#f0f5ff' : '#fff'
            }}
          >
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <Space>
                  {getStatusIcon(step.status)}
                  <Text strong>步骤 {index + 1}</Text>
                  <Tag color={getStatusColor(step.status)}>
                    {getStatusText(step.status)}
                  </Tag>
                  <Tag color={getStepTypeColor(step.type)}>
                    {getStepTypeText(step.type)}
                  </Tag>
                </Space>
                
                <Space>
                  {step.startTime && step.endTime && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      耗时: {formatDuration(step.endTime - step.startTime)}
                    </Text>
                  )}
                  {step.startTime && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {new Date(step.startTime).toLocaleTimeString()}
                    </Text>
                  )}
                </Space>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <Text strong>描述:</Text>
                <Paragraph style={{ margin: '4px 0', fontSize: '14px' }}>
                  {step.description}
                </Paragraph>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <Text strong>期望结果:</Text>
                <Paragraph style={{ margin: '4px 0', fontSize: '14px' }}>
                  {step.expectedOutcome}
                </Paragraph>
              </div>

              {/* 思考过程 */}
              {step.thoughts && step.thoughts.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <Text strong>
                    <BulbOutlined style={{ marginRight: '4px' }} />
                    思考过程:
                  </Text>
                  <List
                    size="small"
                    dataSource={step.thoughts}
                    renderItem={(thought) => (
                      <List.Item style={{ padding: '4px 0' }}>
                        <div style={{ width: '100%' }}>
                          <Space style={{ marginBottom: '4px' }}>
                                                            <Tag color="purple">{thought.type}</Tag>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              置信度: {(thought.confidence * 100).toFixed(1)}%
                            </Text>
                          </Space>
                          <Paragraph style={{ margin: '2px 0', fontSize: '13px' }}>
                            {thought.content}
                          </Paragraph>
                          {thought.reasoning && (
                            <Paragraph style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>
                              推理: {thought.reasoning}
                            </Paragraph>
                          )}
                        </div>
                      </List.Item>
                    )}
                  />
                </div>
              )}

              {/* 执行结果 */}
              {step.result && (
                <div style={{ marginBottom: '8px' }}>
                  <Text strong>执行结果:</Text>
                  <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: '4px',
                    marginTop: '4px'
                  }}>
                    <pre style={{ 
                      margin: 0, 
                      fontSize: '12px', 
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {JSON.stringify(step.result, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* 错误信息 */}
              {step.error && (
                <div style={{ marginBottom: '8px' }}>
                  <Text strong style={{ color: '#ff4d4f' }}>错误信息:</Text>
                  <Paragraph style={{ 
                    margin: '4px 0', 
                    fontSize: '14px', 
                    color: '#ff4d4f',
                    backgroundColor: '#fff2f0',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ffccc7'
                  }}>
                    {step.error}
                  </Paragraph>
                </div>
              )}

              {/* 依赖关系 */}
              {step.dependencies && step.dependencies.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <Text strong>依赖步骤:</Text>
                  <Space style={{ marginLeft: '8px' }}>
                    {step.dependencies.map((dep, idx) => (
                      <Tag key={idx} color="blue">
                        步骤 {dep}
                      </Tag>
                    ))}
                  </Space>
                </div>
              )}
            </div>
          </List.Item>
        )}
      />
    </Card>
  );
};

export default AgentSteps;
