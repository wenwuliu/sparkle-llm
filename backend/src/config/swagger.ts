import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

// Swagger定义
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sparkle LLM API',
      version: '1.0.0',
      description: 'Sparkle LLM平台API文档',
      contact: {
        name: 'Sparkle LLM Team',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: '开发服务器',
      },
    ],
    components: {
      schemas: {
        Memory: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '记忆ID',
            },
            timestamp: {
              type: 'integer',
              description: '记忆时间戳',
            },
            keywords: {
              type: 'string',
              description: '记忆关键词，用逗号分隔',
            },
            context: {
              type: 'string',
              description: '记忆上下文',
            },
            content: {
              type: 'string',
              description: '记忆内容',
            },
            importance: {
              type: 'number',
              description: '记忆重要性，0.1到1.0之间',
            },
            last_accessed: {
              type: 'integer',
              description: '最后访问时间',
              nullable: true,
            },
            created_at: {
              type: 'integer',
              description: '创建时间',
            },
            strength: {
              type: 'number',
              description: '记忆强度，0到1之间',
              nullable: true,
            },
          },
          required: ['id', 'timestamp', 'keywords', 'context', 'content', 'importance', 'created_at'],
        },
        MemoryRelation: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '关联ID',
            },
            memory_id: {
              type: 'integer',
              description: '记忆ID',
            },
            related_memory_id: {
              type: 'integer',
              description: '关联记忆ID',
            },
            relation_strength: {
              type: 'number',
              description: '关联强度，0到1之间',
            },
            created_at: {
              type: 'integer',
              description: '创建时间',
            },
          },
          required: ['id', 'memory_id', 'related_memory_id', 'relation_strength', 'created_at'],
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: '错误信息',
            },
          },
          required: ['success', 'message'],
        },
      },
      responses: {
        BadRequest: {
          description: '请求参数错误',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        NotFound: {
          description: '资源不存在',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        ServerError: {
          description: '服务器错误',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // 路由文件路径
};

// 生成Swagger规范
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// 初始化Swagger
export function setupSwagger(app: Express) {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Swagger JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log('Swagger文档已设置，访问 /api-docs 查看API文档');
}
