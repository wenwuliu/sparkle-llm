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

// TaskFlow相关接口
export interface TaskFlowSession {
  id: string;
  status: {
    status: 'planning' | 'executing' | 'completed' | 'failed';
    currentStep?: string;
    progress?: number;
  };
  toolCalls: any[];
  thinkingSteps?: any[];
  result?: any;
  createdAt: number;
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

  // TaskFlow状态
  currentTaskSession: TaskFlowSession | null;
  taskFlowHistory: TaskFlowSession[];

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

  // TaskFlow操作
  startTaskFlowSession: (id: string) => void;
  updateTaskFlowStatus: (status: TaskFlowSession['status']) => void;
  addToolCall: (toolCall: ToolCall) => void;
  setThinkingSteps: (steps: any[]) => void;
  completeTaskFlow: (result?: any) => void;
  clearTaskFlowState: () => void;
  
  // 复合操作
  sendMessage: (content: string) => Promise<void>;
  sendTaskFlowMessage: (content: string, useTools?: boolean) => Promise<void>;
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

      // TaskFlow状态
      currentTaskSession: null,
      taskFlowHistory: [],
      
      // 基础操作
      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
      
      // 对话操作
      setConversations: (conversations) => {
        set({ conversations });
      },
      
      setCurrentConversation: (conversation) => {
        set({ 
          currentConversation: conversation,
          messages: conversation?.messages || []
        });
      },
      
      createNewConversation: () => {
        const newConversation: Conversation = {
          id: `conv_${Date.now()}`,
          title: '新对话',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversation: newConversation,
          messages: []
        }));
      },
      
      // 状态操作
      setLoading: (loading) => set({ isLoading: loading }),
      setThinking: (thinking) => set({ isThinking: thinking }),
      setError: (error) => set({ error }),

      // UI操作
      setInputValue: (value) => set({ inputValue: value }),
      setHistoryDrawerVisible: (visible) => set({ historyDrawerVisible: visible }),
      setTaskPanelVisible: (visible) => set({ taskPanelVisible: visible }),

      // TaskFlow操作
      startTaskFlowSession: (id) => {
        const newSession: TaskFlowSession = {
          id,
          status: { status: 'planning', progress: 0 },
          toolCalls: [],
          createdAt: Date.now()
        };

        set({ currentTaskSession: newSession });
      },

      updateTaskFlowStatus: (status) => {
        set((state) => ({
          currentTaskSession: state.currentTaskSession
            ? { ...state.currentTaskSession, status }
            : null
        }));
      },

      addToolCall: (toolCall) => {
        set((state) => ({
          currentTaskSession: state.currentTaskSession
            ? {
                ...state.currentTaskSession,
                toolCalls: [...state.currentTaskSession.toolCalls, toolCall]
              }
            : null
        }));
      },

      setThinkingSteps: (steps) => {
        set((state) => ({
          currentTaskSession: state.currentTaskSession
            ? {
                ...state.currentTaskSession,
                thinkingSteps: steps
              }
            : null
        }));
      },

      completeTaskFlow: (result) => {
        set((state) => {
          if (!state.currentTaskSession) return state;

          const completedSession = {
            ...state.currentTaskSession,
            status: { status: 'completed' as const, progress: 100 },
            result
          };

          return {
            currentTaskSession: null,
            taskFlowHistory: [completedSession, ...state.taskFlowHistory]
          };
        });
      },

      clearTaskFlowState: () => {
        set({ currentTaskSession: null });
      },

      // Socket事件处理（简化版）
      initializeSocketListeners: async () => {
        // 暂时保留空实现，后续逐步迁移Socket逻辑
        console.log('Socket监听器初始化（待实现）');
      },
      
      // 复合操作（简化版）
      sendMessage: async (content) => {
        const { setInputValue } = get();

        try {
          // 清空输入框
          setInputValue('');
          console.log('发送消息:', content);
        } catch (error) {
          console.error('发送消息失败:', error);
        }
      },

      // TaskFlow消息发送（简化版）
      sendTaskFlowMessage: async (content, useTools = false) => {
        const { setInputValue } = get();

        try {
          // 清空输入框
          setInputValue('');
          console.log('发送任务流消息:', content, useTools);
        } catch (error) {
          console.error('发送任务流消息失败:', error);
        }
      },

      // 创建新对话
      createNewConversationAction: async () => {
        const { setHistoryDrawerVisible, clearTaskFlowState, clearMessages } = get();

        try {
          // 清除当前状态
          clearMessages();
          clearTaskFlowState();
          setHistoryDrawerVisible(false);

          // 通过Socket创建新对话
          const { socketService } = await import('../../services/socketService');
          socketService.createConversation();

        } catch (error) {
          console.error('创建新对话失败:', error);
        }
      },
      
      regenerateResponse: async (_messageId) => {
        const { setLoading, setError } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          // 重新生成响应的逻辑
          // 这里会调用相应的API
          
        } catch (error) {
          setError(error instanceof Error ? error.message : '重新生成失败');
        } finally {
          setLoading(false);
        }
      }
    }),
    {
      name: 'chat-store'
    }
  )
);
