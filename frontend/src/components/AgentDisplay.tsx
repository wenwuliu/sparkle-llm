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
import AgentTimeline from './AgentTimeline';

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
        <>
          {/* 基本信息卡片 */}
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

          {/* 时间轴组件 */}
          <AgentTimeline 
            agentState={currentSession.agentState} 
            visible={true} 
          />

          {/* 详细步骤列表（可折叠） */}
          {currentSession.agentState && currentSession.agentState.plan.length > 0 && (
            <Card
              size="small"
              title={
                <Space>
                  <Text strong>详细执行步骤</Text>
                  <Tag color="blue">
                    {currentSession.agentState.plan.filter(s => s.status === 'completed').length} / {currentSession.agentState.plan.length}
                  </Tag>
                </Space>
              }
              style={{ marginBottom: '12px' }}
            >
              <Collapse size="small" ghost>
                {currentSession.agentState.plan.map((step, index) => (
                  <Panel
                    key={step.id}
                    header={
                      <Space>
                        <Tag color={getStepStatusColor(step.status)}>
                          {step.status}
                        </Tag>
                        <Text>步骤 {index + 1}: {step.description}</Text>
                        {step.duration && (
                          <Tag color="blue">
                            {formatDuration(step.duration)}
                          </Tag>
                        )}
                      </Space>
                    }
                  >
                    <div style={{ padding: '8px 0' }}>
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div>
                          <Text strong>预期结果:</Text> {step.expectedOutcome}
                        </div>
                        
                        {step.thoughts && step.thoughts.length > 0 && (
                          <div>
                            <Text strong>思考过程:</Text>
                            <List
                              size="small"
                              dataSource={step.thoughts}
                              renderItem={(thought, thoughtIndex) => (
                                <List.Item style={{ padding: '4px 0' }}>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {thoughtIndex + 1}. {thought.content}
                                  </Text>
                                </List.Item>
                              )}
                            />
                          </div>
                        )}
                        
                        {step.result && (
                          <div>
                            <Text strong>执行结果:</Text>
                            <div style={{ 
                              padding: '4px', 
                              backgroundColor: '#f0f0f0', 
                              borderRadius: '2px',
                              marginTop: '2px'
                            }}>
                              <Text style={{ fontSize: '12px' }}>
                                {JSON.stringify(step.result, null, 2)}
                              </Text>
                            </div>
                          </div>
                        )}
                        
                        {step.error && (
                          <div>
                            <Text strong type="danger">错误信息:</Text>
                            <div style={{ 
                              padding: '4px', 
                              backgroundColor: '#fff2f0', 
                              borderRadius: '2px',
                              marginTop: '2px'
                            }}>
                              <Text type="danger" style={{ fontSize: '12px' }}>
                                {step.error}
                              </Text>
                            </div>
                          </div>
                        )}
                      </Space>
                    </div>
                  </Panel>
                ))}
              </Collapse>
            </Card>
          )}
        </>
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
