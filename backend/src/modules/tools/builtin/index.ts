/**
 * 内置工具索引
 */
import { db } from '../../../config/database';
import { registerShellTools } from './shell.tool';
import { registerGaodeMapsTools } from './gaode-maps.tool';
import { registerAgentTools } from './agent.tool';
import { toolManager } from '../tool.manager';
import { ToolCategory } from '../tools.types';

/**
 * 初始化内置工具
 */
export async function initializeBuiltinTools(): Promise<void> {
  console.log('初始化内置工具...');

  // 注册Shell工具（用于执行系统命令和文件操作）
  registerShellTools();

  // 注册记忆工具
  registerMemoryTools();

  // 注册高德地图工具
  registerGaodeMapsTools();

  // 注册Agent工具
  registerAgentTools();

  console.log('内置工具初始化完成');
}

/**
 * 注册记忆工具
 */
function registerMemoryTools(): void {
  // 记忆查询工具
  toolManager.registerTool({
    name: 'query_memories',
    description: '查询记忆库中的记忆',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '查询关键词',
        },
        limit: {
          type: 'integer',
          description: '返回结果数量限制',
          default: 5,
        },
      },
      required: ['query'],
    },
    handler: async (input: { query: string; limit?: number }) => {
      const { query, limit = 5 } = input;

      try {
        const memories = db.prepare(`
          SELECT * FROM memories
          WHERE keywords LIKE ? OR content LIKE ?
          ORDER BY timestamp DESC
          LIMIT ?
        `).all(`%${query}%`, `%${query}%`, limit);

        return { memories };
      } catch (error) {
        console.error('查询记忆错误:', error);
        throw new Error('查询记忆失败');
      }
    },
    requires_auth: false,
    category: ToolCategory.MEMORY,
  });

  // 获取记忆详情工具
  toolManager.registerTool({
    name: 'get_memory_details',
    description: '获取指定记忆的详细信息，包括关联记忆',
    input_schema: {
      type: 'object',
      properties: {
        memory_id: {
          type: 'integer',
          description: '记忆ID',
        },
      },
      required: ['memory_id'],
    },
    handler: async (input: { memory_id: number }) => {
      const { memory_id } = input;

      try {
        // 获取记忆
        const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(memory_id);

        if (!memory) {
          throw new Error('记忆不存在');
        }

        // 获取关联记忆
        const relatedMemories = db.prepare(`
          SELECT m.* FROM memories m
          JOIN memory_relations mr ON m.id = mr.related_memory_id
          WHERE mr.memory_id = ?
        `).all(memory_id);

        // 更新最后访问时间
        db.prepare('UPDATE memories SET last_accessed = ? WHERE id = ?').run(Date.now(), memory_id);

        return { memory, relatedMemories };
      } catch (error) {
        console.error('获取记忆详情错误:', error);
        throw new Error('获取记忆详情失败');
      }
    },
    requires_auth: false,
    category: ToolCategory.MEMORY,
  });

  // 创建记忆工具
  toolManager.registerTool({
    name: 'create_memory',
    description: '创建新的记忆',
    input_schema: {
      type: 'object',
      properties: {
        keywords: {
          type: 'string',
          description: '记忆关键词，用逗号分隔',
        },
        content: {
          type: 'string',
          description: '记忆内容',
        },
        context: {
          type: 'string',
          description: '记忆上下文',
        },
        importance: {
          type: 'number',
          description: '记忆重要性，0.1到1.0之间',
          default: 0.5,
        },
        related_memory_ids: {
          type: 'array',
          items: {
            type: 'integer',
          },
          description: '关联记忆ID列表',
          default: [],
        },
      },
      required: ['keywords', 'content', 'context'],
    },
    handler: async (input: {
      keywords: string;
      content: string;
      context: string;
      importance?: number;
      related_memory_ids?: number[];
    }) => {
      const {
        keywords,
        content,
        context,
        importance = 0.5,
        related_memory_ids = []
      } = input;

      try {
        const timestamp = Date.now();

        // 插入记忆
        const result = db.prepare(`
          INSERT INTO memories (timestamp, keywords, context, content, importance, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(timestamp, keywords, context, content, importance, timestamp);

        const memoryId = result.lastInsertRowid;

        // 插入关联记忆
        if (related_memory_ids.length > 0) {
          const insertRelation = db.prepare(`
            INSERT INTO memory_relations (memory_id, related_memory_id, created_at)
            VALUES (?, ?, ?)
          `);

          for (const relatedId of related_memory_ids) {
            insertRelation.run(memoryId, relatedId, timestamp);
          }
        }

        return {
          success: true,
          memory_id: memoryId,
          timestamp,
        };
      } catch (error) {
        console.error('创建记忆错误:', error);
        throw new Error('创建记忆失败');
      }
    },
    requires_auth: false,
    category: ToolCategory.MEMORY,
  });
}


