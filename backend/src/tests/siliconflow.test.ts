/**
 * 硅基流动模型提供商测试用例
 */

import { SiliconFlowProvider } from '../modules/model/providers/siliconflow.provider';
import { modelService } from '../modules/model';

describe('SiliconFlow Provider', () => {
  let provider: SiliconFlowProvider;

  beforeEach(() => {
    provider = new SiliconFlowProvider();
  });

  describe('Model Management', () => {
    test('should get models list', async () => {
      const models = await provider.getModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      
      // 检查模型对象结构
      if (models.length > 0) {
        const model = models[0];
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
      }
    });

    test('should search models', async () => {
      const searchResults = await provider.searchModels('qwen');
      expect(Array.isArray(searchResults)).toBe(true);
      
      // 验证搜索结果包含qwen相关模型
      if (searchResults.length > 0) {
        const hasQwenModel = searchResults.some(model => 
          model.id.toLowerCase().includes('qwen') || 
          model.name.toLowerCase().includes('qwen')
        );
        expect(hasQwenModel).toBe(true);
      }
    });

    test('should return empty array for non-existent model search', async () => {
      const searchResults = await provider.searchModels('nonexistentmodel12345');
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBe(0);
    });

    test('should return all models when search query is empty', async () => {
      const allModels = await provider.getModels();
      const emptySearchResults = await provider.searchModels('');
      
      expect(emptySearchResults.length).toBe(allModels.length);
    });
  });

  describe('Text Generation', () => {
    test('should generate text with messages', async () => {
      // 跳过需要API密钥的测试
      if (!process.env.SILICONFLOW_API_KEY) {
        console.log('跳过文本生成测试：未设置 SILICONFLOW_API_KEY');
        return;
      }

      const messages = [
        { role: 'user' as const, content: '你好，请简单介绍一下自己。' }
      ];

      const response = await provider.generateTextWithMessages(messages, {
        model: 'Qwen/Qwen2.5-7B-Instruct',
        max_tokens: 100
      });

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });

    test('should generate text with prompt', async () => {
      // 跳过需要API密钥的测试
      if (!process.env.SILICONFLOW_API_KEY) {
        console.log('跳过文本生成测试：未设置 SILICONFLOW_API_KEY');
        return;
      }

      const response = await provider.generateText('什么是人工智能？', {
        model: 'Qwen/Qwen2.5-7B-Instruct',
        max_tokens: 100
      });

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Generation', () => {
    test('should generate memory from context', async () => {
      // 跳过需要API密钥的测试
      if (!process.env.SILICONFLOW_API_KEY) {
        console.log('跳过记忆生成测试：未设置 SILICONFLOW_API_KEY');
        return;
      }

      const context = '用户提到他喜欢编程，特别是JavaScript和Python，工作在一家科技公司。';
      
      const memoryData = await provider.generateMemory(context);
      
      if (memoryData) {
        expect(memoryData).toHaveProperty('keywords');
        expect(memoryData).toHaveProperty('content');
        expect(memoryData).toHaveProperty('memory_type');
        expect(Array.isArray(memoryData.keywords)).toBe(true);
      }
    });
  });

  describe('Tool Integration', () => {
    test('should handle tool calls', async () => {
      // 跳过需要API密钥的测试
      if (!process.env.SILICONFLOW_API_KEY) {
        console.log('跳过工具调用测试：未设置 SILICONFLOW_API_KEY');
        return;
      }

      const messages = [
        { role: 'user' as const, content: '请帮我查看当前时间' }
      ];

      const tools = [
        {
          type: 'function',
          function: {
            name: 'get_current_time',
            description: '获取当前时间',
            parameters: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        }
      ];

      const result = await provider.generateWithToolsUsingMessages(messages, tools);
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('toolCalls');
      expect(Array.isArray(result.toolCalls)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid API key gracefully', async () => {
      // 临时设置无效的API密钥
      const originalKey = process.env.SILICONFLOW_API_KEY;
      process.env.SILICONFLOW_API_KEY = 'invalid_key';

      try {
        await provider.generateText('测试');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('硅基流动API错误');
      } finally {
        // 恢复原始API密钥
        if (originalKey) {
          process.env.SILICONFLOW_API_KEY = originalKey;
        } else {
          delete process.env.SILICONFLOW_API_KEY;
        }
      }
    });

    test('should handle network errors gracefully', async () => {
      // 设置无效的API URL
      const provider = new SiliconFlowProvider();
      
      // 模拟网络错误
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      try {
        await provider.getModels();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // 恢复fetch
      jest.restoreAllMocks();
    });
  });
});

describe('Model Service Integration', () => {
  test('should integrate SiliconFlow provider', async () => {
    const models = await modelService.getAvailableModels('siliconflow');
    expect(Array.isArray(models)).toBe(true);
  });

  test('should search models through model service', async () => {
    const searchResults = await modelService.searchModels('qwen', 'siliconflow');
    expect(Array.isArray(searchResults)).toBe(true);
  });

  test('should get SiliconFlow models through model service', async () => {
    const models = await modelService.getSiliconFlowModels();
    expect(Array.isArray(models)).toBe(true);
  });
});