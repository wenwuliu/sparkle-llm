import { useState, useRef, useEffect } from 'react';
import { Input, Button, Avatar, Spin, Typography, Drawer } from 'antd';
import { SendOutlined, RobotOutlined, HistoryOutlined, PlusOutlined } from '@ant-design/icons';
import { socketService, ChatMessage } from '../services/socketService';

import { useChatStore } from '../store';
import { useAgentStore } from '../store/features/agent.store';
import ConversationHistory from './ConversationHistory';
import MessageItem from './MessageItem';
import TaskExecutionPanel from './TaskExecutionPanel';
import AgentDisplay from './AgentDisplay';
import { ConversationMessage, FrontendMessage as Message } from '../types/conversation';
import { AgentSession } from '../types/agent.types';
import { convertToFrontendMessage } from '../utils/conversationUtils';
import '../styles/agent.css';

const { TextArea } = Input;
const { Text } = Typography;

interface ChatBoxProps {
  agentMode: boolean;
  useTools?: boolean;
  onAgentModeChange?: (enabled: boolean) => void;
  onUseToolsChange?: (enabled: boolean) => void;
}

// 获取API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ChatBox: React.FC<ChatBoxProps> = ({
  agentMode,
  useTools = false,
  onAgentModeChange,
  onUseToolsChange
}) => {
  // 保留本地状态（渐进式重构）
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [taskPanelVisible, setTaskPanelVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 使用ChatStore的功能
  const {
    inputValue,
    setInputValue
  } = useChatStore();

  // 使用AgentStore的功能
  const {
    currentAgentSession,
    startAgentSession,
    updateAgentSession,
    completeAgentSession,
    failAgentSession,
    clearAgentSession
  } = useAgentStore();

  // 初始化Socket连接和注册事件监听器
  useEffect(() => {
    // 初始化Socket连接
    socketService.init();

    // 监听消息
    const messageUnsubscribe = socketService.onMessage((message: ChatMessage) => {
      const newMessage: Message = {
        id: message.id || Date.now().toString(),
        content: message.content,
        sender: message.sender,
        timestamp: new Date(message.timestamp),
        tool_calls: message.tool_calls,
        tool_results: message.tool_results,
      };

      // 如果是AI消息且包含工具调用结果，则替换之前的工具调用状态消息
      if (message.sender === 'ai' && message.tool_calls && message.tool_calls.length > 0 && message.tool_results) {
        setMessages((prev) => {
          const updatedMessages = [...prev];
          // 查找并移除工具调用中和工具调用完成的消息
          const toolMessageIndex = updatedMessages.findIndex(
            msg => (msg.status === 'calling' || msg.status === 'called') && msg.sender === 'ai'
          );

          if (toolMessageIndex !== -1) {
            // 替换该消息为最终结果
            updatedMessages[toolMessageIndex] = newMessage;
            return updatedMessages;
          } else {
            // 如果没有找到，添加新消息
            return [...prev, newMessage];
          }
        });
      } else {
        // 普通消息直接添加
        setMessages((prev) => [...prev, newMessage]);
      }

      setIsLoading(false);
    });

    // 监听工具调用中状态
    const toolCallingUnsubscribe = socketService.onToolCalling((message: ChatMessage) => {
      const newMessage: Message = {
        id: `tool-calling-${Date.now()}`,
        content: message.content,
        sender: message.sender,
        timestamp: new Date(message.timestamp),
        tool_calls: message.tool_calls,
        tool_results: [],
        status: 'calling' as any
      };
      setMessages((prev) => [...prev, newMessage]);
    });

    // 监听工具调用完成状态
    const toolCalledUnsubscribe = socketService.onToolCalled((message: ChatMessage) => {
      // 查找并更新工具调用中的消息
      setMessages((prev) => {
        const updatedMessages = [...prev];
        // 查找最近的工具调用中消息
        const callingIndex = updatedMessages.findIndex(
          msg => msg.status === 'calling' && msg.sender === 'ai'
        );

        if (callingIndex !== -1) {
          // 更新该消息
          updatedMessages[callingIndex] = {
            ...updatedMessages[callingIndex],
            content: "正在生成最终结果，请稍候...",
            tool_results: message.tool_results,
            tool_calls: message.tool_calls,
            status: 'called' as any
          };
          return updatedMessages;
        } else {
          // 如果没有找到，添加新消息
          const newMessage: Message = {
            id: `tool-called-${Date.now()}`,
            content: "正在生成最终结果，请稍候...",
            sender: message.sender,
            timestamp: new Date(message.timestamp),
            tool_calls: message.tool_calls,
            tool_results: message.tool_results,
            status: 'called' as any
          };
          return [...prev, newMessage];
        }
      });
    });

    // 监听Agent开始事件
    const agentStartListener = (event: any) => {
      console.log('收到Agent开始事件:', event);
      console.log('Agent开始事件详情:', {
        sessionId: event.sessionId,
        task: event.task,
        goal: event.goal,
        useTools: event.useTools
      });
      
      const session: AgentSession = {
        id: event.sessionId,
        task: event.task,
        goal: event.goal,
        status: 'running',
        startTime: Date.now()
      };
      
      try {
        startAgentSession(session);
        console.log('Agent会话创建成功，ID:', event.sessionId);
      } catch (error) {
        console.error('Agent会话创建失败:', error);
      }

      // 自动切换到Agent模式
      if (!agentMode && onAgentModeChange) {
        console.log('自动切换到Agent模式');
        onAgentModeChange(true);
      }

      // 如果Agent使用工具，自动开启工具选项
      if (event.useTools && !useTools && onUseToolsChange) {
        console.log('自动开启工具选项');
        onUseToolsChange(true);
      }

      // Agent开始后，清除旧的思考状态，因为现在使用Agent状态
      setIsThinking(false);
      setIsLoading(false);
    };
    socketService.addAgentStartListener(agentStartListener);

    // 监听Agent进度更新
    const agentProgressListener = (event: any) => {
      console.log('收到Agent进度更新:', event);
      updateAgentSession(event.sessionId, event);
    };
    socketService.addAgentProgressListener(agentProgressListener);

    // 监听Agent错误
    const agentErrorListener = (event: any) => {
      console.log('收到Agent错误事件:', event);
      failAgentSession(event.sessionId, event.error);
      // 重置思考状态
      setIsThinking(false);
      setIsLoading(false);
    };
    socketService.addAgentErrorListener(agentErrorListener);

    // 监听Agent完成
    const agentCompleteListener = (event: any) => {
      console.log('收到Agent完成事件:', event);
      console.log('Agent完成事件详情:', {
        sessionId: event.sessionId,
        result: event.result,
        success: event.result?.success,
        summary: event.result?.summary
      });
      
      try {
        completeAgentSession(event.sessionId, event.result);
        console.log('Agent会话状态更新成功');
      } catch (error) {
        console.error('Agent会话状态更新失败:', error);
      }
      
      // 重置思考状态
      setIsThinking(false);
      setIsLoading(false);
      
      // 显示完成通知
      if (event.result?.success) {
        console.log('Agent任务成功完成');
      } else {
        console.log('Agent任务执行失败');
      }
    };
    socketService.addAgentCompleteListener(agentCompleteListener);

    // 监听Agent停止
    const agentStopListener = (event: any) => {
      console.log('收到Agent停止事件:', event);
      clearAgentSession(event.sessionId);
      // 重置思考状态
      setIsThinking(false);
      setIsLoading(false);
    };
    socketService.addAgentStopListener(agentStopListener);

    // 监听错误
    const errorUnsubscribe = socketService.onError((error) => {
      console.error('Socket错误:', error);
      setIsLoading(false);
    });

    // 监听对话创建
    const conversationCreatedUnsubscribe = socketService.onConversationCreated((conversation) => {
      setActiveConversation(conversation);
      setMessages([]);
      // 清除Agent状态，避免在新对话中显示上一个对话的Agent
      if (currentAgentSession) {
        clearAgentSession(currentAgentSession.id);
      }
    });

    // 监听对话激活
    const conversationActivatedUnsubscribe = socketService.onConversationActivated((conversation) => {
      setActiveConversation(conversation);
      loadConversationMessages(conversation.id);
      // 清除Agent状态，避免在切换对话时显示上一个对话的Agent
      if (currentAgentSession) {
        clearAgentSession(currentAgentSession.id);
      }
    });

    // 监听对话更新
    const conversationUpdatedUnsubscribe = socketService.onConversationUpdated((conversation) => {
      setActiveConversation(conversation);
    });

    // 监听任务进度事件
    const taskProgressUnsubscribe = socketService.onTaskProgress((_) => {
      // 当收到任务进度事件时，显示任务执行面板
      setTaskPanelVisible(true);
    });

    // 监听思考开始事件（保留兼容性）
    const thinkingStartUnsubscribe = socketService.onThinkingStart(() => {
      setIsThinking(true);
    });

    // 监听思考结束事件（保留兼容性）
    const thinkingEndUnsubscribe = socketService.onThinkingEnd(() => {
      setIsThinking(false);
    });

    // 获取当前活动对话
    fetchActiveConversation();

    // 组件卸载时清理事件监听器
    return () => {
      messageUnsubscribe();
      toolCallingUnsubscribe();
      toolCalledUnsubscribe();
      errorUnsubscribe();
      conversationCreatedUnsubscribe();
      conversationActivatedUnsubscribe();
      conversationUpdatedUnsubscribe();
      taskProgressUnsubscribe();
      thinkingStartUnsubscribe();
      thinkingEndUnsubscribe();

      // 清理Agent监听器
      socketService.removeAgentStartListener(agentStartListener);
      socketService.removeAgentProgressListener(agentProgressListener);
      socketService.removeAgentErrorListener(agentErrorListener);
      socketService.removeAgentCompleteListener(agentCompleteListener);
      socketService.removeAgentStopListener(agentStopListener);
    };
  }, []);

  // 获取当前活动对话
  const fetchActiveConversation = async () => {
    try {
      const response = await fetch(`${API_URL}/api/conversations/active`);

      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      // 检查内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`预期JSON响应，但收到: ${contentType}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setActiveConversation(data.data);
        loadConversationMessages(data.data.id);
      } else {
        // 如果没有活动对话，创建一个新对话
        socketService.createConversation();
      }
    } catch (error) {
      console.error('获取活动对话失败:', error);
    }
  };

  // 加载对话消息
  const loadConversationMessages = async (conversationId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/conversations/${conversationId}`);

      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      // 检查内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`预期JSON响应，但收到: ${contentType}`);
      }

      const data = await response.json();

      if (data.success) {
        // 转换消息格式，使用统一的转换函数
        const conversationMessages = (data.data.messages || []).map((msg: ConversationMessage) =>
          convertToFrontendMessage(msg)
        );

        // 设置消息
        setMessages(conversationMessages);
      }
    } catch (error) {
      console.error('加载对话消息失败:', error);
    }
  };

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    setIsLoading(true);
    setIsThinking(true);

    if (agentMode) {
      // 发送Agent消息，包含是否使用工具的选项
      socketService.sendAgentMessage(inputValue, useTools);
      if (currentAgentSession) {
        clearAgentSession(currentAgentSession.id);
      }
    } else {
      // 发送普通消息
      socketService.sendMessage(inputValue);
    }

    setInputValue('');
  };

  // 创建新对话
  const handleNewConversation = () => {
    socketService.createConversation();
    setHistoryDrawerVisible(false);
    if (currentAgentSession) {
      clearAgentSession(currentAgentSession.id);
    }
  };

  // 选择对话
  const handleSelectConversation = (conversationId: number) => {
    socketService.activateConversation(conversationId);
    setHistoryDrawerVisible(false);
    // 清除Agent状态，避免在切换对话时显示上一个对话的Agent
    if (currentAgentSession) {
      clearAgentSession(currentAgentSession.id);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          {activeConversation && (
            <Text strong style={{ fontSize: '16px' }}>{activeConversation.title}</Text>
          )}
        </div>
        <div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleNewConversation}
            style={{ marginRight: '8px' }}
          >
            新对话
          </Button>
          <Button
            icon={<HistoryOutlined />}
            onClick={() => setHistoryDrawerVisible(true)}
          >
            历史记录
          </Button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}

        {/* Agent显示 */}
        <AgentDisplay visible={agentMode || !!currentAgentSession} />

        {/* 保留简单的思考状态显示（兼容性） - 只在非Agent模式下显示 */}
        {isThinking && !currentAgentSession && !agentMode && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '16px 0',
            padding: '12px 16px',
            backgroundColor: '#f0f5ff',
            border: '1px solid #91d5ff',
            borderRadius: '8px'
          }}>
            <Spin size="small" style={{ marginRight: '8px' }} />
            <Text style={{ color: '#1890ff' }}>正在思考...</Text>
          </div>
        )}

        {/* 旧的加载状态，保留以兼容旧代码 */}
        {isLoading && !isThinking && (
          <div className="message">
            <Avatar
              icon={<RobotOutlined />}
              style={{ backgroundColor: '#1890ff', marginRight: '8px' }}
            />
            <div className="message-content">
              <Spin size="small" /> <Text type="secondary">思考中...</Text>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="请输入您的问题..."
          autoSize={{ minRows: 2, maxRows: 6 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSendMessage}
          style={{ marginTop: '8px', float: 'right' }}
          loading={isLoading}
        >
          发送
        </Button>
        <Text type="secondary" style={{ marginTop: '12px', display: 'inline-block' }}>
          按 Enter 发送，Shift + Enter 换行
          {agentMode && (
            <>
              {' (Agent模式已开启'}
              {useTools && ', 工具调用已启用'}
              {')'}
            </>
          )}
        </Text>
      </div>

      {/* 对话历史抽屉 */}
      <Drawer
        title="对话历史"
        placement="right"
        onClose={() => setHistoryDrawerVisible(false)}
        open={historyDrawerVisible}
        width={320}
      >
        <ConversationHistory onSelectConversation={handleSelectConversation} />
      </Drawer>

      {/* 任务执行面板 */}
      <TaskExecutionPanel
        visible={taskPanelVisible}
        onClose={() => setTaskPanelVisible(false)}
      />
    </div>
  );
};

export default ChatBox;
