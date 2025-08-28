/**
 * Agent状态管理
 * 管理Agent会话、状态和进度
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  AgentSession, 
  AgentState, 
  ExecutionResult, 
  AgentError, 
  ProgressEvent,
  AgentConfig,
  DEFAULT_AGENT_CONFIG
} from '../../types/agent.types';

interface AgentStateStore {
  // 状态
  sessions: Map<string, AgentSession>;
  currentSessionId: string | null;
  isAgentMode: boolean;
  config: AgentConfig;
  
  // 操作
  startSession: (session: AgentSession) => void;
  updateSession: (sessionId: string, updates: Partial<AgentSession>) => void;
  completeSession: (sessionId: string, result: ExecutionResult) => void;
  failSession: (sessionId: string, error: AgentError) => void;
  stopSession: (sessionId: string) => void;
  clearSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  
  // 状态管理
  setCurrentSession: (sessionId: string | null) => void;
  setAgentMode: (enabled: boolean) => void;
  updateConfig: (config: Partial<AgentConfig>) => void;
  
  // 进度更新
  updateProgress: (sessionId: string, event: ProgressEvent) => void;
  
  // 计算属性
  getCurrentSession: () => AgentSession | null;
  getSession: (sessionId: string) => AgentSession | null;
  getAllSessions: () => AgentSession[];
  getActiveSessions: () => AgentSession[];
  getCompletedSessions: () => AgentSession[];
  getFailedSessions: () => AgentSession[];
}

export const useAgentStore = create<AgentStateStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        sessions: new Map(),
        currentSessionId: null,
        isAgentMode: false,
        config: DEFAULT_AGENT_CONFIG,
        
        // 会话管理
        startSession: (session: AgentSession) => {
          set((state) => {
            const newSessions = new Map(state.sessions);
            newSessions.set(session.id, session);
            return {
              sessions: newSessions,
              currentSessionId: session.id,
              isAgentMode: true
            };
          });
        },
        
        updateSession: (sessionId: string, updates: Partial<AgentSession>) => {
          set((state) => {
            const session = state.sessions.get(sessionId);
            if (!session) return state;
            
            const updatedSession = { ...session, ...updates };
            const newSessions = new Map(state.sessions);
            newSessions.set(sessionId, updatedSession);
            
            return { sessions: newSessions };
          });
        },
        
        completeSession: (sessionId: string, result: ExecutionResult) => {
          console.log('[Agent Store] 完成会话:', { sessionId, result });
          
          set((state) => {
            const session = state.sessions.get(sessionId);
            if (!session) {
              console.warn('[Agent Store] 完成会话时未找到会话:', sessionId);
              return state;
            }
            
            console.log('[Agent Store] 找到会话，当前状态:', session.status);
            
            const updatedSession: AgentSession = {
              ...session,
              status: 'completed',
              result
            };
            
            console.log('[Agent Store] 更新后的会话状态:', updatedSession.status);
            
            const newSessions = new Map(state.sessions);
            newSessions.set(sessionId, updatedSession);
            
            console.log('[Agent Store] 会话已完成并保存');
            
            return { 
              sessions: newSessions
              // 保持Agent模式开启，不自动关闭
            };
          });
        },
        
        failSession: (sessionId: string, error: AgentError) => {
          set((state) => {
            const session = state.sessions.get(sessionId);
            if (!session) return state;
            
            const updatedSession: AgentSession = {
              ...session,
              status: 'failed',
              error
            };
            
            const newSessions = new Map(state.sessions);
            newSessions.set(sessionId, updatedSession);
            
            return { 
              sessions: newSessions
              // 保持Agent模式开启，不自动关闭
            };
          });
        },
        
        stopSession: (sessionId: string) => {
          set((state) => {
            const session = state.sessions.get(sessionId);
            if (!session) return state;
            
            const updatedSession: AgentSession = {
              ...session,
              status: 'stopped'
            };
            
            const newSessions = new Map(state.sessions);
            newSessions.set(sessionId, updatedSession);
            
            return { 
              sessions: newSessions
              // 保持Agent模式开启，不自动关闭
            };
          });
        },
        
        clearSession: (sessionId: string) => {
          set((state) => {
            const newSessions = new Map(state.sessions);
            newSessions.delete(sessionId);
            
            const newCurrentSessionId = state.currentSessionId === sessionId ? null : state.currentSessionId;
            
            return { 
              sessions: newSessions,
              currentSessionId: newCurrentSessionId
            };
          });
        },
        
        clearAllSessions: () => {
          set({
            sessions: new Map(),
            currentSessionId: null,
            isAgentMode: false
          });
        },
        
        // 状态管理
        setCurrentSession: (sessionId: string | null) => {
          set({ currentSessionId: sessionId });
        },
        
        setAgentMode: (enabled: boolean) => {
          set({ isAgentMode: enabled });
        },
        
        updateConfig: (config: Partial<AgentConfig>) => {
          set((state) => ({
            config: { ...state.config, ...config }
          }));
        },
        
        // 进度更新
        updateProgress: (sessionId: string, event: ProgressEvent) => {
          set((state) => {
            const session = state.sessions.get(sessionId);
            if (!session) return state;
            
            // 确保agentState存在，如果不存在则创建初始状态
            const currentAgentState = session.agentState || {
              id: sessionId,
              task: session.task,
              goal: session.goal,
              status: 'idle',
              currentStep: 0,
              totalSteps: 0,
              plan: [],
              context: {
                task: session.task,
                goal: session.goal,
                constraints: [],
                availableTools: [],
                memory: [],
                conversationHistory: [],
                userPreferences: {},
                environment: {}
              },
              history: [],
              startTime: session.startTime,
              lastUpdateTime: Date.now(),
              progress: 0,
              confidence: 0,
              errorCount: 0,
              retryCount: 0,
              metadata: {}
            };
            
            // 更新Agent状态
            const updatedAgentState: AgentState = {
              ...currentAgentState,
              status: event.status,
              progress: event.progress,
              lastUpdateTime: event.timestamp,
              ...(event.data?.agentState && { ...event.data.agentState })
            };
            
            const updatedSession: AgentSession = {
              ...session,
              agentState: updatedAgentState
            };
            
            const newSessions = new Map(state.sessions);
            newSessions.set(sessionId, updatedSession);
            
            return { sessions: newSessions };
          });
        },
        
        // 计算属性
        getCurrentSession: () => {
          const state = get();
          return state.currentSessionId ? state.sessions.get(state.currentSessionId) || null : null;
        },
        
        getSession: (sessionId: string) => {
          return get().sessions.get(sessionId) || null;
        },
        
        getAllSessions: () => {
          return Array.from(get().sessions.values());
        },
        
        getActiveSessions: () => {
          return Array.from(get().sessions.values()).filter(s => s.status === 'running');
        },
        
        getCompletedSessions: () => {
          return Array.from(get().sessions.values()).filter(s => s.status === 'completed');
        },
        
        getFailedSessions: () => {
          return Array.from(get().sessions.values()).filter(s => s.status === 'failed');
        }
      }),
      {
        name: 'agent-store',
        partialize: (state) => ({
          sessions: Array.from(state.sessions.entries()) as [string, AgentSession][],
          currentSessionId: state.currentSessionId,
          isAgentMode: state.isAgentMode,
          config: state.config
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // 将数组转换回Map
            state.sessions = new Map(state.sessions as unknown as [string, AgentSession][]);
          }
        }
      }
    )
  )
);
