import { useEffect } from 'react';
import { Layout, Menu, Typography, notification, App as AntdApp } from 'antd';
import { MessageOutlined, SettingOutlined, BulbOutlined } from '@ant-design/icons';
import ChatBox from './components/ChatBox';
import MemoryManager from './components/MemoryManager';
import Settings from './components/Settings';
import { OperationConfirmProvider } from './contexts/OperationConfirmContext';
import { SudoPermissionProvider } from './contexts/SudoPermissionContext';
import { useAppStore, useSettingsStore } from './store';
import './App.css';

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
    chatSettings: { agentMode, useTools },
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

  // 处理Agent模式切换
  const handleAgentModeChange = (enabled: boolean) => {
    updateChatSettings({ agentMode: enabled });
    if (enabled) {
      showNotification({
        type: 'info',
        message: 'Agent模式已开启',
        description: 'AI将使用任务流模式处理复杂任务'
      });
    }
  };

  // 处理工具使用切换
  const handleUseToolsChange = (enabled: boolean) => {
    updateChatSettings({ useTools: enabled });
    if (enabled) {
      showNotification({
        type: 'info',
        message: '工具使用已开启',
        description: 'AI可以使用工具来完成复杂任务'
      });
    }
  };

  const renderContent = () => {
    switch (activeMenu) {
      case '1':
        return (
          <ChatBox
            agentMode={agentMode}
            useTools={useTools}
            onAgentModeChange={handleAgentModeChange}
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
