/**
 * 应用全局状态管理
 * 协调各个功能模块的状态
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// 应用全局状态接口
interface AppState {
  // 全局状态
  isInitialized: boolean;
  isConnected: boolean;
  error: string | null;
  notification: {
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    description?: string;
  } | null;

  // UI状态
  activeMenu: string;
  sidebarCollapsed: boolean;

  // 全局操作
  initialize: () => Promise<void>;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  showNotification: (notification: AppState['notification']) => void;
  clearNotification: () => void;

  // UI操作
  setActiveMenu: (menu: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // 重置
  reset: () => void;
}

// 创建应用状态存储
export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      // 初始状态
      isInitialized: false,
      isConnected: false,
      error: null,
      notification: null,

      // UI状态
      activeMenu: '1',
      sidebarCollapsed: false,

      // 全局操作
      initialize: async () => {
        try {
          set({ error: null });

          // 初始化Socket连接
          // 加载用户设置
          // 检查后端连接状态

          set({
            isInitialized: true,
            isConnected: true
          });

          console.log('应用初始化完成');
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '初始化失败',
            isConnected: false
          });
        }
      },

      setConnected: (connected) => {
        set({ isConnected: connected });
      },

      setError: (error) => {
        set({ error });
      },

      showNotification: (notification) => {
        set({ notification });

        // 自动清除通知（除了错误类型）
        if (notification && notification.type !== 'error') {
          setTimeout(() => {
            set({ notification: null });
          }, 4000);
        }
      },

      clearNotification: () => {
        set({ notification: null });
      },

      // UI操作
      setActiveMenu: (menu) => {
        set({ activeMenu: menu });
      },

      toggleSidebar: () => {
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed
        }));
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },

      // 重置
      reset: () => {
        set({
          isInitialized: false,
          isConnected: false,
          error: null,
          notification: null,
          activeMenu: '1',
          sidebarCollapsed: false
        });
      }
    }),
    {
      name: 'app-store'
    }
  )
);


