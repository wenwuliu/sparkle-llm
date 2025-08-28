import React, { useEffect, useState } from 'react';
import { Timeline, Card, Typography, Space, Tag, Tooltip, Progress } from 'antd';
import { 
  RobotOutlined, 
  BulbOutlined, 
  ToolOutlined, 
  EyeOutlined, 
  SyncOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { AgentState, TaskStep, AgentStatus } from '../types/agent.types';

const { Text, Title } = Typography;

interface AgentTimelineProps {
  agentState?: AgentState;
  visible: boolean;
}

interface TimelineItem {
  key: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  icon: React.ReactNode;
  color: string;
  timestamp?: number;
  duration?: number;
  details?: any;
}

const AgentTimeline: React.FC<AgentTimelineProps> = ({ agentState, visible }) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // 更新当前时间，用于显示实时执行时间
  useEffect(() => {
    if (visible && agentState && agentState.status !== 'completed' && agentState.status !== 'failed') {
      const timer = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [visible, agentState?.status]);

  if (!visible || !agentState) {
    return null;
  }

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'planning':
        return <BulbOutlined />;
      case 'reasoning':
        return <SyncOutlined spin />;
      case 'acting':
        return <ToolOutlined />;
      case 'observing':
        return <EyeOutlined />;
      case 'reflecting':
        return <BulbOutlined />;
      case 'completed':
        return <CheckCircleOutlined />;
      case 'failed':
        return <ClockCircleOutlined />;
      default:
        return <RobotOutlined />;
    }
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'planning':
      case 'reflecting':
        return 'blue';
      case 'reasoning':
      case 'acting':
      case 'observing':
        return 'processing';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockCircleOutlined />;
      case 'running':
        return <PlayCircleOutlined />;
      case 'completed':
        return <CheckCircleOutlined />;
      case 'failed':
        return <ClockCircleOutlined />;
      case 'skipped':
        return <ClockCircleOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
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

  // 生成时间轴项目
  const generateTimelineItems = (): TimelineItem[] => {
    const items: TimelineItem[] = [];

    // 添加当前状态
    if (agentState.status !== 'idle') {
      items.push({
        key: 'current-status',
        title: `当前状态: ${getStatusDisplayName(agentState.status)}`,
        description: getStatusDescription(agentState.status),
        status: agentState.status === 'completed' ? 'completed' : 'running',
        icon: getStatusIcon(agentState.status),
        color: getStatusColor(agentState.status),
        timestamp: agentState.lastUpdateTime,
        details: {
          currentStep: agentState.currentStep,
          totalSteps: agentState.totalSteps,
          progress: agentState.progress
        }
      });
    }

    // 添加执行步骤
    if (agentState.plan && agentState.plan.length > 0) {
      agentState.plan.forEach((step, index) => {
        const stepItem: TimelineItem = {
          key: `step-${step.id}`,
          title: `步骤 ${index + 1}: ${step.description}`,
          description: step.expectedOutcome,
          status: step.status as any,
          icon: getStepStatusIcon(step.status),
          color: getStepStatusColor(step.status),
          timestamp: step.startTime,
          duration: step.duration,
          details: {
            stepType: step.type,
            thoughts: step.thoughts,
            result: step.result,
            error: step.error
          }
        };
        items.push(stepItem);
      });
    }

    return items;
  };

  const getStatusDisplayName = (status: AgentStatus): string => {
    switch (status) {
      case 'idle':
        return '空闲';
      case 'planning':
        return '规划中';
      case 'reasoning':
        return '推理中';
      case 'acting':
        return '执行中';
      case 'observing':
        return '观察中';
      case 'reflecting':
        return '反思中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      case 'paused':
        return '暂停';
      default:
        return status;
    }
  };

  const getStatusDescription = (status: AgentStatus): string => {
    switch (status) {
      case 'idle':
        return '等待任务开始';
      case 'planning':
        return '正在分析任务并制定执行计划';
      case 'reasoning':
        return '正在分析当前情况并决定下一步行动';
      case 'acting':
        return '正在执行具体的操作和工具调用';
      case 'observing':
        return '正在观察执行结果并分析效果';
      case 'reflecting':
        return '正在反思执行过程并总结经验';
      case 'completed':
        return '任务已成功完成';
      case 'failed':
        return '任务执行失败';
      case 'paused':
        return '任务执行已暂停';
      default:
        return '未知状态';
    }
  };

  const timelineItems = generateTimelineItems();
  const executionTime = currentTime - agentState.startTime;

  return (
    <Card
      size="small"
      title={
        <Space>
          <RobotOutlined />
          <Text strong>Agent执行时间轴</Text>
          <Tag color={getStatusColor(agentState.status)}>
            {getStatusIcon(agentState.status)}
            {getStatusDisplayName(agentState.status)}
          </Tag>
        </Space>
      }
      style={{ marginBottom: '12px' }}
    >
      {/* 总体进度 */}
      <div style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>执行进度</Text>
          <Progress 
            percent={Math.round(agentState.progress)} 
            status={agentState.status === 'failed' ? 'exception' : 'active'}
            size="small"
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            步骤 {agentState.currentStep} / {agentState.totalSteps} | 
            执行时间: {formatDuration(executionTime)}
            {agentState.status !== 'completed' && agentState.status !== 'failed' && (
              <span style={{ color: '#1890ff' }}> (实时更新)</span>
            )}
          </Text>
        </Space>
      </div>

      {/* 时间轴 */}
      <Timeline
        mode="left"
        items={timelineItems.map((item) => ({
          key: item.key,
          color: item.color,
          children: (
            <div style={{ padding: '8px 0' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div>
                  <Space>
                    <Text strong>{item.title}</Text>
                    {item.timestamp && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {formatTimestamp(item.timestamp)}
                      </Text>
                    )}
                    {item.duration && (
                      <Tag color="blue">
                        耗时: {formatDuration(item.duration)}
                      </Tag>
                    )}
                  </Space>
                </div>
                <Text type="secondary">{item.description}</Text>
                
                {/* 步骤详情 */}
                {item.details && item.details.stepType && (
                  <div style={{ marginTop: '8px' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      类型: {item.details.stepType}
                    </Text>
                    {item.details.thoughts && item.details.thoughts.length > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          思考过程: {item.details.thoughts.length} 个想法
                        </Text>
                      </div>
                    )}
                    {item.details.error && (
                      <div style={{ marginTop: '4px' }}>
                        <Text type="danger" style={{ fontSize: '12px' }}>
                          错误: {item.details.error}
                        </Text>
                      </div>
                    )}
                  </div>
                )}

                {/* 当前状态详情 */}
                {item.details && item.details.currentStep && (
                  <div style={{ marginTop: '8px' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      进度: {item.details.currentStep}/{item.details.totalSteps} | 
                      完成度: {Math.round(item.details.progress)}%
                    </Text>
                  </div>
                )}
              </Space>
            </div>
          )
        }))}
      />
    </Card>
  );
};

export default AgentTimeline;
