import { useState, useEffect } from 'react';
import { List, Button, Typography, Spin, Empty, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined, MessageOutlined } from '@ant-design/icons';
import { socketService } from '../services/socketService';
import { Conversation } from '../types/conversation';

const { Title } = Typography;

interface ConversationHistoryProps {
  onSelectConversation: (conversationId: number) => void;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({ onSelectConversation }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

  // 加载对话历史
  useEffect(() => {
    fetchConversations();

    // 监听对话创建事件
    const createdUnsubscribe = socketService.onConversationCreated((conversation) => {
      setConversations(prev => [conversation, ...prev]);
      setActiveConversationId(conversation.id);
    });

    // 监听对话激活事件
    const activatedUnsubscribe = socketService.onConversationActivated((conversation) => {
      setActiveConversationId(conversation.id);
    });

    // 监听对话更新事件
    const updatedUnsubscribe = socketService.onConversationUpdated((updatedConversation) => {
      setConversations(prev =>
        prev.map(conv =>
          conv.id === updatedConversation.id ? updatedConversation : conv
        )
      );
      setActiveConversationId(updatedConversation.id);
    });

    return () => {
      createdUnsubscribe();
      activatedUnsubscribe();
      updatedUnsubscribe();
    };
  }, []);

  // 获取所有对话
  const fetchConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/conversations');
      const data = await response.json();

      if (data.success) {
        setConversations(data.data);

        // 查找活动对话
        const activeConversation = data.data.find((conv: Conversation) => conv.is_active);
        if (activeConversation) {
          setActiveConversationId(activeConversation.id);
        }
      }
    } catch (error) {
      console.error('获取对话历史失败:', error);
      message.error('获取对话历史失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建新对话
  const handleCreateConversation = () => {
    socketService.createConversation();
  };

  // 选择对话
  const handleSelectConversation = (conversationId: number) => {
    if (conversationId === activeConversationId) return;

    socketService.activateConversation(conversationId);
    onSelectConversation(conversationId);
  };

  // 删除对话
  const handleDeleteConversation = async (conversationId: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        message.success('对话已删除');

        // 如果删除的是当前活动对话，创建一个新对话
        if (conversationId === activeConversationId) {
          socketService.createConversation();
        }
      }
    } catch (error) {
      console.error('删除对话失败:', error);
      message.error('删除对话失败');
    }
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="conversation-history">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={4}>对话历史</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateConversation}
        >
          新对话
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
        </div>
      ) : conversations.length === 0 ? (
        <Empty description="暂无对话历史" />
      ) : (
        <List
          dataSource={conversations}
          renderItem={(conversation) => (
            <List.Item
              key={conversation.id}
              className={conversation.id === activeConversationId ? 'active-conversation' : ''}
              style={{
                cursor: 'pointer',
                padding: '12px',
                borderRadius: '4px',
                backgroundColor: conversation.id === activeConversationId ? '#e6f7ff' : 'transparent',
                marginBottom: '8px'
              }}
              onClick={() => handleSelectConversation(conversation.id)}
              actions={[
                <Popconfirm
                  title="确定要删除这个对话吗？"
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    handleDeleteConversation(conversation.id);
                  }}
                  okText="确定"
                  cancelText="取消"
                  onCancel={(e) => e?.stopPropagation()}
                >
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                avatar={<MessageOutlined style={{ fontSize: '20px', color: '#1890ff' }} />}
                title={conversation.title}
                description={formatDate(conversation.updated_at)}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default ConversationHistory;
