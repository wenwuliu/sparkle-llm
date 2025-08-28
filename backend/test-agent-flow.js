const io = require('socket.io-client');

// 连接到后端
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('✅ 连接到后端成功');
  
  // 发送Agent启动请求
  const agentRequest = {
    message: '帮我查询今天的天气',
    useTools: true,
    enableReflection: true,
    maxSteps: 5,
    confidenceThreshold: 0.7
  };
  
  console.log('📤 发送Agent启动请求:', agentRequest);
  socket.emit('agent:start', agentRequest);
});

socket.on('agent:start', (event) => {
  console.log('📥 收到Agent开始事件:', event);
});

socket.on('agent:progress', (event) => {
  console.log('📊 收到Agent进度更新:', event);
});

socket.on('agent:error', (event) => {
  console.log('❌ 收到Agent错误:', event);
});

socket.on('agent:complete', (event) => {
  console.log('✅ 收到Agent完成事件:', event);
  socket.disconnect();
});

socket.on('error', (error) => {
  console.log('❌ Socket错误:', error);
});

socket.on('disconnect', () => {
  console.log('🔌 连接断开');
});

// 5秒后超时
setTimeout(() => {
  console.log('⏰ 测试超时');
  socket.disconnect();
  process.exit(0);
}, 5000);
