import fs from 'fs';
import path from 'path';
import environment from '../config/environment';

// 确保日志目录存在
const logDir = path.dirname(environment.logging.file);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志级别
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// 将配置的日志级别字符串转换为枚举值
const getLogLevelValue = (level: string): LogLevel => {
  switch (level.toLowerCase()) {
    case 'error': return LogLevel.ERROR;
    case 'warn': return LogLevel.WARN;
    case 'info': return LogLevel.INFO;
    case 'debug': return LogLevel.DEBUG;
    default: return LogLevel.INFO;
  }
};

// 当前配置的日志级别
const currentLogLevel = getLogLevelValue(environment.logging.level);

// 格式化日期时间
const formatDate = (): string => {
  const now = new Date();
  return now.toISOString();
};

// 写入日志到文件
const writeToFile = (message: string): void => {
  try {
    if (environment.logging.file) {
      fs.appendFileSync(environment.logging.file, message + '\n');
    }
  } catch (error) {
    console.error(`无法写入日志文件: ${error}`);
  }
};

// 创建日志消息
const createLogMessage = (level: string, message: string, meta?: any): string => {
  const timestamp = formatDate();
  let logMessage = `[${timestamp}] [${level}] ${message}`;

  if (meta) {
    try {
      logMessage += ` ${JSON.stringify(meta)}`;
    } catch (e) {
      logMessage += ` [无法序列化的元数据]`;
    }
  }

  return logMessage;
};

// 日志函数
const logger = {
  error: (message: string, meta?: any): void => {
    if (currentLogLevel >= LogLevel.ERROR) {
      const logMessage = createLogMessage('ERROR', message, meta);
      console.error(logMessage);
      writeToFile(logMessage);
    }
  },

  warn: (message: string, meta?: any): void => {
    if (currentLogLevel >= LogLevel.WARN) {
      const logMessage = createLogMessage('WARN', message, meta);
      console.warn(logMessage);
      writeToFile(logMessage);
    }
  },

  info: (message: string, meta?: any): void => {
    if (currentLogLevel >= LogLevel.INFO) {
      const logMessage = createLogMessage('INFO', message, meta);
      console.info(logMessage);
      writeToFile(logMessage);
    }
  },

  debug: (message: string, meta?: any): void => {
    if (currentLogLevel >= LogLevel.DEBUG) {
      const logMessage = createLogMessage('DEBUG', message, meta);
      console.debug(logMessage);
      writeToFile(logMessage);
    }
  },
};

export default logger;
