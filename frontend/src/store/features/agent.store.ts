/**
 * Agent功能状态管理
 * 替换原有的TaskFlow状态管理
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  AgentSession,
  ExecutionResult,
  AgentError,
  ProgressEvent,
  AgentConfig
} from '../../types/agent.types';

interface AgentStateStore {
  // Agent会话状态
  currentAgentSession: AgentSession | null;
  agentSessions: AgentSession[];
  
  // Agent配置
  agentConfig: AgentConfig;
  
  // UI状态
  agentMode: boolean;
  agentPanelVisible: boolean;
  
  // 操作函数
  startAgentSession: (session: AgentSession) => void;
  updateAgentSession: (sessionId: string, updates: Partial<AgentSession>) => void;
  completeAgentSession: (sessionId: string, result: ExecutionResult) => void;
  failAgentSession: (sessionId: string, error: AgentError) => void;
  stopAgentSession: (sessionId: string) => void;
  clearAgentSession: (sessionId: string) => void;
  clearAllAgentSessions: () => void;
  
  // 进度更新
  updateAgentProgress: (sessionId: string, progress: ProgressEvent) => void;
  
  // UI操作
  setAgentMode: (enabled: boolean) => void;
  setAgentPanelVisible: (visible: boolean) => void;
  
  // 配置操作
  updateAgentConfig: (config: Partial<AgentConfig>) => void;
  
  // 统计信息
  getAgentStats: () => {
    total: number;
    running: number;
    completed: number;
    failed: number;
    stopped: number;
  };
}

const defaultAgentConfig: AgentConfig = {
  maxSteps: 20,
  maxRetries: 3,
  timeout: 300000,
  enableReflection: true,
  enableMemory: true,
  enableProgressTracking: true,
  reasoningModel: 'advanced',
  actionModel: 'advanced',
  reflectionModel: 'advanced',
  confidenceThreshold: 0.7,
  metadata: {}
};

export const useAgentStore = create<AgentStateStore>()(
  devtools(
    (set, get) => ({
      // 初始状态
      currentAgentSession: null,
      agentSessions: [],
      agentConfig: defaultAgentConfig,
      agentMode: false,
      agentPanelVisible: false,

      // 会话管理
      startAgentSession: (session: AgentSession) => {
        set((state) => ({
          currentAgentSession: session,
          agentSessions: [...state.agentSessions, session],
          agentMode: true
        }));
      },

      updateAgentSession: (sessionId: string, updates: Partial<AgentSession>) => {
        set((state) => ({
          agentSessions: state.agentSessions.map(session =>
            session.id === sessionId ? { ...session, ...updates } : session
          ),
          currentAgentSession: state.currentAgentSession?.id === sessionId
            ? { ...state.currentAgentSession, ...updates }
            : state.currentAgentSession
        }));
      },

      completeAgentSession: (sessionId: string, result: ExecutionResult) => {
        set((state) => ({
          agentSessions: state.agentSessions.map(session =>
            session.id === sessionId
              ? { ...session, status: 'completed', result }
              : session
          ),
          currentAgentSession: state.currentAgentSession?.id === sessionId
            ? { ...state.currentAgentSession, status: 'completed', result }
            : state.currentAgentSession
        }));
      },

      failAgentSession: (sessionId: string, error: AgentError) => {
        set((state) => ({
          agentSessions: state.agentSessions.map(session =>
            session.id === sessionId
              ? { ...session, status: 'failed', error }
              : session
          ),
          currentAgentSession: state.currentAgentSession?.id === sessionId
            ? { ...state.currentAgentSession, status: 'failed', error }
            : state.currentAgentSession
        }));
      },

      stopAgentSession: (sessionId: string) => {
        set((state) => ({
          agentSessions: state.agentSessions.map(session =>
            session.id === sessionId
              ? { ...session, status: 'stopped' }
              : session
          ),
          currentAgentSession: state.currentAgentSession?.id === sessionId
            ? { ...state.currentAgentSession, status: 'stopped' }
            : state.currentAgentSession
        }));
      },

      clearAgentSession: (sessionId: string) => {
        set((state) => ({
          agentSessions: state.agentSessions.filter(session => session.id !== sessionId),
          currentAgentSession: state.currentAgentSession?.id === sessionId
            ? null
            : state.currentAgentSession
        }));
      },

      clearAllAgentSessions: () => {
        set({
          currentAgentSession: null,
          agentSessions: [],
          agentMode: false
        });
      },

      // 进度更新
      updateAgentProgress: (sessionId: string, progress: ProgressEvent) => {
        const { agentSessions, currentAgentSession } = get();
        
        // 更新会话状态
        const updatedSessions = agentSessions.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              agentState: session.agentState ? {
                ...session.agentState,
                status: progress.status,
                progress: progress.progress,
                lastUpdateTime: progress.timestamp
              } : undefined
            };
          }
          return session;
        });

        set({
          agentSessions: updatedSessions,
          currentAgentSession: currentAgentSession?.id === sessionId
            ? {
                ...currentAgentSession,
                agentState: currentAgentSession.agentState ? {
                  ...currentAgentSession.agentState,
                  status: progress.status,
                  progress: progress.progress,
                  lastUpdateTime: progress.timestamp
                } : undefined
              }
            : currentAgentSession
        });
      },

      // UI操作
      setAgentMode: (enabled: boolean) => {
        set({ agentMode: enabled });
      },

      setAgentPanelVisible: (visible: boolean) => {
        set({ agentPanelVisible: visible });
      },

      // 配置操作
      updateAgentConfig: (config: Partial<AgentConfig>) => {
        set((state) => ({
          agentConfig: { ...state.agentConfig, ...config }
        }));
      },

      // 统计信息
      getAgentStats: () => {
        const { agentSessions } = get();
        return {
          total: agentSessions.length,
          running: agentSessions.filter(s => s.status === 'running').length,
          completed: agentSessions.filter(s => s.status === 'completed').length,
          failed: agentSessions.filter(s => s.status === 'failed').length,
          stopped: agentSessions.filter(s => s.status === 'stopped').length
        };
      }
    }),
    {
      name: 'agent-store'
    }
  )
);
