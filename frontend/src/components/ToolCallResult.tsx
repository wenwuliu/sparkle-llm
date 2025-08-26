import React, { useState } from 'react';
import { Card, Typography, Collapse, Tag, Divider, Button } from 'antd';
import { ToolOutlined, CheckCircleOutlined, CloseCircleOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { ToolCall, ToolCallResult } from '../types/conversation';

const { Text, Title } = Typography;
const { Panel } = Collapse;

interface ToolCallResultsProps {
  toolCalls?: ToolCall[];
  toolResults?: ToolCallResult[];
}

const ToolCallResults: React.FC<ToolCallResultsProps> = ({ toolCalls, toolResults }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);

  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  // 切换展开/折叠所有工具调用
  const toggleExpand = () => {
    if (isExpanded) {
      setActiveKeys([]);
    } else {
      setActiveKeys(toolCalls.map((_, index) => index.toString()));
    }
    setIsExpanded(!isExpanded);
  };

  // 处理折叠面板变化
  const handleCollapseChange = (keys: string | string[]) => {
    const newKeys = typeof keys === 'string' ? [keys] : keys;
    setActiveKeys(newKeys);
    setIsExpanded(newKeys.length === toolCalls.length);
  };

  // 统计成功和失败的工具调用数量
  const successCount = toolResults?.filter(result => !result.error).length || 0;
  const errorCount = toolResults?.filter(result => !!result.error).length || 0;

  return (
    <div className="tool-calls" style={{ marginTop: '16px', marginBottom: '16px' }}>
      <Divider orientation="left">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ToolOutlined style={{ marginRight: '8px' }} />
          <span>工具调用</span>
          <div style={{ marginLeft: '12px' }}>
            {successCount > 0 && (
              <Tag color="success">
                <CheckCircleOutlined /> {successCount} 成功
              </Tag>
            )}
            {errorCount > 0 && (
              <Tag color="error">
                <CloseCircleOutlined /> {errorCount} 失败
              </Tag>
            )}
          </div>
          <Button
            type="link"
            size="small"
            onClick={toggleExpand}
            icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
            style={{ marginLeft: 'auto' }}
          >
            {isExpanded ? '折叠详情' : '展开详情'}
          </Button>
        </div>
      </Divider>
      <Collapse activeKey={activeKeys} onChange={handleCollapseChange}>
        {toolCalls.map((toolCall, index) => {
          const toolResult = toolResults?.[index];
          const hasError = !!toolResult?.error;

          return (
            <Panel
              key={index.toString()}
              header={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Text strong>{toolCall.name}</Text>
                  {hasError ? (
                    <Tag color="error" style={{ marginLeft: '8px' }}>
                      <CloseCircleOutlined /> 失败
                    </Tag>
                  ) : (
                    <Tag color="success" style={{ marginLeft: '8px' }}>
                      <CheckCircleOutlined /> 成功
                    </Tag>
                  )}
                </div>
              }
            >
              <div>
                <Title level={5}>输入:</Title>
                <Card size="small" style={{ marginBottom: '8px', background: '#f5f5f5' }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(toolCall.input, null, 2)}
                  </pre>
                </Card>

                <Title level={5}>输出:</Title>
                {hasError ? (
                  <Card size="small" style={{ background: '#fff1f0', borderColor: '#ffa39e' }}>
                    <Text type="danger">{toolResult.error}</Text>
                  </Card>
                ) : (
                  <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {JSON.stringify(toolResult?.tool_output, null, 2)}
                    </pre>
                  </Card>
                )}
              </div>
            </Panel>
          );
        })}
      </Collapse>
    </div>
  );
};

export default ToolCallResults;
