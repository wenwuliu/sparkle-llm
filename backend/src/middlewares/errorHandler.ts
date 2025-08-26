import { Request, Response, NextFunction } from 'express';
import environment from '../config/environment';

// 自定义错误类
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 开发环境错误处理
const sendErrorDev = (err: AppError, res: Response) => {
  res.status(err.statusCode).json({
    status: 'error',
    error: err,
    message: err.message,
    stack: err.stack
  });
};

// 生产环境错误处理
const sendErrorProd = (err: AppError, res: Response) => {
  // 可信的操作错误：发送给客户端
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  } else {
    // 编程错误或未知错误：不泄露错误详情
    console.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误'
    });
  }
};

// 全局错误处理中间件
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  
  if (environment.isDevelopment) {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    
    // 处理特定类型的错误
    if (err.name === 'CastError') {
      error = new AppError(`无效的 ${err.path}: ${err.value}`, 400);
    }
    if (err.code === 'SQLITE_CONSTRAINT') {
      error = new AppError('数据库约束错误', 400);
    }
    
    sendErrorProd(error, res);
  }
};

// 未找到路由处理
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`找不到路径: ${req.originalUrl}`, 404));
};
