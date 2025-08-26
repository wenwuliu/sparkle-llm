import React, { useState, useEffect } from 'react';
import { Card, Progress, Button, Statistic, Row, Col, message, Tooltip, Tag } from 'antd';
import {
  BulbOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

interface MemoryOrganizationStatusData {
  currentCounter: number;
  threshold: number;
  lastOrganizationTime: number;
  nextOrganizationIn: number;
  timeBasedThreshold: number;
  memoriesUntilOrganization: number;
  progressPercentage: number;
  daysUntilTimeBasedOrganization: number;
  daysSinceLastOrganization: number;
  lastOrganizationDate: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * 记忆整理状态组件
 * 显示记忆整理的当前状态和控制选项
 */
const MemoryOrganizationStatus: React.FC = () => {
  const [status, setStatus] = useState<MemoryOrganizationStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [resetting, setResetting] = useState(false);

  // 获取记忆整理状态
  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/memory-organization/status`);
      const data = await response.json();

      if (data.success) {
        setStatus(data.data);
      } else {
        message.error('获取记忆整理状态失败');
      }
    } catch (error) {
      console.error('获取记忆整理状态失败:', error);
      message.error('获取记忆整理状态失败');
    } finally {
      setLoading(false);
    }
  };

  // 手动触发记忆整理
  const triggerOrganization = async () => {
    setTriggering(true);
    try {
      const response = await fetch(`${API_URL}/api/memory-organization/trigger`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        message.success('记忆整理已完成');
        fetchStatus(); // 刷新状态
      } else {
        message.error(data.message || '记忆整理失败');
      }
    } catch (error) {
      console.error('触发记忆整理失败:', error);
      message.error('触发记忆整理失败');
    } finally {
      setTriggering(false);
    }
  };

  // 重置计数器
  const resetCounter = async () => {
    setResetting(true);
    try {
      const response = await fetch(`${API_URL}/api/memory-organization/reset-counter`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        message.success('记忆计数器已重置');
        fetchStatus(); // 刷新状态
      } else {
        message.error(data.message || '重置计数器失败');
      }
    } catch (error) {
      console.error('重置计数器失败:', error);
      message.error('重置计数器失败');
    } finally {
      setResetting(false);
    }
  };

  // 组件挂载时获取状态
  useEffect(() => {
    fetchStatus();
  }, []);

  if (!status) {
    return (
      <Card
        title={
          <span>
            <BulbOutlined style={{ marginRight: 8 }} />
            记忆整理状态
          </span>
        }
        loading={loading}
      >
        加载中...
      </Card>
    );
  }

  const getProgressStatus = () => {
    if (status.progressPercentage >= 100) return 'exception';
    if (status.progressPercentage >= 80) return 'active';
    return 'normal';
  };

  return (
    <Card
      title={
        <span>
          <BulbOutlined style={{ marginRight: 8 }} />
          记忆整理状态
        </span>
      }
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchStatus}
          loading={loading}
          size="small"
        >
          刷新
        </Button>
      }
    >
      <Row gutter={[16, 16]}>
        {/* 计数器进度 */}
        <Col span={24}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 'bold' }}>记忆计数进度</span>
              <Tag color={status.progressPercentage >= 100 ? 'red' : 'blue'}>
                {status.currentCounter}/{status.threshold}
              </Tag>
            </div>
            <Progress
              percent={status.progressPercentage}
              status={getProgressStatus()}
              strokeColor={status.progressPercentage >= 100 ? '#ff4d4f' : '#1890ff'}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
              还需 {status.memoriesUntilOrganization} 个记忆触发整理
            </div>
          </div>
        </Col>

        {/* 统计信息 */}
        <Col span={12}>
          <Statistic
            title="距离上次整理"
            value={status.daysSinceLastOrganization}
            suffix="天"
            prefix={<ClockCircleOutlined />}
          />
        </Col>

        <Col span={12}>
          <Statistic
            title="时间触发倒计时"
            value={status.daysUntilTimeBasedOrganization}
            suffix="天"
            prefix={<ExclamationCircleOutlined />}
            valueStyle={{
              color: status.daysUntilTimeBasedOrganization <= 1 ? '#ff4d4f' : '#1890ff'
            }}
          />
        </Col>

        {/* 上次整理时间 */}
        {status.lastOrganizationDate && (
          <Col span={24}>
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              <CheckCircleOutlined style={{ marginRight: 4, color: '#52c41a' }} />
              上次整理时间: {new Date(status.lastOrganizationDate).toLocaleString('zh-CN')}
            </div>
          </Col>
        )}

        {/* 状态提示 */}
        <Col span={24}>
          <div style={{ marginTop: 8 }}>
            {status.progressPercentage >= 100 && (
              <Tag color="red" style={{ marginBottom: 8 }}>
                <ExclamationCircleOutlined /> 已达到计数阈值，建议立即整理
              </Tag>
            )}
            {status.daysUntilTimeBasedOrganization <= 1 && (
              <Tag color="orange" style={{ marginBottom: 8 }}>
                <ClockCircleOutlined /> 即将触发基于时间的自动整理
              </Tag>
            )}
          </div>
        </Col>

        {/* 操作按钮 */}
        <Col span={24}>
          <div style={{ display: 'flex', gap: '8px', marginTop: 16 }}>
            <Tooltip title="立即执行记忆整理，分析并处理冲突记忆">
              <Button
                type="primary"
                icon={<BulbOutlined />}
                onClick={triggerOrganization}
                loading={triggering}
              >
                立即整理
              </Button>
            </Tooltip>

            <Tooltip title="重置记忆计数器到0，不会触发整理">
              <Button
                icon={<SettingOutlined />}
                onClick={resetCounter}
                loading={resetting}
              >
                重置计数器
              </Button>
            </Tooltip>
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default MemoryOrganizationStatus;
