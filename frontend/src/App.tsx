import { useEffect } from 'react';
import { Layout, Menu, Switch, Typography, notification, App as AntdApp } from 'antd';
import { MessageOutlined, SettingOutlined, BulbOutlined } from '@ant-design/icons';
import ChatBox from './components/ChatBox';
import MemoryManager from './components/MemoryManager';
import Settings from './components/Settings';
import { OperationConfirmProvider } from './contexts/OperationConfirmContext';
import { SudoPermissionProvider } from './contexts/SudoPermissionContext';
import { useAppStore, useSettingsStore } from './store';
import './App.css';
import './styles/task-flow.css';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

function App() {
  // 使用新的状态管理
  const {
    activeMenu,
    sidebarCollapsed,
    isInitialized,
    notification: appNotification,
    setActiveMenu,
    setSidebarCollapsed,
    initialize,
    showNotification,
    clearNotification
  } = useAppStore();

  const {
    chatSettings: { taskFlowMode, useTools },
    updateChatSettings
  } = useSettingsStore();

  // 初始化应用
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // 处理通知显示
  useEffect(() => {
    if (appNotification) {
      notification[appNotification.type]({
        message: appNotification.message,
        description: appNotification.description,
        placement: 'topRight',
        onClose: clearNotification
      });
    }
  }, [appNotification, clearNotification]);

  // 处理任务流模式自动切换
  const handleTaskFlowModeChange = (enabled: boolean) => {
    updateChatSettings({ taskFlowMode: enabled });
    if (enabled) {
      showNotification({
        type: 'info',
        message: '任务流模式已自动开启',
        description: 'AI检测到复杂任务，已自动切换到任务流模式以提供更好的处理体验。'
      });
    }
  };

  // 处理工具使用自动切换
  const handleUseToolsChange = (enabled: boolean) => {
    updateChatSettings({ useTools: enabled });
    if (enabled) {
      showNotification({
        type: 'info',
        message: '工具使用已自动开启',
        description: '任务需要使用工具来完成，已自动开启工具使用选项。'
      });
    }
  };

  const renderContent = () => {
    switch (activeMenu) {
      case '1':
        return (
          <ChatBox
            taskFlowMode={taskFlowMode}
            useTools={useTools}
            onTaskFlowModeChange={handleTaskFlowModeChange}
            onUseToolsChange={handleUseToolsChange}
          />
        );
      case '2':
        return <MemoryManager />;
      case '3':
        return <Settings />;
      default:
        return (
          <div className="card">
            <Title level={2}>欢迎使用 Sparkle LLM 平台</Title>
            <p>
              Sparkle是一个强大、能独立完成任务、具备记忆能力的LLM平台。
            </p>
            <p>
              您可以在左侧菜单中选择功能，开始使用平台。
            </p>
          </div>
        );
    }
  };

  return (
    <AntdApp>
      <OperationConfirmProvider>
        <SudoPermissionProvider>
            <Layout style={{ minHeight: '100vh' }}>
          <Sider
          collapsible
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          theme="light"
        >
        <div className="logo" style={{ padding: '16px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            {sidebarCollapsed ? 'S' : 'Sparkle'}
          </Title>
        </div>
        <Menu
          theme="light"
          mode="inline"
          defaultSelectedKeys={['1']}
          selectedKeys={[activeMenu]}
          onClick={({ key }) => setActiveMenu(key)}
          items={[
            {
              key: '1',
              icon: <MessageOutlined />,
              label: '对话',
            },
            {
              key: '2',
              icon: <BulbOutlined />,
              label: '记忆',
            },
            {
              key: '3',
              icon: <SettingOutlined />,
              label: '设置',
            },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 16px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>Sparkle LLM 平台</Title>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px' }}>任务流模式</span>
            <Switch
              checked={taskFlowMode}
              onChange={(checked) => updateChatSettings({ taskFlowMode: checked })}
              checkedChildren="开启"
              unCheckedChildren="关闭"
              style={{ marginRight: '16px' }}
            />
            {taskFlowMode && (
              <>
                <span style={{ marginRight: '8px' }}>使用工具</span>
                <Switch
                  checked={useTools}
                  onChange={(checked) => updateChatSettings({ useTools: checked })}
                  checkedChildren="开启"
                  unCheckedChildren="关闭"
                />
              </>
            )}
          </div>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
          {renderContent()}
        </Content>
      </Layout>
        </Layout>
          </SudoPermissionProvider>
      </OperationConfirmProvider>
    </AntdApp>
  );
}

export default App;
