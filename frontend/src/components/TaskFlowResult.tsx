import React, { useState } from 'react';
import { Card, Typography, Space, Tag, Button } from 'antd';
import {
  CheckCircleOutlined,
  DownOutlined,
  UpOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { TaskFlowSession } from '../store/features/chat.store';
import EnhancedMarkdownRenderer from './EnhancedMarkdownRenderer';

const { Text, Paragraph } = Typography;
// const { Panel } = Collapse;

interface TaskFlowResultProps {
  session: TaskFlowSession;
  style?: React.CSSProperties;
}

/**
 * 任务流结果显示组件
 * 显示任务完成结果和详细处理步骤
 */
const TaskFlowResult: React.FC<TaskFlowResultProps> = ({ session, style }) => {
  const [detailsVisible, setDetailsVisible] = useState(false);

  if (!session.result) {
    return null;
  }



  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };



  return (
    <div style={{ margin: '16px 0', ...style }}>
      {/* 任务完成结果 */}
      <Card
        size="small"
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Text strong style={{ color: '#52c41a' }}>任务执行完成</Text>
            <Tag color="green">成功</Tag>
          </Space>
        }
        style={{
          backgroundColor: '#f6ffed',
          border: '2px solid #52c41a',
          borderRadius: '8px',
          marginBottom: '16px'
        }}
        extra={
          <Space>
            <Text type="secondary">
              创建时间: {formatTimestamp(new Date(session.createdAt).toISOString())}
            </Text>
            <Text type="secondary">
              工具调用: {session.toolCalls.length}次
            </Text>
          </Space>
        }
      >
        <div style={{ marginBottom: '12px' }}>
          <Text strong style={{ color: '#52c41a' }}>任务描述:</Text>
          <Paragraph style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
            会话ID: {session.id}
          </Paragraph>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <Text strong style={{ color: '#52c41a' }}>执行结果:</Text>
          <div style={{ 
            marginTop: '8px', 
            padding: '12px', 
            backgroundColor: '#fff', 
            border: '1px solid #d9f7be',
            borderRadius: '6px'
          }}>
            <EnhancedMarkdownRenderer content={session.result} />
          </div>
        </div>

        {/* 详情展开按钮 */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Button
            type="link"
            icon={detailsVisible ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setDetailsVisible(!detailsVisible)}
            style={{ color: '#52c41a' }}
          >
            {detailsVisible ? '收起' : '查看'}处理详情
          </Button>
        </div>
      </Card>

      {/* 处理详情 */}
      {detailsVisible && (
        <Card
          size="small"
          title={
            <Space>
              <PlayCircleOutlined style={{ color: '#1890ff' }} />
              <Text strong>工具调用详情</Text>
              <Tag color="blue">{session.toolCalls.length}次调用</Tag>
            </Space>
          }
          style={{
            backgroundColor: '#f0f5ff',
            border: '1px solid #d6e4ff',
            borderRadius: '8px'
          }}
        >
          {session.toolCalls.length > 0 ? (
            <div>
              {session.toolCalls.map((toolCall, index) => (
                <div key={index} style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f0f5ff', borderRadius: '4px' }}>
                  <Text strong>工具调用 {index + 1}</Text>
                  <div style={{ marginTop: '4px' }}>
                    <Text type="secondary">状态: {toolCall.status}</Text>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Text type="secondary">无工具调用记录</Text>
          )}
        </Card>
      )}
    </div>
  );
};

export default TaskFlowResult;
