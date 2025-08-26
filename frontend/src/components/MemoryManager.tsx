import { useState, useEffect } from 'react';
import { List, Card, Input, Button, Typography, Tag, Spin, Empty, Progress, Tabs, message, Dropdown, Select, Space, Row, Col } from 'antd';
import { SearchOutlined, MoreOutlined, DeleteOutlined, FilterOutlined } from '@ant-design/icons';

import { useMemoryStore } from '../store';
import MemoryReview from './MemoryReview';
import SemanticSearch from './SemanticSearch';
import AutoMemoryReviewHistory from './AutoMemoryReviewHistory';

const { Title, Text } = Typography;
const { Search } = Input;

const { TabPane } = Tabs;

const { Option } = Select;

const MemoryManager: React.FC = () => {
  // 使用MemoryStore的部分功能
  const {
    memories,
    isLoading,
    deleteMemory: storeDeleteMemory,
    setMemories
  } = useMemoryStore();

  // 保留本地状态（渐进式重构）
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [memoryType, setMemoryType] = useState<string | undefined>(undefined);
  const [memorySubtype, setMemorySubtype] = useState<string | undefined>(undefined);
  const [importanceLevel, setImportanceLevel] = useState<string | undefined>(undefined);

  // 保留部分本地状态（用于UI交互）
  const [activeTab, setActiveTab] = useState('1');
  const [deletingMemoryId, setDeletingMemoryId] = useState<number | null>(null);

  // 加载记忆
  useEffect(() => {
    fetchMemories();
  }, []);

  // 获取所有记忆（分页）
  const fetchMemories = async (currentPage = page, currentPageSize = pageSize) => {
    try {
      const response = await fetch(`http://localhost:3001/api/memories?page=${currentPage}&pageSize=${currentPageSize}`);
      const data = await response.json();
      if (data.success) {
        setMemories(data.data.items || data.data);
        if (data.data.total !== undefined) {
          setTotal(data.data.total);
        } else {
          setTotal(data.data.length || 0);
        }
        setPage(currentPage);
        setPageSize(currentPageSize);
      }
    } catch (error) {
      console.error('获取记忆失败:', error);
    }
  };

  // 处理分页变化
  const handlePageChange = (newPage: number, newPageSize?: number) => {
    const updatedPageSize = newPageSize || pageSize;
    if (searchValue.trim() || memoryType || memorySubtype || importanceLevel) {
      handleSearch(newPage, updatedPageSize);
    } else {
      fetchMemories(newPage, updatedPageSize);
    }
  };

  // 搜索记忆（分页）
  const handleSearch = async (currentPage = page, currentPageSize = pageSize) => {
    if (!searchValue.trim() && !memoryType && !memorySubtype && !importanceLevel) {
      fetchMemories(currentPage, currentPageSize);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (memoryType) params.append('type', memoryType);
      if (memorySubtype) params.append('subtype', memorySubtype);
      if (importanceLevel) params.append('importance', importanceLevel);
      params.append('page', currentPage.toString());
      params.append('pageSize', currentPageSize.toString());

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const searchQuery = searchValue.trim() || '*';

      const response = await fetch(`http://localhost:3001/api/memories/search/${encodeURIComponent(searchQuery)}${queryString}`);
      const data = await response.json();
      if (data.success) {
        setMemories(data.data.items || data.data);
        if (data.data.total !== undefined) {
          setTotal(data.data.total);
        } else {
          setTotal(data.data.length || 0);
        }
        setPage(currentPage);
        setPageSize(currentPageSize);
      }
    } catch (error) {
      console.error('搜索记忆失败:', error);
    }
  };

  // 重置筛选条件
  const resetFilters = () => {
    setMemoryType(undefined);
    setMemorySubtype(undefined);
    setImportanceLevel(undefined);
    setSearchValue('');
    setPage(1);
    fetchMemories(1, pageSize);
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

  // 删除记忆（使用store）
  const handleDeleteMemory = async (id: number) => {
    console.log('开始删除记忆:', id);
    setDeletingMemoryId(id);
    try {
      await storeDeleteMemory(id);
      message.success('记忆删除成功');
      // 重新获取记忆列表
      if (searchValue.trim() || memoryType || memorySubtype || importanceLevel) {
        handleSearch();
      } else {
        fetchMemories();
      }
    } catch (error) {
      console.error('删除记忆失败:', error);
      message.error('删除记忆失败，请稍后重试');
    } finally {
      setDeletingMemoryId(null);
    }
  };

  // 渲染记忆列表
  const renderMemoryList = () => {
    if (isLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      );
    }

    if (memories.length === 0) {
      return <Empty description="暂无记忆" />;
    }

    return (
      <List
        grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
        dataSource={memories}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: total,
          onChange: handlePageChange,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `共 ${total} 条记忆`,
          position: 'bottom'
        }}
        renderItem={(memory) => (
          <List.Item>
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span>记忆 #{memory.id}</span>
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#999' }}>
                      {formatDate((memory as any).created_at || memory.timestamp)}
                    </span>
                  </div>
                  <div>
                    <Tag color={
                      memory.importance_level === 'HIGH' || memory.importance_level === 'CRITICAL' ? 'red' :
                      memory.importance_level === 'MEDIUM' ? 'blue' :
                      memory.importance_level === 'LOW' ? 'gray' : 'blue'
                    }>
                      {memory.importance_level === 'HIGH' || memory.importance_level === 'CRITICAL' ? '重要' :
                       memory.importance_level === 'MEDIUM' ? '一般' :
                       memory.importance_level === 'LOW' ? '不重要' :
                       `重要性: ${(memory as any).importance_score?.toFixed(1) || 'N/A'}`}
                    </Tag>
                  </div>
                </div>
              }
              extra={
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'delete',
                        icon: <DeleteOutlined />,
                        label: '删除记忆',
                        danger: true,
                        disabled: deletingMemoryId === memory.id,
                        onClick: () => {
                          console.log('点击删除按钮:', memory.id);
                          handleDeleteMemory(memory.id);
                        }
                      }
                    ]
                  }}
                  trigger={['click']}
                >
                  <Button
                    type="text"
                    icon={<MoreOutlined />}
                    size="small"
                    style={{ opacity: 0.6 }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              }
            >
              <div style={{ marginBottom: '8px' }}>
                <Text strong>记忆类型:</Text>
                <div style={{ marginTop: '4px' }}>
                  {memory.memory_type && (
                    <Tag color={memory.memory_type === 'CORE' ? 'volcano' : 'cyan'}>
                      {memory.memory_type === 'CORE' ? '核心记忆' : '事实记忆'}
                    </Tag>
                  )}
                  {memory.memory_sub_type && (
                    <Tag color="purple">
                      {memory.memory_sub_type === 'instruction' ? '用户指令' :
                       memory.memory_sub_type === 'preference' ? '用户偏好' :
                       memory.memory_sub_type === 'project_info' ? '项目信息' :
                       memory.memory_sub_type === 'decision' ? '重要决策' :
                       memory.memory_sub_type === 'solution' ? '解决方案' :
                       memory.memory_sub_type === 'knowledge' ? '知识点' :
                       memory.memory_sub_type}
                    </Tag>
                  )}
                  {(memory as any).is_pinned === 1 && (
                    <Tag color="gold">固定显示</Tag>
                  )}
                </div>
              </div>
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

              {(memory as any).last_accessed && (
                <div>
                  <Text type="secondary">最后访问: {formatDate((memory as any).last_accessed)}</Text>
                </div>
              )}
            </Card>
          </List.Item>
        )}
      />
    );
  };

  return (
    <div className="memory-manager">
      <div style={{ marginBottom: '20px' }}>
        <Title level={3}>记忆管理</Title>
        <Text type="secondary">
          这里显示系统的长期记忆，您可以查看、搜索和复习记忆内容。
        </Text>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="记忆列表" key="1">
          <div style={{ marginBottom: '20px' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Search
                  placeholder="搜索记忆..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onSearch={() => handleSearch(page, pageSize)}
                  enterButton={<Button icon={<SearchOutlined />}>搜索</Button>}
                />
              </Col>
              <Col xs={24} md={12}>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button
                    onClick={resetFilters}
                    style={{ marginRight: '8px' }}
                  >
                    重置筛选
                  </Button>
                  <Button
                    type="primary"
                    icon={<FilterOutlined />}
                    onClick={() => handleSearch(page,pageSize)}
                  >
                    应用筛选
                  </Button>
                </Space>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
              <Col xs={24} sm={8}>
                <Select
                  placeholder="记忆类型"
                  style={{ width: '100%' }}
                  value={memoryType}
                  onChange={setMemoryType}
                  allowClear
                >
                  <Option value="core">核心记忆</Option>
                  <Option value="factual">事实记忆</Option>
                </Select>
              </Col>
              <Col xs={24} sm={8}>
                <Select
                  placeholder="记忆子类型"
                  style={{ width: '100%' }}
                  value={memorySubtype}
                  onChange={setMemorySubtype}
                  allowClear
                >
                  <Option value="instruction">用户指令</Option>
                  <Option value="preference">用户偏好</Option>
                  <Option value="reflection">反省记忆</Option>
                  <Option value="project_info">项目信息</Option>
                  <Option value="decision">重要决策</Option>
                  <Option value="solution">解决方案</Option>
                  <Option value="knowledge">知识点</Option>
                </Select>
              </Col>
              <Col xs={24} sm={8}>
                <Select
                  placeholder="重要性级别"
                  style={{ width: '100%' }}
                  value={importanceLevel}
                  onChange={setImportanceLevel}
                  allowClear
                >
                  <Option value="important">重要</Option>
                  <Option value="moderate">一般</Option>
                  <Option value="unimportant">不重要</Option>
                </Select>
              </Col>
            </Row>
          </div>

          {renderMemoryList()}
        </TabPane>
        <TabPane tab="记忆复习" key="2">
          <MemoryReview />
        </TabPane>
        <TabPane tab="自动复习历史" key="3">
          <AutoMemoryReviewHistory />
        </TabPane>
        <TabPane tab="语义搜索" key="4">
          <SemanticSearch />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default MemoryManager;
