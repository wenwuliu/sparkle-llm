import React, { useState } from 'react';
import { Button, Card, Input, Space, Typography, message, Select, List } from 'antd';
import { useOperationConfirm } from '../contexts/OperationConfirmContext';
import { socketService } from '../services/socketService';

const { Title, Text } = Typography;
const { Option } = Select;

const OperationExample: React.FC = () => {
  const { confirmOperation } = useOperationConfirm();
  const [filePath, setFilePath] = useState<string>('');
  const [operationType, setOperationType] = useState<string>('readFile');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  // 执行操作
  const handleOperation = async () => {
    if (!filePath) {
      message.error('请输入文件路径');
      return;
    }

    try {
      setLoading(true);

      // 创建操作
      const operation = await socketService.createOperation(
        operationType,
        `${getOperationTypeText(operationType)}文件: ${filePath}`,
        [`路径: ${filePath}`],
        operationType,
        [filePath],
        'user1'
      );

      // 请求用户确认
      const confirmed = await confirmOperation(operation);

      if (confirmed) {
        // 用户确认，执行操作
        const operationResult = await socketService.executeOperation(operation, true);
        setResult(operationResult);
        message.success('操作执行成功');
      } else {
        // 用户取消
        await socketService.cancelOperation(operation);
        message.info('操作已取消');
      }
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取操作类型文本
  const getOperationTypeText = (type: string): string => {
    switch (type) {
      case 'readFile':
        return '读取';
      case 'deleteFile':
        return '删除';
      case 'createFile':
        return '创建';
      case 'modifyFile':
        return '修改';
      default:
        return '操作';
    }
  };

  return (
    <Card title="操作确认示例" style={{ marginBottom: 20 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Title level={5}>文件操作</Title>
        <Text>此示例展示了如何使用操作确认机制执行文件操作。</Text>

        <Space style={{ marginTop: 16 }}>
          <Select
            value={operationType}
            onChange={setOperationType}
            style={{ width: 120 }}
          >
            <Option value="readFile">读取文件</Option>
            <Option value="deleteFile">删除文件</Option>
            <Option value="createFile">创建文件</Option>
            <Option value="modifyFile">修改文件</Option>
          </Select>

          <Input
            placeholder="输入文件路径"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            style={{ width: 300 }}
          />

          <Button
            type="primary"
            onClick={handleOperation}
            loading={loading}
          >
            执行操作
          </Button>
        </Space>

        {result && (
          <Card
            title="操作结果"
            size="small"
            style={{ marginTop: 16 }}
          >
            {typeof result === 'string' ? (
              <pre style={{ maxHeight: 300, overflow: 'auto' }}>{result}</pre>
            ) : (
              <List
                size="small"
                bordered
                dataSource={Object.entries(result)}
                renderItem={([key, value]: [string, any]) => (
                  <List.Item>
                    <Text strong>{key}:</Text> {JSON.stringify(value)}
                  </List.Item>
                )}
              />
            )}
          </Card>
        )}
      </Space>
    </Card>
  );
};

export default OperationExample;
