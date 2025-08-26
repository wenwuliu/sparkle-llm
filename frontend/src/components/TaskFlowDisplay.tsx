import React from 'react';
import { Card, Typography, Space, Tag, Divider } from 'antd';
import {
  PlayCircleOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useChatStore } from '../store';

import TaskFlowToolCalls from './TaskFlowToolCalls';
import TaskFlowResult from './TaskFlowResult';

const { Title, Text, Paragraph } = Typography;

interface TaskFlowDisplayProps {
  visible: boolean;
  style?: React.CSSProperties;
}

/**
 * 任务流显示组件
 * 显示当前任务流的执行状态和历史
 */
const TaskFlowDisplay: React.FC<TaskFlowDisplayProps> = ({ visible, style }) => {
  const { currentTaskSession, taskFlowHistory } = useChatStore();

  // 适配原有接口
  const currentSession = currentTaskSession;
  const sessionHistory = taskFlowHistory;

  // 简化的统计功能
  const getSessionStats = () => ({
    totalSessions: sessionHistory.length,
    completedSessions: sessionHistory.filter(s => s.status.status === 'completed').length,
    averageExecutionTime: sessionHistory.length > 0
      ? sessionHistory.reduce((acc, s) => acc + (s.createdAt || 0), 0) / sessionHistory.length
      : 0
  });

  // 只在有活跃会话时记录日志
  if (currentSession) {
    console.log('TaskFlowDisplay渲染:', { visible, currentSession, sessionHistory });
  }

  if (!visible) {
    return null;
  }

  const stats = getSessionStats();

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${remainingSeconds}秒`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div style={{ margin: '16px 0', ...style }}>
      {/* 当前任务流会话 */}
      {currentSession && (
        <Card
          size="small"
          title={
            <Space>
              <PlayCircleOutlined style={{ color: '#1890ff' }} />
              <Text strong>当前任务流</Text>
              <Tag color="blue">执行中</Tag>
            </Space>
          }
          style={{
            backgroundColor: '#f0f5ff',
            border: '2px solid #1890ff',
            borderRadius: '8px',
            marginBottom: '16px'
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <Text strong style={{ color: '#1890ff' }}>任务ID:</Text>
            <Paragraph style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
              {currentSession.id}
            </Paragraph>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <Text strong style={{ color: '#1890ff' }}>状态:</Text>
            <Paragraph style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
              {currentSession.status.currentStep || '执行中...'}
            </Paragraph>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <Space>
              <ClockCircleOutlined />
              <Text type="secondary">
                创建时间: {formatTimestamp(new Date(currentSession.createdAt).toISOString())}
              </Text>
            </Space>

            <Space>
              <ToolOutlined />
              <Text type="secondary">
                工具调用: {currentSession.toolCalls.length}次
              </Text>
            </Space>
          </div>

          {/* 当前状态 */}
          {currentSession.status && (
            <div style={{ padding: '8px', backgroundColor: '#f0f5ff', borderRadius: '4px' }}>
              <Text strong>状态: </Text>
              <Tag color="blue">{currentSession.status.status}</Tag>
              {currentSession.status.currentStep && (
                <div style={{ marginTop: '4px' }}>
                  <Text type="secondary">{currentSession.status.currentStep}</Text>
                </div>
              )}
            </div>
          )}

          {/* 细粒度思考步骤时间线 */}
          {currentSession.thinkingSteps && currentSession.thinkingSteps.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <Text strong style={{ color: '#1890ff' }}>思考步骤:</Text>
              <div style={{ marginTop: '8px', display: 'grid', gap: '8px' }}>
                {currentSession.thinkingSteps.map((step, idx) => (
                  <div key={step.id || idx} style={{
                    background: '#fff',
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    padding: 12
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <Text strong>{step.title || `步骤 ${idx + 1}`}</Text>
                        {step.tool && (
                          <Tag color="purple" style={{ marginLeft: 8 }}>{step.tool}</Tag>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {step.duration && step.duration > 0 && step.duration < 60000 && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {step.duration > 1000 ? `${(step.duration / 1000).toFixed(1)}s` : `${step.duration}ms`}
                          </Text>
                        )}
                        <Tag color={step.status === 'completed' ? 'green' : step.status === 'error' ? 'red' : 'blue'}>
                          {step.status || 'process'}
                        </Tag>
                      </div>
                    </div>
                    
                    {step.detail && (
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                        {step.detail.length > 150 ? step.detail.slice(0, 150) + '...' : step.detail}
                      </Text>
                    )}
                    
                    {step.args && (
                      <div style={{ marginTop: 6, padding: 6, background: '#f5f5f5', borderRadius: 4 }}>
                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 'bold' }}>参数:</Text>
                        <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                          {typeof step.args === 'object' ? 
                            JSON.stringify(step.args).slice(0, 100) + (JSON.stringify(step.args).length > 100 ? '...' : '') :
                            String(step.args).slice(0, 100) + (String(step.args).length > 100 ? '...' : '')
                          }
                        </Text>
                      </div>
                    )}
                    
                    {step.stdout && (
                      <div style={{ marginTop: 6, padding: 6, background: '#f6ffed', borderRadius: 4 }}>
                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 'bold', color: '#52c41a' }}>输出:</Text>
                        <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                          {step.stdout.slice(0, 120) + (step.stdout.length > 120 ? '...' : '')}
                        </Text>
                      </div>
                    )}
                    
                    {step.stderr && (
                      <div style={{ marginTop: 6, padding: 6, background: '#fff2f0', borderRadius: 4 }}>
                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 'bold', color: '#ff4d4f' }}>错误:</Text>
                        <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                          {step.stderr.slice(0, 120) + (step.stderr.length > 120 ? '...' : '')}
                        </Text>
                      </div>
                    )}
                    
                    {step.time && (
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                        {step.time}
                      </Text>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 工具调用历史 */}
          {currentSession.toolCalls.length > 0 && (
            <TaskFlowToolCalls toolCalls={currentSession.toolCalls} />
          )}
        </Card>
      )}

      {/* 任务完成结果 */}
      {currentSession && currentSession.result && (
        <TaskFlowResult session={currentSession} />
      )}

      {/* 统计信息 */}
      {(stats.totalSessions > 0 || currentSession) && (
        <Card
          size="small"
          title={
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text strong>任务流统计</Text>
            </Space>
          }
          style={{
            backgroundColor: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: '8px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {stats.totalSessions + (currentSession ? 1 : 0)}
              </div>
              <Text type="secondary">总会话数</Text>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                {stats.completedSessions}
              </div>
              <Text type="secondary">已完成</Text>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>
                {(currentSession ? currentSession.toolCalls.length : 0)}
              </div>
              <Text type="secondary">工具调用</Text>
            </div>
            
            {stats.averageExecutionTime > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
                  {formatDuration(stats.averageExecutionTime)}
                </div>
                <Text type="secondary">平均耗时</Text>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 历史会话 */}
      {sessionHistory.length > 0 && (
        <Card
          size="small"
          title={
            <Space>
              <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
              <Text strong>历史会话</Text>
              <Tag>{sessionHistory.length} 个会话</Tag>
            </Space>
          }
          style={{
            backgroundColor: '#fafafa',
            border: '1px solid #d9d9d9',
            borderRadius: '8px'
          }}
        >
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {sessionHistory.slice(-5).reverse().map((session, index) => (
              <div key={session.id} style={{ marginBottom: index < 4 ? '12px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Space>
                    <Tag color={session.status?.status === 'completed' ? 'green' : 'orange'}>
                      {session.status?.status === 'completed' ? '已完成' : '已停止'}
                    </Tag>
                    <Text style={{ fontSize: '12px' }}>
                      {formatTimestamp(new Date(session.createdAt).toISOString())}
                    </Text>
                  </Space>

                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    工具调用: {session.toolCalls.length}次
                  </Text>
                </div>

                <Text style={{ fontSize: '13px', display: 'block', marginBottom: '2px' }}>
                  <strong>会话ID:</strong> {session.id.length > 20 ? session.id.substring(0, 20) + '...' : session.id}
                </Text>
                
                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                  <strong>状态:</strong> {session.status.status}
                </Text>

                {session.toolCalls.length > 0 && (
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                    工具调用: {session.toolCalls.length} 次
                  </Text>
                )}
                
                {index < sessionHistory.slice(-5).length - 1 && <Divider style={{ margin: '8px 0' }} />}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 历史会话结果 */}
      {sessionHistory.slice(-3).reverse().map((session) => (
        session.result && (
          <TaskFlowResult key={session.id} session={session} />
        )
      ))}

      {/* 无任务流时的提示 */}
      {!currentSession && sessionHistory.length === 0 && (
        <Card
          size="small"
          style={{
            backgroundColor: '#f9f9f9',
            border: '1px dashed #d9d9d9',
            borderRadius: '8px',
            textAlign: 'center',
            padding: '24px'
          }}
        >
          <PlayCircleOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
          <Title level={4} style={{ color: '#8c8c8c', margin: '0 0 8px 0' }}>
            暂无任务流
          </Title>
          <Text type="secondary">
            当AI需要执行复杂任务时，会自动启动任务流模式
          </Text>
        </Card>
      )}
    </div>
  );
};

export default TaskFlowDisplay;
