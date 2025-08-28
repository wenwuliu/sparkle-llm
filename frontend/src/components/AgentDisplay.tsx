import React from 'react';
import { Card, Typography, Space, Tag, Progress, Collapse, List, Button, Alert } from 'antd';
import { 
  RobotOutlined, 
  PlayCircleOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  ClockCircleOutlined,
  BulbOutlined,
  ToolOutlined,
  EyeOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { AgentSession, AgentStatus, StepStatus } from '../types/agent.types';
import { useAgentStore } from '../store/features/agent.store';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface AgentDisplayProps {
  visible: boolean;
}

const AgentDisplay: React.FC<AgentDisplayProps> = ({ visible }) => {
  const { 
    getCurrentSession, 
    getActiveSessions, 
    stopSession, 
    clearSession 
  } = useAgentStore();

  const currentSession = getCurrentSession();
  const activeSessions = getActiveSessions();

  console.log('AgentDisplay渲染 - visible:', visible, 'currentSession:', currentSession, 'activeSessions:', activeSessions);
  console.log('当前会话状态:', currentSession?.status, 'agentState状态:', currentSession?.agentState?.status);

  if (!visible || (!currentSession && activeSessions.length === 0)) {
    return null;
  }

  const getStatusColor = (status: AgentStatus | 'running' | 'completed' | 'failed' | 'stopped') => {
    switch (status) {
      case 'running':
      case 'reasoning':
      case 'acting':
      case 'observing':
        return 'processing';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'stopped':
        return 'default';
      case 'planning':
      case 'reflecting':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: AgentStatus | 'running' | 'completed' | 'failed' | 'stopped') => {
    switch (status) {
      case 'running':
      case 'reasoning':
      case 'acting':
      case 'observing':
        return <SyncOutlined spin />;
      case 'completed':
        return <CheckCircleOutlined />;
      case 'failed':
        return <CloseCircleOutlined />;
      case 'stopped':
        return <ClockCircleOutlined />;
      case 'planning':
        return <BulbOutlined />;
      case 'reflecting':
        return <EyeOutlined />;
      default:
        return <RobotOutlined />;
    }
  };

  const getStepStatusColor = (status: StepStatus) => {
    switch (status) {
      case 'running':
        return 'processing';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'skipped':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDuration = (duration: number) => {
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const handleStopSession = (sessionId: string) => {
    stopSession(sessionId);
  };

  const handleClearSession = (sessionId: string) => {
    clearSession(sessionId);
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* 当前Agent会话 */}
      {currentSession && (
        <Card
          size="small"
          title={
            <Space>
              <RobotOutlined />
              <Text strong>
                {currentSession.status === 'completed' ? 'Agent任务已完成' :
                 currentSession.status === 'failed' ? 'Agent任务失败' :
                 currentSession.status === 'stopped' ? 'Agent任务已停止' :
                 'Agent任务执行中'}
              </Text>
              <Tag color={getStatusColor(currentSession.status)}>
                {getStatusIcon(currentSession.status)}
                {currentSession.status}
              </Tag>
            </Space>
          }
          extra={
            <Space>
              {currentSession.status === 'running' && (
                <Button 
                  size="small" 
                  danger 
                  onClick={() => handleStopSession(currentSession.id)}
                >
                  停止
                </Button>
              )}
              <Button 
                size="small" 
                onClick={() => handleClearSession(currentSession.id)}
              >
                清除
              </Button>
            </Space>
          }
          style={{ marginBottom: '12px' }}
        >
          {/* 任务信息 */}
          <div style={{ marginBottom: '12px' }}>
            <Text strong>任务:</Text> {currentSession.task}
            <br />
            <Text strong>目标:</Text> {currentSession.goal}
            <br />
            <Text strong>开始时间:</Text> {formatTimestamp(currentSession.startTime)}
          </div>

          {/* 进度条 */}
          {currentSession.agentState && (
            <div style={{ marginBottom: '12px' }}>
              <Progress 
                percent={Math.round(currentSession.agentState.progress)} 
                status={currentSession.agentState.status === 'failed' ? 'exception' : 'active'}
                size="small"
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                步骤 {currentSession.agentState.currentStep} / {currentSession.agentState.totalSteps}
              </Text>
            </div>
          )}

          {/* 执行步骤 */}
          {currentSession.agentState && currentSession.agentState.plan.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <Text strong>执行步骤:</Text>
              <List
                size="small"
                dataSource={currentSession.agentState.plan}
                renderItem={(step, index) => (
                  <List.Item style={{ padding: '4px 0' }}>
                    <Space>
                      <Tag color={getStepStatusColor(step.status)}>
                        {step.status}
                      </Tag>
                      <Text>{index + 1}. {step.description}</Text>
                      {step.duration && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {formatDuration(step.duration)}
                        </Text>
                      )}
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          )}

          {/* 错误信息 */}
          {currentSession.error && (
            <Alert
              message="执行错误"
              description={currentSession.error.message}
              type="error"
              showIcon
              style={{ marginBottom: '12px' }}
            />
          )}

          {/* 执行结果 */}
          {currentSession.result && (
            <div style={{ marginBottom: '12px' }}>
              <Text strong>执行结果:</Text>
              <div style={{ 
                padding: '8px', 
                backgroundColor: '#f6ffed', 
                borderRadius: '4px',
                marginTop: '4px'
              }}>
                <Text>{currentSession.result.summary}</Text>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 其他活跃会话 */}
      {activeSessions.filter(s => s.id !== currentSession?.id).map(session => (
        <Card
          key={session.id}
          size="small"
          title={
            <Space>
              <RobotOutlined />
              <Text strong>Agent会话</Text>
              <Tag color={getStatusColor(session.status)}>
                {getStatusIcon(session.status)}
                {session.status}
              </Tag>
            </Space>
          }
          extra={
            <Space>
              {session.status === 'running' && (
                <Button 
                  size="small" 
                  danger 
                  onClick={() => handleStopSession(session.id)}
                >
                  停止
                </Button>
              )}
              <Button 
                size="small" 
                onClick={() => handleClearSession(session.id)}
              >
                清除
              </Button>
            </Space>
          }
          style={{ marginBottom: '8px' }}
        >
          <div>
            <Text strong>任务:</Text> {session.task}
            <br />
            <Text strong>开始时间:</Text> {formatTimestamp(session.startTime)}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default AgentDisplay;
