/**
 * sudo权限管理服务
 * 处理sudo权限请求和响应
 */
import { create } from 'zustand';
import { socketService } from './socketService';

interface SudoRequest {
  requestId: string;
  command: string;
  riskLevel: string;
}

interface SudoPermissionState {
  currentRequest: SudoRequest | null;
  showDialog: boolean;
  setCurrentRequest: (request: SudoRequest | null) => void;
  setShowDialog: (show: boolean) => void;
}

/**
 * sudo权限状态管理
 */
export const useSudoPermissionStore = create<SudoPermissionState>((set) => ({
  currentRequest: null,
  showDialog: false,
  setCurrentRequest: (request) => set({ currentRequest: request }),
  setShowDialog: (show) => set({ showDialog: show }),
}));

/**
 * 初始化sudo权限服务
 */
export function initializeSudoPermissionService() {
  // 初始化socket服务
  socketService.init();

  // 获取socket实例
  const socket = socketService.socket;

  if (!socket) {
    console.error('Socket未初始化，无法设置sudo权限监听');
    return;
  }

  // 监听sudo权限请求
  socket.on('sudo:permission:request', (data: {
    requestId: string;
    command: string;
    riskLevel: string;
  }) => {
    console.log('收到sudo权限请求:', data);

    // 设置当前请求
    useSudoPermissionStore.setState({
      currentRequest: {
        requestId: data.requestId,
        command: data.command,
        riskLevel: data.riskLevel
      },
      showDialog: true
    });
  });

  console.log('sudo权限服务初始化完成');
}

/**
 * 确认sudo权限请求
 * @param requestId 请求ID
 * @param password sudo密码
 * @param remember 是否记住决定
 */
export function confirmSudoPermission(requestId: string, password: string, remember: boolean) {
  // 获取socket实例
  const socket = socketService.socket;

  if (!socket) {
    console.error('Socket未初始化，无法发送sudo权限响应');
    return;
  }

  // 发送sudo密码
  socket.emit('sudo:password', {
    requestId,
    password
  });

  // 发送权限响应
  socket.emit('sudo:permission:response', {
    requestId,
    granted: true,
    remember
  });

  // 重置状态
  resetState();
}

/**
 * 取消sudo权限请求
 * @param requestId 请求ID
 */
export function cancelSudoPermission(requestId: string) {
  // 获取socket实例
  const socket = socketService.socket;

  if (!socket) {
    console.error('Socket未初始化，无法发送sudo权限响应');
    return;
  }

  // 发送权限响应
  socket.emit('sudo:permission:response', {
    requestId,
    granted: false,
    remember: false
  });

  // 重置状态
  resetState();
}

/**
 * 重置状态
 */
function resetState() {
  useSudoPermissionStore.setState({
    currentRequest: null,
    showDialog: false
  });
}

/**
 * 清除所有sudo权限记忆
 */
export function clearAllSudoPermissions() {
  // 获取socket实例
  const socket = socketService.socket;

  if (!socket) {
    console.error('Socket未初始化，无法清除sudo权限记忆');
    return;
  }

  socket.emit('sudo:clear-permissions');
}
