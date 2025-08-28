const io = require('socket.io-client');

// 连接到后端
const socket = io('http://localhost:3001', {
  timeout: 10000,
  forceNew: true
});

console.log('🔌 开始连接测试...');

socket.on('connect', () => {
  console.log('✅ 连接到后端成功');
  console.log('📡 Socket ID:', socket.id);
  
  // 发送Agent启动请求
  const agentRequest = {
    message: '帮我查询今天的天气',
    useTools: true,
    enableReflection: true,
    maxSteps: 5,
    confidenceThreshold: 0.7
  };
  
  console.log('📤 发送Agent启动请求:', JSON.stringify(agentRequest, null, 2));
  socket.emit('agent:start', agentRequest);
});

socket.on('agent:start', (event) => {
  console.log('📥 收到Agent开始事件:', JSON.stringify(event, null, 2));
});

socket.on('agent:progress', (event) => {
  console.log('📊 收到Agent进度更新:', JSON.stringify(event, null, 2));
});

socket.on('agent:error', (event) => {
  console.log('❌ 收到Agent错误:', JSON.stringify(event, null, 2));
});

socket.on('agent:complete', (event) => {
  console.log('✅ 收到Agent完成事件:', JSON.stringify(event, null, 2));
  console.log('🎉 Agent任务执行完成！');
  socket.disconnect();
});

socket.on('error', (error) => {
  console.log('❌ Socket错误:', error);
});

socket.on('connect_error', (error) => {
  console.log('❌ 连接错误:', error);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 连接断开，原因:', reason);
});

// 监听所有事件
socket.onAny((eventName, ...args) => {
  console.log(`🔍 收到事件 [${eventName}]:`, args);
});

// 10秒后超时
setTimeout(() => {
  console.log('⏰ 测试超时');
  socket.disconnect();
  process.exit(0);
}, 10000);

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n🛑 收到中断信号，正在断开连接...');
  socket.disconnect();
  process.exit(0);
});
