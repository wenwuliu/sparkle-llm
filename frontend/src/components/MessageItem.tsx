import React from 'react';
import { Avatar, Spin, Typography } from 'antd';
import { RobotOutlined, UserOutlined } from '@ant-design/icons';
import EnhancedMarkdownContent from './EnhancedMarkdownContent';
import ToolCallResults from './ToolCallResult';
import { FrontendMessage as MessageProps } from '../types/conversation';

const { Text } = Typography;

// 使用React.memo包装消息组件，减少不必要的渲染
const MessageItem: React.FC<{ message: MessageProps }> = React.memo(({ message }) => {
  return (
    <div
      className={`message ${message.sender === 'user' ? 'message-user' : ''}`}
    >
      {message.sender === 'ai' && (
        <Avatar
          icon={<RobotOutlined />}
          style={{ backgroundColor: '#1890ff', marginRight: '8px' }}
        />
      )}
      <div className="message-content">
        {/* 工具调用中状态 */}
        {message.status === 'calling' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <Spin size="small" style={{ marginRight: '8px' }} />
              <Text>正在调用工具，请稍候...</Text>
            </div>
            <div className={message.sender === 'ai' ? 'ai-message-content' : ''}>
              <EnhancedMarkdownContent content={message.content} />
            </div>
            {message.tool_calls && message.tool_calls.length > 0 && (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <Text strong>正在执行以下工具调用：</Text>
                <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
                  {message.tool_calls.map((tool, index) => (
                    <li key={index}>{tool.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : message.status === 'called' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <Spin size="small" style={{ marginRight: '8px' }} />
              <Text>正在生成最终结果，请稍候...</Text>
            </div>
            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <Text strong>工具调用已完成</Text>
              {message.tool_calls && message.tool_calls.length > 0 && (
                <ToolCallResults
                  toolCalls={message.tool_calls}
                  toolResults={message.tool_results}
                />
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className={message.sender === 'ai' ? 'ai-message-content' : ''}>
              {message.sender === 'ai' ? (
                <EnhancedMarkdownContent content={message.content} />
              ) : (
                message.content
              )}
            </div>
            {message.sender === 'ai' && message.tool_calls && message.tool_calls.length > 0 && (
              <ToolCallResults
                toolCalls={message.tool_calls}
                toolResults={message.tool_results}
              />
            )}
          </div>
        )}
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {message.timestamp.toLocaleTimeString()}
        </Text>
      </div>
      {message.sender === 'user' && (
        <Avatar
          icon={<UserOutlined />}
          style={{ backgroundColor: '#52c41a', marginLeft: '8px' }}
        />
      )}
    </div>
  );
});

export default MessageItem;
