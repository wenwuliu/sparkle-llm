import { useState, useEffect } from 'react';
import { Form, Input, Button, Select, Switch, Card, Typography, Divider, message, Radio } from 'antd';
import { SaveOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import { useSettingsStore } from '../store';
import OperationExample from './OperationExample';

const { Title, Text } = Typography;
const { Option } = Select;

interface Model {
  name: string;
  description?: string;
}

interface Settings {
  model_provider: string;
  ollama_api_url: string;
  ollama_model: string;
  ollama_advanced_model: string;
  qwen_api_url: string;
  qwen_api_key: string;
  qwen_model: string;
  qwen_enable_search: string;
  deepseek_api_url: string;
  deepseek_api_key: string;
  deepseek_model: string;
  siliconflow_api_url: string;
  siliconflow_api_key: string;
  siliconflow_model: string;
  siliconflow_advanced_model: string;
  temperature: string;
  max_tokens: string;
  enable_memory: string;
  memory_importance_threshold: string;
  enable_task_flow: string;
  history_window_size: string;
}

interface SettingsProps {}

const Settings: React.FC<SettingsProps> = () => {
  const [form] = Form.useForm();

  // 使用SettingsStore替代本地状态
  const {
    modelConfig,
    isLoading,
    updateModelConfig,
    saveSettings,
    loadSettings,
    getAvailableModels
  } = useSettingsStore();

  // 保留部分本地状态（用于UI交互）
  const [ollamaModels, setOllamaModels] = useState<Model[]>([]);
  const [siliconflowModels, setSiliconflowModels] = useState<Model[]>([]);
  const [modelLoading, setModelLoading] = useState(false);
  const [siliconflowModelLoading, setSiliconflowModelLoading] = useState(false);
  const [modelProvider, setModelProvider] = useState<string>('ollama');

  // 获取设置（使用store）
  const fetchSettings = async () => {
    try {
      await loadSettings();

      // 更新表单值（基于store中的配置）
      const formValues = {
        modelProvider: modelConfig.provider || 'ollama',
        ollamaApiUrl: modelConfig.provider === 'ollama' ? (modelConfig.apiUrl || 'http://localhost:11434/api') : 'http://localhost:11434/api',
        siliconflowApiUrl: modelConfig.provider === 'siliconflow' ? (modelConfig.apiUrl || 'https://api.siliconflow.cn/v1/chat/completions') : 'https://api.siliconflow.cn/v1/chat/completions',
        siliconflowApiKey: modelConfig.provider === 'siliconflow' ? (modelConfig.apiKey || '') : '',
        siliconflowModel: modelConfig.provider === 'siliconflow' ? (modelConfig.model || 'Qwen/Qwen2.5-7B-Instruct') : 'Qwen/Qwen2.5-7B-Instruct',
        temperature: modelConfig.temperature || 0.7,
        maxTokens: modelConfig.maxTokens || 2048,
      };

      form.setFieldsValue(formValues);

      // 确保模型服务商选择器显示正确的值
      setModelProvider(modelConfig.provider || 'ollama');
    } catch (error) {
      console.error('获取设置失败:', error);
      message.error('获取设置失败');
    }
  };

  // 获取Ollama模型列表（使用store）
  const fetchOllamaModels = async () => {
    setModelLoading(true);
    try {
      const models = await getAvailableModels('ollama');
      setOllamaModels(models);

      // 如果没有模型，使用默认模型
      if (models.length === 0) {
        form.setFieldsValue({ ollamaModel: '' });
      } else {
        // 如果当前选择的模型不在列表中，选择第一个可用模型
        const currentModel = form.getFieldValue('ollamaModel');
        const modelExists = models.some((model: Model) => model.name === currentModel);

        if (!modelExists && models.length > 0) {
          form.setFieldsValue({ ollamaModel: models[0].name });
        }
      }
    } catch (error) {
      console.error('获取Ollama模型列表失败:', error);
      message.error('获取Ollama模型列表失败');
      form.setFieldsValue({ ollamaModel: '' });
    } finally {
      setModelLoading(false);
    }
  };

  // 获取硅基流动模型列表
  const fetchSiliconFlowModels = async () => {
    setSiliconflowModelLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/model/models?provider=siliconflow');
      const data = await response.json();

      if (data.success) {
        setSiliconflowModels(data.data);

        // 如果当前选择的模型不在列表中，选择第一个可用模型
        const currentModel = form.getFieldValue('siliconflowModel');
        const modelExists = data.data.some((model: Model) => model.name === currentModel);

        if (!modelExists && data.data.length > 0) {
          form.setFieldsValue({ siliconflowModel: data.data[0].name });
        }
      } else {
        message.warning('获取硅基流动模型列表失败，将使用默认模型');
        // 设置默认模型
        form.setFieldsValue({ siliconflowModel: 'Qwen/Qwen2.5-7B-Instruct' });
      }
    } catch (error) {
      console.error('获取硅基流动模型列表失败:', error);
      message.error('获取硅基流动模型列表失败');
      // 设置默认模型
      form.setFieldsValue({ siliconflowModel: 'Qwen/Qwen2.5-7B-Instruct' });
    } finally {
      setSiliconflowModelLoading(false);
    }
  };

  // 搜索硅基流动模型
  const searchSiliconFlowModels = async (query: string) => {
    if (!query.trim()) {
      // 如果搜索为空，获取所有模型
      await fetchSiliconFlowModels();
      return;
    }

    setSiliconflowModelLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/model/search?q=${encodeURIComponent(query)}&provider=siliconflow`);
      const data = await response.json();

      if (data.success) {
        setSiliconflowModels(data.data);
      } else {
        message.warning('搜索硅基流动模型失败');
      }
    } catch (error) {
      console.error('搜索硅基流动模型失败:', error);
      message.error('搜索硅基流动模型失败');
    } finally {
      setSiliconflowModelLoading(false);
    }
  };

  // 组件加载时获取设置和模型列表
  useEffect(() => {
    fetchSettings();
    fetchOllamaModels();
  }, []);

  // 处理模型提供商变更
  const handleModelProviderChange = (value: string) => {
    setModelProvider(value);
    
    // 当切换到硅基流动时，自动获取模型列表
    if (value === 'siliconflow' && siliconflowModels.length === 0) {
      fetchSiliconFlowModels();
    }
  };



  // 保存设置（使用store）
  const handleSave = async (values: any) => {
    try {
      // 更新模型配置到store
      updateModelConfig({
        provider: values.modelProvider,
        apiUrl: values.modelProvider === 'ollama' ? values.ollamaApiUrl : values.siliconflowApiUrl,
        apiKey: values.modelProvider === 'siliconflow' ? values.siliconflowApiKey : undefined,
        model: values.modelProvider === 'ollama' ? values.ollamaModel : values.siliconflowModel,
        temperature: values.temperature,
        maxTokens: values.maxTokens,
      });

      // 保存到后端
      await saveSettings();

      // 显示成功提示
      message.success('设置保存成功！');

      // 重新加载设置以确保数据同步
      await loadSettings();

    } catch (error) {
      console.error('保存设置失败:', error);
      const errorMessage = error instanceof Error ? error.message : '保存设置失败，请重试';
      message.error(errorMessage);
    }
  };

  return (
    <div className="settings">
      <Title level={3}>系统设置</Title>
      <Text type="secondary">
        配置系统参数和模型设置
      </Text>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          modelProvider: modelConfig.provider || 'ollama',
          ollamaApiUrl: 'http://localhost:11434/api',
          siliconflowApiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
          siliconflowApiKey: '',
          siliconflowModel: 'Qwen/Qwen2.5-7B-Instruct',
          temperature: modelConfig.temperature || 0.7,
          maxTokens: modelConfig.maxTokens || 2048,
          enableMemory: true,
          memoryImportanceThreshold: 0.5,
          enableTaskFlow: true,
          historyWindowSize: 5,
        }}
      >
        <Card title="模型提供商" style={{ marginTop: 20 }}>
          <Form.Item
            name="modelProvider"
            label="选择模型提供商"
            rules={[{ required: true, message: '请选择模型提供商' }]}
          >
            <Radio.Group onChange={(e) => handleModelProviderChange(e.target.value)}>
              <Radio.Button value="ollama">本地 Ollama</Radio.Button>
              <Radio.Button value="siliconflow">在线 硅基流动</Radio.Button>
            </Radio.Group>
            <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
              💡 系统会根据任务复杂度自动选择合适的模型：基础任务使用轻量模型，复杂任务使用高级模型
            </div>
          </Form.Item>
        </Card>

        {modelProvider === 'ollama' && (
          <Card title="Ollama设置" style={{ marginTop: 20 }}>
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
              <Text style={{ color: '#52c41a', fontWeight: 500 }}>🤖 智能模型选择</Text>
              <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                • 基础任务（问候、简单问答）：自动使用 <code>qwen3:1.7b</code> 轻量模型<br/>
                • 复杂任务（代码、分析、创作）：使用下方配置的高级模型
              </div>
            </div>

            <Form.Item
              name="ollamaApiUrl"
              label="Ollama API地址"
              rules={[{ required: true, message: '请输入API地址' }]}
            >
              <Input placeholder="http://localhost:11434/api" />
            </Form.Item>

            <Form.Item
              name="ollamaAdvancedModel"
              label="高级模型（复杂任务使用）"
              rules={[{ required: true, message: '请选择高级模型' }]}
              extra="用于代码生成、深度分析等复杂任务"
            >
              <Select
                placeholder="选择高级模型"
                loading={modelLoading}
                notFoundContent={modelLoading ? <div style={{ textAlign: 'center', padding: '8px' }}><SyncOutlined spin /> 加载中...</div> : "没有可用模型"}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Button
                      type="link"
                      icon={<SyncOutlined />}
                      onClick={fetchOllamaModels}
                      loading={modelLoading}
                      style={{ width: '100%', textAlign: 'center' }}
                    >
                      刷新模型列表
                    </Button>
                  </>
                )}
              >
                {ollamaModels.length > 0 ? (
                  ollamaModels.map(model => (
                    <Option key={model.name} value={model.name}>{model.name}</Option>
                  ))
                ) : (
                  <Option value="qwen3:7b">qwen3:7b (默认)</Option>
                )}
              </Select>
            </Form.Item>


          </Card>
        )}



        {modelProvider === 'siliconflow' && (
          <Card title="硅基流动设置" style={{ marginTop: 20 }}>
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
              <Text style={{ color: '#52c41a', fontWeight: 500 }}>🤖 智能模型选择 + 💰 成本优化</Text>
              <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                • 基础任务（问候、简单问答）：自动使用 <code>Qwen/Qwen2.5-7B-Instruct</code> 免费模型<br/>
                • 复杂任务（代码、分析、创作）：使用下方配置的高级模型
              </div>
            </div>

            <Form.Item
              name="siliconflowApiUrl"
              label="硅基流动 API地址"
              rules={[{ required: true, message: '请输入API地址' }]}
            >
              <Input placeholder="https://api.siliconflow.cn/v1/chat/completions" />
            </Form.Item>

            <Form.Item
              name="siliconflowApiKey"
              label="API密钥"
              rules={[{ required: true, message: '请输入API密钥' }]}
              tooltip="硅基流动的API密钥，可在硅基流动官网获取"
            >
              <Input.Password placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
            </Form.Item>

            <Form.Item
              name="siliconflowAdvancedModel"
              label="高级模型（复杂任务使用）"
              rules={[{ required: true, message: '请选择高级模型' }]}
              tooltip="用于代码生成、深度分析等复杂任务，建议选择32B或更大的模型"
            >
              <Select
                placeholder="选择或搜索高级模型"
                loading={siliconflowModelLoading}
                showSearch
                filterOption={false}
                onSearch={searchSiliconFlowModels}
                optionLabelProp="value"
                style={{ width: '100%' }}
                dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                notFoundContent={siliconflowModelLoading ? <div style={{ textAlign: 'center', padding: '8px' }}><SyncOutlined spin /> 搜索中...</div> : "没有找到匹配的模型"}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Button
                      type="link"
                      icon={<SyncOutlined />}
                      onClick={fetchSiliconFlowModels}
                      loading={siliconflowModelLoading}
                      style={{ width: '100%', textAlign: 'center' }}
                    >
                      刷新模型列表
                    </Button>
                  </>
                )}
              >
                {(() => {
                  // 获取当前配置的模型
                  const currentModel = modelConfig.provider === 'siliconflow' ? modelConfig.model : '';

                  // 默认模型列表
                  const defaultModels = [
                    'Qwen/Qwen2.5-7B-Instruct',
                    'Qwen/Qwen2.5-32B-Instruct',
                    'Qwen/Qwen3-235B-A22B',
                    'deepseek-ai/DeepSeek-V3',
                    'meta-llama/Llama-3.1-70B-Instruct',
                    'anthropic/claude-3-5-sonnet-20241022'
                  ];

                  // 合并API返回的模型和默认模型
                  const allModels = [...siliconflowModels];

                  // 添加当前配置的模型（如果不在列表中）
                  if (currentModel && !allModels.find(m => m.name === currentModel)) {
                    allModels.unshift({ name: currentModel, description: '当前配置' });
                  }

                  // 添加默认模型（如果不在列表中）
                  defaultModels.forEach(modelName => {
                    if (!allModels.find(m => m.name === modelName)) {
                      allModels.push({ name: modelName, description: '常用模型' });
                    }
                  });

                  return allModels.map(model => (
                    <Option key={model.name} value={model.name}>
                      <div style={{ padding: '4px 0', lineHeight: '1.4' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{model.name}</div>
                        <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {model.name.includes('/') && <span>{model.name.split('/')[0]} 系列</span>}
                          {model.name === currentModel && <span style={{ color: '#52c41a', fontSize: '11px', backgroundColor: '#f6ffed', padding: '1px 4px', borderRadius: '2px' }}>当前</span>}
                          {model.name.includes('32B') && <span style={{ color: '#52c41a', fontSize: '11px', backgroundColor: '#f6ffed', padding: '1px 4px', borderRadius: '2px' }}>推荐</span>}
                          {model.name.includes('7B') && model.name.includes('Instruct') && <span style={{ color: '#1890ff', fontSize: '11px', backgroundColor: '#e6f7ff', padding: '1px 4px', borderRadius: '2px' }}>免费</span>}
                          {model.description && <span style={{ color: '#999', fontSize: '11px' }}>({model.description})</span>}
                        </div>
                      </div>
                    </Option>
                  ));
                })()}
              </Select>
            </Form.Item>


          </Card>
        )}

        <Card title="模型参数" style={{ marginTop: 20 }}>
          <Form.Item
            name="temperature"
            label="温度 (Temperature)"
            rules={[{ required: true, message: '请输入温度值' }]}
          >
            <Select>
              <Option value={0.1}>0.1 (更确定性)</Option>
              <Option value={0.3}>0.3</Option>
              <Option value={0.5}>0.5</Option>
              <Option value={0.7}>0.7 (平衡)</Option>
              <Option value={0.9}>0.9</Option>
              <Option value={1.0}>1.0 (更创造性)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="maxTokens"
            label="最大Token数"
            rules={[{ required: true, message: '请输入最大Token数' }]}
          >
            <Select>
              <Option value={512}>512</Option>
              <Option value={1024}>1024</Option>
              <Option value={2048}>2048</Option>
              <Option value={4096}>4096</Option>
              <Option value={8192}>8192</Option>
            </Select>
          </Form.Item>
        </Card>

        <Card title="记忆设置" style={{ marginTop: 20 }}>
          <Form.Item
            name="enableMemory"
            label="启用长期记忆"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="memoryImportanceThreshold"
            label="记忆重要性阈值"
            rules={[{ required: true, message: '请选择记忆重要性阈值' }]}
          >
            <Select>
              <Option value={0.3}>0.3 (记住更多)</Option>
              <Option value={0.5}>0.5 (平衡)</Option>
              <Option value={0.7}>0.7 (只记住重要的)</Option>
              <Option value={0.9}>0.9 (只记住非常重要的)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="historyWindowSize"
            label="对话历史窗口大小"
            rules={[{ required: true, message: '请选择对话历史窗口大小' }]}
            tooltip="在每次对话中，大模型能够看到的历史消息数量"
          >
            <Select>
              <Option value={3}>3 条消息</Option>
              <Option value={5}>5 条消息</Option>
              <Option value={8}>8 条消息</Option>
              <Option value={10}>10 条消息</Option>
              <Option value={15}>15 条消息</Option>
              <Option value={20}>20 条消息</Option>
            </Select>
          </Form.Item>
        </Card>

        <Card title="任务流模式" style={{ marginTop: 20 }}>
          <Form.Item
            name="enableTaskFlow"
            label="启用任务流模式"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
            任务流模式允许AI将复杂任务分解为多个步骤，连续执行并调用工具，提供更强的问题解决能力。
          </Typography.Paragraph>
        </Card>

        <Card title="安全操作" style={{ marginTop: 20 }}>
          <Typography.Paragraph>
            系统支持二次确认机制，保护高风险操作的安全性。以下是操作确认示例：
          </Typography.Paragraph>
          <OperationExample />
        </Card>

        <Divider />

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={isLoading}
            style={{ marginRight: 8 }}
          >
            保存设置
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => form.resetFields()}
          >
            重置
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Settings;
