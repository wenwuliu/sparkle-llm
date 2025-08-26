/**
 * Agent测试文件
 * 用于测试新的ReAct Agent系统
 */

import { ReActAgent } from './react-agent';
import { agentService } from './agent.service';
import { DEFAULT_AGENT_CONFIG } from './types/agent.types';

/**
 * 测试Agent基本功能
 */
export async function testAgent() {
  console.log('开始测试ReAct Agent系统...');

  try {
    // 1. 测试Agent创建
    console.log('1. 测试Agent创建...');
    const agent = new ReActAgent({
      maxSteps: 5,
      enableReflection: true,
      confidenceThreshold: 0.6
    });

    console.log('Agent创建成功，配置:', agent.getConfig());

    // 2. 测试简单任务执行
    console.log('2. 测试简单任务执行...');
    const result = await agent.executeTask(
      '分析当前系统状态',
      '生成系统状态报告',
      {
        constraints: ['只使用安全的工具'],
        availableTools: [],
        memory: [],
        conversationHistory: [],
        userPreferences: {},
        environment: { test: true }
      },
      {
        onProgress: (event) => {
          console.log('进度事件:', event.message);
        },
        onError: (error) => {
          console.error('错误事件:', error.message);
        }
      }
    );

    console.log('任务执行结果:', {
      success: result.success,
      executionTime: result.executionTime,
      errorCount: result.errorCount,
      confidence: result.confidence
    });

    // 3. 测试Agent服务
    console.log('3. 测试Agent服务...');
    const sessionId = await agentService.startAgentTask(
      '测试任务',
      '验证Agent服务功能',
      'test-conversation-id',
      {
        onProgress: (event) => {
          console.log('服务进度事件:', event.message);
        },
        onComplete: (result) => {
          console.log('服务完成事件:', result.summary);
        }
      }
    );

    console.log('Agent服务会话ID:', sessionId);

    // 4. 测试会话管理
    console.log('4. 测试会话管理...');
    const session = agentService.getSession(sessionId);
    console.log('会话信息:', session ? '存在' : '不存在');

    const stats = agentService.getSessionStats();
    console.log('会话统计:', stats);

    // 5. 清理测试数据
    console.log('5. 清理测试数据...');
    agentService.deleteSession(sessionId);

    console.log('ReAct Agent系统测试完成！');

  } catch (error) {
    console.error('Agent测试失败:', error);
  }
}

/**
 * 运行测试
 */
if (require.main === module) {
  testAgent().then(() => {
    console.log('测试完成');
    process.exit(0);
  }).catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
}
