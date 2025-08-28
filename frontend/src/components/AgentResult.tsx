import React from 'react';
import { Card, Typography, Space, Tag, List, Collapse, Progress } from 'antd';
import { 
  RobotOutlined, 
  BulbOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { ExecutionResult } from '../types/agent.types';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface AgentResultProps {
  result: ExecutionResult;
  style?: React.CSSProperties;
}

const AgentResult: React.FC<AgentResultProps> = ({ result, style }) => {
  if (!result) {
    return null;
  }

  const getSuccessColor = () => {
    return result.success ? '#52c41a' : '#ff4d4f';
  };

  const getSuccessIcon = () => {
    return result.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />;
  };

  const getSuccessText = () => {
    return result.success ? '执行成功' : '执行失败';
  };

  const formatDuration = (duration: number) => {
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <RobotOutlined />
          <Text strong>执行结果</Text>
          <Tag color={getSuccessColor()}>
            {getSuccessIcon()}
            {getSuccessText()}
          </Tag>
        </Space>
      }
      style={{ 
        marginBottom: '16px',
        borderColor: result.success ? '#52c41a' : '#ff4d4f',
        ...style 
      }}
    >
      {/* 执行摘要 */}
      <div style={{ marginBottom: '16px' }}>
        <Title level={5}>执行摘要</Title>
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '6px',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          fontSize: '14px'
        }}>
          {result.summary}
        </div>
      </div>

      {/* 任务结论总结 */}
      {result.taskConclusion && (
        <div style={{ marginBottom: '16px' }}>
          <Title level={5}>
            <CheckCircleOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
            任务结论总结
          </Title>
          
          {/* 任务完成情况 */}
          <div style={{ marginBottom: '12px' }}>
            <Space size="large">
              <div>
                <Text strong>完成状态:</Text>
                <br />
                <Tag color={result.taskConclusion.taskCompletion?.isCompleted ? 'green' : 'red'}>
                  {result.taskConclusion.taskCompletion?.isCompleted ? '已完成' : '未完成'}
                </Tag>
              </div>
              <div>
                <Text strong>完成度:</Text>
                <br />
                <Text type="secondary">
                  {(result.taskConclusion.taskCompletion?.completionRate * 100).toFixed(1)}%
                </Text>
              </div>
              <div>
                <Text strong>成功等级:</Text>
                <br />
                <Tag color={
                  result.taskConclusion.taskCompletion?.successLevel === 'high' ? 'green' :
                  result.taskConclusion.taskCompletion?.successLevel === 'medium' ? 'orange' : 'red'
                }>
                  {result.taskConclusion.taskCompletion?.successLevel === 'high' ? '高' :
                   result.taskConclusion.taskCompletion?.successLevel === 'medium' ? '中' : '低'}
                </Tag>
              </div>
            </Space>
          </div>

          {/* 用户需求回应 */}
          {result.taskConclusion.userResponse && (
            <div style={{ marginBottom: '12px' }}>
              <Text strong>需求回应:</Text>
              <div style={{ 
                padding: '8px', 
                backgroundColor: '#f0f8ff', 
                borderRadius: '4px',
                marginTop: '4px'
              }}>
                {result.taskConclusion.userResponse}
              </div>
            </div>
          )}

          {/* 主要成果 */}
          {result.taskConclusion.mainResults && result.taskConclusion.mainResults.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <Text strong>主要成果:</Text>
              <List
                size="small"
                dataSource={result.taskConclusion.mainResults}
                renderItem={(resultItem, index) => (
                  <List.Item style={{ padding: '4px 0' }}>
                    <Space>
                      <Text type="secondary">{index + 1}.</Text>
                      <Text>{String(resultItem)}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          )}

          {/* 重要发现 */}
          {result.taskConclusion.keyFindings && result.taskConclusion.keyFindings.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <Text strong>重要发现:</Text>
              <List
                size="small"
                dataSource={result.taskConclusion.keyFindings}
                renderItem={(finding, index) => (
                  <List.Item style={{ padding: '4px 0' }}>
                    <Space>
                      <Text type="secondary">{index + 1}.</Text>
                      <Text>{String(finding)}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          )}

          {/* 结果解释 */}
          {result.taskConclusion.resultExplanation && (
            <div style={{ marginBottom: '12px' }}>
              <Text strong>结果解释:</Text>
              <div style={{ 
                padding: '8px', 
                backgroundColor: '#fff7e6', 
                borderRadius: '4px',
                marginTop: '4px',
                fontSize: '14px'
              }}>
                {result.taskConclusion.resultExplanation}
              </div>
            </div>
          )}

          {/* 后续步骤 */}
          {result.taskConclusion.nextSteps && result.taskConclusion.nextSteps.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <Text strong>后续步骤:</Text>
              <List
                size="small"
                dataSource={result.taskConclusion.nextSteps}
                renderItem={(step, index) => (
                  <List.Item style={{ padding: '4px 0' }}>
                    <Space>
                      <Text type="secondary">{index + 1}.</Text>
                      <Text>{String(step)}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          )}

          {/* 最终结论 */}
          {result.taskConclusion.conclusion && (
            <div style={{ marginBottom: '12px' }}>
              <Text strong>最终结论:</Text>
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#f6ffed', 
                borderRadius: '6px',
                marginTop: '4px',
                border: '1px solid #b7eb8f',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {result.taskConclusion.conclusion}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 执行统计 */}
      <div style={{ marginBottom: '16px' }}>
        <Title level={5}>执行统计</Title>
        <Space size="large">
          <div>
            <Text strong>执行时间:</Text>
            <br />
            <Text type="secondary">{formatDuration(result.executionTime)}</Text>
          </div>
          <div>
            <Text strong>总步骤数:</Text>
            <br />
            <Text type="secondary">{result.steps.length}</Text>
          </div>
          <div>
            <Text strong>错误次数:</Text>
            <br />
            <Text type="secondary" style={{ color: result.errorCount > 0 ? '#ff4d4f' : '#52c41a' }}>
              {result.errorCount}
            </Text>
          </div>
          <div>
            <Text strong>置信度:</Text>
            <br />
            <Text type="secondary">{(result.confidence * 100).toFixed(1)}%</Text>
          </div>
        </Space>
      </div>

      {/* 建议 */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <Title level={5}>
            <BulbOutlined style={{ marginRight: '8px' }} />
            改进建议
          </Title>
          <List
            size="small"
            dataSource={result.recommendations}
            renderItem={(recommendation, index) => (
              <List.Item style={{ padding: '4px 0' }}>
                <Space>
                  <Text type="secondary">{index + 1}.</Text>
                  <Text>{recommendation}</Text>
                </Space>
              </List.Item>
            )}
          />
        </div>
      )}

      {/* 执行历史 */}
      {result.history && result.history.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <Title level={5}>
            <ClockCircleOutlined style={{ marginRight: '8px' }} />
            执行历史
          </Title>
          <Collapse size="small">
            {result.history.map((history, index) => (
              <Panel
                key={index}
                header={
                  <Space>
                    <Tag color={history.success ? 'green' : 'red'}>
                      {history.success ? '成功' : '失败'}
                    </Tag>
                    <Text>{history.description}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {formatDuration(history.duration)}
                    </Text>
                  </Space>
                }
              >
                <div style={{ padding: '8px 0' }}>
                  <Paragraph style={{ margin: '0 0 8px 0' }}>
                    <Text strong>类型:</Text> {history.type}
                  </Paragraph>
                  {history.error && (
                    <Paragraph style={{ margin: '0 0 8px 0', color: '#ff4d4f' }}>
                      <Text strong>错误:</Text> {history.error}
                    </Paragraph>
                  )}
                  {history.thoughts && history.thoughts.length > 0 && (
                    <div>
                      <Text strong>思考过程:</Text>
                      <List
                        size="small"
                        dataSource={history.thoughts}
                        renderItem={(thought, thoughtIndex) => (
                          <List.Item style={{ padding: '4px 0' }}>
                            <div>
                              <Text type="secondary">{thoughtIndex + 1}. [{thought.type}]</Text>
                              <br />
                              <Text>{thought.content}</Text>
                            </div>
                          </List.Item>
                        )}
                      />
                    </div>
                  )}
                </div>
              </Panel>
            ))}
          </Collapse>
        </div>
      )}
    </Card>
  );
};

export default AgentResult;
