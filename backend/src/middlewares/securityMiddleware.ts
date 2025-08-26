import { Request, Response, NextFunction, RequestHandler } from 'express';
import environment from '../config/environment';

/**
 * 安全相关的中间件集合
 */

// 设置安全相关的HTTP头
export const securityHeaders: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // 禁止在iframe中嵌入
  res.setHeader('X-Frame-Options', 'DENY');

  // 启用XSS过滤
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 防止MIME类型嗅探
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 内容安全策略 - 仅在生产环境启用
  if (environment.isProduction) {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
    );
  }

  next();
};

// 限制请求体大小
export const limitBodySize: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  if (contentLength > MAX_SIZE) {
    res.status(413).json({
      status: 'error',
      message: '请求体过大'
    });
    return;
  }

  next();
};

// 防止暴力破解的速率限制
export const rateLimit: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // 在生产环境中，应该使用专门的速率限制库
  // 这里只是一个简单的示例
  if (environment.isProduction) {
    // 实现速率限制逻辑
    // 例如使用 express-rate-limit 库
  }

  next();
};
