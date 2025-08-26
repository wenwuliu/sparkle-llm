import React from 'react';
import { Card, Typography, Space, Tag, Progress, Button, Collapse } from 'antd';
import {
  RobotOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useAgentStore } from '../store/features/agent.store';
import AgentSteps from './AgentSteps';
import AgentResult from './AgentResult';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface AgentDisplayProps {
  visible: boolean;
  style?: React.CSSProperties;
}

/**
 * Agent显示组件
 * 显示当前Agent的执行状态和历史
 */
const AgentDisplay: React.FC<AgentDisplayProps> = ({ visible, style }) => {
  const { 
    currentAgentSession, 
    agentSessions, 
    agentMode,
    stopAgentSession,
    clearAgentSession,
    getAgentStats
  } = useAgentStore();

  // 只在有活跃会话时记录日志
  if (currentAgentSession) {
    console.log('AgentDisplay渲染:', { visible, currentAgentSession, agentSessions });
  }

  if (!visible) {
    return null;
  }

  const stats = getAgentStats();

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${remainingSeconds}秒`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'blue';
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'stopped': return 'orange';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <LoadingOutlined />;
      case 'completed': return <CheckCircleOutlined />;
      case 'failed': return <CloseCircleOutlined />;
      case 'stopped': return <PauseCircleOutlined />;
      default: return <LoadingOutlined />;
    }
  };

  const handleStopSession = (sessionId: string) => {
    stopAgentSession(sessionId);
  };

  const handleClearSession = (sessionId: string) => {
    clearAgentSession(sessionId);
  };

  return (
    <div style={{ margin: '16px 0', ...style }}>
      {/* 当前Agent会话 */}
      {currentAgentSession && (
        <Card
          size="small"
          title={
            <Space>
              <RobotOutlined style={{ color: '#1890ff' }} />
              <Text strong>当前Agent任务</Text>
              <Tag color={getStatusColor(currentAgentSession.status)}>
                {getStatusIcon(currentAgentSession.status)}
                {currentAgentSession.status === 'running' ? '执行中' :
                 currentAgentSession.status === 'completed' ? '已完成' :
                 currentAgentSession.status === 'failed' ? '失败' :
                 currentAgentSession.status === 'stopped' ? '已停止' : '未知'}
              </Tag>
            </Space>
          }
          style={{
            backgroundColor: '#f0f5ff',
            border: '2px solid #1890ff',
            borderRadius: '8px',
            marginBottom: '16px'
          }}
          extra={
            <Space>
              {currentAgentSession.status === 'running' && (
                <Button 
                  size="small" 
                  danger 
                  onClick={() => handleStopSession(currentAgentSession.id)}
                >
                  停止
                </Button>
              )}
              <Button 
                size="small" 
                onClick={() => handleClearSession(currentAgentSession.id)}
              >
                清除
              </Button>
            </Space>
          }
        >
          <div style={{ marginBottom: '12px' }}>
            <Text strong style={{ color: '#1890ff' }}>任务ID:</Text>
            <Paragraph style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
              {currentAgentSession.id}
            </Paragraph>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <Text strong style={{ color: '#1890ff' }}>任务描述:</Text>
            <Paragraph style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
              {currentAgentSession.task}
            </Paragraph>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <Text strong style={{ color: '#1890ff' }}>目标:</Text>
            <Paragraph style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
              {currentAgentSession.goal}
            </Paragraph>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <Text strong style={{ color: '#1890ff' }}>开始时间:</Text>
            <Paragraph style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
              {formatTimestamp(currentAgentSession.startTime)}
            </Paragraph>
          </div>

          {currentAgentSession.agentState && (
            <div style={{ marginBottom: '12px' }}>
              <Text strong style={{ color: '#1890ff' }}>执行进度:</Text>
              <Progress 
                percent={currentAgentSession.agentState.progress} 
                status={currentAgentSession.status === 'failed' ? 'exception' : 'active'}
                style={{ marginTop: '8px' }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                步骤 {currentAgentSession.agentState.currentStep} / {currentAgentSession.agentState.totalSteps}
              </Text>
            </div>
          )}

          {/* 执行步骤 */}
          {currentAgentSession.agentState && (
            <AgentSteps steps={currentAgentSession.agentState.plan} />
          )}

          {/* 执行结果 */}
          {currentAgentSession.result && (
            <AgentResult result={currentAgentSession.result} />
          )}

          {/* 错误信息 */}
          {currentAgentSession.error && (
            <Card size="small" style={{ marginTop: '12px', borderColor: '#ff4d4f' }}>
              <Space>
                <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                <Text strong style={{ color: '#ff4d4f' }}>执行错误</Text>
              </Space>
              <Paragraph style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                {currentAgentSession.error.message}
              </Paragraph>
              {currentAgentSession.error.details && (
                <Paragraph style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                  详情: {currentAgentSession.error.details}
                </Paragraph>
              )}
            </Card>
          )}
        </Card>
      )}

      {/* Agent会话历史 */}
      {agentSessions.length > 0 && (
        <Card
          size="small"
          title={
            <Space>
              <EyeOutlined />
              <Text strong>Agent会话历史</Text>
              <Tag color="blue">{stats.total}</Tag>
            </Space>
          }
          style={{ marginBottom: '16px' }}
        >
          <div style={{ marginBottom: '12px' }}>
            <Space size="large">
              <Text>总计: {stats.total}</Text>
              <Text type="success">完成: {stats.completed}</Text>
              <Text type="warning">运行中: {stats.running}</Text>
              <Text type="danger">失败: {stats.failed}</Text>
              <Text type="secondary">停止: {stats.stopped}</Text>
            </Space>
          </div>

          <Collapse size="small">
            {agentSessions.map((session) => (
              <Panel
                key={session.id}
                header={
                  <Space>
                    <Tag color={getStatusColor(session.status)}>
                      {getStatusIcon(session.status)}
                      {session.status}
                    </Tag>
                    <Text ellipsis style={{ maxWidth: '200px' }}>
                      {session.task}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {formatTimestamp(session.startTime)}
                    </Text>
                  </Space>
                }
                extra={
                  <Space>
                    {session.status === 'running' && (
                      <Button 
                        size="small" 
                        danger 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStopSession(session.id);
                        }}
                      >
                        停止
                      </Button>
                    )}
                    <Button 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearSession(session.id);
                      }}
                    >
                      清除
                    </Button>
                  </Space>
                }
              >
                <div style={{ padding: '8px 0' }}>
                  <Paragraph style={{ margin: '0 0 8px 0' }}>
                    <Text strong>目标:</Text> {session.goal}
                  </Paragraph>
                  
                  {session.agentState && (
                    <Paragraph style={{ margin: '0 0 8px 0' }}>
                      <Text strong>进度:</Text> {session.agentState.progress.toFixed(1)}%
                      ({session.agentState.currentStep}/{session.agentState.totalSteps})
                    </Paragraph>
                  )}

                  {session.result && (
                    <Paragraph style={{ margin: '0 0 8px 0' }}>
                      <Text strong>执行时间:</Text> {formatDuration(session.result.executionTime)}
                    </Paragraph>
                  )}

                  {session.error && (
                    <Paragraph style={{ margin: '0 0 8px 0', color: '#ff4d4f' }}>
                      <Text strong>错误:</Text> {session.error.message}
                    </Paragraph>
                  )}
                </div>
              </Panel>
            ))}
          </Collapse>
        </Card>
      )}

      {/* Agent模式状态 */}
      {agentMode && (
        <Card
          size="small"
          title={
            <Space>
              <RobotOutlined />
              <Text strong>Agent模式</Text>
              <Tag color="green">已启用</Tag>
            </Space>
          }
          style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}
        >
          <Paragraph style={{ margin: '0', fontSize: '14px' }}>
            Agent模式已启用，系统将使用智能Agent来执行复杂任务。
          </Paragraph>
        </Card>
      )}
    </div>
  );
};

export default AgentDisplay;
