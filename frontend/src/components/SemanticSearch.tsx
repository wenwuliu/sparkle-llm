import React, { useState } from 'react';
import { Input, Button, List, Card, Typography, Tag, Empty, Spin, Progress } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Memory } from '../services/socketService';

const { Title, Text } = Typography;
const { Search } = Input;

const SemanticSearch: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // 语义搜索记忆
  const handleSearch = async () => {
    if (!searchValue.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/memories/semantic-search/${encodeURIComponent(searchValue)}`);
      const data = await response.json();
      if (data.success) {
        setMemories(data.data);
      }
    } catch (error) {
      console.error('语义搜索记忆失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // 获取记忆强度颜色
  const getStrengthColor = (strength?: number) => {
    if (!strength) return '#f5222d';
    if (strength < 0.3) return '#f5222d';
    if (strength < 0.6) return '#faad14';
    return '#52c41a';
  };

  // 获取相似度颜色
  const getSimilarityColor = (score?: number) => {
    if (!score) return '#f5222d';
    if (score < 0.5) return '#f5222d';
    if (score < 0.8) return '#faad14';
    return '#52c41a';
  };

  return (
    <div className="semantic-search">
      <Title level={3}>语义搜索</Title>
      <Text type="secondary">
        使用向量数据库进行语义搜索，找到与查询语义相似的记忆。
      </Text>

      <Search
        placeholder="输入搜索内容..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onSearch={handleSearch}
        enterButton={<Button icon={<SearchOutlined />}>语义搜索</Button>}
        style={{ marginTop: '20px', marginBottom: '20px' }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : memories.length === 0 ? (
        <Empty description="暂无搜索结果" />
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
          dataSource={memories}
          renderItem={(memory) => (
            <List.Item>
              <Card
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>记忆 #{memory.id}</span>
                    <Tag color="blue">重要性: {memory.importance.toFixed(1)}</Tag>
                  </div>
                }
                extra={
                  <Tag color={getSimilarityColor(memory.similarity_score)}>
                    相似度: {memory.similarity_score ? (memory.similarity_score * 100).toFixed(0) : 0}%
                  </Tag>
                }
              >
                <div>
                  <Text strong>关键词:</Text>
                  <div style={{ marginBottom: '8px' }}>
                    {memory.keywords.split(',').map((keyword, index) => (
                      <Tag key={index} color="green">{keyword.trim()}</Tag>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <Text strong>内容:</Text>
                  <div>{memory.content}</div>
                </div>

                {memory.strength !== undefined && (
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>记忆强度:</Text>
                    <Progress
                      percent={Math.round(memory.strength * 100)}
                      strokeColor={getStrengthColor(memory.strength)}
                      size="small"
                    />
                  </div>
                )}

                <div>
                  <Text type="secondary">创建时间: {formatDate(memory.created_at)}</Text>
                </div>
                {memory.last_accessed && (
                  <div>
                    <Text type="secondary">最后访问: {formatDate(memory.last_accessed)}</Text>
                  </div>
                )}
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default SemanticSearch;
