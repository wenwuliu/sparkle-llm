import React, { useState } from 'react';
import { Card, Collapse, Tag, Typography, Space, Button } from 'antd';
import { 
  ToolOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 
  LoadingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { ToolCall } from '../store/features/chat.store';

const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

interface TaskFlowToolCallsProps {
  toolCalls: ToolCall[];
  style?: React.CSSProperties;
}

/**
 * 任务流工具调用显示组件
 * 显示任务流执行过程中的工具调用历史
 */
const TaskFlowToolCalls: React.FC<TaskFlowToolCallsProps> = ({ toolCalls, style }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executing':
        return <LoadingOutlined style={{ color: '#1890ff' }} spin />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ToolOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executing':
        return 'processing';
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'executing':
        return '执行中';
      case 'completed':
        return '已完成';
      case 'error':
        return '执行失败';
      default:
        return '未知状态';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatJson = (obj: any) => {
    if (typeof obj === 'string') {
      try {
        obj = JSON.parse(obj);
      } catch {
        return obj;
      }
    }
    return JSON.stringify(obj, null, 2);
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div style={{ margin: '16px 0', ...style }}>
      <Card
        size="small"
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space>
              <ToolOutlined />
              <Text strong>工具调用历史</Text>
              <Tag color="blue">{toolCalls.length} 次调用</Tag>
            </Space>
            <Button
              type="text"
              size="small"
              icon={showDetails ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? '隐藏详情' : '显示详情'}
            </Button>
          </div>
        }
        style={{
          backgroundColor: '#fafafa',
          border: '1px solid #d9d9d9'
        }}
      >
        <Collapse 
          ghost 
          size="small"
          activeKey={showDetails ? toolCalls.map((_, index) => index.toString()) : []}
        >
          {toolCalls.map((toolCall, index) => (
            <Panel
              key={index}
              header={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Space>
                    {getStatusIcon(toolCall.status)}
                    <Text strong>{toolCall.name}</Text>
                    <Tag color={getStatusColor(toolCall.status)}>
                      {getStatusText(toolCall.status)}
                    </Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {formatTimestamp(Date.now().toString())}
                  </Text>
                </div>
              }
              style={{
                backgroundColor: toolCall.status === 'failed' ? '#fff2f0' :
                                toolCall.status === 'completed' ? '#f6ffed' : '#f0f5ff',
                border: `1px solid ${
                  toolCall.status === 'failed' ? '#ffccc7' :
                  toolCall.status === 'completed' ? '#b7eb8f' : '#91d5ff'
                }`,
                borderRadius: '6px',
                marginBottom: '8px'
              }}
            >
              <div style={{ padding: '8px 0' }}>
                {/* 输入参数 */}
                <div style={{ marginBottom: '12px' }}>
                  <Text strong style={{ color: '#1890ff' }}>输入参数:</Text>
                  <div style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    marginTop: '4px',
                    border: '1px solid #d9d9d9'
                  }}>
                    {showDetails ? (
                      <Paragraph
                        copyable
                        style={{ 
                          margin: 0, 
                          fontSize: '12px', 
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {formatJson(toolCall.arguments)}
                      </Paragraph>
                    ) : (
                      <Text style={{ fontSize: '12px', color: '#666' }}>
                        {truncateText(formatJson(toolCall.arguments))}
                      </Text>
                    )}
                  </div>
                </div>

                {/* 输出结果 */}
                {toolCall.result && (
                  <div style={{ marginBottom: '12px' }}>
                    <Text strong style={{ color: '#52c41a' }}>输出结果:</Text>
                    <div style={{ 
                      backgroundColor: '#f6ffed', 
                      padding: '8px', 
                      borderRadius: '4px', 
                      marginTop: '4px',
                      border: '1px solid #b7eb8f'
                    }}>
                      {showDetails ? (
                        <Paragraph
                          copyable
                          style={{ 
                            margin: 0, 
                            fontSize: '12px', 
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {formatJson(toolCall.result)}
                        </Paragraph>
                      ) : (
                        <Text style={{ fontSize: '12px', color: '#666' }}>
                          {truncateText(formatJson(toolCall.result))}
                        </Text>
                      )}
                    </div>
                  </div>
                )}

                {/* 错误信息 */}
                {toolCall.status === 'failed' && (
                  <div>
                    <Text strong style={{ color: '#ff4d4f' }}>执行失败</Text>
                    <div style={{
                      backgroundColor: '#fff2f0',
                      padding: '8px',
                      borderRadius: '4px',
                      marginTop: '4px',
                      border: '1px solid #ffccc7'
                    }}>
                      <Text style={{ fontSize: '12px', color: '#ff4d4f' }}>
                        工具调用执行失败
                      </Text>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          ))}
        </Collapse>
      </Card>
    </div>
  );
};

export default TaskFlowToolCalls;
