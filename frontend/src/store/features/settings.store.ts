/**
 * 设置功能状态管理
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface ModelConfig {
  provider: 'ollama' | 'siliconflow';
  model: string;
  apiUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  // 高级模型配置
  ollamaAdvancedModel?: string;
  siliconflowAdvancedModel?: string;
}

export interface UISettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  fontSize: 'small' | 'medium' | 'large';
  sidebarCollapsed: boolean;
  showLineNumbers: boolean;
  enableAnimations: boolean;
}

export interface ChatSettings {
  taskFlowMode: boolean;
  useTools: boolean;
  enableMemory: boolean;
  autoSave: boolean;
  maxHistoryLength: number;
}

interface SettingsState {
  // 状态
  modelConfig: ModelConfig;
  uiSettings: UISettings;
  chatSettings: ChatSettings;
  isSettingsOpen: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 操作
  updateModelConfig: (config: Partial<ModelConfig>) => void;
  updateUISettings: (settings: Partial<UISettings>) => void;
  updateChatSettings: (settings: Partial<ChatSettings>) => void;
  
  toggleSettings: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 复合操作
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  resetSettings: () => void;
  
  // 模型相关
  getAvailableModels: (provider: string) => Promise<any[]>;
  testConnection: (config: ModelConfig) => Promise<boolean>;
}

const defaultModelConfig: ModelConfig = {
  provider: 'ollama',
  model: 'qwen3:1.7b',
  apiUrl: 'http://localhost:11434',
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  topK: 40
};

const defaultUISettings: UISettings = {
  theme: 'light',
  language: 'zh',
  fontSize: 'medium',
  sidebarCollapsed: false,
  showLineNumbers: true,
  enableAnimations: true
};

const defaultChatSettings: ChatSettings = {
  taskFlowMode: false,
  useTools: false,
  enableMemory: true,
  autoSave: true,
  maxHistoryLength: 100
};

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        modelConfig: defaultModelConfig,
        uiSettings: defaultUISettings,
        chatSettings: defaultChatSettings,
        isSettingsOpen: false,
        isLoading: false,
        error: null,
        
        // 基础操作
        updateModelConfig: (config) => {
          set((state) => ({
            modelConfig: { ...state.modelConfig, ...config }
          }));
        },
        
        updateUISettings: (settings) => {
          set((state) => ({
            uiSettings: { ...state.uiSettings, ...settings }
          }));
        },
        
        updateChatSettings: (settings) => {
          set((state) => ({
            chatSettings: { ...state.chatSettings, ...settings }
          }));
        },
        
        toggleSettings: () => {
          set((state) => ({
            isSettingsOpen: !state.isSettingsOpen
          }));
        },
        
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        
        // 复合操作
        saveSettings: async () => {
          const { modelConfig, setLoading, setError } = get();

          try {
            setLoading(true);
            setError(null);

            // 转换前端数据格式到后端期望的格式
            const settings: Record<string, string> = {};

            // 模型配置
            settings['model_provider'] = modelConfig.provider;
            settings['temperature'] = modelConfig.temperature?.toString() || '0.7';
            settings['max_tokens'] = modelConfig.maxTokens?.toString() || '2048';

            // 根据provider保存对应的配置
            if (modelConfig.provider === 'ollama') {
              if (modelConfig.apiUrl) settings['ollama_api_url'] = modelConfig.apiUrl;
              if (modelConfig.model) settings['ollama_model'] = modelConfig.model;
              if (modelConfig.ollamaAdvancedModel) settings['ollama_advanced_model'] = modelConfig.ollamaAdvancedModel;
            } else if (modelConfig.provider === 'siliconflow') {
              if (modelConfig.apiUrl) settings['siliconflow_api_url'] = modelConfig.apiUrl;
              if (modelConfig.apiKey) settings['siliconflow_api_key'] = modelConfig.apiKey;
              if (modelConfig.model) settings['siliconflow_model'] = modelConfig.model;
              if (modelConfig.siliconflowAdvancedModel) settings['siliconflow_advanced_model'] = modelConfig.siliconflowAdvancedModel;
            }

            // 保存到后端
            const response = await fetch('/api/settings', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                settings
              })
            });

            if (!response.ok) {
              throw new Error('保存设置失败');
            }

            console.log('设置保存成功');
          } catch (error) {
            setError(error instanceof Error ? error.message : '保存设置失败');
            throw error;
          } finally {
            setLoading(false);
          }
        },
        
        loadSettings: async () => {
          const { setLoading, setError } = get();

          try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/settings/model/config');
            if (!response.ok) {
              throw new Error('加载设置失败');
            }

            const result = await response.json();
            const data = result.data; // 后端返回格式: { success: true, data: {...} }

            // 转换后端数据格式到前端期望的格式
            let modelConfig = { ...defaultModelConfig };

            if (data) {
              modelConfig.provider = data.provider || 'ollama';
              modelConfig.temperature = data.temperature || 0.7;
              modelConfig.maxTokens = data.maxTokens || 2048;

              // 根据provider提取对应的配置
              if (data.provider === 'ollama' && data.ollama) {
                modelConfig.apiUrl = data.ollama.apiUrl;
                modelConfig.model = data.ollama.model;
                modelConfig.ollamaAdvancedModel = data.ollama.advancedModel;
              } else if (data.provider === 'siliconflow' && data.siliconflow) {
                modelConfig.apiUrl = data.siliconflow.apiUrl;
                modelConfig.apiKey = data.siliconflow.apiKey;
                modelConfig.model = data.siliconflow.model;
                modelConfig.siliconflowAdvancedModel = data.siliconflow.advancedModel;
              }
            }

            set({
              modelConfig,
              // UI和Chat设置暂时使用默认值，后续可以扩展
              uiSettings: defaultUISettings,
              chatSettings: defaultChatSettings
            });

          } catch (error) {
            setError(error instanceof Error ? error.message : '加载设置失败');
            console.error('加载设置失败:', error);
          } finally {
            setLoading(false);
          }
        },
        
        resetSettings: () => {
          set({
            modelConfig: defaultModelConfig,
            uiSettings: defaultUISettings,
            chatSettings: defaultChatSettings
          });
        },
        
        // 模型相关操作
        getAvailableModels: async (provider) => {
          try {
            const response = await fetch(`/api/model/models?provider=${provider}`);
            if (!response.ok) {
              throw new Error('获取模型列表失败');
            }
            
            const data = await response.json();
            return data.models || [];
          } catch (error) {
            console.error('获取模型列表失败:', error);
            return [];
          }
        },
        
        testConnection: async (config) => {
          try {
            const response = await fetch('/api/model/test-connection', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(config)
            });
            
            return response.ok;
          } catch (error) {
            console.error('测试连接失败:', error);
            return false;
          }
        }
      }),
      {
        name: 'settings-store',
        // 只持久化部分状态
        partialize: (state) => ({
          modelConfig: state.modelConfig,
          uiSettings: state.uiSettings,
          chatSettings: state.chatSettings
        })
      }
    ),
    {
      name: 'settings-store'
    }
  )
);
