import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { Server as SocketIOServer } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import environment from './config/environment';

// 导入模块
import {
  apiModule,
  socketService,
  modelService,
  memoryService,
  autoMemoryReviewService,
  vectorDbService,
  toolService,
  AppStartupService
} from './modules';

import { serviceRegistry } from './modules/core';

import { sudoPermissionService } from './modules/sudo/sudo-permission.service';

/**
 * 应用类
 * 负责初始化Express应用、配置中间件和路由
 */
export class App {
  public app: Express;
  public server: http.Server;
  public io: SocketIOServer;
  private port: number;
  private applicationService: any; // ApplicationService实例

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.port = environment.port;

    // 初始化Socket.IO
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.configureMiddlewares();
    this.configureRoutes();
    this.configureSwagger();
    this.configureErrorHandling();
  }

  /**
   * 配置中间件
   */
  private configureMiddlewares(): void {
    // 启用CORS
    this.app.use(cors());

    // 解析JSON请求体
    this.app.use(express.json({ limit: '50mb' }));

    // 解析URL编码的请求体
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // 静态文件服务
    // 优先使用环境变量中的前端路径，适用于Electron打包环境
    const frontendPath = process.env.FRONTEND_PATH || path.join(__dirname, '../../frontend/dist');
    console.log(`[Frontend Path]: 使用前端静态文件路径: ${frontendPath}`);
    this.app.use(express.static(frontendPath));

    // 日志中间件
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * 配置路由
   */
  private configureRoutes(): void {
    // API路由
    this.app.use('/api/settings', apiModule.settingsRoutes);
    this.app.use('/api/model', apiModule.modelRoutes);
    this.app.use('/api/memories', apiModule.memoryRoutes);
    this.app.use('/api/conversations', apiModule.conversationRoutes);
    this.app.use('/api/tools', apiModule.toolsRoutes);
    this.app.use('/api/memory-organization', apiModule.memoryOrganizationRoutes);


    // 前端路由 - 所有未匹配的路由都返回前端应用
    this.app.get('*', (req: Request, res: Response) => {
      // 优先使用环境变量中的前端路径，适用于Electron打包环境
      const frontendPath = process.env.FRONTEND_PATH || path.join(__dirname, '../../frontend/dist');
      const indexPath = path.join(frontendPath, 'index.html');
      console.log(`[Index Path]: 尝试加载前端入口文件: ${indexPath}`);

      // 检查文件是否存在
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error(`[Error]: 找不到前端入口文件: ${indexPath}`);
        res.status(404).send(`[Server Error]: 服务器错误: 找不到前端入口文件: ${indexPath}`);
      }
    });
  }

  /**
   * 配置Swagger文档
   */
  private configureSwagger(): void {
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Sparkle LLM API',
          version: '1.0.0',
          description: 'Sparkle LLM平台API文档'
        },
        servers: [
          {
            url: `http://localhost:${this.port}`,
            description: '开发服务器'
          }
        ]
      },
      apis: ['./src/modules/api/routes/*.ts']
    };

    const swaggerSpec = swaggerJSDoc(swaggerOptions);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  /**
   * 配置错误处理
   */
  private configureErrorHandling(): void {
    // 404错误处理
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({ success: false, message: '请求的资源不存在' });
    });

    // 全局错误处理
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('服务器错误:', err);
      res.status(500).json({ success: false, message: '服务器内部错误' });
    });
  }

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    try {
      // 1. 注册所有服务到依赖注入容器
      serviceRegistry.registerServices();
      console.log('✅ 服务注册完成');

      // 2. 初始化sudo权限服务（独立服务）
      sudoPermissionService.initialize();
      console.log('✅ sudo权限服务初始化成功');

      // 3. 通过服务注册表初始化所有服务
      await serviceRegistry.initializeServices(this.io);

      // 4. 获取应用服务协调器实例
      this.applicationService = await serviceRegistry.getService('applicationService');

      console.log('🚀 所有服务初始化完成');
    } catch (error) {
      console.error('❌ 服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 启动服务器
   */
  public start(): void {
    this.server.listen(this.port, async () => {
      console.log(`Server started on port ${this.port}`);
      console.log(`服务器运行在 http://localhost:${this.port}`);
      console.log(`API文档地址: http://localhost:${this.port}/api-docs`);

      // 初始化应用启动服务
      try {
        const appStartupService = new AppStartupService(
          memoryService,
          autoMemoryReviewService
        );
        await appStartupService.initialize();
        console.log('应用启动服务初始化成功');
      } catch (error) {
        console.error('应用启动服务初始化失败:', error);
      }
    });
  }
}

// 导出应用实例
export const app = new App();
