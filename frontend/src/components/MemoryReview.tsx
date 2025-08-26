import React, { useState, useEffect } from 'react';
import { Card, List, Button, Typography, Tag, Progress, Empty, Spin, Divider, message } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, StarOutlined, HistoryOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface Memory {
  id: number;
  timestamp: number;
  keywords: string;
  context: string;
  content: string;
  importance: number;
  last_accessed?: number;
  created_at: number;
  strength?: number;
  stage?: number;
  nextReviewTime?: number;
}

const MemoryReview: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewingMemory, setReviewingMemory] = useState<Memory | null>(null);

  // 加载需要复习的记忆
  useEffect(() => {
    fetchMemoriesToReview();
  }, []);

  // 获取需要复习的记忆
  const fetchMemoriesToReview = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/memories/review/due');
      const data = await response.json();
      if (data.success) {
        setMemories(data.data);
      }
    } catch (error) {
      console.error('获取需要复习的记忆失败:', error);
      message.error('获取需要复习的记忆失败');
    } finally {
      setLoading(false);
    }
  };

  // 记录记忆复习
  const recordReview = async (memoryId: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/memories/review/${memoryId}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        message.success('记忆复习已记录');
        // 从列表中移除已复习的记忆
        setMemories(memories.filter(memory => memory.id !== memoryId));
        setReviewingMemory(null);
      }
    } catch (error) {
      console.error('记录记忆复习失败:', error);
      message.error('记录记忆复习失败');
    }
  };

  // 获取记忆强度颜色
  const getStrengthColor = (strength?: number) => {
    if (!strength) return '#f5222d';
    if (strength < 0.3) return '#f5222d';
    if (strength < 0.6) return '#faad14';
    return '#52c41a';
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };



  // 渲染记忆复习卡片
  const renderReviewCard = () => {
    if (!reviewingMemory) return null;

    return (
      <Card
        title={<Title level={4}>记忆复习</Title>}
        extra={<Button onClick={() => setReviewingMemory(null)}>返回列表</Button>}
        style={{ marginBottom: '20px' }}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text strong>关键词:</Text>
          <div>
            {reviewingMemory.keywords.split(',').map((keyword, index) => (
              <Tag key={index} color="blue">{keyword.trim()}</Tag>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <Text strong>内容:</Text>
          <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', marginTop: '8px' }}>
            {reviewingMemory.content}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <Text strong>上下文:</Text>
          <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', marginTop: '8px' }}>
            {reviewingMemory.context}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <Text strong>记忆强度:</Text>
          <Progress
            percent={Math.round((reviewingMemory.strength || 0) * 100)}
            strokeColor={getStrengthColor(reviewingMemory.strength)}
            status="active"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <Text strong>记忆阶段:</Text> <Tag color="blue">阶段 {reviewingMemory.stage || 0}</Tag>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <Text strong>创建时间:</Text> {formatDate(reviewingMemory.created_at)}
        </div>

        {reviewingMemory.last_accessed && (
          <div style={{ marginBottom: '16px' }}>
            <Text strong>上次访问:</Text> {formatDate(reviewingMemory.last_accessed)}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            size="large"
            onClick={() => recordReview(reviewingMemory.id)}
          >
            标记为已复习
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="memory-review">
      <Title level={3}>记忆复习</Title>
      <Text type="secondary">
        基于艾宾浩斯遗忘曲线，定期复习记忆可以增强记忆强度。
      </Text>

      {reviewingMemory ? (
        renderReviewCard()
      ) : (
        <>
          <Divider orientation="left">待复习记忆</Divider>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
            </div>
          ) : memories.length === 0 ? (
            <Empty description="当前没有需要复习的记忆" />
          ) : (
            <List
              grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
              dataSource={memories}
              renderItem={(memory) => (
                <List.Item>
                  <Card
                    hoverable
                    onClick={() => setReviewingMemory(memory)}
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>记忆 #{memory.id}</span>
                        <Tag color={getStrengthColor(memory.strength)}>
                          强度: {Math.round((memory.strength || 0) * 100)}%
                        </Tag>
                      </div>
                    }
                    extra={<ClockCircleOutlined />}
                  >
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>关键词:</Text>
                      <div>
                        {memory.keywords.split(',').map((keyword, index) => (
                          <Tag key={index} color="blue">{keyword.trim()}</Tag>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>内容:</Text>
                      <div style={{ height: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {memory.content}
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">
                        <HistoryOutlined /> 阶段 {memory.stage || 0}
                      </Text>
                      <Text type="secondary">
                        <StarOutlined /> 重要性: {memory.importance.toFixed(1)}
                      </Text>
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          )}

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Button
              type="primary"
              onClick={fetchMemoriesToReview}
              loading={loading}
            >
              刷新记忆列表
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default MemoryReview;
