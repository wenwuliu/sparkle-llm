import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { DEFAULT_MODEL_CONFIG } from './model.config';

dotenv.config();

// 获取数据库路径
const dbPath = process.env.DATABASE_PATH || process.env.DB_PATH || './data/sparkle.db';

console.log(`[Database]: 数据库路径: ${dbPath}`);
console.log(`[Database]: 当前工作目录: ${process.cwd()}`);

// 确保数据库目录存在
const dbDir = path.dirname(dbPath);
console.log(`[Database]: 数据库目录: ${dbDir}`);

if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`[Database]: 成功创建数据库目录: ${dbDir}`);
  } catch (error) {
    console.error(`[Database Error]: 创建数据库目录失败: ${dbDir}`, error);
    throw error;
  }
} else {
  console.log(`[Database]: 数据库目录已存在: ${dbDir}`);
}

// 创建数据库连接
let db: Database.Database;
try {
  db = new Database(dbPath);
  console.log(`[Database]: 成功连接到数据库: ${dbPath}`);
} catch (error) {
  console.error(`[Database Error]: 连接数据库失败: ${dbPath}`, error);
  throw error;
}

// 启用外键约束
try {
  db.pragma('foreign_keys = ON');
  console.log(`[Database]: 外键约束已启用`);
} catch (error) {
  console.error(`[Database Error]: 启用外键约束失败`, error);
  throw error;
}

// 初始化数据库表
function initDatabase() {
  console.log(`[Database]: 开始初始化数据库表...`);
  
  try {
    // 创建记忆表
    console.log(`[Database]: 创建记忆表...`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        keywords TEXT NOT NULL,
        context TEXT NOT NULL,
        content TEXT NOT NULL,
        importance REAL DEFAULT 1.0,
        last_accessed INTEGER,
        created_at INTEGER NOT NULL
      );
    `);
    console.log(`[Database]: 记忆表创建成功`);

    // 创建关联记忆表
    console.log(`[Database]: 创建关联记忆表...`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_id INTEGER NOT NULL,
        related_memory_id INTEGER NOT NULL,
        relation_strength REAL DEFAULT 1.0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
        FOREIGN KEY (related_memory_id) REFERENCES memories(id) ON DELETE CASCADE
      );
    `);
    console.log(`[Database]: 关联记忆表创建成功`);

    // 创建记忆复习表
    console.log(`[Database]: 创建记忆复习表...`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_id INTEGER NOT NULL,
        review_time INTEGER NOT NULL,
        FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
      );
    `);
    console.log(`[Database]: 记忆复习表创建成功`);

    // 创建对话会话表
    console.log(`[Database]: 创建对话会话表...`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT 1
      );
    `);
    console.log(`[Database]: 对话会话表创建成功`);

    // 创建对话消息表
    console.log(`[Database]: 创建对话消息表...`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        sender TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        tool_calls TEXT,
        tool_results TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
    `);
    console.log(`[Database]: 对话消息表创建成功`);

    // 创建设置表
    console.log(`[Database]: 创建设置表...`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    console.log(`[Database]: 设置表创建成功`);

    // 创建快照表
    console.log(`[Database]: 创建快照表...`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        operation_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `);
    console.log(`[Database]: 快照表创建成功`);

    // 创建审计日志表
    console.log(`[Database]: 创建审计日志表...`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        operation_id TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        success INTEGER NOT NULL,
        error TEXT,
        snapshot_id TEXT,
        timestamp INTEGER NOT NULL,
        details TEXT NOT NULL
      );
    `);
    console.log(`[Database]: 审计日志表创建成功`);

    // 创建用户决策表
    console.log(`[Database]: 创建用户决策表...`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        decision TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
    `);
    console.log(`[Database]: 用户决策表创建成功`);

    // 创建系统配置表（用于存储计数器等系统状态）
    console.log(`[Database]: 创建系统配置表...`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    console.log(`[Database]: 系统配置表创建成功`);

    // 初始化默认设置
    console.log(`[Database]: 开始初始化默认设置...`);
    const timestamp = Date.now();
    const defaultSettings = [
      { key: 'model_provider', value: DEFAULT_MODEL_CONFIG.DEFAULT_PROVIDER, updated_at: timestamp },
      { key: 'ollama_api_url', value: process.env.OLLAMA_API_URL || DEFAULT_MODEL_CONFIG.OLLAMA.API_URL, updated_at: timestamp },
      { key: 'ollama_model', value: DEFAULT_MODEL_CONFIG.OLLAMA.MODEL, updated_at: timestamp },
      { key: 'ollama_advanced_model', value: DEFAULT_MODEL_CONFIG.OLLAMA.ADVANCED_MODEL, updated_at: timestamp },
      // 保留通义和DeepSeek的数据库字段以保持兼容性，但使用默认值
      { key: 'qwen_api_url', value: process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', updated_at: timestamp },
      { key: 'qwen_api_key', value: process.env.QWEN_API_KEY || '', updated_at: timestamp },
      { key: 'qwen_model', value: 'qwen-max', updated_at: timestamp },
      { key: 'deepseek_api_url', value: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions', updated_at: timestamp },
      { key: 'deepseek_api_key', value: process.env.DEEPSEEK_API_KEY || '', updated_at: timestamp },
      { key: 'deepseek_model', value: 'deepseek-chat', updated_at: timestamp },
      { key: 'siliconflow_api_url', value: process.env.SILICONFLOW_API_URL || DEFAULT_MODEL_CONFIG.SILICONFLOW.API_URL, updated_at: timestamp },
      { key: 'siliconflow_api_key', value: process.env.SILICONFLOW_API_KEY || '', updated_at: timestamp },
      { key: 'siliconflow_model', value: DEFAULT_MODEL_CONFIG.SILICONFLOW.MODEL, updated_at: timestamp },
      { key: 'siliconflow_advanced_model', value: DEFAULT_MODEL_CONFIG.SILICONFLOW.ADVANCED_MODEL, updated_at: timestamp },
      { key: 'temperature', value: DEFAULT_MODEL_CONFIG.PARAMETERS.TEMPERATURE.toString(), updated_at: timestamp },
      { key: 'max_tokens', value: DEFAULT_MODEL_CONFIG.PARAMETERS.MAX_TOKENS.toString(), updated_at: timestamp },
      { key: 'enable_memory', value: 'true', updated_at: timestamp },
      { key: 'memory_importance_threshold', value: '0.5', updated_at: timestamp },
      { key: 'enable_task_flow', value: 'true', updated_at: timestamp }
    ];

    // 使用事务批量插入默认设置
    const insertSetting = db.prepare(`
      INSERT OR IGNORE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);

    // 检查设置表是否为空（首次初始化）
    const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
    const isFirstInit = settingsCount.count === 0;
    console.log(`[Database]: 是否首次初始化: ${isFirstInit}`);

    // 初始化默认系统配置
    const defaultSystemConfig = [
      { key: 'memory_counter', value: '0', updated_at: timestamp },
      { key: 'last_memory_organization', value: '0', updated_at: timestamp }
    ];

    const insertSystemConfig = db.prepare(`
      INSERT OR IGNORE INTO system_config (key, value, updated_at)
      VALUES (?, ?, ?)
    `);

    console.log(`[Database]: 开始执行数据库事务...`);
    db.transaction(() => {
      // 插入默认设置
      for (const setting of defaultSettings) {
        // 只在首次初始化时插入默认设置
        insertSetting.run(setting.key, setting.value, setting.updated_at);

        // 只在首次初始化时，如果环境变量中有设置，则使用环境变量的值
        if (isFirstInit) {
          if (setting.key === 'ollama_api_url' && process.env.OLLAMA_API_URL) {
            db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?')
              .run(process.env.OLLAMA_API_URL, timestamp, setting.key);
          } else if (setting.key === 'qwen_api_url' && process.env.QWEN_API_URL) {
            db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?')
              .run(process.env.QWEN_API_URL, timestamp, setting.key);
          } else if (setting.key === 'qwen_api_key' && process.env.QWEN_API_KEY) {
            db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?')
              .run(process.env.QWEN_API_KEY, timestamp, setting.key);
          } else if (setting.key === 'deepseek_api_url' && process.env.DEEPSEEK_API_URL) {
            db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?')
              .run(process.env.DEEPSEEK_API_URL, timestamp, setting.key);
          } else if (setting.key === 'deepseek_api_key' && process.env.DEEPSEEK_API_KEY) {
            db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?')
              .run(process.env.DEEPSEEK_API_KEY, timestamp, setting.key);
          } else if (setting.key === 'siliconflow_api_url' && process.env.SILICONFLOW_API_URL) {
            db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?')
              .run(process.env.SILICONFLOW_API_URL, timestamp, setting.key);
          } else if (setting.key === 'siliconflow_api_key' && process.env.SILICONFLOW_API_KEY) {
            db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?')
              .run(process.env.SILICONFLOW_API_KEY, timestamp, setting.key);
          } else if (setting.key === 'model_provider' && process.env.MODEL_PROVIDER) {
            db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?')
              .run(process.env.MODEL_PROVIDER, timestamp, setting.key);
          }
        }
      }

      // 插入默认系统配置
      for (const config of defaultSystemConfig) {
        insertSystemConfig.run(config.key, config.value, config.updated_at);
      }
    })();
    console.log(`[Database]: 数据库事务执行成功`);

    console.log(`[Database]: 数据库初始化完成`);
  } catch (error) {
    console.error(`[Database Error]: 数据库初始化失败`, error);
    throw error;
  }
}

export { db, initDatabase };
