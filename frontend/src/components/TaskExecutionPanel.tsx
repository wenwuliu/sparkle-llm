import React, { useState, useEffect } from 'react';
import { Card, Steps, Collapse, Typography, Spin, Alert, Button } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { socketService } from '../services/socketService';

const { Step } = Steps;
const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

interface TaskProgressEvent {
  taskId: string;
  timestamp: number;
  type: string;
  message: string;
  details?: string;
  stepIndex?: number;
  steps?: string[];
}

interface TaskExecutionPanelProps {
  visible: boolean;
  onClose: () => void;
}

const TaskExecutionPanel: React.FC<TaskExecutionPanelProps> = ({ visible, onClose }) => {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [stepStatus, setStepStatus] = useState<('wait' | 'process' | 'finish' | 'error')[]>([]);
  const [progressEvents, setProgressEvents] = useState<TaskProgressEvent[]>([]);
  const [taskCompleted, setTaskCompleted] = useState<boolean>(false);
  const [taskSuccess, setTaskSuccess] = useState<boolean>(false);
  const [taskSummary, setTaskSummary] = useState<string>('');

  useEffect(() => {
    if (!visible) {
      return;
    }

    // 监听任务进度事件
    const handleTaskProgress = (event: TaskProgressEvent) => {
      console.log('收到任务进度事件:', event);

      // 更新任务ID
      if (!taskId && event.taskId) {
        setTaskId(event.taskId);
      }

      // 更新进度事件列表
      setProgressEvents(prev => [...prev, event]);

      // 处理不同类型的事件
      switch (event.type) {
        case 'plan':
          if (event.steps) {
            setSteps(event.steps);
            setStepStatus(event.steps.map(() => 'wait'));
          }
          break;

        case 'step_start':
          if (event.stepIndex !== undefined) {
            setCurrentStep(event.stepIndex);
            setStepStatus(prev => {
              const newStatus = [...prev];
              newStatus[event.stepIndex!] = 'process';
              return newStatus;
            });
          }
          break;

        case 'step_success':
          if (event.stepIndex !== undefined) {
            setStepStatus(prev => {
              const newStatus = [...prev];
              newStatus[event.stepIndex!] = 'finish';
              return newStatus;
            });
          }
          break;

        case 'step_error':
        case 'step_failed':
          if (event.stepIndex !== undefined) {
            setStepStatus(prev => {
              const newStatus = [...prev];
              newStatus[event.stepIndex!] = 'error';
              return newStatus;
            });
          }
          break;

        case 'task_completed':
          setTaskCompleted(true);
          setTaskSuccess(true);
          setTaskSummary(event.details || '');
          break;

        case 'task_failed':
          setTaskCompleted(true);
          setTaskSuccess(false);
          setTaskSummary(event.details || '');
          break;
      }
    };

    // 订阅任务进度事件
    socketService.onTaskProgress(handleTaskProgress);

    return () => {
      // 取消订阅
      socketService.offTaskProgress(handleTaskProgress);
    };
  }, [visible, taskId]);

  // 重置任务面板
  const resetPanel = () => {
    setTaskId(null);
    setSteps([]);
    setCurrentStep(0);
    setStepStatus([]);
    setProgressEvents([]);
    setTaskCompleted(false);
    setTaskSuccess(false);
    setTaskSummary('');
    onClose();
  };

  // 按时间顺序对事件进行分组
  const groupedEvents = progressEvents.reduce((groups, event) => {
    const stepIndex = event.stepIndex !== undefined ? event.stepIndex : -1;
    if (!groups[stepIndex]) {
      groups[stepIndex] = [];
    }
    groups[stepIndex].push(event);
    return groups;
  }, {} as Record<number, TaskProgressEvent[]>);

  if (!visible) {
    return null;
  }

  return (
    <Card
      title="任务执行"
      style={{ marginBottom: 20 }}
      extra={<Button onClick={resetPanel}>关闭</Button>}
    >
      {steps.length > 0 ? (
        <>
          <Steps current={currentStep} status={taskCompleted ? (taskSuccess ? 'finish' : 'error') : 'process'}>
            {steps.map((step, index) => (
              <Step
                key={index}
                title={`步骤 ${index + 1}`}
                description={step}
                status={stepStatus[index]}
                icon={
                  stepStatus[index] === 'process' ? <LoadingOutlined /> :
                  stepStatus[index] === 'finish' ? <CheckCircleOutlined /> :
                  stepStatus[index] === 'error' ? <CloseCircleOutlined /> :
                  <QuestionCircleOutlined />
                }
              />
            ))}
          </Steps>

          <Collapse
            defaultActiveKey={['summary']}
            style={{ marginTop: 20 }}
          >
            <Panel header="任务摘要" key="summary">
              {taskCompleted ? (
                <div>
                  {taskSuccess ? (
                    <Alert message="任务成功完成" type="success" showIcon />
                  ) : (
                    <Alert message="任务执行失败" type="error" showIcon />
                  )}
                  <Paragraph style={{ marginTop: 16 }}>
                    {taskSummary}
                  </Paragraph>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Spin tip="任务执行中..." />
                </div>
              )}
            </Panel>

            {Object.entries(groupedEvents).map(([stepIndexStr, events]) => {
              const stepIndex = parseInt(stepIndexStr);
              const stepTitle = stepIndex >= 0 ? steps[stepIndex] : '任务规划';

              return (
                <Panel
                  header={stepTitle}
                  key={`step-${stepIndexStr}`}
                  extra={
                    stepStatus[stepIndex] === 'process' ? <LoadingOutlined /> :
                    stepStatus[stepIndex] === 'finish' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                    stepStatus[stepIndex] === 'error' ? <CloseCircleOutlined style={{ color: '#f5222d' }} /> :
                    <QuestionCircleOutlined />
                  }
                >
                  {events.map((event, index) => (
                    <div key={index} style={{ marginBottom: 16 }}>
                      <Text strong>{event.message}</Text>
                      {event.details && (
                        <Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
                          {event.details}
                        </Paragraph>
                      )}
                    </div>
                  ))}
                </Panel>
              );
            })}
          </Collapse>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip="正在规划任务..." />
        </div>
      )}
    </Card>
  );
};

export default TaskExecutionPanel;
