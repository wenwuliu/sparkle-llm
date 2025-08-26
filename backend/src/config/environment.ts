import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 确定当前环境
const environment = process.env.NODE_ENV || 'development';

// 尝试加载特定环境的配置文件
const envFile = `.env.${environment}`;
const envPath = path.resolve(process.cwd(), envFile);

// 如果特定环境的配置文件存在，则加载它
if (fs.existsSync(envPath)) {
  console.log(`加载环境配置: ${envFile}`);
  dotenv.config({ path: envPath });
} else {
  // 否则加载默认的.env文件
  console.log('加载默认环境配置: .env');
  dotenv.config();
}

// 创建日志目录
const logFile = process.env.LOG_FILE || './logs/app.log';
const logDir = path.dirname(logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 导出环境配置
export default {
  // 环境信息
  env: environment,
  isProduction: environment === 'production',
  isDevelopment: environment === 'development',
  isTest: environment === 'test',

  // 服务器配置
  port: parseInt(process.env.PORT || (environment === 'production' ? '3001' : '8080'), 10),
  host: process.env.HOST || 'localhost',

  // 数据库配置
  database: {
    path: process.env.DATABASE_PATH || './data/database.sqlite',
  },

  // 模型配置
  models: {
    defaultModel: process.env.DEFAULT_MODEL || 'ollama',
    ollamaEndpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
    claudeApiKey: process.env.CLAUDE_API_KEY || '',
    qwenApiKey: process.env.QWEN_API_KEY || '',
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
    siliconflowApiKey: process.env.SILICONFLOW_API_KEY || '',
  },

  // 向量数据库配置
  vectorDb: {
    enabled: process.env.VECTOR_DB_ENABLED === 'true',
    path: process.env.VECTOR_DB_PATH || './data/vector_db',
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: logFile,
  },
};
