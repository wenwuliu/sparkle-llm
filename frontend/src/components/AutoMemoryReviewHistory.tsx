import React, { useState, useEffect } from 'react';
import { Card, List, Button, Typography, Tag, Statistic, Empty, Spin, Divider, message, Row, Col, Collapse } from 'antd';
import { CheckCircleOutlined, DeleteOutlined, MinusCircleOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface ReviewSession {
  id: number;
  timestamp: number;
  reviewed_count: number;
  forgotten_count: number;
  unchanged_count: number;
  details: string;
  trigger_type: string;
}

interface ReviewDetail {
  id: number;
  action: string;
  reason: string;
}

const AutoMemoryReviewHistory: React.FC = () => {
  const [history, setHistory] = useState<ReviewSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  // 加载自动记忆复习历史
  useEffect(() => {
    fetchReviewHistory();
  }, []);

  // 获取自动记忆复习历史
  const fetchReviewHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/memories/review/history');
      const data = await response.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (error) {
      console.error('获取自动记忆复习历史失败:', error);
      message.error('获取历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 触发自动记忆复习
  const triggerAutoReview = async () => {
    setTriggering(true);
    try {
      const response = await fetch('http://localhost:3001/api/memories/review/auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ triggerType: 'manual' }),
      });
      const data = await response.json();
      if (data.success) {
        message.success('自动记忆复习已触发');
        // 刷新历史记录
        fetchReviewHistory();
      }
    } catch (error) {
      console.error('触发自动记忆复习失败:', error);
      message.error('触发自动记忆复习失败');
    } finally {
      setTriggering(false);
    }
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // 获取触发类型标签颜色
  const getTriggerTypeColor = (triggerType: string) => {
    switch (triggerType) {
      case 'startup':
        return 'green';
      case 'periodic':
        return 'blue';
      case 'manual':
        return 'purple';
      default:
        return 'default';
    }
  };

  // 获取触发类型显示文本
  const getTriggerTypeText = (triggerType: string) => {
    switch (triggerType) {
      case 'startup':
        return '启动时';
      case 'periodic':
        return '定期检查';
      case 'manual':
        return '手动触发';
      default:
        return triggerType;
    }
  };

  return (
    <div className="auto-memory-review-history">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Title level={3}>自动记忆管理历史</Title>
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          loading={triggering}
          onClick={triggerAutoReview}
        >
          立即执行自动复习
        </Button>
      </div>
      
      <Text type="secondary" style={{ marginBottom: '20px', display: 'block' }}>
        系统会在启动时和每30分钟自动检查并复习记忆，保留有价值的信息，淡忘不再重要的内容。
      </Text>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : history.length === 0 ? (
        <Empty description="暂无自动记忆复习历史" />
      ) : (
        <>
          <Divider orientation="left">复习历史记录</Divider>
          
          <List
            dataSource={history}
            renderItem={item => (
              <List.Item>
                <Card 
                  title={`自动复习 - ${formatDate(item.timestamp)}`}
                  extra={<Tag color={getTriggerTypeColor(item.trigger_type)}>{getTriggerTypeText(item.trigger_type)}</Tag>}
                  style={{ width: '100%' }}
                >
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic 
                        title="强化记忆" 
                        value={item.reviewed_count} 
                        valueStyle={{ color: '#52c41a' }}
                        prefix={<CheckCircleOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic 
                        title="淡忘记忆" 
                        value={item.forgotten_count} 
                        valueStyle={{ color: '#faad14' }}
                        prefix={<DeleteOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic 
                        title="保持不变" 
                        value={item.unchanged_count}
                        prefix={<MinusCircleOutlined />}
                      />
                    </Col>
                  </Row>
                  
                  {item.details && (
                    <Collapse ghost style={{ marginTop: 16 }}>
                      <Panel header="查看详情" key="1">
                        <List
                          size="small"
                          dataSource={JSON.parse(item.details) as ReviewDetail[]}
                          renderItem={(detail: ReviewDetail) => (
                            <List.Item>
                              <Text strong>记忆 #{detail.id}:</Text> 
                              <Tag color={
                                detail.action === 'review' ? 'green' : 
                                detail.action === 'forget' ? 'orange' : 'default'
                              }>
                                {detail.action === 'review' ? '强化' : 
                                detail.action === 'forget' ? '淡忘' : '不变'}
                              </Tag>
                              <Text type="secondary">{detail.reason}</Text>
                            </List.Item>
                          )}
                        />
                      </Panel>
                    </Collapse>
                  )}
                </Card>
              </List.Item>
            )}
          />
          
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchReviewHistory}
              loading={loading}
            >
              刷新历史记录
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default AutoMemoryReviewHistory;
