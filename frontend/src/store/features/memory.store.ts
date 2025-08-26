/**
 * 记忆功能状态管理
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Memory {
  id: number;
  content: string;
  keywords: string;
  context: string;
  timestamp: string;
  memory_type: 'CORE' | 'FACTUAL';
  memory_sub_type: string;
  importance_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  strength?: number;
  related_memories?: number[];
}

export interface MemorySearchResult {
  memories: Memory[];
  total: number;
  query: string;
}

interface MemoryState {
  // 状态
  memories: Memory[];
  selectedMemory: Memory | null;
  searchResults: MemorySearchResult | null;
  isMemoryPanelOpen: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 分页和过滤
  currentPage: number;
  pageSize: number;
  totalCount: number;
  searchQuery: string;
  filters: {
    type?: 'CORE' | 'FACTUAL';
    subtype?: string;
    importance?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    importanceLevel?: string;
    dateRange?: [string, string];
  };

  // 分页对象（兼容组件期望）
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  
  // 操作
  setMemories: (memories: Memory[]) => void;
  addMemory: (memory: Omit<Memory, 'id' | 'timestamp'>) => void;
  updateMemory: (id: number, updates: Partial<Memory>) => void;
  deleteMemory: (id: number) => void;
  
  selectMemory: (memory: Memory | null) => void;
  toggleMemoryPanel: () => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 搜索和过滤
  searchMemories: (query: string, pagination?: { page: number; pageSize: number }) => Promise<void>;
  setFilters: (filters: Partial<MemoryState['filters']>) => void;
  updateFilters: (filters: Partial<MemoryState['filters']>) => void;
  clearFilters: () => void;
  setPagination: (page: number, pageSize?: number) => void;
  updatePagination: (pagination: { page: number; pageSize: number }) => void;
  setSearchQuery: (query: string) => void;

  // 复合操作
  loadMemories: (pagination?: { page: number; pageSize: number }) => Promise<void>;
  createMemory: (content: string, keywords: string, context: string) => Promise<void>;
  getRelatedMemories: (memoryId: number) => Promise<Memory[]>;
  
  // 记忆组织
  organizeMemories: () => Promise<void>;
  getMemoryStats: () => Promise<any>;
}

export const useMemoryStore = create<MemoryState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      memories: [],
      selectedMemory: null,
      searchResults: null,
      isMemoryPanelOpen: false,
      isLoading: false,
      error: null,
      
      // 分页和过滤
      currentPage: 1,
      pageSize: 10,
      totalCount: 0,
      searchQuery: '',
      filters: {},
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0
      },
      
      // 基础操作
      setMemories: (memories) => {
        set({ memories });
      },
      
      addMemory: (memory) => {
        const newMemory: Memory = {
          ...memory,
          id: Date.now(), // 临时ID，实际会由后端生成
          timestamp: new Date().toISOString()
        };
        
        set((state) => ({
          memories: [newMemory, ...state.memories]
        }));
      },
      
      updateMemory: (id, updates) => {
        set((state) => ({
          memories: state.memories.map(memory =>
            memory.id === id ? { ...memory, ...updates } : memory
          ),
          selectedMemory: state.selectedMemory?.id === id 
            ? { ...state.selectedMemory, ...updates }
            : state.selectedMemory
        }));
      },
      
      deleteMemory: (id) => {
        set((state) => ({
          memories: state.memories.filter(memory => memory.id !== id),
          selectedMemory: state.selectedMemory?.id === id ? null : state.selectedMemory
        }));
      },
      
      selectMemory: (memory) => {
        set({ selectedMemory: memory });
      },
      
      toggleMemoryPanel: () => {
        set((state) => ({
          isMemoryPanelOpen: !state.isMemoryPanelOpen
        }));
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      
      // 搜索和过滤
      searchMemories: async (query, paginationParams) => {
        const state = get();
        const { filters, setLoading, setError } = state;
        const currentPage = paginationParams?.page || state.currentPage;
        const pageSize = paginationParams?.pageSize || state.pageSize;

        try {
          setLoading(true);
          setError(null);

          // 构建查询参数
          const params = new URLSearchParams();
          if (filters.type) params.append('type', filters.type);
          if (filters.subtype) params.append('subtype', filters.subtype);
          if (filters.importanceLevel) params.append('importance', filters.importanceLevel);
          params.append('page', currentPage.toString());
          params.append('pageSize', pageSize.toString());

          const queryString = params.toString() ? `?${params.toString()}` : '';
          const searchQuery = query.trim() || '*';

          const response = await fetch(`http://localhost:3001/api/memories/search/${encodeURIComponent(searchQuery)}${queryString}`);

          if (!response.ok) {
            throw new Error('搜索记忆失败');
          }

          const data = await response.json();

          if (data.success) {
            set({
              memories: data.data.items || data.data,
              totalCount: data.data.total || data.data.length || 0,
              currentPage,
              pageSize,
              pagination: {
                page: currentPage,
                pageSize,
                total: data.data.total || data.data.length || 0
              },
              searchQuery: query
            });
          }

        } catch (error) {
          setError(error instanceof Error ? error.message : '搜索记忆失败');
        } finally {
          setLoading(false);
        }
      },
      
      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
          currentPage: 1 // 重置到第一页
        }));
      },
      
      setPagination: (page, pageSize) => {
        set((state) => ({
          currentPage: page,
          pageSize: pageSize || state.pageSize
        }));
      },
      
      // 复合操作
      loadMemories: async (paginationParams) => {
        const state = get();
        const { setLoading, setError } = state;
        const currentPage = paginationParams?.page || state.currentPage;
        const pageSize = paginationParams?.pageSize || state.pageSize;

        try {
          setLoading(true);
          setError(null);

          const response = await fetch(`http://localhost:3001/api/memories?page=${currentPage}&pageSize=${pageSize}`);
          if (!response.ok) {
            throw new Error('加载记忆失败');
          }

          const data = await response.json();

          if (data.success) {
            set({
              memories: data.data.items || data.data,
              totalCount: data.data.total || data.data.length || 0,
              currentPage,
              pageSize,
              pagination: {
                page: currentPage,
                pageSize,
                total: data.data.total || data.data.length || 0
              }
            });
          }

        } catch (error) {
          setError(error instanceof Error ? error.message : '加载记忆失败');
        } finally {
          setLoading(false);
        }
      },
      
      createMemory: async (content, keywords, context) => {
        const { setLoading, setError, loadMemories } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          const response = await fetch('/api/memories', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content,
              keywords,
              context,
              memory_type: 'FACTUAL',
              importance_level: 'MEDIUM'
            })
          });
          
          if (!response.ok) {
            throw new Error('创建记忆失败');
          }
          
          // 重新加载记忆列表
          await loadMemories();
          
        } catch (error) {
          setError(error instanceof Error ? error.message : '创建记忆失败');
          throw error;
        } finally {
          setLoading(false);
        }
      },
      
      getRelatedMemories: async (memoryId) => {
        try {
          const response = await fetch(`/api/memories/${memoryId}/related`);
          if (!response.ok) {
            throw new Error('获取相关记忆失败');
          }
          
          const data = await response.json();
          return data.memories || [];
        } catch (error) {
          console.error('获取相关记忆失败:', error);
          return [];
        }
      },
      
      organizeMemories: async () => {
        const { setLoading, setError } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          const response = await fetch('/api/memory-organization/organize', {
            method: 'POST'
          });
          
          if (!response.ok) {
            throw new Error('组织记忆失败');
          }
          
          console.log('记忆组织完成');
          
        } catch (error) {
          setError(error instanceof Error ? error.message : '组织记忆失败');
        } finally {
          setLoading(false);
        }
      },
      
      getMemoryStats: async () => {
        try {
          const response = await fetch('/api/memories/stats');
          if (!response.ok) {
            throw new Error('获取记忆统计失败');
          }

          return await response.json();
        } catch (error) {
          console.error('获取记忆统计失败:', error);
          return null;
        }
      },

      // 新增方法
      updateFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters }
        }));
      },

      clearFilters: () => {
        set({
          filters: {},
          searchQuery: ''
        });
      },

      updatePagination: (newPagination) => {
        set((state) => ({
          currentPage: newPagination.page,
          pageSize: newPagination.pageSize,
          pagination: {
            ...state.pagination,
            page: newPagination.page,
            pageSize: newPagination.pageSize
          }
        }));
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      }
    }),
    {
      name: 'memory-store'
    }
  )
);
