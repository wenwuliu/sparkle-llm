/**
 * 聊天功能状态管理
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isLoading?: boolean;
  error?: string;
  sender?: 'user' | 'assistant';
  tool_calls?: any[];
  tool_results?: any[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
}

interface ChatState {
  // 基础状态
  messages: Message[];
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  isThinking: boolean;
  error: string | null;

  // UI状态
  inputValue: string;
  historyDrawerVisible: boolean;
  taskPanelVisible: boolean;

  // 基础操作
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;

  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  createNewConversation: () => void;

  setLoading: (loading: boolean) => void;
  setThinking: (thinking: boolean) => void;
  setError: (error: string | null) => void;

  // UI操作
  setInputValue: (value: string) => void;
  setHistoryDrawerVisible: (visible: boolean) => void;
  setTaskPanelVisible: (visible: boolean) => void;
  
  // 复合操作
  sendMessage: (content: string) => Promise<void>;
  createNewConversationAction: () => Promise<void>;
  initializeSocketListeners: () => Promise<void>;
  regenerateResponse: (messageId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      messages: [],
      conversations: [],
      currentConversation: null,
      isLoading: false,
      isThinking: false,
      error: null,

      // UI状态
      inputValue: '',
      historyDrawerVisible: false,
      taskPanelVisible: false,

      // 基础操作
      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: Date.now().toString(),
          timestamp: Date.now()
        };
        set((state) => ({
          messages: [...state.messages, newMessage]
        }));
      },

      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map(msg =>
            msg.id === id ? { ...msg, ...updates } : msg
          )
        }));
      },

      deleteMessage: (id) => {
        set((state) => ({
          messages: state.messages.filter(msg => msg.id !== id)
        }));
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      setConversations: (conversations) => {
        set({ conversations });
      },

      setCurrentConversation: (conversation) => {
        set({ currentConversation: conversation });
      },

      createNewConversation: () => {
        const newConversation: Conversation = {
          id: Date.now().toString(),
          title: '新对话',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversation: newConversation
        }));
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setThinking: (thinking) => {
        set({ isThinking: thinking });
      },

      setError: (error) => {
        set({ error });
      },

      // UI操作
      setInputValue: (value) => {
        set({ inputValue: value });
      },

      setHistoryDrawerVisible: (visible) => {
        set({ historyDrawerVisible: visible });
      },

      setTaskPanelVisible: (visible) => {
        set({ taskPanelVisible: visible });
      },

      // 复合操作
      sendMessage: async (content: string) => {
        const { addMessage, setLoading } = get();
        
        // 添加用户消息
        addMessage({
          role: 'user',
          content,
          sender: 'user'
        });

        setLoading(true);

        // 这里可以添加发送消息到后端的逻辑
        // 暂时模拟AI回复
        setTimeout(() => {
          addMessage({
            role: 'assistant',
            content: `收到您的消息: ${content}`,
            sender: 'assistant'
          });
          setLoading(false);
        }, 1000);
      },

      createNewConversationAction: async () => {
        const { createNewConversation } = get();
        createNewConversation();
      },

      initializeSocketListeners: async () => {
        // 初始化Socket监听器的逻辑
        console.log('初始化Socket监听器');
      },

      regenerateResponse: async (messageId: string) => {
        const { updateMessage } = get();
        
        updateMessage(messageId, {
          isLoading: true,
          error: undefined
        });

        // 模拟重新生成回复
        setTimeout(() => {
          updateMessage(messageId, {
            content: '重新生成的回复内容',
            isLoading: false
          });
        }, 2000);
      }
    }),
    {
      name: 'chat-store'
    }
  )
);
